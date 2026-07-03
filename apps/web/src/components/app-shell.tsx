'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Mail, Inbox, Send, Trash2, PenSquare, LayoutDashboard,
  Globe, Users, LogOut, ChevronDown,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings/domains', label: 'Domains', icon: Globe },
  { href: '/settings/mailboxes', label: 'Mailboxes', icon: Mail },
  { href: '/settings/users', label: 'Users', icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mailboxOpen, setMailboxOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    retry: false,
  });

  const { data: mailboxes = [] } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api.getMailboxes(),
  });

  useEffect(() => {
    if (!api.isAuthenticated) {
      router.replace('/login');
    }
  }, [router]);

  const activeMailboxId = pathname.match(/\/mail\/([^/]+)/)?.[1];
  const activeMailbox = mailboxes.find((m) => m.id === activeMailboxId);

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      api.clearTokens();
      router.push('/login');
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-mail-bg">
      <aside className="flex w-[var(--sidebar-width)] flex-col border-r border-mail-border bg-mail-surface">
        <div className="flex items-center gap-2 border-b border-mail-border px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-mail-text">MailPlatform</p>
            <p className="truncate text-xs text-mail-muted">{user?.organizationName}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                pathname.startsWith(item.href)
                  ? 'bg-mail-elevated font-medium text-brand-400'
                  : 'text-mail-muted hover:bg-mail-panel hover:text-mail-text',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          <div className="my-4 border-t border-mail-border pt-4">
            <button
              onClick={() => setMailboxOpen(!mailboxOpen)}
              className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider text-mail-muted"
            >
              Mailboxes
              <ChevronDown className={cn('h-3 w-3 transition', mailboxOpen && 'rotate-180')} />
            </button>

            {mailboxOpen && mailboxes.map((mb) => (
              <div key={mb.id} className="mt-1">
                <p className="truncate px-3 py-1 text-xs font-medium text-mail-muted">{mb.address}</p>
                <Link
                  href={`/mail/${mb.id}/inbox`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm',
                    pathname === `/mail/${mb.id}/inbox` ? 'bg-mail-elevated text-brand-400' : 'text-mail-muted hover:bg-mail-panel hover:text-mail-text',
                  )}
                >
                  <Inbox className="h-3.5 w-3.5" /> Inbox
                </Link>
                <Link
                  href={`/mail/${mb.id}/sent`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm',
                    pathname === `/mail/${mb.id}/sent` ? 'bg-mail-elevated text-brand-400' : 'text-mail-muted hover:bg-mail-panel hover:text-mail-text',
                  )}
                >
                  <Send className="h-3.5 w-3.5" /> Sent
                </Link>
                <Link
                  href={`/mail/${mb.id}/trash`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm',
                    pathname === `/mail/${mb.id}/trash` ? 'bg-mail-elevated text-brand-400' : 'text-mail-muted hover:bg-mail-panel hover:text-mail-text',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Trash
                </Link>
                <Link
                  href={`/mail/${mb.id}/compose`}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-mail-muted hover:bg-mail-panel hover:text-mail-text"
                >
                  <PenSquare className="h-3.5 w-3.5" /> Compose
                </Link>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-mail-border p-3">
          <div className="mb-2 truncate px-3 text-xs text-mail-muted">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-mail-muted hover:bg-mail-panel hover:text-mail-text"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        {activeMailbox && (
          <header className="flex items-center justify-between border-b border-mail-border bg-mail-surface px-6 py-3">
            <h2 className="text-sm font-medium text-mail-text">{activeMailbox.address}</h2>
            <Link
              href={`/mail/${activeMailbox.id}/compose`}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              <PenSquare className="h-4 w-4" /> Compose
            </Link>
          </header>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
