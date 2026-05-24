import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AdminGate from '@/components/manager/AdminGate';
import {
  banAdminUser,
  deleteAdminUser,
  getAdminUsers,
  unbanAdminUser,
  updateAdminUser,
  type AdminUser,
} from '@/lib/api/adminManagement';
import { useAuthStore } from '@/lib/store';

export default function ManagerUsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editVerified, setEditVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await getAdminUsers({ q: query || undefined, status: status || undefined, take: 100 }));
    } catch {
      setError('Could not load users.');
    } finally {
      setIsLoading(false);
    }
  }, [query, status, user?.role]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function runAction(action: () => Promise<unknown>, message: string) {
    if (!window.confirm(message)) return;
    setError(null);
    try {
      await action();
      await loadUsers();
    } catch {
      setError('Action failed. Make sure your admin session is still valid.');
    }
  }

  function startEdit(item: AdminUser) {
    setEditing(item);
    setEditName(item.displayName ?? '');
    setEditVerified(item.emailVerified);
  }

  async function saveEdit() {
    if (!editing) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateAdminUser(editing.id, {
        displayName: editName.trim(),
        displayNameSet: true,
        emailVerified: editVerified,
      });
      setEditing(null);
      await loadUsers();
    } catch {
      setError('Could not save changes. Make sure your admin session is still valid.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Layout title="Manage Users">
      <AdminGate>
        <div className="py-8">
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Managers</p>
              <h1 className="mt-2 text-3xl font-semibold text-gray-950">Users</h1>
              <p className="mt-2 text-sm text-gray-600">Ban, unban, or deactivate user accounts.</p>
            </div>
            <Link href="/manager/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">
              Back to dashboard
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search email or name"
              className="h-10 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="deactivated">Deactivated</option>
            </select>
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400"
            >
              {isLoading ? 'Loading' : 'Search'}
            </button>
          </div>

          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Verified</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-950">{item.displayName || item.email}</div>
                        <div className="text-xs text-gray-500">{item.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.role}</td>
                      <td className="px-4 py-3 text-gray-700">{item.status}</td>
                      <td className="px-4 py-3 text-gray-700">{item.isSeller ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-gray-700">{item.emailVerified ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="rounded-md border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          {item.status === 'blocked' ? (
                            <button
                              type="button"
                              onClick={() => runAction(() => unbanAdminUser(item.id), `Unban ${item.email}?`)}
                              className="rounded-md border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => runAction(() => banAdminUser(item.id), `Ban ${item.email}?`)}
                              className="rounded-md border border-amber-200 px-3 py-1.5 font-semibold text-amber-700 hover:bg-amber-50"
                            >
                              Ban
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => runAction(() => deleteAdminUser(item.id), `Deactivate ${item.email}?`)}
                            className="rounded-md border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-950">Edit user</h2>
              <p className="mt-1 text-xs text-gray-500">{editing.email}</p>

              <label className="mt-4 block text-sm font-medium text-gray-700">Display name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Display name"
                className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              />

              <label className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={editVerified}
                  onChange={e => setEditVerified(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Email verified
              </label>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={isSaving}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminGate>
    </Layout>
  );
}
