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
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole, LeadGenerationResult } from '@/lib/types';

export default function GenerateLeadsPage() {
  const [currentUser, setCurrentUser] = useState<{ fullName: string; username: string; role: UserRole } | null>(null);

  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadGenerationResult | null>(null);

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
    setResult(null);

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
          limit: parseInt(limit, 10) || 10,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate leads.');
      }

      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during lead generation.';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const sampleNiches = ['Dentists', 'HVAC Contractors', 'Roofing Services', 'Coffee Roasters', 'Digital Marketing Agencies'];
  const sampleLocations = ['Austin, TX', 'Miami, FL', 'Seattle, WA', 'Denver, CO', 'Chicago, IL'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Generate Business Leads
            </h1>
            <Badge variant="slate" size="sm">Admin Engine</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Discover verified local businesses via Google Places, automatically normalize data, deduplicate records, and store leads in Neon PostgreSQL.
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
                  placeholder="e.g. Dental Clinics, Plumbers, Cafes"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  leftIcon={<Building2 className="w-4 h-4" />}
                />
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">Suggestions:</span>
                  {sampleNiches.slice(0, 3).map((item) => (
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
                  {sampleLocations.slice(0, 3).map((item) => (
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

            {/* Number of Leads */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Number of Leads
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="5">5 Leads</option>
                  <option value="10">10 Leads</option>
                  <option value="15">15 Leads</option>
                  <option value="20">20 Leads</option>
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
                  {isGenerating ? 'Discovering & Normalizing Leads...' : 'Generate Leads'}
                </Button>
              </div>
            </div>
          </form>

          {/* Engine note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Google Places API provides verified company titles, addresses, verified phone numbers, and official websites.
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Lead Generation Error</h4>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Generation Results */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Google Places Found
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {result.totalFound}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  New Leads Saved to DB
                </span>
                <div className="mt-2 text-2xl font-bold text-emerald-700">
                  +{result.insertedCount}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Duplicates Skipped
                </span>
                <div className="mt-2 text-2xl font-bold text-amber-700">
                  {result.duplicatesCount}
                </div>
              </div>
            </div>

            {/* Results Table Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Recently Added Leads ({result.leads.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified and indexed in Neon PostgreSQL
                  </p>
                </div>

                <Link href="/">
                  <Button
                    variant="outline"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View All in Dashboard
                  </Button>
                </Link>
              </div>

              {result.leads.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3">Location</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Website</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/60">
                          <td className="px-6 py-3.5 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{lead.company_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                            {lead.address || '—'}
                          </td>
                          <td className="px-6 py-3.5 text-xs font-mono text-slate-700 whitespace-nowrap">
                            {lead.phone || '—'}
                          </td>
                          <td className="px-6 py-3.5 text-xs whitespace-nowrap">
                            {lead.website ? (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1"
                              >
                                <Globe className="w-3 h-3" />
                                <span>Website</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">
                  {result.totalFound === 0
                    ? 'No places returned by Google Places API for this query.'
                    : 'All discovered places were already stored in the database as duplicates.'}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
