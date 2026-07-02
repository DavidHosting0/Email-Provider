import { Worker, type Job } from 'bullmq';
import { prisma } from '@email-provider/database';
import { fetchEmailFromS3, parseRawEmail, hashParticipants } from '@email-provider/email';
import { QUEUE_NAMES, parseRedisUrl } from '@email-provider/shared';
import { workerConfig } from '../config.js';
import pino from 'pino';

const logger = pino({
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const connection = parseRedisUrl(workerConfig.redisUrl);

interface InboundJobData {
  notificationType: string;
  mail: {
    messageId: string;
    source: string;
    destination: string[];
    commonHeaders?: { subject?: string };
  };
  receipt: {
    action?: { type: string; bucketName?: string; objectKey?: string };
    recipients?: string[];
  };
}

function extractLocalPart(email: string): string {
  return email.split('@')[0]?.toLowerCase() ?? '';
}

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

export function startInboundWorker() {
  const worker = new Worker<InboundJobData>(
    QUEUE_NAMES.INBOUND_INGEST,
    async (job: Job<InboundJobData>) => {
      const { mail, receipt } = job.data;
      logger.info({ messageId: mail.messageId }, 'Processing inbound email');

      const s3Action = receipt.action;
      if (!s3Action?.bucketName || !s3Action?.objectKey) {
        logger.error({ messageId: mail.messageId }, 'No S3 action in receipt');
        return;
      }

      const raw = await fetchEmailFromS3(
        {
          region: workerConfig.sesRegion,
          accessKeyId: workerConfig.awsAccessKeyId,
          secretAccessKey: workerConfig.awsSecretAccessKey,
          bucket: s3Action.bucketName,
        },
        s3Action.objectKey,
      );

      const parsed = await parseRawEmail(raw);
      const recipients = receipt.recipients ?? mail.destination;

      for (const recipient of recipients) {
        const localPart = extractLocalPart(recipient);
        const domainName = extractDomain(recipient);

        const mailbox = await prisma.mailbox.findFirst({
          where: {
            localPart,
            isEnabled: true,
            domain: { name: domainName },
          },
          include: { domain: true },
        });

        if (!mailbox) {
          logger.warn({ recipient }, 'No mailbox found for recipient');
          continue;
        }

        const participants = hashParticipants([parsed.from, ...parsed.to, ...parsed.cc]);
        let thread = await prisma.emailThread.findFirst({
          where: {
            mailboxId: mailbox.id,
            subject: parsed.subject,
          },
          orderBy: { lastMessageAt: 'desc' },
        });

        if (!thread) {
          thread = await prisma.emailThread.create({
            data: {
              mailboxId: mailbox.id,
              subject: parsed.subject,
              participantHashes: participants,
              lastMessageAt: new Date(),
            },
          });
        } else {
          await prisma.emailThread.update({
            where: { id: thread.id },
            data: { lastMessageAt: new Date(), participantHashes: participants },
          });
        }

        await prisma.emailInbox.create({
          data: {
            threadId: thread.id,
            mailboxId: mailbox.id,
            messageId: parsed.messageId ?? mail.messageId,
            fromAddr: parsed.from,
            toAddrs: parsed.to,
            ccAddrs: parsed.cc,
            subject: parsed.subject,
            bodyText: parsed.bodyText,
            bodyHtml: parsed.bodyHtml,
            rawS3Key: s3Action.objectKey,
            folder: 'inbox',
            isRead: false,
          },
        });

        logger.info({ recipient, threadId: thread.id }, 'Inbound email stored');
      }
    },
    {
      connection,
      concurrency: workerConfig.concurrency,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Inbound job failed');
  });

  logger.info('Inbound ingest worker started');
  return worker;
}
