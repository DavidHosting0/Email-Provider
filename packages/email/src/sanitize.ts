import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'div', 'span',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'pre', 'code', 'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
