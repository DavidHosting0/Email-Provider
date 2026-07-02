'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { Send } from 'lucide-react';

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
    <AppShell>
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-lg font-semibold">Compose</h1>

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Email queued for delivery. Redirecting...
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSend} className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <input
              type="text"
              placeholder="To (comma-separated)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="w-full text-sm focus:outline-none"
            />
          </div>
          <div className="border-b border-gray-100 px-4 py-3">
            <input
              type="text"
              placeholder="Cc (optional)"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="w-full text-sm focus:outline-none"
            />
          </div>
          <div className="border-b border-gray-100 px-4 py-3">
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full text-sm font-medium focus:outline-none"
            />
          </div>
          <textarea
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full resize-none px-4 py-3 text-sm focus:outline-none"
          />
          <div className="flex justify-end border-t border-gray-100 px-4 py-3">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
