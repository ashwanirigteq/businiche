'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Building2,
  Phone,
  Globe,
  MapPin,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Calendar,
  Layers,
  AlertCircle,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TableSkeletonRows, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Lead, UserRole } from '@/lib/types';

export default function DashboardPage() {
  const [user, setUser] = useState<{ fullName: string; username: string; role: UserRole } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [industries, setIndustries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Unauthenticated');
      })
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, []);

  // Fetch leads with search and filter parameters
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedIndustry) params.set('industry', selectedIndustry);
      if (selectedSource) params.set('source', selectedSource);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch leads');
      }

      setLeads(data.leads || []);
      setTotalLeads(data.total ?? (data.leads ? data.leads.length : 0));
      if (data.industries && data.industries.length > 0) {
        setIndustries(data.industries);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error loading leads';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedIndustry, selectedSource]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedIndustry('');
    setSelectedSource('');
  };

  const hasActiveFilters = Boolean(searchQuery || selectedIndustry || selectedSource);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {user && <Navbar user={user} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Business Leads
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Browse, filter, and manage discovered local business leads.
            </p>
          </div>

          {user?.role === 'Admin' && (
            <Link href="/generate-leads">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
              >
                Generate Leads
              </Button>
            </Link>
          )}
        </div>

        {/* Top Summary Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Discovered Leads
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {isLoading && leads.length === 0 ? '—' : totalLeads}
              </span>
              <span className="text-xs text-slate-500">leads stored</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Industries Represented
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {isLoading && industries.length === 0 ? '—' : industries.length}
              </span>
              <span className="text-xs text-slate-500">categories</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Filter Results
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Search className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {isLoading ? '—' : leads.length}
              </span>
              <span className="text-xs text-slate-500">matching leads</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search leads by company, location, industry, phone, or website..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Industry Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="Google Places">Google Places</option>
            </select>
          </div>

          {/* Reset / Refresh buttons */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="md"
                onClick={clearFilters}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={fetchLeads}
              isLoading={isLoading}
              title="Refresh lead list"
              className="px-3"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLeads} className="bg-white">
              Retry
            </Button>
          </div>
        )}

        {/* Leads Table Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Company</th>
                  <th scope="col" className="px-6 py-3.5">Industry</th>
                  <th scope="col" className="px-6 py-3.5">Location</th>
                  <th scope="col" className="px-6 py-3.5">Website</th>
                  <th scope="col" className="px-6 py-3.5">Phone</th>
                  <th scope="col" className="px-6 py-3.5">Source</th>
                  <th scope="col" className="px-6 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <TableSkeletonRows rows={5} cols={7} />
                ) : leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Company Name */}
                      <td className="px-6 py-4 font-semibold text-slate-900 max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="line-clamp-2">{lead.company_name}</span>
                            {lead.source_url && (
                              <a
                                href={lead.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                              >
                                <span>Google Maps</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="px-6 py-4">
                        <Badge variant="primary" size="sm">
                          {lead.industry}
                        </Badge>
                      </td>

                      {/* Location / Address */}
                      <td className="px-6 py-4 max-w-xs text-slate-600">
                        {lead.address ? (
                          <div className="flex items-start gap-1.5 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{lead.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Website */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline max-w-[180px] truncate"
                          >
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 text-xs font-mono font-medium hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{lead.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="default" size="sm">
                          {lead.source}
                        </Badge>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {formatDate(lead.created_on)}
                      </td>
                    </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg bg-slate-50 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : leads.length > 0 ? (
              leads.map((lead) => (
                <div key={lead.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                          {lead.company_name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="primary" size="sm">
                            {lead.industry}
                          </Badge>
                          <Badge variant="default" size="sm">
                            {lead.source}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {lead.address && (
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{lead.address}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                    {lead.website && (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 font-medium hover:underline truncate"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                      </a>
                    )}
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-1.5 text-slate-700 font-mono font-medium hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{lead.phone}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(lead.created_on)}
                    </span>
                    {lead.source_url && (
                      <a
                        href={lead.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Google Maps <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : null}
          </div>

          {/* Empty States */}
          {!isLoading && leads.length === 0 && (
            <div className="p-8">
              {hasActiveFilters ? (
                <EmptyState
                  title="No matching leads found"
                  description="We couldn't find any business leads matching your search criteria or active filters."
                  action={
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Search & Filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Building2}
                  title="No business leads in database"
                  description={
                    user?.role === 'Admin'
                      ? 'Get started by discovering verified local leads with the Google Places generator.'
                      : 'No business leads have been discovered yet. Please contact an administrator to generate leads.'
                  }
                  action={
                    user?.role === 'Admin' ? (
                      <Link href="/generate-leads">
                        <Button
                          variant="primary"
                          size="md"
                          leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
                        >
                          Generate Your First Leads
                        </Button>
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
