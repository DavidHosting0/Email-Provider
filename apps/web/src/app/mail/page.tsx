'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function MailHomePage() {
  const router = useRouter();

  const { data: mailboxes = [], isLoading } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api.getMailboxes(),
    enabled: api.isAuthenticated,
  });

  useEffect(() => {
    if (!api.isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isLoading) {
      if (mailboxes.length > 0) {
        router.replace(`/mail/${mailboxes[0].id}/inbox`);
      } else {
        router.replace('/settings/mailboxes');
      }
    }
  }, [isLoading, mailboxes, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-mail-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );
}
