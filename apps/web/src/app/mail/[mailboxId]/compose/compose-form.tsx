'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MailShell } from '@/components/mail-shell';
import { api } from '@/lib/api';
import { Send, X } from 'lucide-react';
import Link from 'next/link';

const inputClass =
  'min-w-0 flex-1 border-0 bg-transparent py-1.5 text-mail-text placeholder:text-mail-muted focus:outline-none focus:ring-0';

export default function ComposeForm() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mailboxId = params.mailboxId as string;
  const threadId = searchParams.get('threadId') ?? undefined;

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      const toAddrs = to.split(',').map((s) => s.trim()).filter(Boolean);
      const ccAddrs = cc ? cc.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

      await api.sendEmail(mailboxId, {
        to: toAddrs,
        cc: ccAddrs,
        subject,
        bodyText: body,
        threadId,
      });

      setSuccess(true);
      setTimeout(() => router.push(`/mail/${mailboxId}/sent`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <MailShell>
      <div className="mx-auto flex h-full max-w-3xl flex-col bg-mail-panel">
        <div className="flex items-center justify-between border-b border-mail-border px-8 py-5">
          <h1 className="text-base font-semibold text-mail-text">New message</h1>
          <Link
            href={`/mail/${mailboxId}/inbox`}
            className="rounded-lg p-2 text-mail-muted transition hover:bg-mail-elevated hover:text-mail-text"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        <form onSubmit={handleSend} className="flex flex-1 flex-col">
          {success && (
            <div className="mx-8 mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              Message queued. Redirecting to Sent...
            </div>
          )}
          {error && (
            <div className="mx-8 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="border-b border-mail-border px-8 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="w-10 shrink-0 font-medium text-mail-muted">To</span>
              <input
                type="text"
                placeholder="recipient@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>
          <div className="border-b border-mail-border px-8 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="w-10 shrink-0 font-medium text-mail-muted">Cc</span>
              <input
                type="text"
                placeholder="Optional"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="border-b border-mail-border px-8 py-3">
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className={`w-full text-sm ${inputClass}`}
            />
          </div>
          <textarea
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[280px] flex-1 resize-none border-0 bg-transparent px-8 py-6 text-sm leading-relaxed text-mail-text placeholder:text-mail-muted focus:outline-none"
          />
          <div className="flex justify-end gap-3 border-t border-mail-border px-8 py-4">
            <Link
              href={`/mail/${mailboxId}/inbox`}
              className="rounded-lg px-4 py-2 text-sm font-medium text-mail-muted transition hover:bg-mail-elevated hover:text-mail-text"
            >
              Discard
            </Link>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </MailShell>
  );
}
