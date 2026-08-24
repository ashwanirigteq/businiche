'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users as UsersIcon,
  Search,
  UserPlus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  User as UserIcon,
  UserCheck,
  Zap,
  Edit2,
  Trash2,
  KeyRound,
  Coins,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TableSkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { UserRole } from '@/lib/types';

interface UserItem {
  id: string;
  full_name: string;
  username: string;
  role_name: UserRole;
  credits: number;
  created_on: string;
}

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<{ fullName: string; username: string; role: UserRole } | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add User Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('User');
  const [newCredits, setNewCredits] = useState('1000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('User');
  const [editPassword, setEditPassword] = useState('');
  const [editCredits, setEditCredits] = useState('1000');

  // Delete Confirm Modal
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newFullName.trim() || !newUsername.trim() || !newPassword) {
      setModalError('All fields are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
          credits: parseInt(newCredits, 10) || 1000,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setNewFullName('');
      setNewUsername('');
      setNewPassword('');
      setIsAddModalOpen(false);
      setSuccessMessage(`User @${data.user.username} created.`);
      fetchUsers();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          fullName: editFullName.trim(),
          role: editRole,
          password: editPassword.trim() || undefined,
          credits: parseInt(editCredits, 10) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setEditingUser(null);
      setSuccessMessage(`Updated account @${editingUser.username}.`);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users?userId=${deletingUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      setDeletingUser(null);
      setSuccessMessage(`User @${deletingUser.username} deleted.`);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u: UserItem) => {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditRole(u.role_name);
    setEditPassword('');
    setEditCredits(String(u.credits ?? 1000));
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="min-h-screen bg-[#f0f6ff] flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
              <Badge variant="slate" size="sm">Admin</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage accounts, reset passwords, adjust credit balances, and assign roles.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => { setModalError(null); setIsAddModalOpen(true); }}
          >
            Add User
          </Button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="font-semibold underline cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers}>Retry</Button>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-blue-100 text-sm text-slate-900 bg-blue-50/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-blue-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-blue-50/80 text-xs uppercase font-bold text-blue-500 border-b border-blue-100 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Credits</th>
                  <th className="px-6 py-3.5">Joined</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {isLoading ? (
                  <TableSkeletonRows rows={3} cols={5} />
                ) : users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold uppercase">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div>{u.full_name}</div>
                            <div className="text-xs text-blue-400 font-mono">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={u.role_name === 'Admin' ? 'slate' : 'primary'} size="sm">
                          {u.role_name}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {u.role_name === 'Admin' ? '∞' : u.credits.toLocaleString()}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                        {formatDate(u.created_on)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(u)} title="Edit / Reset Password / Add Credits">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {currentUser?.username !== u.username && (
                          <Button variant="danger" size="sm" onClick={() => setDeletingUser(u)} title="Delete user">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create User">
        {modalError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {modalError}
          </div>
        )}
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="Full Name" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
          <Input label="Username" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          <Input label="Password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full py-2.5 px-3 rounded-lg border border-blue-100 text-sm bg-white"
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <Input label="Initial Monthly Credits" type="number" value={newCredits} onChange={(e) => setNewCredits(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal isOpen={Boolean(editingUser)} onClose={() => setEditingUser(null)} title={`Edit @${editingUser.username}`}>
          <form onSubmit={handleSaveEditUser} className="space-y-4">
            <Input label="Full Name" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full py-2.5 px-3 rounded-lg border border-blue-100 text-sm bg-white"
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <Input
              label="Reset Password (optional)"
              type="password"
              placeholder="Leave blank to keep current"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              leftIcon={<KeyRound className="w-4 h-4" />}
            />
            <Input
              label="Credit Balance"
              type="number"
              value={editCredits}
              onChange={(e) => setEditCredits(e.target.value)}
              leftIcon={<Coins className="w-4 h-4" />}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>Save</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deletingUser && (
        <Modal isOpen={Boolean(deletingUser)} onClose={() => setDeletingUser(null)} title="Delete Account">
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete user <strong>@{deletingUser.username}</strong> ({deletingUser.full_name})?
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="md" className="flex-1" onClick={() => setDeletingUser(null)}>Cancel</Button>
              <Button variant="danger" size="md" className="flex-1" onClick={handleDeleteUser} isLoading={isSubmitting}>Delete</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
