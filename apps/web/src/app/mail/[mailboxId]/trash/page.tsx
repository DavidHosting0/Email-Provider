'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MailShell } from '@/components/mail-shell';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface TrashEmail {
  id: string;
  fromAddr: string;
  subject: string;
  receivedAt: string;
}

export default function TrashPage() {
  const params = useParams();
  const mailboxId = params.mailboxId as string;

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['trash', mailboxId],
    queryFn: () => api.getTrash(mailboxId) as Promise<TrashEmail[]>,
  });

  return (
    <MailShell>
      <div className="h-full overflow-y-auto bg-mail-panel">
        <div className="border-b border-mail-border px-8 py-5">
          <h1 className="text-base font-semibold text-mail-text">Trash</h1>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-mail-muted">Loading...</p>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mail-elevated">
              <Trash2 className="h-7 w-7 text-mail-muted" />
            </div>
            <p className="text-sm font-medium text-mail-text">Trash is empty</p>
          </div>
        ) : (
          <ul>
            {emails.map((email) => (
              <li
                key={email.id}
                className="border-b border-mail-border/50 px-8 py-4 transition hover:bg-mail-elevated/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-mail-text">{email.fromAddr}</span>
                  <span className="text-xs text-mail-muted">{formatDate(email.receivedAt)}</span>
                </div>
                <p className="text-sm text-mail-muted">{email.subject}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MailShell>
  );
}
