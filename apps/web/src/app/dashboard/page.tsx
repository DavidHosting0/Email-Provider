'use client';

import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { Globe, Mail, Users, Inbox } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: org } = useQuery({ queryKey: ['org'], queryFn: () => api.getOrg() });
  const { data: mailboxes = [] } = useQuery({ queryKey: ['mailboxes'], queryFn: () => api.getMailboxes() });
  const { data: domains = [] } = useQuery({ queryKey: ['domains'], queryFn: () => api.getDomains() });

  const stats = [
    { label: 'Domains', value: org?._count.domains ?? 0, icon: Globe, href: '/settings/domains' },
    { label: 'Mailboxes', value: mailboxes.length, icon: Mail, href: '/settings/mailboxes' },
    { label: 'Users', value: org?._count.users ?? 0, icon: Users, href: '/settings/users' },
  ];

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mb-8 text-gray-500">Welcome to {org?.name ?? 'your organization'}</p>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Mailboxes</h2>
            {mailboxes.length === 0 ? (
              <p className="text-sm text-gray-500">No mailboxes yet. Create one in Settings.</p>
            ) : (
              <ul className="space-y-2">
                {mailboxes.map((mb) => (
                  <li key={mb.id}>
                    <Link
                      href={`/mail/${mb.id}/inbox`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50"
                    >
                      <Inbox className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">{mb.address}</span>
                      {!mb.isEnabled && (
                        <span className="ml-auto text-xs text-red-500">Disabled</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Domains</h2>
            {domains.length === 0 ? (
              <p className="text-sm text-gray-500">No domains configured yet.</p>
            ) : (
              <ul className="space-y-2">
                {domains.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg px-3 py-2">
                    <span className="text-sm font-medium">{d.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.verificationStatus === 'verified'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {d.verificationStatus}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
