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
        <div className="border-b border-gray-100 px-6 py-4">
          <h1 className="text-sm font-semibold text-gray-800">Sent</h1>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Send className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No sent messages</p>
          </div>
        ) : (
          <ul>
            {emails.map((email) => (
              <li
                key={email.id}
                className="flex items-center gap-4 border-b border-gray-50 px-6 py-3 hover:bg-[#f2f6fc]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-800">
                      To: {email.toAddrs.join(', ')}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                        email.status === 'sent' && 'bg-green-100 text-green-700',
                        email.status === 'failed' && 'bg-red-100 text-red-700',
                        email.status !== 'sent' && email.status !== 'failed' && 'bg-yellow-100 text-yellow-700',
                      )}
                    >
                      {email.status}
                    </span>
                  </div>
                  <p className="truncate text-sm text-gray-700">{email.subject}</p>
                  <p className="truncate text-xs text-gray-400">{truncate(email.bodyText, 80)}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{formatDate(email.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MailShell>
  );
}
