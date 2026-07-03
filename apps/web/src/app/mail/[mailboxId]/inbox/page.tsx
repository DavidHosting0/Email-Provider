'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MailShell } from '@/components/mail-shell';
import { api } from '@/lib/api';
import { formatDate, truncate, cn } from '@/lib/utils';
import { useState } from 'react';
import { Inbox, Reply } from 'lucide-react';

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const mailboxId = params.mailboxId as string;
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  const { data: threads = [], isLoading, refetch } = useQuery({
    queryKey: ['inbox', mailboxId],
    queryFn: () => api.getInbox(mailboxId),
  });

  const { data: thread } = useQuery({
    queryKey: ['thread', selectedThread],
    queryFn: () => api.getThread(selectedThread!),
    enabled: !!selectedThread,
  });

  return (
    <MailShell>
      <div className="flex h-full">
        <div className="w-full max-w-md shrink-0 overflow-y-auto border-r border-gray-200 bg-white md:w-80 lg:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h1 className="text-sm font-semibold text-gray-800">Inbox</h1>
            <button onClick={() => refetch()} className="text-xs text-brand-600 hover:underline">
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading messages...</p>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Inbox className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">No messages yet</p>
              <p className="mt-1 text-xs text-gray-400">Incoming mail will appear here</p>
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThread(t.id)}
                className={cn(
                  'w-full border-b border-gray-50 px-4 py-3 text-left transition hover:bg-[#f2f6fc]',
                  selectedThread === t.id && 'bg-[#d3e3fd]',
                  t.unread && 'border-l-4 border-l-brand-600',
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn('truncate text-sm', t.unread ? 'font-semibold text-gray-900' : 'text-gray-800')}>
                    {t.preview?.fromAddr ?? 'Unknown'}
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400">{formatDate(t.lastMessageAt)}</span>
                </div>
                <p className={cn('truncate text-sm', t.unread ? 'font-medium text-gray-800' : 'text-gray-600')}>
                  {t.subject}
                </p>
                <p className="truncate text-xs text-gray-400">{truncate(t.preview?.bodyText, 70)}</p>
              </button>
            ))
          )}
        </div>

        <div className="hidden flex-1 overflow-y-auto bg-white md:block">
          {!selectedThread ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-400">
              <Inbox className="mb-3 h-12 w-12 text-gray-200" />
              <p className="text-sm">Select a message to read</p>
            </div>
          ) : thread ? (
            <div className="p-6">
              <h2 className="mb-6 border-b border-gray-100 pb-4 text-xl font-normal text-gray-900">
                {thread.subject}
              </h2>
              {thread.inboxEmails.map((email) => (
                <div key={email.id} className="mb-8">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{email.fromAddr}</p>
                      <p className="text-xs text-gray-500">to {email.toAddrs.join(', ')}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{formatDate(email.receivedAt)}</span>
                  </div>
                  {email.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                      {email.bodyText}
                    </pre>
                  )}
                  <button
                    onClick={() =>
                      router.push(`/mail/${mailboxId}/compose?threadId=${thread.id}`)
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Reply className="h-4 w-4" />
                    Reply
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          )}
        </div>
      </div>
    </MailShell>
  );
}
