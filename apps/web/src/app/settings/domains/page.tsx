'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MailShell } from '@/components/mail-shell';
import { SettingsLayout } from '@/components/settings-layout';
import { api } from '@/lib/api';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const fieldClass =
  'rounded-lg border border-mail-border bg-mail-elevated px-4 py-2 text-sm text-mail-text focus:border-brand-500 focus:outline-none';

export default function DomainsPage() {
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.getDomains(),
  });

  const { data: dnsInstructions } = useQuery({
    queryKey: ['dns', selectedId],
    queryFn: () => api.getDnsInstructions(selectedId!),
    enabled: !!selectedId,
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.createDomain(newDomain);
      setNewDomain('');
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this domain and all its mailboxes?')) return;
    await api.deleteDomain(id);
    queryClient.invalidateQueries({ queryKey: ['domains'] });
    if (selectedId === id) setSelectedId(null);
  }

  function copyValue(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <MailShell>
      <SettingsLayout
        title="Domain & DNS"
        description="Domain verification and DNS records for Amazon SES"
      >
        <form onSubmit={handleAdd} className="mb-6 flex gap-3">
          <input
            type="text"
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className={cn('flex-1', fieldClass)}
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            <Plus className="h-4 w-4" /> Add Domain
          </button>
        </form>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            {domains.map((d) => (
              <div
                key={d.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-4 py-3',
                  selectedId === d.id
                    ? 'border-brand-500/50 bg-brand-600/10'
                    : 'border-mail-border bg-mail-panel',
                )}
              >
                <button onClick={() => setSelectedId(d.id)} className="flex-1 text-left">
                  <span className="font-medium text-mail-text">{d.name}</span>
                  <span className="ml-2 text-xs text-mail-muted">{d._count.mailboxes} mailboxes</span>
                </button>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      d.verificationStatus === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400',
                    )}
                  >
                    {d.verificationStatus}
                  </span>
                  <button onClick={() => handleDelete(d.id)} className="text-mail-muted hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {dnsInstructions && (
            <div className="rounded-xl border border-mail-border bg-mail-panel p-5">
              <h2 className="mb-4 font-semibold text-mail-text">
                DNS Records for {dnsInstructions.domain}
              </h2>
              <div className="space-y-4">
                {dnsInstructions.records.map((record, i) => (
                  <div key={i} className="rounded-lg bg-mail-elevated p-3">
                    <p className="mb-1 text-xs font-medium text-mail-muted">{record.purpose}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-brand-400">{record.type}</span>
                      <span className="truncate font-mono text-mail-text">{record.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-mail-bg px-2 py-1 text-xs text-mail-muted">
                        {record.value}
                      </code>
                      <button
                        onClick={() => copyValue(record.value, `${i}`)}
                        className="text-mail-muted hover:text-mail-text"
                      >
                        {copied === `${i}` ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-mail-muted">
                Webhook URL: {dnsInstructions.webhookUrl}
              </p>
            </div>
          )}
        </div>
      </SettingsLayout>
    </MailShell>
  );
}
