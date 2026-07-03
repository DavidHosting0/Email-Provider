import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'MailPlatform',
  description: 'Self-hosted multi-tenant webmail',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-mail-bg text-mail-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
