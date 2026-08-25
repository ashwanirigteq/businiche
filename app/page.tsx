'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  AlertCircle,
  X,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  BarChart2,
  Trash2,
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

function getSearchCountKey(userId?: string): string {
  return userId ? `bn_search_count_${userId}` : 'bn_search_count';
}

function getSearchCount(userId?: string): number {
  try { return parseInt(localStorage.getItem(getSearchCountKey(userId)) || '0', 10); } catch { return 0; }
}

function incrementSearchCount(userId?: string): number {
  try {
    const next = getSearchCount(userId) + 1;
    localStorage.setItem(getSearchCountKey(userId), String(next));
    return next;
  } catch { return 0; }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id?: string; fullName: string; username: string; role: UserRole; credits?: number } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [industries, setIndustries] = useState<string[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [totalSearches, setTotalSearches] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const [emailModalConfig, setEmailModalConfig] = useState<{
    isOpen: boolean;
    isBulk: boolean;
    leadId?: string;
    recipientEmail?: string;
    recipientCompany?: string;
    recipientIndustry?: string;
  }>({ isOpen: false, isBulk: false });

  const isFirstRender = useRef(true);

  // Fetch user
  const fetchUser = useCallback(() => {
    fetch('/api/auth/me')
      .then((res) => { if (res.ok) return res.json(); throw new Error(); })
      .then((data) => {
        setUser(data.user);
        if (data.user?.id) {
          setTotalSearches(getSearchCount(data.user.id));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Fetch total comments
  useEffect(() => {
    fetch('/api/leads/stats')
      .then((r) => r.json())
      .then((d) => { if (d.totalComments !== undefined) setTotalComments(d.totalComments); })
      .catch(() => {});
  }, []);

  const fetchLeads = useCallback(async (targetPage = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('filter') === 'my_leads') {
        params.set('myLeads', 'true');
      }
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedIndustry) params.set('industry', selectedIndustry);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedSource) params.set('source', selectedSource);
      params.set('page', String(targetPage));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch leads');

      const leadCount = data.total ?? 0;
      setLeads(data.leads || []);
      setTotalLeads(leadCount);
      setTotalPages(data.totalPages ?? 1);
      setPage(data.page ?? targetPage);
      if (data.industries?.length > 0) setIndustries(data.industries);

      if (!isFirstRender.current && (searchQuery || selectedIndustry || selectedStatus)) {
        setTotalSearches(incrementSearchCount(user?.id));
      } else if (leadCount === 0 && !searchQuery && !selectedIndustry && !selectedStatus) {
        // If user has 0 leads and no filters, search count defaults to 0 if not incremented
        if (getSearchCount(user?.id) === 0) setTotalSearches(0);
      }
      isFirstRender.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading leads');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedIndustry, selectedStatus, selectedSource, pageSize, user?.id]);


  useEffect(() => {
    const timer = setTimeout(() => fetchLeads(1), 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  };

  const clearFilters = () => {
    setSearchQuery(''); setSelectedIndustry(''); setSelectedStatus(''); setSelectedSource(''); setPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery || selectedIndustry || selectedStatus || selectedSource);

  // Select All on current page (allows bulk delete of ALL selected leads)
  const isAllSelected = leads.length > 0 && leads.every((l) => selectedLeadIds.includes(l.id));

  const toggleSelectAll = () => {
    setSelectedLeadIds(isAllSelected ? [] : leads.map((l) => l.id));
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Calculate selected leads with valid email
  const selectedValidEmailLeads = leads.filter(
    (l) => selectedLeadIds.includes(l.id) && Boolean(l.email && l.email.includes('@'))
  );
  const totalValidEmailLeads = leads.filter((l) => Boolean(l.email && l.email.includes('@'))).length;

  const validEmailCountForButton = selectedLeadIds.length > 0 ? selectedValidEmailLeads.length : totalValidEmailLeads;

  const handleSingleDelete = async (leadId: string, companyName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete lead "${companyName}"?`)) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
      fetchLeads(page);
    } catch {
      alert('Failed to delete lead.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!confirm(`Delete ${selectedLeadIds.length} selected lead(s)?`)) return;
    setIsDeletingBulk(true);
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedLeadIds }),
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      setSelectedLeadIds([]);
      fetchLeads(page);
    } catch {
      alert('Failed to delete selected leads.');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const openSingleEmail = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.email) return;
    setEmailModalConfig({ isOpen: true, isBulk: false, leadId: lead.id, recipientEmail: lead.email, recipientCompany: lead.company_name, recipientIndustry: lead.industry });
  };

  const openBulkEmail = () => setEmailModalConfig({ isOpen: true, isBulk: true });

  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 px-1 text-xs text-slate-600">
      <div className="flex items-center gap-3">
        <span>
          <strong className="text-slate-900">{leads.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong>
          {' – '}
          <strong className="text-slate-900">{Math.min(page * pageSize, totalLeads)}</strong>
          {' of '}
          <strong className="text-blue-700">{totalLeads}</strong>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="py-1 px-2 rounded border border-blue-100 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => fetchLeads(1)} className="px-2" title="First">
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => fetchLeads(page - 1)} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>Prev</Button>
        <span className="px-2 font-medium text-slate-700">
          {page} / {totalPages || 1}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => fetchLeads(page + 1)} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>Next</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => fetchLeads(totalPages)} className="px-2" title="Last">
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f6ff] flex flex-col">
      {user && <Navbar user={user} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-900">Leads</h1>
            <p className="text-xs text-blue-500 mt-0.5">Discover, filter, and outreach B2B leads</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Mail className="w-4 h-4 text-blue-600" />}
              onClick={openBulkEmail}
              disabled={validEmailCountForButton === 0}
            >
              Email ({validEmailCountForButton})
            </Button>
            <Link href="/generate-leads">
              <Button variant="primary" size="md" leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}>
                Generate
              </Button>
            </Link>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Leads</span>
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-900">{totalLeads.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Searches</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <BarChart2 className="w-4.5 h-4.5 text-indigo-500" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-900">{totalSearches}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Notes</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <MessageSquare className="w-4.5 h-4.5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-900">{totalComments.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs mb-6 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-blue-100 text-sm text-slate-900 placeholder:text-slate-400 bg-blue-50/20 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2.5 px-3 rounded-lg border border-blue-100 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              {LEAD_STATUS_OPTIONS.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          <div className="w-full sm:w-44">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full py-2.5 px-3 rounded-lg border border-blue-100 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Industries</option>
              {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="md" onClick={clearFilters} className="text-xs text-blue-600">
                Clear
              </Button>
            )}
            <Button variant="outline" size="md" onClick={() => fetchLeads(page)} isLoading={isLoading} title="Refresh" className="px-3">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 bg-white p-3 rounded-xl border border-blue-100 shadow-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Mail className="w-3.5 h-3.5" />}
              onClick={openBulkEmail}
              disabled={validEmailCountForButton === 0}
            >
              Email ({validEmailCountForButton})
            </Button>

            {selectedLeadIds.length > 0 && (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={handleBulkDelete}
                  isLoading={isDeletingBulk}
                >
                  Delete ({selectedLeadIds.length})
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLeadIds([])} className="text-xs text-slate-500">
                  Deselect
                </Button>
              </>
            )}
          </div>
          {renderPagination()}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchLeads(page)} className="bg-white">Retry</Button>
          </div>
        )}

        {/* Table View */}
        <div className="bg-white rounded-xl border border-blue-100 shadow-xs overflow-hidden mb-4">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-blue-50/80 text-xs uppercase font-bold text-blue-500 border-b border-blue-100 tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-blue-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Select all on page"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3.5">Company</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Industry</th>
                  <th scope="col" className="px-4 py-3.5">Email</th>
                  <th scope="col" className="px-4 py-3.5">Phone</th>
                  <th scope="col" className="px-4 py-3.5">Website</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {isLoading ? (
                  <TableSkeletonRows rows={8} cols={8} />
                ) : leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={(e) => toggleSelectLead(lead.id, e as unknown as React.MouseEvent)}
                          className="rounded border-blue-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {lead.company_name}
                            </span>
                            {lead.address && <div className="text-[11px] text-slate-400 line-clamp-1">{lead.address}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={lead.status} />
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge variant="primary" size="sm">{lead.industry}</Badge>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {lead.email ? (
                          <button
                            type="button"
                            onClick={(e) => openSingleEmail(lead, e)}
                            title={lead.email}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span className="max-w-[110px] truncate">{lead.email}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs italic">No email</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-slate-700 text-xs font-mono font-medium hover:underline">
                            <Phone className="w-3 h-3 text-blue-400" />
                            <span>{lead.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="max-w-[110px] truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleSingleDelete(lead.id, lead.company_name, e)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="lg:hidden divide-y divide-blue-50">
            {leads.length > 0 && leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => router.push(`/leads/${lead.id}`)}
                className="p-4 hover:bg-blue-50/40 transition-colors space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={(e) => toggleSelectLead(lead.id, e as unknown as React.MouseEvent)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-blue-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm hover:text-blue-600">
                        {lead.company_name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <StatusBadge status={lead.status} />
                        <Badge variant="primary" size="sm">{lead.industry}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {lead.email && (
                      <button
                        type="button"
                        onClick={(e) => openSingleEmail(lead, e)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleSingleDelete(lead.id, lead.company_name, e)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {lead.address && (
                  <div className="flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{lead.address}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty States */}
          {!isLoading && leads.length === 0 && (
            <div className="p-8">
              {hasActiveFilters ? (
                <EmptyState
                  title="No matches found"
                  description="No leads match your active filters."
                  action={<Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>}
                />
              ) : (
                <EmptyState
                  icon={Building2}
                  title="No leads saved"
                  description="Generate leads matching your target niche."
                  action={
                    <Link href="/generate-leads">
                      <Button variant="primary" size="md" leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}>
                        Generate Leads
                      </Button>
                    </Link>
                  }
                />
              )}
            </div>
          )}
        </div>

        {/* Bottom Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-blue-100 shadow-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Mail className="w-3.5 h-3.5" />}
              onClick={openBulkEmail}
              disabled={validEmailCountForButton === 0}
            >
              Email ({validEmailCountForButton})
            </Button>
          </div>
          {renderPagination()}
        </div>
      </main>

      <EmailModal
        isOpen={emailModalConfig.isOpen}
        onClose={() => setEmailModalConfig({ ...emailModalConfig, isOpen: false })}
        isBulk={emailModalConfig.isBulk}
        leadId={emailModalConfig.leadId}
        recipientEmail={emailModalConfig.recipientEmail}
        recipientCompany={emailModalConfig.recipientCompany}
        recipientIndustry={emailModalConfig.recipientIndustry}
        selectedLeadIds={selectedLeadIds}
        validEmailCount={validEmailCountForButton}
        totalRecipientsCount={totalLeads}
        onSuccess={() => {
          setSelectedLeadIds([]);
          fetchLeads(page);
          fetchUser();
        }}
      />
    </div>
  );
}
