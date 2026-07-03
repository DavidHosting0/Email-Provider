import { fetchEmailFromS3, type S3Config } from './s3.js';
import { parseRawEmail } from './mime-parser.js';
import { isEffectivelyEmptyHtml } from './sanitize.js';

export interface EmailBodyFields {
  bodyHtml: string | null;
  bodyText: string | null;
  rawS3Key: string | null;
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
  if (isEffectivelyEmptyHtml(email.bodyHtml)) return true;

  const textLen = (email.bodyText ?? '').trim().length;
  const htmlTextLen = email.bodyHtml ? visibleTextLength(email.bodyHtml) : 0;
  if (textLen > 80 && htmlTextLen < textLen * 0.25) return true;

  return false;
}

export async function reparseEmailBodyFromS3(
  email: EmailBodyFields,
  s3Config: S3Config,
): Promise<{ bodyHtml: string | null; bodyText: string | null } | null> {
  if (!email.rawS3Key || !s3Config.bucket) return null;

  const raw = await fetchEmailFromS3(s3Config, email.rawS3Key);
  const parsed = await parseRawEmail(raw);

  return {
    bodyHtml: parsed.bodyHtml ?? null,
    bodyText: parsed.bodyText ?? null,
  };
}
