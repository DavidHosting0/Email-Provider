'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

export default function MailboxesPage() {
  const queryClient = useQueryClient();
  const [domainId, setDomainId] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.getDomains(),
  });

  const { data: mailboxes = [] } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api.getMailboxes(),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.createMailbox({ domainId, localPart, displayName: displayName || undefined });
      setLocalPart('');
      setDisplayName('');
      queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mailbox');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this mailbox?')) return;
    await api.deleteMailbox(id);
    queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
  }

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="mb-6 text-lg font-semibold">Mailboxes</h1>

        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <select
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select domain</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="local-part (e.g. info)"
              value={localPart}
              onChange={(e) => setLocalPart(e.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </form>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Address</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Display Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mailboxes.map((mb) => (
                <tr key={mb.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium">{mb.address}</td>
                  <td className="px-4 py-3 text-gray-500">{mb.displayName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${mb.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {mb.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(mb.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
