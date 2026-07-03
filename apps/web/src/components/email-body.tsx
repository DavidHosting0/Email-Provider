'use client';

import { useEffect, useMemo, useRef } from 'react';

function isEffectivelyEmptyHtml(html: string | null | undefined): boolean {
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

function hasRenderableHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;
  if (!isEffectivelyEmptyHtml(html)) return true;
  if (/<img[\s>]/i.test(html)) return true;
  if (/<table[\s>]/i.test(html)) return true;
  if (/<style[\s>]/i.test(html)) return true;
  return html.replace(/\s/g, '').length > 80;
}

function buildEmailSrcDoc(html: string): string {
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

interface EmailBodyProps {
  html: string | null;
  text: string | null;
  className?: string;
}

export function EmailBody({ html, text, className }: EmailBodyProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const showHtml = hasRenderableHtml(html);
  const srcDoc = useMemo(
    () => (showHtml && html ? buildEmailSrcDoc(html) : null),
    [html, showHtml],
  );

  useEffect(() => {
    if (!srcDoc || !iframeRef.current) return;

    const iframe = iframeRef.current;

    const resize = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const height = Math.max(
        doc.body?.scrollHeight ?? 0,
        doc.documentElement?.scrollHeight ?? 0,
      );
      iframe.style.height = `${height + 8}px`;
    };

    const handleLoad = () => {
      resize();
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      const observer = new ResizeObserver(resize);
      observer.observe(doc.body);
      (iframe as HTMLIFrameElement & { _observer?: ResizeObserver })._observer = observer;
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      const observer = (iframe as HTMLIFrameElement & { _observer?: ResizeObserver })._observer;
      observer?.disconnect();
    };
  }, [srcDoc]);

  if (showHtml && srcDoc) {
    return (
      <div className={className}>
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-same-origin"
          title="Email content"
          className="w-full rounded-lg border border-mail-border/40 bg-white"
          style={{ minHeight: 120 }}
        />
      </div>
    );
  }

  if (text?.trim()) {
    return (
      <pre
        className={`whitespace-pre-wrap font-sans text-sm leading-relaxed text-mail-text/90 ${className ?? ''}`}
      >
        {text}
      </pre>
    );
  }

  return <p className={`text-sm italic text-mail-muted ${className ?? ''}`}>No content</p>;
}
