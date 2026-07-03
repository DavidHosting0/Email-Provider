'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MailShell } from '@/components/mail-shell';
import { api } from '@/lib/api';
import { formatDate, truncate, cn } from '@/lib/utils';
import { useState } from 'react';
import { Inbox, Reply, RefreshCw } from 'lucide-react';

function senderInitials(from: string) {
  const name = from.split('@')[0] ?? '?';
  return name.slice(0, 1).toUpperCase();
}

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const mailboxId = params.mailboxId as string;
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  const { data: threads = [], isLoading, refetch, isFetching } = useQuery({
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
        <div className="flex w-full max-w-md shrink-0 flex-col border-r border-mail-border bg-mail-surface md:w-96">
          <div className="flex items-center justify-between border-b border-mail-border px-5 py-4">
            <h1 className="text-base font-semibold text-mail-text">Inbox</h1>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg p-2 text-mail-muted transition hover:bg-mail-panel hover:text-brand-400 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-6 text-sm text-mail-muted">Loading messages...</p>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mail-panel">
                  <Inbox className="h-7 w-7 text-mail-muted" />
                </div>
                <p className="text-sm font-medium text-mail-text">All caught up</p>
                <p className="mt-1 text-xs text-mail-muted">New messages will appear here</p>
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThread(t.id)}
                  className={cn(
                    'w-full border-b border-mail-border/50 px-5 py-4 text-left transition hover:bg-mail-panel/60',
                    selectedThread === t.id && 'bg-mail-panel',
                    t.unread && 'border-l-[3px] border-l-brand-500',
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        t.unread
                          ? 'bg-brand-600/20 text-brand-400'
                          : 'bg-mail-elevated text-mail-muted',
                      )}
                    >
                      {senderInitials(t.preview?.fromAddr ?? '?')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-sm',
                            t.unread ? 'font-semibold text-mail-text' : 'font-medium text-mail-muted',
                          )}
                        >
                          {t.preview?.fromAddr ?? 'Unknown'}
                        </span>
                        <span className="shrink-0 text-[11px] text-mail-muted">
                          {formatDate(t.lastMessageAt)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'truncate text-sm',
                          t.unread ? 'font-medium text-mail-text' : 'text-mail-muted',
                        )}
                      >
                        {t.subject}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-mail-muted/80">
                        {truncate(t.preview?.bodyText, 70)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="hidden flex-1 flex-col overflow-hidden bg-mail-panel md:flex">
          {!selectedThread ? (
            <div className="flex h-full flex-col items-center justify-center text-mail-muted">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-mail-elevated">
                <Inbox className="h-8 w-8 text-mail-border" />
              </div>
              <p className="text-sm font-medium text-mail-text">Select a message</p>
              <p className="mt-1 text-xs text-mail-muted">Choose a conversation from your inbox</p>
            </div>
          ) : thread ? (
            <>
              <div className="border-b border-mail-border px-8 py-5">
                <h2 className="text-lg font-semibold text-mail-text">{thread.subject}</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {thread.inboxEmails.map((email) => (
                  <div key={email.id} className="mb-10 last:mb-0">
                    <div className="mb-5 flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mail-elevated text-sm font-semibold text-brand-400">
                        {senderInitials(email.fromAddr)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-mail-text">{email.fromAddr}</p>
                            {email.toAddrs.length > 0 && (
                              <p className="mt-0.5 text-xs text-mail-muted">
                                to {email.toAddrs.join(', ')}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-mail-muted">
                            {formatDate(email.receivedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {email.bodyHtml ? (
                      <div
                        className="prose prose-sm prose-invert max-w-none pl-14 text-mail-text"
                        dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap pl-14 font-sans text-sm leading-relaxed text-mail-text/90">
                        {email.bodyText}
                      </pre>
                    )}
                    <div className="pl-14">
                      <button
                        onClick={() =>
                          router.push(`/mail/${mailboxId}/compose?threadId=${thread.id}`)
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-mail-border bg-mail-elevated px-4 py-2 text-sm font-medium text-mail-text transition hover:border-brand-500/50 hover:text-brand-400"
                      >
                        <Reply className="h-4 w-4" />
                        Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="p-6 text-sm text-mail-muted">Loading...</p>
          )}
        </div>
      </div>
    </MailShell>
  );
}
