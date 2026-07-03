import { simpleParser, type Attachment, type ParsedMail } from 'mailparser';
import {
  prepareEmailHtml,
  htmlToPlainText,
  isEffectivelyEmptyHtml,
} from './sanitize.js';

export interface ParsedEmail {
  messageId: string | undefined;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string | undefined;
  bodyHtml: string | undefined;
  inReplyTo: string | undefined;
}

interface ExtractedBodies {
  bodyText?: string;
  bodyHtml?: string;
}

function mailText(parsed: ParsedMail): string | undefined {
  if (typeof parsed.text !== 'string' || !parsed.text.trim()) return undefined;
  return parsed.text;
}

function mailHtml(parsed: ParsedMail): string | undefined {
  if (typeof parsed.html !== 'string' || !parsed.html.trim()) return undefined;
  return parsed.html;
}

function visibleTextLength(text: string): number {
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim().length;
}

function isForwardBoilerplate(text: string | undefined): boolean {
  if (!text?.trim()) return false;
  const trimmed = text.trim();
  if (trimmed.length > 300) return false;
  return /forwarded message|begin forwarded message|original message/i.test(trimmed)
    && visibleTextLength(trimmed) < 120;
}

function isForwardBoilerplateHtml(html: string | undefined): boolean {
  if (!html?.trim()) return false;
  return isForwardBoilerplate(htmlToPlainText(html));
}

function isBoilerplateBodies(bodies: ExtractedBodies): boolean {
  return isForwardBoilerplate(bodies.bodyText) || isForwardBoilerplateHtml(bodies.bodyHtml);
}

function scoreBodies(bodies: ExtractedBodies): number {
  const textLen = bodies.bodyText?.trim().length ?? 0;
  const htmlLen = bodies.bodyHtml ? visibleTextLength(bodies.bodyHtml) : 0;
  return Math.max(textLen, htmlLen);
}

function pickBetterBodies(current: ExtractedBodies, candidate: ExtractedBodies): ExtractedBodies {
  const currentBoilerplate = isBoilerplateBodies(current);
  const candidateBoilerplate = isBoilerplateBodies(candidate);

  if (currentBoilerplate && !candidateBoilerplate) return candidate;
  if (!currentBoilerplate && candidateBoilerplate) return current;

  const currentScore = scoreBodies(current);
  const candidateScore = scoreBodies(candidate);

  if (candidateScore > currentScore) return candidate;
  if (candidateScore < currentScore) return current;

  return {
    bodyText: candidate.bodyText ?? current.bodyText,
    bodyHtml: candidate.bodyHtml ?? current.bodyHtml,
  };
}

function bodiesFromParsed(parsed: ParsedMail): ExtractedBodies {
  const rawHtml = mailHtml(parsed)
    ?? (typeof parsed.textAsHtml === 'string' && parsed.textAsHtml.trim()
      ? parsed.textAsHtml
      : undefined);

  const bodyHtml = rawHtml ? prepareEmailHtml(rawHtml) : undefined;
  let bodyText = mailText(parsed);

  if (!bodyText && bodyHtml && !isEffectivelyEmptyHtml(bodyHtml)) {
    bodyText = htmlToPlainText(bodyHtml);
  }

  if (isBoilerplateBodies({ bodyText, bodyHtml })) {
    return { bodyText: undefined, bodyHtml: undefined };
  }

  return {
    bodyText: bodyText?.trim() || undefined,
    bodyHtml: bodyHtml?.trim() || undefined,
  };
}

async function extractFromAttachment(attachment: Attachment): Promise<ExtractedBodies> {
  const type = attachment.contentType?.toLowerCase() ?? '';
  const content = attachment.content;

  if (!content || !Buffer.isBuffer(content)) return { bodyText: undefined, bodyHtml: undefined };

  if (type === 'text/html' || type.startsWith('text/html;')) {
    const html = prepareEmailHtml(content.toString('utf8'));
    return {
      bodyHtml: html || undefined,
      bodyText: html ? htmlToPlainText(html) : undefined,
    };
  }

  if (type === 'text/plain' || type.startsWith('text/plain;')) {
    const text = content.toString('utf8').trim();
    return { bodyText: text || undefined, bodyHtml: undefined };
  }

  if (type === 'message/rfc822' || type.startsWith('message/rfc822') || type.startsWith('message/')) {
    return extractAllBodies(await simpleParser(content));
  }

  return { bodyText: undefined, bodyHtml: undefined };
}

async function extractAllBodies(parsed: ParsedMail): Promise<ExtractedBodies> {
  let best = bodiesFromParsed(parsed);

  for (const attachment of parsed.attachments ?? []) {
    const fromAttachment = await extractFromAttachment(attachment);
    if (fromAttachment.bodyHtml || fromAttachment.bodyText) {
      best = pickBetterBodies(best, fromAttachment);
    }
  }

  return best;
}

export async function parseRawEmail(raw: Buffer | string): Promise<ParsedEmail> {
  const parsed: ParsedMail = await simpleParser(raw);

  const from = extractAddress(parsed.from);
  const to = extractAddresses(parsed.to);
  const cc = extractAddresses(parsed.cc);
  const { bodyText, bodyHtml } = await extractAllBodies(parsed);

  return {
    messageId: parsed.messageId ?? undefined,
    from,
    to,
    cc,
    subject: parsed.subject ?? '(no subject)',
    bodyText,
    bodyHtml,
    inReplyTo: parsed.inReplyTo ?? undefined,
  };
}

function extractAddress(addr: ParsedMail['from']): string {
  if (!addr) return 'unknown@unknown';
  if (Array.isArray(addr)) {
    const first = addr[0];
    return first?.text ?? (first as { address?: string })?.address ?? 'unknown@unknown';
  }
  return addr.text ?? (addr as { address?: string }).address ?? 'unknown@unknown';
}

function extractAddresses(
  addrs: ParsedMail['to'] | ParsedMail['cc'],
): string[] {
  if (!addrs) return [];
  const list = Array.isArray(addrs) ? addrs : [addrs];
  return list.flatMap((a) => {
    const item = a as { address?: string; text?: string };
    if (item.address) return [item.address];
    if (item.text) return [item.text];
    return [];
  });
}

export function hashParticipants(addresses: string[]): string[] {
  return [...new Set(addresses.map((a) => a.toLowerCase()))].sort();
}
