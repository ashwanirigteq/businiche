'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  Sparkles,
  Building2,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  AlertTriangle,
  Zap,
  Bot,
  Mail,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { CreditsModal } from '@/components/CreditsModal';
import { SalesModal } from '@/components/SalesModal';
import type { UserRole } from '@/lib/types';

interface NavbarProps {
  user?: {
    fullName: string;
    username: string;
    role: UserRole;
    credits?: number;
    nextCreditDate?: string | null;
  };
}

export function Navbar({ user: initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [salesModalOpen, setSalesModalOpen] = useState(false);

  const [userInfo, setUserInfo] = useState<{
    fullName: string;
    username: string;
    role: UserRole;
  }>({
    fullName: initialUser?.fullName || 'User',
    username: initialUser?.username || 'user',
    role: initialUser?.role || 'User',
  });

  const [currentCredits, setCurrentCredits] = useState<number>(initialUser?.credits ?? 10000);
  const [nextCreditDate, setNextCreditDate] = useState<string | null>(initialUser?.nextCreditDate ?? null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdmin = userInfo.role === 'Admin';

  const refreshUserData = () => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          if (d.user.credits !== undefined) setCurrentCredits(d.user.credits);
          if (d.user.nextCreditDate !== undefined) setNextCreditDate(d.user.nextCreditDate);
          setUserInfo({
            fullName: d.user.fullName || 'User',
            username: d.user.username || 'user',
            role: d.user.role || 'User',
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshUserData();

    const handleCreditUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ remaining?: number; nextCreditDate?: string }>;
      if (customEvt.detail?.remaining !== undefined) {
        setCurrentCredits(customEvt.detail.remaining);
      }
      if (customEvt.detail?.nextCreditDate !== undefined) {
        setNextCreditDate(customEvt.detail.nextCreditDate);
      } else {
        refreshUserData();
      }
    };

    window.addEventListener('bn_credits_updated', handleCreditUpdate);
    return () => window.removeEventListener('bn_credits_updated', handleCreditUpdate);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const [leadsDropdownOpen, setLeadsDropdownOpen] = useState(false);
  const [campaignsDropdownOpen, setCampaignsDropdownOpen] = useState(false);

  const initials = (userInfo.fullName || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isInfinite = isAdmin || currentCredits === Infinity;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand + Nav */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <Logo size="md" variant="light" showText={true} />
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {/* Leads Dropdown */}
                <div
                  className="relative"
                  onMouseEnter={() => setLeadsDropdownOpen(true)}
                  onMouseLeave={() => setLeadsDropdownOpen(false)}
                >
                  <Link
                    href="/"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      pathname === '/'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 ${pathname === '/' ? 'text-white' : 'text-blue-400'}`} />
                    <span>Leads</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </Link>

                  {leadsDropdownOpen && (
                    <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl border border-blue-100 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1">
                      <Link
                        href="/"
                        className="block px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        All Leads
                      </Link>
                      <Link
                        href="/?filter=my_leads"
                        className="block px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        My Leads
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  href="/generate-leads"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/generate-leads'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${pathname === '/generate-leads' ? 'text-white' : 'text-blue-400'}`} />
                  <span>Generate</span>
                </Link>

                {/* Campaigns Dropdown */}
                <div
                  className="relative"
                  onMouseEnter={() => setCampaignsDropdownOpen(true)}
                  onMouseLeave={() => setCampaignsDropdownOpen(false)}
                >
                  <Link
                    href="/automate"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      pathname === '/automate'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <Bot className={`w-4 h-4 ${pathname === '/automate' ? 'text-white' : 'text-blue-400'}`} />
                    <span>Campaigns</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </Link>

                  {campaignsDropdownOpen && (
                    <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl border border-blue-100 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1">
                      <Link
                        href="/automate"
                        className="block px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        All Campaigns
                      </Link>
                      <Link
                        href="/automate?filter=my_campaigns"
                        className="block px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        My Campaigns
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  href="/mailbox"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/mailbox'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <Mail className={`w-4 h-4 ${pathname === '/mailbox' ? 'text-white' : 'text-blue-400'}`} />
                  <span>Mailbox</span>
                </Link>

                {isAdmin && (
                  <Link
                    href="/users"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      pathname === '/users'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>Users</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Right: Credits Pill + User Dropdown */}
            <div className="hidden md:flex items-center gap-3">
              {/* Credits Pill */}
              <button
                onClick={() => setCreditsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-xs font-bold text-blue-700 transition-colors cursor-pointer"
                title="Click to view credits rate sheet & top-up"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{isInfinite ? '∞ Credits' : `${currentCredits.toLocaleString()} Credits`}</span>
              </button>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50/60 hover:bg-blue-100 transition-colors cursor-pointer"
                  aria-label="User menu"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {initials}
                  </div>
                  <span className="text-sm font-semibold text-blue-900">{userInfo.fullName}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-blue-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-blue-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-blue-50 bg-blue-50/40">
                      <p className="text-xs font-bold text-blue-950">{userInfo.fullName}</p>
                      <p className="text-[11px] text-blue-600 mt-0.5 font-mono">
                        @{userInfo.username} · {userInfo.role}
                      </p>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setCreditsModalOpen(true);
                        }}
                        className="mt-2.5 w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                          Balance:
                        </span>
                        <span>{isInfinite ? '∞ Credits' : `${currentCredits.toLocaleString()} Cr`}</span>
                      </button>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <User className="w-4 h-4 text-blue-400" />
                        <span>Profile</span>
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setCreditsModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200"
              >
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{isInfinite ? '∞' : `${currentCredits}`}</span>
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 focus:outline-none"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-blue-100 bg-white px-4 pt-3 pb-4 space-y-3">
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium ${
                  pathname === '/' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>All Leads</span>
              </Link>

              <Link
                href="/?filter=my_leads"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50"
              >
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>My Leads</span>
              </Link>

              <Link
                href="/generate-leads"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium ${
                  pathname === '/generate-leads' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate</span>
              </Link>

              <Link
                href="/automate"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium ${
                  pathname === '/automate' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>All Campaigns</span>
              </Link>

              <Link
                href="/automate?filter=my_campaigns"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50"
              >
                <Bot className="w-4 h-4 text-blue-400" />
                <span>My Campaigns</span>
              </Link>

              <Link
                href="/mailbox"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium ${
                  pathname === '/mailbox' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Mailbox</span>
              </Link>

              {isAdmin && (
                <Link
                  href="/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium ${
                    pathname === '/users' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-blue-50 space-y-1">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-blue-50"
              >
                <User className="w-4 h-4 text-blue-400" />
                <span>Profile</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Credits Modal */}
      <CreditsModal
        isOpen={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        credits={currentCredits}
        role={userInfo.role}
        nextCreditDate={nextCreditDate}
        onOpenSalesModal={() => setSalesModalOpen(true)}
      />

      {/* Sales Modal */}
      <SalesModal
        isOpen={salesModalOpen}
        onClose={() => setSalesModalOpen(false)}
      />

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl p-6 max-w-sm w-full mx-auto animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Sign out?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You will need to log in again to access Businiche.
                </p>
              </div>
              <div className="flex gap-2.5 w-full">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
