'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MailShell } from '@/components/mail-shell';
import { SettingsLayout } from '@/components/settings-layout';
import { api } from '@/lib/api';
import { Plus, Trash2, Copy, Check } from 'lucide-react';

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
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add Domain
          </button>
        </form>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            {domains.map((d) => (
              <div
                key={d.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  selectedId === d.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white'
                }`}
              >
                <button onClick={() => setSelectedId(d.id)} className="flex-1 text-left">
                  <span className="font-medium">{d.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{d._count.mailboxes} mailboxes</span>
                </button>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      d.verificationStatus === 'verified'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {d.verificationStatus}
                  </span>
                  <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {dnsInstructions && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 font-semibold">DNS Records for {dnsInstructions.domain}</h2>
              <div className="space-y-4">
                {dnsInstructions.records.map((record, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-1 text-xs font-medium text-gray-500">{record.purpose}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-brand-600">{record.type}</span>
                      <span className="truncate font-mono">{record.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs">{record.value}</code>
                      <button
                        onClick={() => copyValue(record.value, `${i}`)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {copied === `${i}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Webhook URL: {dnsInstructions.webhookUrl}
              </p>
            </div>
          )}
        </div>
      </SettingsLayout>
    </MailShell>
  );
}
