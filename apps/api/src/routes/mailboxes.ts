import type { FastifyInstance } from 'fastify';
import { createMailboxSchema, updateMailboxSchema } from '@email-provider/shared';
import { buildMailboxAddress } from '@email-provider/shared';
import { prisma } from '@email-provider/database';
import { getUser, requireAdmin } from '../lib/middleware.js';

export async function mailboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const user = getUser(request);
    const where =
      user.role === 'org_admin'
        ? { domain: { organizationId: user.organizationId } }
        : { userAccess: { some: { userId: user.sub } } };

    const mailboxes = await prisma.mailbox.findMany({
      where,
      include: { domain: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return mailboxes.map((m) => ({
      ...m,
      address: buildMailboxAddress(m.localPart, m.domain.name),
    }));
  });

  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createMailboxSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const user = getUser(request);
    const domain = await prisma.domain.findFirst({
      where: { id: parsed.data.domainId, organizationId: user.organizationId },
    });
    if (!domain) return reply.status(404).send({ error: 'Domain not found' });

    try {
      const mailbox = await prisma.mailbox.create({
        data: {
          domainId: parsed.data.domainId,
          localPart: parsed.data.localPart.toLowerCase(),
          displayName: parsed.data.displayName,
        },
        include: { domain: { select: { name: true } } },
      });

      return reply.status(201).send({
        ...mailbox,
        address: buildMailboxAddress(mailbox.localPart, mailbox.domain.name),
      });
    } catch {
      return reply.status(409).send({ error: 'Mailbox already exists' });
    }
  });

  app.patch('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateMailboxSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const user = getUser(request);
    const mailbox = await prisma.mailbox.findFirst({
      where: { id, domain: { organizationId: user.organizationId } },
      include: { domain: { select: { name: true } } },
    });
    if (!mailbox) return reply.status(404).send({ error: 'Mailbox not found' });

    const updated = await prisma.mailbox.update({
      where: { id },
      data: parsed.data,
      include: { domain: { select: { name: true } } },
    });

    return {
      ...updated,
      address: buildMailboxAddress(updated.localPart, updated.domain.name),
    };
  });

  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getUser(request);

    const mailbox = await prisma.mailbox.findFirst({
      where: { id, domain: { organizationId: user.organizationId } },
    });
    if (!mailbox) return reply.status(404).send({ error: 'Mailbox not found' });

    await prisma.mailbox.delete({ where: { id } });
    return reply.status(204).send();
  });
}
