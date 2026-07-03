'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MailShell } from '@/components/mail-shell';
import { SettingsLayout } from '@/components/settings-layout';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

const fieldClass =
  'rounded-lg border border-mail-border bg-mail-elevated px-3 py-2 text-sm text-mail-text';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.createUser({ email, password, role, name: name || undefined });
      setEmail('');
      setPassword('');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return;
    await api.deleteUser(id);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }

  return (
    <MailShell>
      <SettingsLayout title="Team access" description="Manage who can sign in to your organization">
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-mail-border bg-mail-panel p-5">
          <div className="grid gap-3 sm:grid-cols-5">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={fieldClass}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={fieldClass}
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={fieldClass}
            >
              <option value="user">User</option>
              <option value="org_admin">Org Admin</option>
            </select>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </form>

        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg border border-mail-border bg-mail-panel px-4 py-3"
            >
              <div>
                <p className="font-medium text-mail-text">{user.email}</p>
                <p className="text-xs text-mail-muted">
                  {user.name ?? 'No name'} · {user.role}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(user.id)} className="text-mail-muted hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </SettingsLayout>
    </MailShell>
  );
}
