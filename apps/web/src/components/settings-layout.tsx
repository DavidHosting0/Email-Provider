'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ArrowLeft, AtSign, Globe, Users } from 'lucide-react';

const settingsNav = [
  { href: '/settings/mailboxes', label: 'Email addresses', icon: AtSign },
  { href: '/settings/domains', label: 'Domain & DNS', icon: Globe },
  { href: '/settings/users', label: 'Team access', icon: Users },
] as const;

export function SettingsLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-mail-bg">
      <div className="border-b border-mail-border bg-mail-surface px-6 py-5">
        <Link
          href="/mail"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-mail-muted transition hover:text-brand-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to mail
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-mail-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-mail-muted">{description}</p>}
        <nav className="mt-5 flex gap-1 overflow-x-auto">
          {settingsNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                    : 'text-mail-muted hover:bg-mail-panel hover:text-mail-text',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
