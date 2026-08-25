'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Mail,
  KeyRound,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/Logo';

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('Demo');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    setError(null);
    setOtpMessage(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP code.');

      setIsOtpSent(true);
      setOtpMessage(`Verification code sent from ops@rigteq.com to ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otpCode: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP code.');

      setIsOtpVerified(true);
      setOtpMessage('Email address verified successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isOtpVerified) {
      setError('Please verify your email address with the 6-digit OTP code before proceeding.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          companyName: companyName.trim() || 'Demo',
          password,
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed. Please try again.');
        setIsLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('A network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size="xl" variant="white" showText={false} />
        </div>
        <h2 className="mt-4 text-center text-3xl font-bold text-white tracking-tight">
          Create Account
        </h2>
        <p className="mt-1 text-center text-sm text-blue-200">
          Get 10,000 Free Weekly Credits &amp; Campaign Automation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-blue-100 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {otpMessage && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{otpMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSignup}>
            <Input
              label="Full Name"
              id="fullName"
              type="text"
              required
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<UserCheck className="w-4 h-4" />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Username"
                id="username"
                type="text"
                required
                autoComplete="username"
                placeholder="e.g. johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />
              <Input
                label="Company Name"
                id="companyName"
                type="text"
                placeholder="Demo"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                leftIcon={<Building className="w-4 h-4" />}
              />
            </div>

            {/* Email + OTP Row */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (OTP Verification)
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isOtpVerified}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
                {!isOtpVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendOtp}
                    isLoading={isSendingOtp}
                    className="shrink-0"
                  >
                    {isOtpSent ? 'Resend OTP' : 'Send OTP'}
                  </Button>
                )}
              </div>
            </div>

            {/* OTP Code Verification Input */}
            {isOtpSent && !isOtpVerified && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                <label className="block text-xs font-bold text-blue-900">
                  Enter 6-Digit OTP Code (Sent from ops@rigteq.com)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-36 px-3 py-1.5 rounded-lg border border-blue-300 text-base font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleVerifyOtp}
                    leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                  >
                    Verify OTP
                  </Button>
                </div>
              </div>
            )}

            <Input
              label="Password"
              id="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                disabled={!isOtpVerified}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {isOtpVerified ? 'Complete Signup' : 'Verify OTP To Continue'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-slate-900 hover:underline">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
