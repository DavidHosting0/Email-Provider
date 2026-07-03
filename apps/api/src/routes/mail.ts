import type { FastifyInstance } from 'fastify';
import { sendEmailSchema, updateEmailSchema } from '@email-provider/shared';
import { buildMailboxAddress } from '@email-provider/shared';
import { prisma } from '@email-provider/database';
import { needsBodyReparse, reparseEmailBodyFromS3 } from '@email-provider/email';
import { getUser, requireMailboxAccess, getMailboxWithDomain } from '../lib/middleware.js';
import { checkSendRateLimit } from '../lib/rate-limit.js';
import { outboundQueue } from '../lib/queue.js';
import { config } from '../config.js';

export async function mailRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/mailboxes/:id/inbox', async (request, reply) => {
    const { id } = request.params as { id: string };
    await requireMailboxAccess(request, reply, id);
    if (reply.sent) return;

    const threads = await prisma.emailThread.findMany({
      where: {
        mailboxId: id,
        inboxEmails: { some: { folder: 'inbox' } },
      },
      include: {
        inboxEmails: {
          where: { folder: 'inbox' },
          orderBy: { receivedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });

    return threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      lastMessageAt: t.lastMessageAt,
      preview: t.inboxEmails[0],
      unread: t.inboxEmails.some((e) => !e.isRead),
    }));
  });

  app.get('/mailboxes/:id/sent', async (request, reply) => {
    const { id } = request.params as { id: string };
    await requireMailboxAccess(request, reply, id);
    if (reply.sent) return;

    return prisma.emailSent.findMany({
      where: { mailboxId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });

  app.get('/mailboxes/:id/trash', async (request, reply) => {
    const { id } = request.params as { id: string };
    await requireMailboxAccess(request, reply, id);
    if (reply.sent) return;

    return prisma.emailInbox.findMany({
      where: { mailboxId: id, folder: 'trash' },
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });
  });

  app.get('/threads/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getUser(request);

    const thread = await prisma.emailThread.findFirst({
      where: {
        id,
        mailbox: { domain: { organizationId: user.organizationId } },
      },
      include: {
        inboxEmails: { orderBy: { receivedAt: 'asc' } },
        mailbox: { include: { domain: true } },
      },
    });

    if (!thread) return reply.status(404).send({ error: 'Thread not found' });
    await requireMailboxAccess(request, reply, thread.mailboxId);
    if (reply.sent) return;

    await prisma.emailInbox.updateMany({
      where: { threadId: id, isRead: false },
      data: { isRead: true },
    });

    const s3Config = {
      region: config.sesRegion,
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
      bucket: config.sesInboundS3Bucket,
      prefix: config.sesInboundS3Prefix,
    };

    for (const email of thread.inboxEmails) {
      if (!email.rawS3Key) continue;
      if (!needsBodyReparse(email) && email.bodyHtml?.trim()) continue;

      try {
        const fresh = await reparseEmailBodyFromS3(
          { ...email, messageId: email.messageId },
          s3Config,
        );
        if (!fresh?.bodyHtml && !fresh?.bodyText) continue;

        await prisma.emailInbox.update({
          where: { id: email.id },
          data: {
            bodyHtml: fresh.bodyHtml,
            bodyText: fresh.bodyText ?? email.bodyText,
          },
        });
        email.bodyHtml = fresh.bodyHtml;
        if (fresh.bodyText) email.bodyText = fresh.bodyText;
      } catch (err) {
        request.log.warn(
          { emailId: email.id, err: err instanceof Error ? err.message : err },
          'Failed to reparse email body from S3',
        );
      }
    }

    return thread;
  });

  app.post('/mailboxes/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = sendEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    await requireMailboxAccess(request, reply, id);
    if (reply.sent) return;

    const user = getUser(request);
    const mailbox = await getMailboxWithDomain(id, user.organizationId);
    if (!mailbox || !mailbox.isEnabled) {
      return reply.status(400).send({ error: 'Mailbox not available' });
    }

    const rateCheck = await checkSendRateLimit(id);
    if (!rateCheck.allowed) {
      return reply.status(429).send({ error: 'Rate limit exceeded', remaining: rateCheck.remaining });
    }

    const fromAddr = buildMailboxAddress(mailbox.localPart, mailbox.domain.name);
    const displayFrom = mailbox.displayName
      ? `"${mailbox.displayName}" <${fromAddr}>`
      : fromAddr;

    const emailSent = await prisma.emailSent.create({
      data: {
        mailboxId: id,
        threadId: parsed.data.threadId,
        fromAddr: displayFrom,
        toAddrs: parsed.data.to,
        ccAddrs: parsed.data.cc ?? [],
        bccAddrs: parsed.data.bcc ?? [],
        subject: parsed.data.subject,
        bodyText: parsed.data.bodyText,
        bodyHtml: parsed.data.bodyHtml,
        inReplyTo: parsed.data.inReplyTo,
        status: 'queued',
      },
    });

    await outboundQueue.add('send', { emailSentId: emailSent.id });

    return reply.status(202).send({
      id: emailSent.id,
      status: 'queued',
      message: 'Email queued for delivery',
    });
  });

  app.patch('/emails/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const user = getUser(request);
    const email = await prisma.emailInbox.findFirst({
      where: {
        id,
        mailbox: { domain: { organizationId: user.organizationId } },
      },
    });
    if (!email) return reply.status(404).send({ error: 'Email not found' });

    await requireMailboxAccess(request, reply, email.mailboxId);
    if (reply.sent) return;

    return prisma.emailInbox.update({
      where: { id },
      data: parsed.data,
    });
  });

  app.delete('/emails/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getUser(request);

    const email = await prisma.emailInbox.findFirst({
      where: {
        id,
        mailbox: { domain: { organizationId: user.organizationId } },
      },
    });
    if (!email) return reply.status(404).send({ error: 'Email not found' });

    await requireMailboxAccess(request, reply, email.mailboxId);
    if (reply.sent) return;

    await prisma.emailInbox.update({
      where: { id },
      data: { folder: 'trash' },
    });

    return reply.status(204).send();
  });
}
