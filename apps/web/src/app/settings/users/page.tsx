'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

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

  const { data: mailboxes = [] } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api.getMailboxes(),
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

  async function handleAssignMailboxes(userId: string) {
    const current = users.find((u) => u.id === userId);
    const currentIds = current?.mailboxAccess.map((a) => a.mailboxId) ?? [];
    const selected = prompt(
      `Enter mailbox IDs to assign (comma-separated):\nAvailable: ${mailboxes.map((m) => `${m.address}=${m.id}`).join(', ')}`,
      currentIds.join(','),
    );
    if (selected === null) return;
    const mailboxIds = selected.split(',').map((s) => s.trim()).filter(Boolean);
    await api.assignMailboxes(userId, mailboxIds);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="mb-6 text-lg font-semibold">Users</h1>

        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-5">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="user">User</option>
              <option value="org_admin">Org Admin</option>
            </select>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </form>

        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-xs text-gray-400">
                  {user.name ?? 'No name'} · {user.role} · {user.mailboxAccess.length} mailboxes
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user.role === 'user' && (
                  <button
                    onClick={() => handleAssignMailboxes(user.id)}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    Assign Mailboxes
                  </button>
                )}
                <button onClick={() => handleDelete(user.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
