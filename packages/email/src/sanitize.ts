import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const EMAIL_ALLOWED_TAGS = [
  'a', 'abbr', 'address', 'article', 'b', 'blockquote', 'body', 'br', 'caption', 'center',
  'code', 'col', 'colgroup', 'del', 'div', 'em', 'figcaption', 'figure', 'font', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'i', 'img', 'ins',
  'li', 'link', 'main', 'meta', 'nav', 'ol', 'p', 'pre', 's', 'section', 'small', 'span',
  'strike', 'strong', 'style', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'title', 'tr', 'u', 'ul',
];

const EMAIL_ALLOWED_ATTR = [
  'align', 'alt', 'aria-hidden', 'aria-label', 'background', 'bgcolor', 'border',
  'cellpadding', 'cellspacing', 'class', 'color', 'colspan', 'dir', 'face', 'height',
  'href', 'id', 'lang', 'name', 'rel', 'role', 'rowspan', 'size', 'src', 'style',
  'target', 'title', 'valign', 'width',
];

const EMAIL_FORBID_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select',
  'applet', 'base', 'frame', 'frameset',
];

/** Strict allowlist sanitization (e.g. compose preview). */
export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ALLOWED_TAGS: EMAIL_ALLOWED_TAGS,
    ALLOWED_ATTR: EMAIL_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: EMAIL_FORBID_TAGS,
    ADD_ATTR: ['target'],
  });
}

/**
 * Minimal sanitization for inbound HTML email bodies.
 * Preserves marketing/newsletter layout (styles, tables) — display is sandboxed in the UI.
 */
export function stripDangerousHtml(html: string): string {
  let out = html;
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  out = out.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  out = out.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  out = out.replace(/<embed\b[^>]*>/gi, '');
  out = out.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  out = out.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(
    /\b(href|src|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi,
    '$1=""',
  );
  return out.trim();
}

export function prepareEmailHtml(rawHtml: string): string {
  const stripped = stripDangerousHtml(rawHtml);
  if (stripped) return stripped;

  const sanitized = sanitizeHtml(rawHtml);
  return sanitized.trim();
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isEffectivelyEmptyHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return true;
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\s+/g, '')
    .trim();
  return text.length === 0;
}

export function hasRenderableHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;
  if (!isEffectivelyEmptyHtml(html)) return true;
  if (/<img[\s>]/i.test(html)) return true;
  if (/<table[\s>]/i.test(html)) return true;
  if (/<style[\s>]/i.test(html)) return true;
  return html.replace(/\s/g, '').length > 80;
}

export function wrapEmailDocument(html: string): string {
  const trimmed = html.trim();
  if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    if (!/<base[\s>]/i.test(trimmed)) {
      return trimmed.replace(
        /<head([^>]*)>/i,
        '<head$1><base target="_blank" rel="noopener noreferrer">',
      );
    }
    return trimmed;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank" rel="noopener noreferrer">
  <style>body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }</style>
</head>
<body>${html}</body>
</html>`;
}

export function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
