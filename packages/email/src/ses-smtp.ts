import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSesSmtpHost, SES_SMTP_PORT } from '@email-provider/shared';

export interface SesSmtpConfig {
  region: string;
  user: string;
  pass: string;
}

export interface SendMessage {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  messageId?: string;
}

export interface SendAttemptResult {
  success: boolean;
  attempt: number;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  isThrottle: boolean;
}

export interface SendWithRetryResult {
  success: boolean;
  messageId?: string;
  attempts: SendAttemptResult[];
}

const THROTTLE_PATTERNS = [/454/i, /421/i, /throttl/i, /rate limit/i];

function isThrottleError(message: string): boolean {
  return THROTTLE_PATTERNS.some((p) => p.test(message));
}

let transporter: Transporter | null = null;
let currentConfig: SesSmtpConfig | null = null;

export function createSesTransporter(config: SesSmtpConfig): Transporter {
  if (
    transporter &&
    currentConfig &&
    currentConfig.region === config.region &&
    currentConfig.user === config.user
  ) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: getSesSmtpHost(config.region),
    port: SES_SMTP_PORT,
    secure: false,
    requireTLS: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  currentConfig = config;
  return transporter;
}

export async function sendWithRetry(
  config: SesSmtpConfig,
  message: SendMessage,
  options: { maxAttempts?: number; backoffMs?: number[] } = {},
): Promise<SendWithRetryResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const backoffMs = options.backoffMs ?? [1000, 5000, 15000];
  const transport = createSesTransporter(config);
  const attempts: SendAttemptResult[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await transport.sendMail({
        from: message.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        text: message.text,
        html: message.html,
        inReplyTo: message.inReplyTo,
        messageId: message.messageId,
      });

      const attemptResult: SendAttemptResult = {
        success: true,
        attempt,
        messageId: result.messageId,
        isThrottle: false,
      };
      attempts.push(attemptResult);

      return { success: true, messageId: result.messageId, attempts };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const throttle = isThrottleError(errorMessage);

      attempts.push({
        success: false,
        attempt,
        errorCode: throttle ? 'THROTTLE' : 'SEND_ERROR',
        errorMessage,
        isThrottle: throttle,
      });

      if (attempt < maxAttempts) {
        const delay = backoffMs[attempt - 1] ?? backoffMs[backoffMs.length - 1] ?? 5000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  return { success: false, attempts };
}
