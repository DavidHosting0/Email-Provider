'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { formatDate, truncate, cn } from '@/lib/utils';
import { useState } from 'react';

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const mailboxId = params.mailboxId as string;
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['inbox', mailboxId],
    queryFn: () => api.getInbox(mailboxId),
  });

  const { data: thread } = useQuery({
    queryKey: ['thread', selectedThread],
    queryFn: () => api.getThread(selectedThread!),
    enabled: !!selectedThread,
  });

  return (
    <AppShell>
      <div className="flex h-full">
        <div className="w-96 shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
          {isLoading ? (
            <p className="p-4 text-sm text-gray-500">Loading...</p>
          ) : threads.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No messages in inbox</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThread(t.id)}
                className={cn(
                  'w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50',
                  selectedThread === t.id && 'bg-brand-50',
                  t.unread && 'font-semibold',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm">{t.preview?.fromAddr ?? 'Unknown'}</span>
                  <span className="ml-2 shrink-0 text-xs text-gray-400">{formatDate(t.lastMessageAt)}</span>
                </div>
                <p className="truncate text-sm text-gray-700">{t.subject}</p>
                <p className="truncate text-xs text-gray-400">{truncate(t.preview?.bodyText)}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-6">
          {!selectedThread ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Select a conversation
            </div>
          ) : thread ? (
            <div>
              <h2 className="mb-6 text-xl font-semibold">{thread.subject}</h2>
              {thread.inboxEmails.map((email) => (
                <div key={email.id} className="mb-6 rounded-lg border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{email.fromAddr}</span>
                      <span className="ml-2 text-gray-400">to {email.toAddrs.join(', ')}</span>
                    </div>
                    <span className="text-gray-400">{formatDate(email.receivedAt)}</span>
                  </div>
                  {email.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">{email.bodyText}</pre>
                  )}
                  <button
                    onClick={() => router.push(`/mail/${mailboxId}/compose?replyTo=${email.id}&threadId=${thread.id}`)}
                    className="mt-3 text-sm text-brand-600 hover:underline"
                  >
                    Reply
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading thread...</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
