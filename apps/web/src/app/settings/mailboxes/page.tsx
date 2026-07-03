'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MailShell } from '@/components/mail-shell';
import { SettingsLayout } from '@/components/settings-layout';
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

  useEffect(() => {
    if (domains.length === 1 && !domainId) {
      setDomainId(domains[0].id);
    }
  }, [domains, domainId]);

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
    <MailShell>
      <SettingsLayout
        title="Email addresses"
        description="Create and manage addresses for your domain"
      >
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-mail-border bg-mail-panel p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <select
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
              required
              className="rounded-lg border border-mail-border bg-mail-elevated px-3 py-2 text-sm text-mail-text"
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
              className="rounded-lg border border-mail-border bg-mail-elevated px-3 py-2 text-sm text-mail-text"
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-lg border border-mail-border bg-mail-elevated px-3 py-2 text-sm text-mail-text"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </form>

        <div className="overflow-hidden rounded-2xl border border-mail-border bg-mail-panel">
          <table className="w-full text-sm">
            <thead className="border-b border-mail-border bg-mail-elevated">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-mail-muted">Address</th>
                <th className="px-4 py-3 text-left font-medium text-mail-muted">Display Name</th>
                <th className="px-4 py-3 text-left font-medium text-mail-muted">Status</th>
                <th className="px-4 py-3 text-right font-medium text-mail-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mailboxes.map((mb) => (
                <tr key={mb.id} className="border-b border-mail-border/50">
                  <td className="px-4 py-3 font-medium text-mail-text">{mb.address}</td>
                  <td className="px-4 py-3 text-mail-muted">{mb.displayName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${mb.isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {mb.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(mb.id)} className="text-mail-muted hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsLayout>
    </MailShell>
  );
}
