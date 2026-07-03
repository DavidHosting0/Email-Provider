'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MailShell } from '@/components/mail-shell';
import { api } from '@/lib/api';
import { formatDate, truncate, cn } from '@/lib/utils';
import { Send } from 'lucide-react';

export default function SentPage() {
  const params = useParams();
  const mailboxId = params.mailboxId as string;

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['sent', mailboxId],
    queryFn: () => api.getSent(mailboxId),
  });

  return (
    <MailShell>
      <div className="h-full overflow-y-auto bg-white">
        <div className="border-b border-slate-100 px-8 py-5">
          <h1 className="text-base font-semibold text-slate-900">Sent</h1>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading...</p>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Send className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-700">No sent messages</p>
            <p className="mt-1 text-xs text-slate-400">Messages you send will appear here</p>
          </div>
        ) : (
          <ul>
            {emails.map((email) => (
              <li
                key={email.id}
                className="flex items-center gap-4 border-b border-slate-50 px-8 py-4 transition hover:bg-slate-50/80"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">
                      To: {email.toAddrs.join(', ')}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        email.status === 'sent' && 'bg-emerald-100 text-emerald-700',
                        email.status === 'failed' && 'bg-red-100 text-red-700',
                        email.status !== 'sent' && email.status !== 'failed' && 'bg-amber-100 text-amber-700',
                      )}
                    >
                      {email.status}
                    </span>
                  </div>
                  <p className="truncate text-sm text-slate-700">{email.subject}</p>
                  <p className="truncate text-xs text-slate-400">{truncate(email.bodyText, 80)}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(email.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MailShell>
  );
}
