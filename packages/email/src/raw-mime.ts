import { parseRawEmail } from './mime-parser.js';
import { reparseEmailBodyFromS3, type ReparseS3Options } from './reparse.js';

const RAW_EMAIL_MARKERS = /^(From|Return-Path|MIME-Version|Received|Date|Delivered-To|X-)/im;

export function looksLikeRawEmail(raw: Buffer): boolean {
  if (!raw.length) return false;
  const sample = raw.subarray(0, Math.min(raw.length, 4096)).toString('utf8');
  return RAW_EMAIL_MARKERS.test(sample);
}

export function decodeInboundContent(content: string): Buffer {
  const trimmed = content.trim();
  if (!trimmed) return Buffer.alloc(0);

  const asUtf8 = Buffer.from(trimmed, 'utf8');
  if (looksLikeRawEmail(asUtf8)) return asUtf8;

  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as { content?: string };
      if (typeof json.content === 'string' && json.content.trim()) {
        return decodeInboundContent(json.content);
      }
    } catch {
      // not JSON
    }
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64');
    if (looksLikeRawEmail(decoded)) return decoded;
  } catch {
    // not base64
  }

  return asUtf8;
}

export function encodeRawMime(raw: Buffer): string {
  return raw.toString('base64');
}

export function decodeRawMime(encoded: string): Buffer {
  return Buffer.from(encoded, 'base64');
}

export interface StoredEmailBodyFields {
  bodyText: string | null;
  bodyHtml: string | null;
  rawMime: string | null;
  rawS3Key: string | null;
  messageId?: string | null;
}

export async function hydrateEmailBody(
  email: StoredEmailBodyFields,
  s3Config?: ReparseS3Options,
): Promise<{ bodyText: string | null; bodyHtml: string | null; updated: boolean }> {
  const hasBody = !!(email.bodyHtml?.trim() || email.bodyText?.trim());
  if (hasBody) {
    return { bodyText: email.bodyText, bodyHtml: email.bodyHtml, updated: false };
  }

  if (email.rawMime) {
    try {
      const parsed = await parseRawEmail(decodeRawMime(email.rawMime));
      if (parsed.bodyHtml || parsed.bodyText) {
        return {
          bodyText: parsed.bodyText ?? null,
          bodyHtml: parsed.bodyHtml ?? null,
          updated: true,
        };
      }
    } catch {
      // try other sources
    }
  }

  if (email.rawS3Key && s3Config) {
    const fromS3 = await reparseEmailBodyFromS3(email, s3Config);
    if (fromS3?.bodyHtml || fromS3?.bodyText) {
      return {
        bodyText: fromS3.bodyText,
        bodyHtml: fromS3.bodyHtml,
        updated: true,
      };
    }
  }

  return { bodyText: email.bodyText, bodyHtml: email.bodyHtml, updated: false };
}
