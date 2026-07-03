import { simpleParser } from 'mailparser';
import { parseRawEmail } from './dist/mime-parser.js';

const attachmentOnlyForward = `From: sender@gmail.com
To: inbox@example.com
Subject: Fwd: Uber receipt
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="outer"

--outer
Content-Type: message/rfc822

From: uber@uber.com
To: user@gmail.com
Subject: Your Tuesday trip
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="inner"

--inner
Content-Type: text/plain; charset=UTF-8

Your trip total was EUR 12.50

--inner
Content-Type: text/html; charset=UTF-8

<html><body><table><tr><td><p>Your trip total was <b>EUR 12.50</b></p></td></tr></table></body></html>

--inner--
--outer--
`;

const parsed = await parseRawEmail(Buffer.from(attachmentOnlyForward));
console.log('ATTACHMENT ONLY', JSON.stringify({
  bodyTextLen: parsed.bodyText?.length ?? 0,
  bodyHtmlLen: parsed.bodyHtml?.length ?? 0,
  bodyText: parsed.bodyText,
  bodyHtml: parsed.bodyHtml,
}, null, 2));

const direct = await simpleParser(attachmentOnlyForward);
console.log('DIRECT', {
  hasHtml: !!direct.html,
  hasText: !!direct.text,
  attachments: direct.attachments?.map(a => ({ type: a.contentType, size: a.size })),
});
