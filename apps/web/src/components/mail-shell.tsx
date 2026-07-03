'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Inbox,
  Send,
  Trash2,
  PenSquare,
  Settings,
  LogOut,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const folders = [
  { key: 'inbox', label: 'Inbox', icon: Inbox, suffix: '/inbox' },
  { key: 'sent', label: 'Sent', icon: Send, suffix: '/sent' },
  { key: 'trash', label: 'Trash', icon: Trash2, suffix: '/trash' },
] as const;

export function MailShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    retry: false,
  });

  const { data: mailboxes = [], refetch: refetchMailboxes } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api.getMailboxes(),
  });

  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.getDomains(),
  });

  useEffect(() => {
    if (!api.isAuthenticated) {
      router.replace('/login');
    }
  }, [router]);

  const activeMailboxId = pathname.match(/\/mail\/([^/]+)/)?.[1];
  const activeMailbox = mailboxes.find((m) => m.id === activeMailboxId) ?? mailboxes[0];
  const domainName = domains[0]?.name ?? activeMailbox?.domain.name ?? 'Mail';

  const activeFolder = folders.find((f) => pathname.endsWith(f.suffix))?.key ?? 'inbox';
  const isCompose = pathname.includes('/compose');
  const isSettings = pathname.startsWith('/settings');

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      api.clearTokens();
      router.push('/login');
    }
  }

  function switchMailbox(id: string) {
    setSwitcherOpen(false);
    const folder = folders.find((f) => f.key === activeFolder) ?? folders[0];
    router.push(`/mail/${id}${folder.suffix}`);
  }

  return (
    <div className="flex h-screen flex-col bg-[#f6f8fc]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <Link href="/mail" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {domainName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">Mail</p>
            <p className="text-xs text-gray-500">{domainName}</p>
          </div>
        </Link>

        <div className="mx-auto hidden max-w-xl flex-1 md:block">
          <input
            type="search"
            placeholder="Search mail"
            className="w-full rounded-full border border-gray-200 bg-[#f1f3f4] px-4 py-2 text-sm text-gray-700 placeholder:text-gray-500 focus:border-brand-400 focus:bg-white focus:outline-none"
            disabled
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => refetchMailboxes()}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {user?.role === 'org_admin' && (
            <Link
              href="/settings/mailboxes"
              className={cn(
                'rounded-full p-2 hover:bg-gray-100',
                isSettings ? 'bg-gray-100 text-brand-700' : 'text-gray-500',
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
          <span className="hidden text-xs text-gray-500 sm:inline">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white p-3 md:w-60">
          <Link
            href={activeMailbox ? `/mail/${activeMailbox.id}/compose` : '/mail'}
            className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-[#e8f0fe] px-4 py-3 text-sm font-medium text-[#1a73e8] shadow-sm transition hover:bg-[#d2e3fc] hover:shadow"
          >
            <PenSquare className="h-4 w-4" />
            Compose
          </Link>

          {mailboxes.length > 1 && (
            <div className="relative mb-3">
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-xs hover:bg-gray-50"
              >
                <span className="truncate font-medium">{activeMailbox?.address ?? 'Mailbox'}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
              {switcherOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {mailboxes.map((mb) => (
                    <button
                      key={mb.id}
                      onClick={() => switchMailbox(mb.id)}
                      className="block w-full truncate px-3 py-2 text-left text-xs hover:bg-gray-50"
                    >
                      {mb.address}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMailbox && (
            <nav className="space-y-0.5">
              {folders.map((folder) => {
                const href = `/mail/${activeMailbox.id}${folder.suffix}`;
                const active = !isCompose && pathname === href;
                return (
                  <Link
                    key={folder.key}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-r-full rounded-l-lg px-4 py-2 text-sm font-medium transition',
                      active
                        ? 'bg-[#d3e3fd] text-[#001d35] font-semibold'
                        : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    <folder.icon className="h-4 w-4" />
                    {folder.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {mailboxes.length === 1 && activeMailbox && (
            <p className="mt-4 truncate px-2 text-xs text-gray-400">{activeMailbox.address}</p>
          )}

          {user?.role === 'org_admin' && (
            <div className="mt-auto border-t border-gray-100 pt-3">
              <Link
                href="/settings/mailboxes"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
              >
                <Settings className="h-3.5 w-3.5" />
                Manage addresses
              </Link>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
