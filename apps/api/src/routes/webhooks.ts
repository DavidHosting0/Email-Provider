import crypto from 'node:crypto';
import https from 'node:https';
import type { FastifyInstance } from 'fastify';
import { inboundQueue } from '../lib/queue.js';

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

async function fetchCert(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function buildSignatureString(msg: SnsMessage): string {
  const fields: Array<[string, string | undefined]> = [
    ['Message', msg.Message],
    ['MessageId', msg.MessageId],
    ['Subject', msg.Subject],
    ['Timestamp', msg.Timestamp],
    ['TopicArn', msg.TopicArn],
    ['Type', msg.Type],
  ];

  if (msg.Type === 'SubscriptionConfirmation' || msg.Type === 'UnsubscribeConfirmation') {
    fields.push(['SubscribeURL', msg.SubscribeURL], ['Token', msg.Token]);
  }

  return fields
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}\n${v}\n`)
    .join('');
}

async function verifySnsSignature(msg: SnsMessage): Promise<boolean> {
  if (!msg.SigningCertURL?.startsWith('https://sns.')) return false;
  if (!msg.SigningCertURL.includes('.amazonaws.com/')) return false;

  try {
    const cert = await fetchCert(msg.SigningCertURL);
    const verifier = crypto.createVerify('RSA-SHA1');
    verifier.update(buildSignatureString(msg));
    return verifier.verify(cert, msg.Signature, 'base64');
  } catch {
    return false;
  }
}

export async function webhookRoutes(app: FastifyInstance) {
  app.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const parsed = JSON.parse(body as string);
      done(null, parsed);
    } catch (err) {
      done(err as Error);
    }
  });

  app.post('/ses/inbound', async (request, reply) => {
    const msg = request.body as SnsMessage;

    if (!(await verifySnsSignature(msg))) {
      return reply.status(403).send({ error: 'Invalid SNS signature' });
    }

    if (msg.Type === 'SubscriptionConfirmation' && msg.SubscribeURL) {
      await fetch(msg.SubscribeURL);
      return { status: 'subscribed' };
    }

    if (msg.Type === 'Notification') {
      const sesNotification = JSON.parse(msg.Message);
      await inboundQueue.add('ingest', {
        notificationType: sesNotification.notificationType,
        mail: sesNotification.mail,
        receipt: sesNotification.receipt,
      });
      return { status: 'queued' };
    }

    return { status: 'ignored' };
  });

  app.post('/ses/events', async (request, reply) => {
    const msg = request.body as SnsMessage;

    if (!(await verifySnsSignature(msg))) {
      return reply.status(403).send({ error: 'Invalid SNS signature' });
    }

    if (msg.Type === 'SubscriptionConfirmation' && msg.SubscribeURL) {
      await fetch(msg.SubscribeURL);
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
  });
}
