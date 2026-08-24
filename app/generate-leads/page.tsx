'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Zap,
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
    credits?: number;
  } | null>(null);

  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState('20');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchUser = useCallback(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDiscoveredLeads([]);
    setPage(1);

    if (!niche.trim() || !location.trim()) {
      setError('Please specify both a target niche and location.');
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

      if (data.remainingCredits !== undefined) {
        window.dispatchEvent(
          new CustomEvent('bn_credits_updated', {
            detail: { remaining: data.remainingCredits, nextCreditDate: data.nextCreditDate },
          })
        );
      }

      setDiscoveredLeads(data.leads || []);
      setSuccessMessage(
        `Discovered ${data.totalFound || (data.leads ? data.leads.length : 0)} leads for "${niche}" in "${location}".`
      );
      fetchUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating leads.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLead = async (leadToSave: DiscoveredLead) => {
    setSavingLeadId(leadToSave.temp_id || leadToSave.company_name);
    try {
      const res = await fetch('/api/leads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: leadToSave }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save lead.');

      setDiscoveredLeads((prev) =>
        prev.map((l) => (l.temp_id === leadToSave.temp_id ? { ...l, isSaved: true } : l))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving lead.');
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleSaveAllLeads = async () => {
    const unsavedLeads = discoveredLeads.filter((l) => !l.isSaved);
    if (unsavedLeads.length === 0) return;

    setIsSavingAll(true);
    try {
      const res = await fetch('/api/leads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: unsavedLeads }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save leads.');

      setDiscoveredLeads((prev) => prev.map((l) => ({ ...l, isSaved: true })));
      setSuccessMessage(`Saved ${data.savedCount || unsavedLeads.length} leads to your account!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving leads.');
    } finally {
      setIsSavingAll(false);
    }
  };

  const sampleNiches = ['Software Companies', 'Dental Clinics', 'Marketing Agencies', 'Real Estate Brokers'];
  const sampleLocations = ['New York, NY', 'Austin, TX', 'London, UK', 'Mumbai, India'];

  const totalPages = Math.ceil(discoveredLeads.length / pageSize) || 1;
  const paginatedLeads = discoveredLeads.slice((page - 1) * pageSize, page * pageSize);
  const unsavedCount = discoveredLeads.filter((l) => !l.isSaved).length;

  return (
    <div className="min-h-screen bg-[#f0f6ff] flex flex-col pb-12">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lead Generation Engine</h1>
              <Badge variant="primary" size="sm">Google Places AI</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Discover verified business decision-maker leads by industry &amp; region. Rate: 10 credits per lead generated.
            </p>
          </div>

          <Link href="/">
            <Button variant="outline" size="sm">← Back to Leads</Button>
          </Link>
        </div>

        {/* Search Form Card */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 sm:p-8 mb-8">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Industry / Niche"
                  required
                  placeholder="e.g. Software Companies"
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
                      className="text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Input
                  label="Target Location"
                  required
                  placeholder="e.g. Austin, TX"
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
                      className="text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-blue-50">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-blue-600">Leads Quantity:</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="py-2 px-3 rounded-lg border border-blue-100 text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="10">10 Leads (100 Cr)</option>
                  <option value="20">20 Leads (200 Cr)</option>
                  <option value="30">30 Leads (300 Cr)</option>
                  <option value="50">50 Leads (500 Cr)</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isGenerating}
                leftIcon={<Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />}
              >
                {isGenerating ? 'Discovering Leads...' : 'Generate Leads'}
              </Button>
            </div>
          </form>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Discovered Leads Results */}
        {discoveredLeads.length > 0 && (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 bg-blue-50/50 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Discovered Leads ({discoveredLeads.length})</h3>
                <p className="text-xs text-slate-500">Review results and save to your account.</p>
              </div>

              {unsavedCount > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSavingAll}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  onClick={handleSaveAllLeads}
                >
                  Save All ({unsavedCount})
                </Button>
              )}
            </div>

            <div className="divide-y divide-blue-50">
              {paginatedLeads.map((lead) => (
                <div key={lead.temp_id || lead.company_name} className="p-4 hover:bg-blue-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{lead.company_name}</div>
                    {lead.address && <div className="text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-400" />{lead.address}</div>}
                    <div className="flex items-center gap-3 text-slate-600">
                      {lead.phone && <span className="font-mono flex items-center gap-1"><Phone className="w-3 h-3 text-blue-400" />{lead.phone}</span>}
                      {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><Globe className="w-3 h-3" />Website</a>}
                    </div>
                  </div>

                  <div>
                    {lead.isSaved ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" /> Saved
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={savingLeadId === (lead.temp_id || lead.company_name)}
                        onClick={() => handleSaveLead(lead)}
                      >
                        Save Lead
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
