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
      <div className="h-full overflow-y-auto bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h1 className="text-sm font-semibold text-gray-800">Trash</h1>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trash2 className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Trash is empty</p>
          </div>
        ) : (
          <ul>
            {emails.map((email) => (
              <li
                key={email.id}
                className="border-b border-gray-50 px-6 py-3 hover:bg-[#f2f6fc]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{email.fromAddr}</span>
                  <span className="text-xs text-gray-400">{formatDate(email.receivedAt)}</span>
                </div>
                <p className="text-sm text-gray-600">{email.subject}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MailShell>
  );
}
