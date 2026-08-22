'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Building2,
  MapPin,
  AlertCircle,
  ArrowRight,
  Globe,
  Info,
  Save,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Phone,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  type UserRole,
  type DiscoveredLead,
} from '@/lib/types';

export default function GenerateLeadsPage() {
  const [currentUser, setCurrentUser] = useState<{
    fullName: string;
    username: string;
    role: UserRole;
  } | null>(null);

  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState('20');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // In-memory discovered leads
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Pagination for discovered leads table
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDiscoveredLeads([]);
    setPage(1);

    if (!niche.trim()) {
      setError('Please specify a target business niche or industry.');
      return;
    }

    if (!location.trim()) {
      setError('Please specify a target location (City, State, or Region).');
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch('/api/leads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: niche.trim(),
          location: location.trim(),
          limit: parseInt(limit, 10) || 20,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to discover leads.');
      }

      setDiscoveredLeads(data.leads || []);
      setSuccessMessage(
        `Discovered ${data.totalFound || (data.leads ? data.leads.length : 0)} business leads. Review the results below and save desired leads to your database.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during lead discovery.';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save a single discovered lead
  const handleSaveSingle = async (lead: DiscoveredLead) => {
    const tempId = lead.temp_id || lead.company_name;
    setSavingLeadId(tempId);
    setError(null);

    try {
      const res = await fetch('/api/leads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save lead');

      // Mark as saved in local state
      setDiscoveredLeads((prev) =>
        prev.map((item) =>
          item.temp_id === lead.temp_id || item.company_name === lead.company_name
            ? { ...item, isSaved: true }
            : item
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving lead';
      setError(msg);
    } finally {
      setSavingLeadId(null);
    }
  };

  // Save all discovered leads in bulk
  const handleSaveAll = async () => {
    const unsavedLeads = discoveredLeads.filter((l) => !l.isSaved);
    if (unsavedLeads.length === 0) {
      alert('All discovered leads are already saved.');
      return;
    }

    setIsSavingAll(true);
    setError(null);

    try {
      const res = await fetch('/api/leads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: unsavedLeads }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save leads in bulk');

      // Mark all as saved
      setDiscoveredLeads((prev) => prev.map((item) => ({ ...item, isSaved: true })));
      setSuccessMessage(`Successfully saved ${data.savedCount} leads to the database!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving leads';
      setError(msg);
    } finally {
      setIsSavingAll(false);
    }
  };

  // Pagination calculation
  const totalItems = discoveredLeads.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLeads = discoveredLeads.slice((page - 1) * pageSize, page * pageSize);

  const sampleNiches = ['Dentists', 'HVAC Contractors', 'Roofing Services', 'Software Agencies', 'Coffee Roasters'];
  const sampleLocations = ['Austin, TX', 'Miami, FL', 'Seattle, WA', 'Denver, CO', 'Chicago, IL'];

  // Pagination Controls Element
  const renderPaginationControls = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 px-1 text-xs text-slate-600">
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-slate-900">{totalItems > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
          <strong className="text-slate-900">{Math.min(page * pageSize, totalItems)}</strong> of{' '}
          <strong className="text-slate-900">{totalItems}</strong> discovered leads
        </span>

        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-slate-400">Page size:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="py-1 px-2 rounded border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
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
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Discover &amp; Generate Leads
            </h1>
            <Badge variant="slate" size="sm">Admin Engine</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Discover verified business decision-maker leads via Google Places API in-memory. Review discovered results and choose which leads to save into PostgreSQL.
          </p>
        </div>

        {/* Lead Generation Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 mb-8">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Niche / Industry */}
              <div>
                <Input
                  label="Niche / Industry"
                  id="niche"
                  required
                  placeholder="e.g. Dental Clinics, Software Companies, Plumbers"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  leftIcon={<Building2 className="w-4 h-4" />}
                />
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">Suggestions:</span>
                  {sampleNiches.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setNiche(item)}
                      className="text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <Input
                  label="Target Location"
                  id="location"
                  required
                  placeholder="e.g. Austin, TX or Chicago, IL"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">Suggestions:</span>
                  {sampleLocations.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setLocation(item)}
                      className="text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Limit Options: 10, 20, 50, 100 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="w-full sm:w-56">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Number of Leads to Fetch
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer font-medium"
                >
                  <option value="10">10 Leads</option>
                  <option value="20">20 Leads</option>
                  <option value="50">50 Leads (Multi-page)</option>
                  <option value="100">100 Leads (Multi-page)</option>
                </select>
              </div>

              <div className="sm:self-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isGenerating}
                  leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
                  className="w-full sm:w-auto"
                >
                  {isGenerating ? 'Discovering Leads In-Memory...' : 'Discover Leads'}
                </Button>
              </div>
            </div>
          </form>

          {/* Architecture note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Discovered leads are fetched in-memory first so you can review verified details before saving them to your database.
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Lead Discovery Error</h4>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Discovered Leads Results Table */}
        {discoveredLeads.length > 0 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Top Action Bar with Save All & Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSavingAll}
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleSaveAll}
                >
                  {isSavingAll ? 'Saving All to DB...' : 'Save All Leads to Database'}
                </Button>
                <Link href="/">
                  <Button
                    variant="outline"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Go to Leads Dashboard
                  </Button>
                </Link>
              </div>

              {renderPaginationControls()}
            </div>

            {/* Results Table Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Company</th>
                      <th className="px-6 py-3.5">Industry</th>
                      <th className="px-6 py-3.5">Location</th>
                      <th className="px-6 py-3.5">Phone</th>
                      <th className="px-6 py-3.5">Website</th>
                      <th className="px-6 py-3.5 text-center">Save Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLeads.map((lead) => {
                      const tempId = lead.temp_id || lead.company_name;
                      const isSaving = savingLeadId === tempId;

                      return (
                        <tr key={tempId} className="hover:bg-slate-50/60 transition-colors">
                          {/* Company Name */}
                          <td className="px-6 py-4 font-semibold text-slate-900 max-w-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="line-clamp-2">{lead.company_name}</span>
                                {lead.source_url && (
                                  <a
                                    href={lead.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-blue-600 hover:underline inline-block mt-0.5"
                                  >
                                    Google Maps
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

                          {/* Location */}
                          <td className="px-6 py-4 max-w-xs text-slate-600 text-xs">
                            {lead.address ? (
                              <div className="flex items-start gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{lead.address}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-700">
                            {lead.phone ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{lead.phone}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>

                          {/* Website */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            {lead.website ? (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline max-w-[140px] truncate"
                              >
                                <Globe className="w-3 h-3" />
                                <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>

                          {/* Save Action */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {lead.isSaved ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                <Check className="w-3.5 h-3.5" />
                                <span>Saved in DB</span>
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                isLoading={isSaving}
                                leftIcon={<Save className="w-3.5 h-3.5 text-slate-600" />}
                                onClick={() => handleSaveSingle(lead)}
                              >
                                Save Lead
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View for Discovered Leads */}
              <div className="lg:hidden divide-y divide-slate-100">
                {paginatedLeads.map((lead) => {
                  const tempId = lead.temp_id || lead.company_name;
                  const isSaving = savingLeadId === tempId;

                  return (
                    <div key={tempId} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">
                            {lead.company_name}
                          </h3>
                          <Badge variant="primary" size="sm" className="mt-1">
                            {lead.industry}
                          </Badge>
                        </div>

                        <div>
                          {lead.isSaved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>Saved</span>
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              isLoading={isSaving}
                              leftIcon={<Save className="w-3.5 h-3.5" />}
                              onClick={() => handleSaveSingle(lead)}
                            >
                              Save
                            </Button>
                          )}
                        </div>
                      </div>

                      {lead.address && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span>{lead.address}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Action Bar with Save All & Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSavingAll}
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleSaveAll}
                >
                  {isSavingAll ? 'Saving All to DB...' : 'Save All Leads to Database'}
                </Button>
              </div>

              {renderPaginationControls()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
