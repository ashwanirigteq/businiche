'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Calendar,
  Shield,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  AtSign,
  Lock,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import type { UserRole } from '@/lib/types';

interface ProfileUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  created_on: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPass, setEditConfirmPass] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error('Unauthenticated');
        return r.json();
      })
      .then((data) => {
        setProfile({
          id: data.user.id,
          fullName: data.user.fullName,
          username: data.user.username,
          role: data.user.role,
          created_on: data.user.created_on,
        });
        setEditFullName(data.user.fullName);
      })
      .catch(() => router.push('/login'))
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!editFullName.trim() || editFullName.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (editPassword && editPassword !== editConfirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const body: Record<string, string> = { fullName: editFullName.trim() };
      if (editPassword) body.password = editPassword;

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setProfile((prev) => prev ? { ...prev, fullName: editFullName.trim() } : prev);
      setEditPassword('');
      setEditConfirmPass('');
      setIsEditing(false);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return d; }
  };

  const initials = profile?.fullName
    .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '';

  return (
    <div className="min-h-screen bg-[#f0f6ff] flex flex-col">
      {profile && (
        <Navbar user={{ fullName: profile.fullName, username: profile.username, role: profile.role }} />
      )}

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Success / Error alerts */}
        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-8 space-y-6 animate-pulse">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : profile ? (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border-2 border-white/40 flex items-center justify-center text-2xl font-bold text-white">
                  {initials}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{profile.fullName}</h1>
                  <p className="text-blue-200 text-sm mt-0.5">@{profile.username}</p>
                  <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    profile.role === 'Admin'
                      ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                      : 'bg-white/10 text-blue-100 border border-white/20'
                  }`}>
                    <Shield className="w-3 h-3" />
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1.5">
                    <AtSign className="w-3.5 h-3.5" />
                    Username
                  </div>
                  <p className="text-sm font-semibold text-blue-900 font-mono">@{profile.username}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Member Since
                  </div>
                  <p className="text-sm font-semibold text-blue-900">{formatDate(profile.created_on)}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1.5">
                    <User className="w-3.5 h-3.5" />
                    Full Name
                  </div>
                  <p className="text-sm font-semibold text-blue-900">{profile.fullName}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Role
                  </div>
                  <p className="text-sm font-semibold text-blue-900">{profile.role}</p>
                </div>
              </div>

              {/* Edit toggle */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { setIsEditing(!isEditing); setError(null); setSuccess(null); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition-colors cursor-pointer"
                >
                  {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {/* Edit Form */}
              {isEditing && (
                <form onSubmit={handleSave} className="p-5 rounded-xl bg-slate-50 border border-blue-100 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">Edit Profile</h3>
                  <Input
                    label="Full Name"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    leftIcon={<User className="w-4 h-4" />}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="Repeat new password"
                      value={editConfirmPass}
                      onChange={(e) => setEditConfirmPass(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" type="button" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      isLoading={isSaving}
                      leftIcon={<Save className="w-3.5 h-3.5" />}
                    >
                      Save
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
