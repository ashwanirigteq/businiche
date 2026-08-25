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
  Building,
  Mail,
  Key,
  Server,
  AlertTriangle,
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
  companyName?: string;
  email?: string;
  emailPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  customPlacesApiKey?: string;
  created_on: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [editFullName, setEditFullName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('Demo');
  const [editEmail, setEditEmail] = useState('');
  const [editEmailPassword, setEditEmailPassword] = useState('');
  const [editSmtpHost, setEditSmtpHost] = useState('');
  const [editSmtpPort, setEditSmtpPort] = useState('465');
  const [editCustomPlacesApiKey, setEditCustomPlacesApiKey] = useState('');
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
        const u = data.user;
        setProfile({
          id: u.id,
          fullName: u.fullName,
          username: u.username,
          role: u.role,
          companyName: u.companyName || 'Demo',
          email: u.email || '',
          emailPassword: u.emailPassword || '',
          smtpHost: u.smtpHost || '',
          smtpPort: u.smtpPort || 465,
          customPlacesApiKey: u.customPlacesApiKey || '',
          created_on: u.created_on,
        });
        setEditFullName(u.fullName || '');
        setEditCompanyName(u.companyName || 'Demo');
        setEditEmail(u.email || '');
        setEditEmailPassword(u.emailPassword || '');
        setEditSmtpHost(u.smtpHost || 'smtp.hostinger.com');
        setEditSmtpPort(String(u.smtpPort || 465));
        setEditCustomPlacesApiKey(u.customPlacesApiKey || '');
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
      const body: Record<string, string | number> = {
        fullName: editFullName.trim(),
        companyName: editCompanyName.trim() || 'Demo',
        email: editEmail.trim(),
        emailPassword: editEmailPassword.trim(),
        smtpHost: editSmtpHost.trim(),
        smtpPort: parseInt(editSmtpPort, 10) || 465,
        customPlacesApiKey: editCustomPlacesApiKey.trim(),
      };
      if (editPassword) body.password = editPassword;

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: editFullName.trim(),
              companyName: editCompanyName.trim() || 'Demo',
              email: editEmail.trim(),
              emailPassword: editEmailPassword.trim(),
              smtpHost: editSmtpHost.trim(),
              smtpPort: parseInt(editSmtpPort, 10) || 465,
              customPlacesApiKey: editCustomPlacesApiKey.trim(),
            }
          : prev
      );
      setEditPassword('');
      setEditConfirmPass('');
      setIsEditing(false);
      setSuccess('Profile and SMTP integration settings updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const initials =
    profile?.fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '';

  return (
    <div className="min-h-screen bg-[#f0f6ff] flex flex-col">
      {profile && (
        <Navbar user={{ fullName: profile.fullName, username: profile.username, role: profile.role }} />
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <p className="text-blue-200 text-sm mt-0.5">
                    @{profile.username} · {profile.companyName || 'Demo'}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      profile.role === 'Admin'
                        ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                        : 'bg-white/10 text-blue-100 border border-white/20'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Info Grid - In-Place Editable */}
            <div className="p-6 space-y-6">
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">Editing Profile &amp; Integration Settings</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Modify fields directly below and click Save Profile.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" type="button" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                        Save Profile
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      leftIcon={<User className="w-4 h-4" />}
                      required
                    />
                    <Input
                      label="Company Name"
                      placeholder="e.g. Acme Corp"
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      leftIcon={<Building className="w-4 h-4" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Outreach Sender Email"
                      type="email"
                      placeholder="sales@yourcompany.com"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      leftIcon={<Mail className="w-4 h-4" />}
                    />
                    <Input
                      label="SMTP / App Password"
                      type="password"
                      placeholder="Custom SMTP / App Password"
                      value={editEmailPassword}
                      onChange={(e) => setEditEmailPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="SMTP Host URL"
                      placeholder="smtp.hostinger.com"
                      value={editSmtpHost}
                      onChange={(e) => setEditSmtpHost(e.target.value)}
                      leftIcon={<Server className="w-4 h-4" />}
                    />
                    <Input
                      label="SMTP Port"
                      type="number"
                      placeholder="465"
                      value={editSmtpPort}
                      onChange={(e) => setEditSmtpPort(e.target.value)}
                      leftIcon={<Server className="w-4 h-4" />}
                    />
                  </div>

                  <Input
                    label="Places API (New) Key (Optional)"
                    type="password"
                    placeholder="AIzaSy..."
                    value={editCustomPlacesApiKey}
                    onChange={(e) => setEditCustomPlacesApiKey(e.target.value)}
                    leftIcon={<Key className="w-4 h-4" />}
                  />

                  <div className="pt-3 border-t border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Change Account Password</h4>
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
                        label="Confirm New Password"
                        type="password"
                        placeholder="Repeat new password"
                        value={editConfirmPass}
                        onChange={(e) => setEditConfirmPass(e.target.value)}
                        leftIcon={<Lock className="w-4 h-4" />}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button variant="outline" size="sm" type="button" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                      Save Profile &amp; Settings
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                        <User className="w-3.5 h-3.5" />
                        Full Name
                      </div>
                      <p className="text-sm font-semibold text-blue-950">{profile.fullName}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                        <Building className="w-3.5 h-3.5" />
                        Company Name
                      </div>
                      <p className="text-sm font-semibold text-blue-950">{profile.companyName || 'Demo'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                        <Mail className="w-3.5 h-3.5" />
                        Sender Email
                      </div>
                      <div className="text-sm font-semibold text-blue-950 truncate font-mono">
                        {profile.email ? (
                          profile.email
                        ) : (
                          <span className="text-amber-800 bg-amber-50/90 px-2 py-0.5 rounded border border-amber-200 font-sans text-xs font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Not set — Email outreach will not work
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                        <Server className="w-3.5 h-3.5" />
                        SMTP Host &amp; Port
                      </div>
                      <div className="text-sm font-semibold text-blue-950 truncate font-mono">
                        {profile.smtpHost ? (
                          `${profile.smtpHost}:${profile.smtpPort || 465}`
                        ) : (
                          <span className="text-amber-800 bg-amber-50/90 px-2 py-0.5 rounded border border-amber-200 font-sans text-xs font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Not set — Email outreach will not work
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 sm:col-span-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                        <Key className="w-3.5 h-3.5" />
                        Places API (New) Key
                      </div>
                      <div className="text-sm font-semibold text-blue-950 truncate font-mono">
                        {profile.customPlacesApiKey ? (
                          '••••••••••••••••'
                        ) : (
                          <span className="text-amber-800 bg-amber-50/90 px-2 py-0.5 rounded border border-amber-200 font-sans text-xs font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Not set — Lead generation will not work
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setError(null);
                        setSuccess(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Profile &amp; Credentials</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
