'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Mail,
  Star,
  CheckCircle2,
  TrendingUp,
  Building,
  Bot,
} from 'lucide-react';
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
    <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-blue-100 space-y-6">
      <div className="text-center sm:text-left space-y-1">
        <h3 className="text-xl font-bold text-blue-950">Welcome Back</h3>
        <p className="text-xs text-slate-500">Sign in to your Businiche Lead Automation Suite</p>
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
            Create Account (10,000 Free Weekly Credits)
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f0f6ff] text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Radial Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[30rem] h-[30rem] bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Logo size="lg" variant="light" showText={true} />
        <Link href="/signup">
          <Button variant="primary" size="sm">
            Get Started Free
          </Button>
        </Link>
      </header>

      {/* Main Hero & Content Section */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Result-Based Value & Case Studies */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Result-Based B2B Lead Intelligence &amp; Campaign Autopilot</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black text-blue-950 tracking-tight leading-tight">
              Turn Local Business Data into Qualified Pipeline on Autopilot.
            </h1>
            <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
              Businiche combines Google Places multi-page lead generation, AI web contact scraping, and automated matrix email campaigns with 10,000 free weekly credits.
            </p>
          </div>

          {/* Core USPs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-blue-100 shadow-xs space-y-1.5">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h4 className="text-xs font-bold text-blue-950">10,000 Weekly Credits</h4>
              <p className="text-[11px] text-slate-500">Free credit refresh every 7 days for all users.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-blue-100 shadow-xs space-y-1.5">
              <Bot className="w-5 h-5 text-blue-600" />
              <h4 className="text-xs font-bold text-blue-950">Campaign Automation</h4>
              <p className="text-[11px] text-slate-500">Multi-keyword x Multi-city automated outreach.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-blue-100 shadow-xs space-y-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h4 className="text-xs font-bold text-blue-950">Strict Contact Filter</h4>
              <p className="text-[11px] text-slate-500">Only valid phone numbers and Emails.</p>
            </div>
          </div>

          {/* 2 Short Case Studies */}
          <div className="space-y-3 pt-4 border-t border-blue-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Proven Case Studies &amp; Results
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-blue-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">Aura Digital Media</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    +$24k Revenue
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Discovered 480 verified software agency leads across 5 cities. Closed 4 high-ticket retainer clients in 3 weeks using Businiche Campaign Autopilot.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-blue-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">Nexus Cloud Solutions</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                    94% Email Delivery
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Replaced 3 fragmented scraping tools with 1-click Google Places discovery and email de-obfuscation, reducing lead acquisition cost by 85%.
                </p>
              </div>
            </div>
          </div>

          {/* 5-Star Reviews */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
              <span className="text-xs font-bold text-white ml-2">4.9 / 5.0 Rating by 1,200+ Growth Teams</span>
            </div>
            <p className="text-xs text-blue-100 italic leading-relaxed">
              &quot;Businiche paid for itself on day 1. The 10,000 weekly credits and campaign autopilot are a game changer for B2B outreach!&quot;
            </p>
            <div className="flex items-center justify-between text-[11px] text-blue-300 font-semibold pt-1 border-t border-white/10">
              <span>— Marcus Vance, Founder at Apex Sales</span>
              <span>Verified Customer Review</span>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <Suspense fallback={<div className="bg-white p-8 rounded-3xl animate-pulse h-80" />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 border-t border-blue-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} Rigteq Software. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a href="https://razorpay.me/@rigteq" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Pricing &amp; Refills</a>
          <span>•</span>
          <a href="mailto:ops@rigteq.com" className="hover:text-blue-600 transition-colors">ops@rigteq.com</a>
        </div>
      </footer>
    </div>
  );
}
