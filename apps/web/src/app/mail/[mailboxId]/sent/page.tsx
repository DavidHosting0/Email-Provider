'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { formatDate, truncate } from '@/lib/utils';

export default function SentPage() {
  const params = useParams();
  const mailboxId = params.mailboxId as string;

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['sent', mailboxId],
    queryFn: () => api.getSent(mailboxId),
  });

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="mb-4 text-lg font-semibold">Sent</h1>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-gray-500">No sent messages</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">To</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">{email.toAddrs.join(', ')}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{email.subject}</div>
                      <div className="text-xs text-gray-400">{truncate(email.bodyText, 60)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          email.status === 'sent'
                            ? 'bg-green-100 text-green-700'
                            : email.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {email.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(email.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
