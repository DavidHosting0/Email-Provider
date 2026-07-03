'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MailShell } from '@/components/mail-shell';
import { api } from '@/lib/api';
import { Send, X } from 'lucide-react';
import Link from 'next/link';

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
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h1 className="text-sm font-semibold text-gray-800">New message</h1>
          <Link
            href={`/mail/${mailboxId}/inbox`}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        <form onSubmit={handleSend} className="flex flex-1 flex-col">
          {success && (
            <div className="mx-4 mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Message queued. Redirecting to Sent...
            </div>
          )}
          {error && (
            <div className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="border-b border-gray-100 px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-8 shrink-0 text-gray-500">To</span>
              <input
                type="text"
                placeholder="recipient@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                className="min-w-0 flex-1 py-2 focus:outline-none"
              />
            </div>
          </div>
          <div className="border-b border-gray-100 px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-8 shrink-0 text-gray-500">Cc</span>
              <input
                type="text"
                placeholder="Optional"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="min-w-0 flex-1 py-2 focus:outline-none"
              />
            </div>
          </div>
          <div className="border-b border-gray-100 px-4 py-2">
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full py-2 text-sm focus:outline-none"
            />
          </div>
          <textarea
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[200px] flex-1 resize-none px-4 py-4 text-sm leading-relaxed focus:outline-none"
          />
          <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
            <Link
              href={`/mail/${mailboxId}/inbox`}
              className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Discard
            </Link>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-2 text-sm font-medium text-white hover:bg-[#1765cc] disabled:opacity-50"
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
