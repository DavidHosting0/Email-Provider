import { simpleParser, type ParsedMail } from 'mailparser';
import { prepareEmailHtml, htmlToPlainText, isEffectivelyEmptyHtml } from './sanitize.js';

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

function extractRawHtml(parsed: ParsedMail): string | undefined {
  if (parsed.html) return String(parsed.html);
  if (parsed.textAsHtml) return String(parsed.textAsHtml);
  return undefined;
}

export async function parseRawEmail(raw: Buffer | string): Promise<ParsedEmail> {
  const parsed: ParsedMail = await simpleParser(raw);

  const from = extractAddress(parsed.from);
  const to = extractAddresses(parsed.to);
  const cc = extractAddresses(parsed.cc);

  const rawHtml = extractRawHtml(parsed);
  const bodyHtml = rawHtml ? prepareEmailHtml(rawHtml) : undefined;

  let bodyText = parsed.text?.trim() ? parsed.text : undefined;
  if (!bodyText && bodyHtml && !isEffectivelyEmptyHtml(bodyHtml)) {
    bodyText = htmlToPlainText(bodyHtml);
  }

  return {
    messageId: parsed.messageId ?? undefined,
    from,
    to,
    cc,
    subject: parsed.subject ?? '(no subject)',
    bodyText,
    bodyHtml: bodyHtml || undefined,
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
