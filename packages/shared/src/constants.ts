export const API_PREFIX = '/api/v1';

export const QUEUE_NAMES = {
  OUTBOUND_SEND: 'outbound-send',
  INBOUND_INGEST: 'inbound-ingest',
} as const;

export const DEFAULT_SEND_RATE_LIMIT = 30;
export const SEND_RATE_WINDOW_SECONDS = 3600;

export const SES_SMTP_PORT = 587;

export function getSesSmtpHost(region: string): string {
  return `email-smtp.${region}.amazonaws.com`;
}

export function getSesInboundMx(region: string): string {
  return `inbound-smtp.${region}.amazonaws.com`;
}

export function buildMailboxAddress(localPart: string, domain: string): string {
  return `${localPart}@${domain}`;
}
