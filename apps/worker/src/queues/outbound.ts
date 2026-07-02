import { Worker, type Job } from 'bullmq';
import { prisma } from '@email-provider/database';
import { sendWithRetry } from '@email-provider/email';
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

interface OutboundJobData {
  emailSentId: string;
}

export function startOutboundWorker() {
  const worker = new Worker<OutboundJobData>(
    QUEUE_NAMES.OUTBOUND_SEND,
    async (job: Job<OutboundJobData>) => {
      const { emailSentId } = job.data;
      logger.info({ emailSentId, attempt: job.attemptsMade + 1 }, 'Processing outbound email');

      const email = await prisma.emailSent.findUnique({
        where: { id: emailSentId },
        include: { mailbox: { include: { domain: true } } },
      });

      if (!email) {
        logger.error({ emailSentId }, 'Email not found');
        return;
      }

      await prisma.emailSent.update({
        where: { id: emailSentId },
        data: { status: 'sending' },
      });

      const result = await sendWithRetry(
        {
          region: workerConfig.sesRegion,
          user: workerConfig.sesSmtpUser,
          pass: workerConfig.sesSmtpPass,
        },
        {
          from: email.fromAddr,
          to: email.toAddrs,
          cc: email.ccAddrs.length > 0 ? email.ccAddrs : undefined,
          bcc: email.bccAddrs.length > 0 ? email.bccAddrs : undefined,
          subject: email.subject,
          text: email.bodyText ?? undefined,
          html: email.bodyHtml ?? undefined,
          inReplyTo: email.inReplyTo ?? undefined,
        },
      );

      for (const attempt of result.attempts) {
        await prisma.deliveryLog.create({
          data: {
            emailSentId,
            attempt: attempt.attempt,
            success: attempt.success,
            errorCode: attempt.errorCode,
            errorMessage: attempt.errorMessage,
          },
        });
      }

      if (result.success) {
        await prisma.emailSent.update({
          where: { id: emailSentId },
          data: {
            status: 'sent',
            sesMessageId: result.messageId,
            sentAt: new Date(),
          },
        });
        logger.info({ emailSentId, messageId: result.messageId }, 'Email sent successfully');
      } else {
        const lastAttempt = result.attempts[result.attempts.length - 1];
        if (lastAttempt?.isThrottle && job.attemptsMade < 2) {
          throw new Error('SES throttle - will retry via BullMQ');
        }

        await prisma.emailSent.update({
          where: { id: emailSentId },
          data: { status: 'failed' },
        });
        logger.error({ emailSentId }, 'Email send failed after retries');
      }
    },
    {
      connection,
      concurrency: workerConfig.concurrency,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Outbound job failed');
  });

  logger.info('Outbound send worker started');
  return worker;
}
