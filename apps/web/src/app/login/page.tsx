'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login(email, password);
      api.setTokens(result.accessToken, result.refreshToken);
      router.push('/mail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mail-bg px-4">
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="w-full max-w-sm rounded-2xl border border-mail-border bg-mail-panel p-6 shadow-xl"
      >
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <input
          type="text"
          inputMode="email"
          name="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore
          className="mb-3 w-full rounded-xl border border-mail-border bg-mail-elevated px-4 py-2.5 text-sm text-mail-text transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="Email"
        />

        <input
          type="password"
          name="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore
          className="mb-4 w-full rounded-xl border border-mail-border bg-mail-elevated px-4 py-2.5 text-sm text-mail-text transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="Password"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
