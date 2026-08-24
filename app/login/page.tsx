'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, AlertCircle, ArrowRight, Sparkles, Zap, ShieldCheck, Mail, Globe, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/Logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed. Check your credentials.');
        setIsLoading(false);
        return;
      }
      router.push(redirectPath);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-white/40 space-y-6">
      <div className="text-center sm:text-left space-y-1">
        <h3 className="text-xl font-bold text-slate-900">Welcome Back</h3>
        <p className="text-xs text-slate-500">Sign in to your Businiche workspace</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleLogin}>
        <Input
          label="Username"
          id="username"
          type="text"
          required
          autoComplete="username"
          placeholder="your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
        />
        <Input
          label="Password"
          id="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
        />
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full shadow-md hover:shadow-lg transition-all"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Platform
          </Button>
        </div>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-blue-600 hover:underline">
            Create Free Account (1,000 Credits)
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Lighting & Mesh Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[30rem] h-[30rem] bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Logo size="lg" variant="white" showText={true} />
        <Link href="/signup">
          <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
            Sign Up
          </Button>
        </Link>
      </header>

      {/* Main Showcase Hero Section */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Architectural Showcase & USPs */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Next-Gen B2B Lead Intelligence &amp; Web Enrichment</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Turn Local Business Data into High-Converting Outreach.
            </h1>
            <p className="text-base text-slate-400 max-w-2xl leading-relaxed">
              Businiche automates B2B lead generation, web contact scraping (emails, de-obfuscation &amp; phone numbers), and personalized SMTP outreach with built-in credit security.
            </p>
          </div>

          {/* Core USPs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-all backdrop-blur-md space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Google Places Discovery</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Discover verified businesses by niche and location with 1-click database saving.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-all backdrop-blur-md space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">AI Web Contact Scraper</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                De-obfuscate emails <span className="font-mono text-blue-300">[at]/[dot]</span> &amp; extract phone numbers automatically.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-all backdrop-blur-md space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">High-Deliverability Outreach</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hostinger SMTP outreach with plain-text fallback &amp; anti-spam headers.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-all backdrop-blur-md space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">1,000 Monthly Credits</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Secure credit engine with 30-day auto-resets &amp; Razorpay credit top-ups.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: High-Conversion Login Form */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <Suspense fallback={<div className="bg-white/95 p-8 rounded-3xl animate-pulse h-80" />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} Rigteq Software. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a href="https://razorpay.me/@rigteq" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Pricing &amp; Refills</a>
          <span>•</span>
          <a href="mailto:ops@rigteq.com" className="hover:text-blue-400 transition-colors">ops@rigteq.com</a>
        </div>
      </footer>
    </div>
  );
}
