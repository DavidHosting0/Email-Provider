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

export function isEffectivelyEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\s+/g, '')
    .trim();
  return text.length === 0;
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
