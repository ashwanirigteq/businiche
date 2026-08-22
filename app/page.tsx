'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Building2,
  Phone,
  Globe,
  MapPin,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Layers,
  AlertCircle,
  X,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TableSkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmailModal } from '@/components/EmailModal';
import {
  type Lead,
  type UserRole,
  LEAD_STATUS_OPTIONS,
} from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName: string; username: string; role: UserRole } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [industries, setIndustries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection for bulk email
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Email Modal State
  const [emailModalConfig, setEmailModalConfig] = useState<{
    isOpen: boolean;
    isBulk: boolean;
    leadId?: string;
    recipientEmail?: string;
    recipientCompany?: string;
    recipientIndustry?: string;
  }>({
    isOpen: false,
    isBulk: false,
  });

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
  const fetchLeads = useCallback(async (targetPage: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedIndustry) params.set('industry', selectedIndustry);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedSource) params.set('source', selectedSource);
      params.set('page', String(targetPage));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch leads');
      }

      setLeads(data.leads || []);
      setTotalLeads(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPage(data.page ?? targetPage);
      if (data.industries && data.industries.length > 0) {
        setIndustries(data.industries);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error loading leads';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedIndustry, selectedStatus, selectedSource, pageSize]);

  // Debounced search trigger (resets to page 1)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads(1);
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
    setSelectedStatus('');
    setSelectedSource('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery || selectedIndustry || selectedStatus || selectedSource);

  // Checkbox Selection
  const leadsWithEmailOnPage = leads.filter((l) => Boolean(l.email && l.email.includes('@')));
  const isAllSelected =
    leadsWithEmailOnPage.length > 0 &&
    leadsWithEmailOnPage.every((l) => selectedLeadIds.includes(l.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leadsWithEmailOnPage.map((l) => l.id));
    }
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  // Open Single Lead Email Modal
  const openSingleEmail = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.email) return;
    setEmailModalConfig({
      isOpen: true,
      isBulk: false,
      leadId: lead.id,
      recipientEmail: lead.email,
      recipientCompany: lead.company_name,
      recipientIndustry: lead.industry,
    });
  };

  // Open Bulk Email Modal
  const openBulkEmail = () => {
    setEmailModalConfig({
      isOpen: true,
      isBulk: true,
    });
  };

  // Reusable Pagination Controls
  const renderPaginationControls = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 px-1 text-xs text-slate-600">
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-slate-900">{leads.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
          <strong className="text-slate-900">{Math.min(page * pageSize, totalLeads)}</strong> of{' '}
          <strong className="text-slate-900">{totalLeads}</strong> leads
        </span>

        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-slate-400">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="py-1 px-2 rounded border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isLoading}
          onClick={() => fetchLeads(1)}
          title="First Page"
          className="px-2"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isLoading}
          onClick={() => fetchLeads(page - 1)}
          leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
        >
          Prev
        </Button>

        <span className="px-2 font-medium text-slate-700">
          Page {page} of {totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isLoading}
          onClick={() => fetchLeads(page + 1)}
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isLoading}
          onClick={() => fetchLeads(totalPages)}
          title="Last Page"
          className="px-2"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

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
              Browse, filter, outreach, and manage high-value B2B company leads.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Mail className="w-4 h-4 text-blue-600" />}
              onClick={openBulkEmail}
              disabled={totalLeads === 0}
            >
              Email All Leads
            </Button>

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
        </div>

        {/* Top Summary Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Leads
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{totalLeads}</span>
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
              <span className="text-2xl font-bold text-slate-900">{industries.length}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Selected for Campaign
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{selectedLeadIds.length}</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search leads by company, location, industry, email, phone, or website..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
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

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="">All Statuses</option>
              {LEAD_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Industry Filter */}
          <div className="w-full sm:w-44">
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
              onClick={() => fetchLeads(page)}
              isLoading={isLoading}
              title="Refresh lead list"
              className="px-3"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Top Action Bar & Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Mail className="w-3.5 h-3.5" />}
              onClick={openBulkEmail}
              disabled={leads.length === 0}
            >
              {selectedLeadIds.length > 0
                ? `Email Selected (${selectedLeadIds.length})`
                : 'Email All Leads'}
            </Button>
            {selectedLeadIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLeadIds([])}
                className="text-xs text-slate-500"
              >
                Deselect All
              </Button>
            )}
          </div>

          {renderPaginationControls()}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchLeads(page)} className="bg-white">
              Retry
            </Button>
          </div>
        )}

        {/* Leads Table Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      title="Select all with email on page"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3.5">Company</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Industry</th>
                  <th scope="col" className="px-4 py-3.5">Location</th>
                  <th scope="col" className="px-4 py-3.5">Outreach</th>
                  <th scope="col" className="px-4 py-3.5">Phone</th>
                  <th scope="col" className="px-4 py-3.5">Website</th>
                  <th scope="col" className="px-4 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <TableSkeletonRows rows={8} cols={9} />
                ) : leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      {/* Checkbox */}
                      <td
                        className="px-4 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={(e) => toggleSelectLead(lead.id, e as unknown as React.MouseEvent)}
                          disabled={!lead.email}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Company Name */}
                      <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {lead.company_name}
                            </span>
                            {lead.source_url && (
                              <a
                                href={lead.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 hover:underline mt-0.5"
                              >
                                <span>Google Maps</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={lead.status} />
                      </td>

                      {/* Industry */}
                      <td className="px-4 py-3.5">
                        <Badge variant="primary" size="sm">
                          {lead.industry}
                        </Badge>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5 max-w-xs text-slate-600">
                        {lead.address ? (
                          <div className="flex items-start gap-1 text-xs">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{lead.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Outreach / Email Action Icon */}
                      <td
                        className="px-4 py-3.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.email ? (
                          <button
                            type="button"
                            onClick={(e) => openSingleEmail(lead, e)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 transition-colors cursor-pointer"
                            title={`Send Rigteq Software offer to ${lead.email}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span className="max-w-[120px] truncate">{lead.email}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1 text-slate-400 text-xs opacity-50 cursor-not-allowed"
                            title="No email available"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>No Email</span>
                          </button>
                        )}
                      </td>

                      {/* Phone */}
                      <td
                        className="px-4 py-3.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 text-xs font-mono font-medium hover:underline"
                          >
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{lead.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Website */}
                      <td
                        className="px-4 py-3.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline max-w-[140px] truncate"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {formatDate(lead.created_on)}
                      </td>
                    </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {leads.length > 0 ? (
              leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="p-5 hover:bg-slate-50/60 transition-colors space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm leading-tight hover:text-blue-600">
                          {lead.company_name}
                        </h3>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <StatusBadge status={lead.status} />
                          <Badge variant="primary" size="sm">
                            {lead.industry}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      {lead.email ? (
                        <button
                          type="button"
                          onClick={(e) => openSingleEmail(lead, e)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                          title={`Email ${lead.email}`}
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="p-2 text-slate-300">
                          <Mail className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>

                  {lead.address && (
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{lead.address}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                    {lead.email && (
                      <span className="inline-flex items-center gap-1.5 text-blue-600 truncate font-mono">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </span>
                    )}
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-slate-700 font-mono font-medium hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{lead.phone}</span>
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
                  description="We couldn't find any business leads matching your search criteria or active status/industry filters."
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
                      ? 'Discover and review local businesses using the Google Places generator.'
                      : 'No business leads have been saved yet. Contact an administrator to discover leads.'
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

        {/* Bottom Action Bar & Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Mail className="w-3.5 h-3.5" />}
              onClick={openBulkEmail}
              disabled={leads.length === 0}
            >
              {selectedLeadIds.length > 0
                ? `Email Selected (${selectedLeadIds.length})`
                : 'Email All Leads'}
            </Button>
          </div>

          {renderPaginationControls()}
        </div>
      </main>

      {/* Reusable Offer Email Modal */}
      <EmailModal
        isOpen={emailModalConfig.isOpen}
        onClose={() => setEmailModalConfig({ ...emailModalConfig, isOpen: false })}
        isBulk={emailModalConfig.isBulk}
        leadId={emailModalConfig.leadId}
        recipientEmail={emailModalConfig.recipientEmail}
        recipientCompany={emailModalConfig.recipientCompany}
        recipientIndustry={emailModalConfig.recipientIndustry}
        selectedLeadIds={selectedLeadIds}
        totalRecipientsCount={totalLeads}
        onSuccess={() => {
          setSelectedLeadIds([]);
          fetchLeads(page);
        }}
      />
    </div>
  );
}
