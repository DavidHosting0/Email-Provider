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
  ChevronDown,
  AtSign,
  Globe,
  Users,
  Mail,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const folders = [
  { key: 'inbox', label: 'Inbox', icon: Inbox, suffix: '/inbox' },
  { key: 'sent', label: 'Sent', icon: Send, suffix: '/sent' },
  { key: 'trash', label: 'Trash', icon: Trash2, suffix: '/trash' },
] as const;

const settingsLinks = [
  { href: '/settings/mailboxes', label: 'Email addresses', icon: AtSign },
  { href: '/settings/domains', label: 'Domain & DNS', icon: Globe },
  { href: '/settings/users', label: 'Team access', icon: Users },
] as const;

function mailboxInitials(address: string) {
  const local = address.split('@')[0] ?? '?';
  return local.slice(0, 2).toUpperCase();
}

export function MailShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    retry: false,
  });

  const { data: mailboxes = [] } = useQuery({
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeMailboxId = pathname.match(/\/mail\/([^/]+)/)?.[1];
  const activeMailbox = mailboxes.find((m) => m.id === activeMailboxId) ?? mailboxes[0];
  const domainName = domains[0]?.name ?? activeMailbox?.domain.name ?? 'Mail';
  const isSettings = pathname.startsWith('/settings');
  const isCompose = pathname.includes('/compose');
  const activeFolder = folders.find((f) => pathname.endsWith(f.suffix))?.key ?? 'inbox';
  const isAdmin = user?.role === 'org_admin';

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      api.clearTokens();
      router.push('/login');
    }
  }

  return (
    <div className="flex h-screen bg-[#f4f6f8]">
      {/* Sidebar */}
      <aside className="flex w-[272px] shrink-0 flex-col border-r border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 shadow-sm">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Thrill Seekers</p>
              <p className="truncate text-xs text-slate-500">{domainName}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <Link
            href={activeMailbox ? `/mail/${activeMailbox.id}/compose` : '/mail'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            <PenSquare className="h-4 w-4" />
            Compose
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Mailboxes
          </p>
          <div className="space-y-1">
            {mailboxes.map((mb) => {
              const isActive = mb.id === activeMailbox?.id && !isSettings;
              return (
                <div key={mb.id}>
                  <Link
                    href={`/mail/${mb.id}/inbox`}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition',
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200 text-slate-600',
                      )}
                    >
                      {mailboxInitials(mb.address)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {mb.displayName ?? mb.address.split('@')[0]}
                      </p>
                      <p className="truncate text-xs text-slate-500">{mb.address}</p>
                    </div>
                  </Link>

                  {isActive && (
                    <nav className="mb-2 ml-3 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                      {folders.map((folder) => {
                        const href = `/mail/${mb.id}${folder.suffix}`;
                        const active = !isCompose && pathname === href;
                        return (
                          <Link
                            key={folder.key}
                            href={href}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition',
                              active
                                ? 'bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                            )}
                          >
                            <folder.icon className="h-4 w-4" />
                            {folder.label}
                          </Link>
                        );
                      })}
                    </nav>
                  )}
                </div>
              );
            })}
          </div>

          {mailboxes.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-slate-400">No mailboxes yet</p>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-slate-200/80 bg-white px-5">
          {isAdmin && (
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  setUserMenuOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isSettings || settingsOpen
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
                <ChevronDown className={cn('h-3.5 w-3.5 transition', settingsOpen && 'rotate-180')} />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Administration
                  </p>
                  {settingsLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSettingsOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50',
                        pathname === link.href && 'bg-slate-50 font-medium text-slate-900',
                      )}
                    >
                      <link.icon className="h-4 w-4 text-slate-400" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setSettingsOpen(false);
              }}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
                {(user?.email?.[0] ?? '?').toUpperCase()}
              </div>
              <span className="hidden max-w-[140px] truncate text-sm text-slate-700 sm:block">
                {user?.email}
              </span>
              <ChevronDown className={cn('hidden h-3.5 w-3.5 text-slate-400 sm:block', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-slate-900">{user?.name ?? 'User'}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
