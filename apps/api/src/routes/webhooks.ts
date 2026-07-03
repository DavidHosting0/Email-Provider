import { createRequire } from 'node:module';
import https from 'node:https';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { inboundQueue } from '../lib/queue.js';

const require = createRequire(import.meta.url);
const MessageValidator = require('sns-validator') as new () => {
  validate(
    message: string | Record<string, unknown>,
    cb: (err: Error | null, message: SnsMessage) => void,
  ): void;
};

interface SnsMessage {
  Type: string;
  MessageId: string;
  TopicArn?: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
  Token?: string;
}

interface SesInboundNotification {
  notificationType: string;
  content?: string;
  mail: {
    messageId: string;
    source: string;
    destination: string[];
    commonHeaders?: { subject?: string };
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

const snsValidator = new MessageValidator();

function parseJsonBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') return JSON.parse(body) as Record<string, unknown>;
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString('utf8')) as Record<string, unknown>;
  if (body && typeof body === 'object') return body as Record<string, unknown>;
  throw new Error('Invalid request body');
}

function isSesInboundNotification(obj: Record<string, unknown>): boolean {
  return obj.notificationType === 'Received'
    && typeof obj.mail === 'object'
    && obj.mail !== null
    && typeof obj.receipt === 'object'
    && obj.receipt !== null;
}

function validateSnsMessage(body: unknown): Promise<SnsMessage> {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    snsValidator.validate(payload, (err, validated) => {
      if (err) reject(err);
      else resolve(validated);
    });
  });
}

async function confirmSubscription(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.resume();
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`SubscribeURL returned ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function queueInboundEmail(
  sesNotification: SesInboundNotification,
  log: FastifyRequest['log'],
) {
  await inboundQueue.add('ingest', {
    notificationType: sesNotification.notificationType,
    content: sesNotification.content,
    mail: sesNotification.mail,
    receipt: sesNotification.receipt,
  });
  log.info({ messageId: sesNotification.mail.messageId }, 'Inbound email queued');
}

export async function webhookRoutes(app: FastifyInstance) {
  await app.register(async (webhooks) => {
    const rawStringParser = (
      _req: unknown,
      body: string,
      done: (err: Error | null, result?: string) => void,
    ) => {
      done(null, body);
    };

    webhooks.removeContentTypeParser('application/json');
    webhooks.addContentTypeParser('application/json', { parseAs: 'string' }, rawStringParser);
    webhooks.addContentTypeParser('text/plain', { parseAs: 'string' }, rawStringParser);

    webhooks.post('/ses/inbound', async (request, reply) => {
      try {
        const body = parseJsonBody(request.body);

        // SNS "Raw message delivery" posts the SES JSON directly (no SNS envelope/signature)
        if (isSesInboundNotification(body)) {
          const sesNotification = body as unknown as SesInboundNotification;
          request.log.info(
            { messageId: sesNotification.mail.messageId },
            'Direct SES notification received (SNS raw delivery)',
          );
          await queueInboundEmail(sesNotification, request.log);
          return { status: 'queued' };
        }

        const msg = await validateSnsMessage(request.body);

        if (msg.Type === 'SubscriptionConfirmation' && msg.SubscribeURL) {
          await confirmSubscription(msg.SubscribeURL);
          request.log.info({ topicArn: msg.TopicArn }, 'SNS subscription confirmed');
          return { status: 'subscribed' };
        }

        if (msg.Type === 'Notification') {
          const sesNotification = JSON.parse(msg.Message) as SesInboundNotification;
          await queueInboundEmail(sesNotification, request.log);
          return { status: 'queued' };
        }

        return { status: 'ignored' };
      } catch (err) {
        request.log.warn(
          { err: err instanceof Error ? err.message : err },
          'Inbound webhook failed',
        );
        const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
        return reply.status(statusCode).send({
          error: err instanceof Error ? err.message : 'Webhook error',
        });
      }
    });

    webhooks.post('/ses/events', async (request, reply) => {
      try {
        const msg = await validateSnsMessage(request.body);

        if (msg.Type === 'SubscriptionConfirmation' && msg.SubscribeURL) {
          await confirmSubscription(msg.SubscribeURL);
          request.log.info({ topicArn: msg.TopicArn }, 'SNS subscription confirmed');
          return { status: 'subscribed' };
        }

        if (msg.Type === 'Notification') {
          const event = JSON.parse(msg.Message);
          const eventType = event.eventType?.toLowerCase();

          if (eventType === 'bounce' || eventType === 'complaint' || eventType === 'delivery') {
            const { prisma } = await import('@email-provider/database');
            await prisma.sesEvent.create({
              data: {
                eventType,
                messageId: event.mail?.messageId,
                emailAddress: event.bounce?.bouncedRecipients?.[0]?.emailAddress
                  ?? event.complaint?.complainedRecipients?.[0]?.emailAddress,
                payload: event,
              },
            });
          }

          return { status: 'processed' };
        }

        return { status: 'ignored' };
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
        return reply.status(statusCode).send({
          error: err instanceof Error ? err.message : 'Webhook error',
        });
      }
    });
  });
}
