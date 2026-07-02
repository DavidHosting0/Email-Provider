'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

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
    <AppShell>
      <div className="p-6">
        <h1 className="mb-4 text-lg font-semibold">Trash</h1>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-gray-500">Trash is empty</p>
        ) : (
          <div className="space-y-2">
            {emails.map((email) => (
              <div key={email.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{email.fromAddr}</span>
                  <span className="text-xs text-gray-400">{formatDate(email.receivedAt)}</span>
                </div>
                <p className="text-sm text-gray-700">{email.subject}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
