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
  const lines: string[] = [];

  const add = (key: string, value: string | undefined) => {
    if (value !== undefined) lines.push(`${key}\n${value}\n`);
  };

  add('Message', msg.Message);
  add('MessageId', msg.MessageId);
  add('Subject', msg.Subject);
  add('Timestamp', msg.Timestamp);

  if (msg.Type === 'SubscriptionConfirmation' || msg.Type === 'UnsubscribeConfirmation') {
    add('Token', msg.Token);
    add('TopicArn', msg.TopicArn);
    add('Type', msg.Type);
    add('SubscribeURL', msg.SubscribeURL);
  } else {
    add('TopicArn', msg.TopicArn);
    add('Type', msg.Type);
  }

  return lines.join('');
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

async function verifySnsSignature(msg: SnsMessage): Promise<boolean> {
  if (!msg.SigningCertURL?.startsWith('https://sns.')) return false;
  if (!msg.SigningCertURL.includes('.amazonaws.com/')) return false;

  try {
    const cert = await fetchCert(msg.SigningCertURL);
    const algorithm = msg.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1';
    const verifier = crypto.createVerify(algorithm);
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
      await confirmSubscription(msg.SubscribeURL);
      request.log.info({ topicArn: msg.TopicArn }, 'SNS subscription confirmed');
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
  });
}
