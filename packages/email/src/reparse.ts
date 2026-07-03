import { fetchEmailFromS3, parseS3Ref, type S3Config } from './s3.js';
import { parseRawEmail } from './mime-parser.js';
import { isEffectivelyEmptyHtml } from './sanitize.js';

export interface EmailBodyFields {
  bodyHtml: string | null;
  bodyText: string | null;
  rawS3Key: string | null;
  messageId?: string | null;
}

export interface ReparseS3Options extends S3Config {
  prefix?: string;
}

function visibleTextLength(html: string): number {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

export function needsBodyReparse(email: EmailBodyFields): boolean {
  if (!email.rawS3Key) return false;

  const html = email.bodyHtml?.trim();
  const text = email.bodyText?.trim();
  if (!html && !text) return true;
  if (isEffectivelyEmptyHtml(email.bodyHtml)) return true;

  const textLen = text?.length ?? 0;
  const htmlTextLen = html ? visibleTextLength(html) : 0;
  if (textLen > 80 && htmlTextLen < textLen * 0.25) return true;

  if (html && /<table/i.test(html) && !/<style[\s>]/i.test(html)) return true;

  return false;
}

export async function reparseEmailBodyFromS3(
  email: EmailBodyFields,
  options: ReparseS3Options,
): Promise<{ bodyHtml: string | null; bodyText: string | null } | null> {
  if (!email.rawS3Key) return null;

  const { bucket: parsedBucket, key } = parseS3Ref(email.rawS3Key, options.bucket);
  const bucket = parsedBucket || options.bucket;
  if (!bucket) return null;

  const s3Config = { ...options, bucket };
  const keysToTry = new Set<string>([key]);

  if (email.messageId) {
    const prefix = options.prefix ?? 'inbound/';
    const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    keysToTry.add(`${normalizedPrefix}${email.messageId}`);
    keysToTry.add(email.messageId);
  }

  for (const objectKey of keysToTry) {
    try {
      const raw = await fetchEmailFromS3(s3Config, objectKey);
      const parsed = await parseRawEmail(raw);
      if (parsed.bodyHtml || parsed.bodyText) {
        return {
          bodyHtml: parsed.bodyHtml ?? null,
          bodyText: parsed.bodyText ?? null,
        };
      }
    } catch {
      // try next key candidate
    }
  }

  return null;
}
