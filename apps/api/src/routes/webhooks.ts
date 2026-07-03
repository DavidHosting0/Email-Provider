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

const snsValidator = new MessageValidator();

const SNS_KEY_ALIASES: Record<string, string> = {
  SigningCertUrl: 'SigningCertURL',
  UnsubscribeUrl: 'UnsubscribeURL',
};

function normalizeSnsKeys(input: Record<string, unknown>): Record<string, unknown> {
  const msg = { ...input };
  for (const [alias, canonical] of Object.entries(SNS_KEY_ALIASES)) {
    if (msg[canonical] === undefined && msg[alias] !== undefined) {
      msg[canonical] = msg[alias];
    }
  }
  if (msg.Subject === null) delete msg.Subject;
  return msg;
}

function toSnsPayload(body: unknown): string | Record<string, unknown> {
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (body && typeof body === 'object') return normalizeSnsKeys(body as Record<string, unknown>);
  throw new Error('Invalid SNS body');
}

function validateSnsMessage(body: unknown): Promise<SnsMessage> {
  const payload = toSnsPayload(body);
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

async function handleSnsMessage(
  request: FastifyRequest,
  onNotification: (msg: SnsMessage) => Promise<void>,
) {
  let msg: SnsMessage;
  try {
    msg = await validateSnsMessage(request.body);
  } catch (err) {
    let keys: string[] = [];
    try {
      const preview = toSnsPayload(request.body);
      keys = typeof preview === 'string'
        ? Object.keys(JSON.parse(preview) as object)
        : Object.keys(preview);
    } catch {
      keys = ['<unparseable>'];
    }
    request.log.warn(
      { err: err instanceof Error ? err.message : err, keys },
      'SNS signature validation failed',
    );
    throw Object.assign(new Error('Invalid SNS signature'), { statusCode: 403 });
  }

  if (msg.Type === 'SubscriptionConfirmation' && msg.SubscribeURL) {
    await confirmSubscription(msg.SubscribeURL);
    request.log.info({ topicArn: msg.TopicArn }, 'SNS subscription confirmed');
    return { status: 'subscribed' };
  }

  if (msg.Type === 'Notification') {
    await onNotification(msg);
    return { status: 'processed' };
  }

  return { status: 'ignored' };
}

export async function webhookRoutes(app: FastifyInstance) {
  await app.register(async (webhooks) => {
    // Keep raw body as string — sns-validator parses it (avoids Fastify JSON parser issues)
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
        return await handleSnsMessage(request, async (msg) => {
          const sesNotification = JSON.parse(msg.Message);
          await inboundQueue.add('ingest', {
            notificationType: sesNotification.notificationType,
            content: sesNotification.content,
            mail: sesNotification.mail,
            receipt: sesNotification.receipt,
          });
          request.log.info(
            { messageId: sesNotification.mail?.messageId },
            'Inbound email queued',
          );
        });
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
        return reply.status(statusCode).send({
          error: err instanceof Error ? err.message : 'Webhook error',
        });
      }
    });

    webhooks.post('/ses/events', async (request, reply) => {
      try {
        return await handleSnsMessage(request, async (msg) => {
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
        });
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
        return reply.status(statusCode).send({
          error: err instanceof Error ? err.message : 'Webhook error',
        });
      }
    });
  });
}
