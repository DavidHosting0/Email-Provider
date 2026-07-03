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
  content?: string;
  mail: {
    messageId: string;
    source: string;
    destination: string[];
    commonHeaders?: {
      subject?: string;
      from?: string[];
      to?: string[];
    };
  };
  receipt: {
    action?: {
      type: string;
      bucketName?: string;
      objectKey?: string;
      objectKeyPrefix?: string;
    };
    recipients?: string[];
  };
}

function extractLocalPart(email: string): string {
  return email.split('@')[0]?.toLowerCase() ?? '';
}

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

function normalizePrefix(prefix: string): string {
  if (!prefix) return '';
  return prefix.endsWith('/') ? prefix : `${prefix}/`;
}

async function tryFetchFromS3(
  messageId: string,
  receipt: InboundJobData['receipt'],
): Promise<{ raw: Buffer; s3Key: string } | null> {
  const action = receipt.action;
  if (action?.type === 'S3' && action.bucketName && action.objectKey) {
    const key = action.objectKeyPrefix
      ? `${normalizePrefix(action.objectKeyPrefix)}${action.objectKey}`
      : action.objectKey;
    const raw = await fetchEmailFromS3(
      {
        region: workerConfig.sesRegion,
        accessKeyId: workerConfig.awsAccessKeyId,
        secretAccessKey: workerConfig.awsSecretAccessKey,
        bucket: action.bucketName,
      },
      key,
    );
    return { raw, s3Key: key };
  }

  if (!workerConfig.sesInboundS3Bucket) return null;

  const prefix = normalizePrefix(workerConfig.sesInboundS3Prefix);
  const candidates = [`${prefix}${messageId}`, messageId];

  for (const key of candidates) {
    try {
      const raw = await fetchEmailFromS3(
        {
          region: workerConfig.sesRegion,
          accessKeyId: workerConfig.awsAccessKeyId,
          secretAccessKey: workerConfig.awsSecretAccessKey,
          bucket: workerConfig.sesInboundS3Bucket,
        },
        key,
      );
      return { raw, s3Key: key };
    } catch {
      // try next key pattern
    }
  }

  return null;
}

function applySesFallbacks(
  parsed: Awaited<ReturnType<typeof parseRawEmail>>,
  mail: InboundJobData['mail'],
) {
  const headers = mail.commonHeaders;
  const from = parsed.from !== 'unknown@unknown'
    ? parsed.from
    : headers?.from?.[0] ?? mail.source;
  const subject = parsed.subject !== '(no subject)'
    ? parsed.subject
    : headers?.subject ?? parsed.subject;
  const to = parsed.to.length > 0 ? parsed.to : headers?.to ?? mail.destination ?? [];

  return { ...parsed, from, subject, to };
}

async function resolveRawEmail(
  data: InboundJobData,
): Promise<{ raw: Buffer; s3Key: string | null }> {
  const { mail, receipt, content } = data;

  // Prefer S3 — full RFC822 MIME, parses reliably
  try {
    const fromS3 = await tryFetchFromS3(mail.messageId, receipt);
    if (fromS3) {
      logger.info({ messageId: mail.messageId, s3Key: fromS3.s3Key }, 'Fetched email from S3');
      return fromS3;
    }
  } catch (err) {
    logger.warn(
      { messageId: mail.messageId, err: err instanceof Error ? err.message : err },
      'S3 fetch failed, falling back to SNS content',
    );
  }

  if (content) {
    logger.info({ messageId: mail.messageId }, 'Using raw email from SNS content field');
    return { raw: Buffer.from(content, 'utf8'), s3Key: null };
  }

  throw new Error(`Could not resolve email body for message ${mail.messageId}`);
}

export function startInboundWorker() {
  const worker = new Worker<InboundJobData>(
    QUEUE_NAMES.INBOUND_INGEST,
    async (job: Job<InboundJobData>) => {
      const { mail, receipt } = job.data;
      logger.info(
        { messageId: mail.messageId, actionType: receipt.action?.type },
        'Processing inbound email',
      );

      const { raw, s3Key } = await resolveRawEmail(job.data);
      const parsed = applySesFallbacks(await parseRawEmail(raw), mail);
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
            rawS3Key: s3Key,
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
