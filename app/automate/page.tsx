'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Bot,
  Play,
  Pause,
  Square,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  AlertCircle,
  Clock,
  Search,
  Copy,
  RotateCcw,
  Edit2,
  Mail,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
  Filter,
} from 'lucide-react';
import type { Campaign, CampaignStatus, EmailFormat, StateItem, UserRole } from '@/lib/types';

export default function AutomatePage() {
  const searchParams = useSearchParams();
  const urlFilterParam = searchParams.get('filter');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [formats, setFormats] = useState<EmailFormat[]>([]);
  const [statesList, setStatesList] = useState<StateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // User Auth State for ownership check
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('User');

  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'running' | 'paused' | 'completed'>(
    urlFilterParam === 'my_campaigns' ? 'my' : 'all'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  // Modal State: New / Edit Campaign
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [locationsInput, setLocationsInput] = useState('');
  const [targetEmails, setTargetEmails] = useState('50');
  const [dailyEmailLimit, setDailyEmailLimit] = useState('50');
  const [selectedFormatId, setSelectedFormatId] = useState('default_generic');
  const [isStateCampaign, setIsStateCampaign] = useState(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal State: Quick Add Format
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [newFormatName, setNewFormatName] = useState('');
  const [newFormatSubject, setNewFormatSubject] = useState('');
  const [newFormatBody, setNewFormatBody] = useState('');
  const [isSavingFormat, setIsSavingFormat] = useState(false);

  const fetchAuthUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setCurrentUserId(data.user.id);
        setCurrentUserRole(data.user.role);
      }
    } catch {}
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/automate');
      const data = await res.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch {
      console.error('Failed to fetch campaigns');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchFormats = useCallback(async () => {
    try {
      const res = await fetch('/api/email/formats');
      const data = await res.json();
      if (data.formats) {
        setFormats(data.formats);
      }
    } catch {
      console.error('Failed to fetch formats');
    }
  }, []);

  const fetchStates = useCallback(async () => {
    try {
      const res = await fetch('/api/states');
      const data = await res.json();
      if (data.states) {
        setStatesList(data.states);
      }
    } catch {
      console.error('Failed to fetch states');
    }
  }, []);

  useEffect(() => {
    fetchAuthUser();
    fetchCampaigns();
    fetchFormats();
    fetchStates();

    const timer = setInterval(() => {
      fetchCampaigns();
    }, 5000);

    return () => clearInterval(timer);
  }, [fetchAuthUser, fetchCampaigns, fetchFormats, fetchStates]);

  useEffect(() => {
    if (urlFilterParam === 'my_campaigns') {
      setActiveFilter('my');
    }
  }, [urlFilterParam]);

  // Filter & Search computation
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      // 1. Ownership / Status Filter
      if (activeFilter === 'my' && camp.created_by_user_id !== currentUserId) {
        return false;
      }
      if (activeFilter === 'running' && camp.status !== 'RUNNING') {
        return false;
      }
      if (activeFilter === 'paused' && camp.status !== 'PAUSED') {
        return false;
      }
      if (activeFilter === 'completed' && camp.status !== 'COMPLETED') {
        return false;
      }

      // 2. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const kwMatch = Array.isArray(camp.keywords) && camp.keywords.some((k) => k.toLowerCase().includes(q));
      const locMatch = Array.isArray(camp.locations) && camp.locations.some((l) => l.toLowerCase().includes(q));

      return (
        camp.campaign_name.toLowerCase().includes(q) ||
        (camp.created_by_username || '').toLowerCase().includes(q) ||
        (camp.created_by_full_name || '').toLowerCase().includes(q) ||
        kwMatch ||
        locMatch
      );
    });
  }, [campaigns, activeFilter, searchQuery, currentUserId]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE));
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCampaigns.slice(start, start + PAGE_SIZE);
  }, [filteredCampaigns, currentPage]);

  const openCreateModal = () => {
    setEditingCampaignId(null);
    setCampaignName('');
    setKeywordsInput('Software Development, Web Development');
    setLocationsInput('Texas, California');
    setTargetEmails('50');
    setDailyEmailLimit('50');
    setSelectedFormatId('default_generic');
    setIsStateCampaign(false);
    setSelectedStates([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (camp: Campaign) => {
    setEditingCampaignId(camp.id);
    setCampaignName(camp.campaign_name);
    setKeywordsInput(Array.isArray(camp.keywords) ? camp.keywords.join(', ') : String(camp.keywords || ''));
    setLocationsInput(Array.isArray(camp.locations) ? camp.locations.join(', ') : String(camp.locations || ''));
    setTargetEmails(String(camp.target_emails || 50));
    setDailyEmailLimit(String(camp.daily_email_limit ?? 50));
    setSelectedFormatId(camp.email_format_id || 'default_generic');
    setIsStateCampaign(Boolean(camp.is_state_campaign));
    setSelectedStates(Array.isArray(camp.selected_states) ? camp.selected_states : []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const keywords = keywordsInput.split(',').map((k) => k.trim()).filter(Boolean);
    const locations = locationsInput.split(',').map((l) => l.trim()).filter(Boolean);

    if (keywords.length < 1) {
      setFormError('Please enter at least 1 keyword.');
      setIsSubmitting(false);
      return;
    }

    if (!isStateCampaign && locations.length < 1) {
      setFormError('Please enter at least 1 location or select State Campaign.');
      setIsSubmitting(false);
      return;
    }

    if (isStateCampaign && selectedStates.length < 1) {
      setFormError('Please select at least 1 US State for State Campaign matrix automation.');
      setIsSubmitting(false);
      return;
    }

    try {
      const endpoint = '/api/automate';
      const method = editingCampaignId ? 'PATCH' : 'POST';
      const payload: any = {
        campaignName,
        keywords,
        locations,
        targetEmails: Number(targetEmails),
        dailyEmailLimit: Number(dailyEmailLimit),
        isStateCampaign,
        selectedStates,
        emailFormatId: selectedFormatId,
      };

      if (editingCampaignId) {
        payload.campaignId = editingCampaignId;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save campaign');

      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSaveFormat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFormat(true);
    try {
      const res = await fetch('/api/email/formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formatName: newFormatName,
          subject: newFormatSubject,
          formatLargeText: newFormatBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save format');

      await fetchFormats();
      if (data.format?.id) {
        setSelectedFormatId(data.format.id);
      }
      setIsFormatModalOpen(false);
      setNewFormatName('');
      setNewFormatSubject('');
      setNewFormatBody('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create format');
    } finally {
      setIsSavingFormat(false);
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: CampaignStatus) => {
    try {
      const res = await fetch('/api/automate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, status: newStatus }),
      });
      if (res.ok) {
        fetchCampaigns();
        if (newStatus === 'RUNNING') {
          setTimeout(fetchCampaigns, 500);
          setTimeout(fetchCampaigns, 1500);
          setTimeout(fetchCampaigns, 3000);
        }
      }
    } catch {
      alert('Failed to update campaign status.');
    }
  };

  const handleRestartCampaign = async (campaignId: string, name: string) => {
    if (!confirm(`Restart campaign "${name}"? This will reset counters and rerun matrix discovery from start.`)) return;
    try {
      const res = await fetch('/api/automate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, action: 'restart' }),
      });
      if (res.ok) {
        fetchCampaigns();
        setTimeout(fetchCampaigns, 600);
      }
    } catch {
      alert('Failed to restart campaign.');
    }
  };

  const handleDuplicateCampaign = async (campaignId: string) => {
    try {
      const res = await fetch('/api/automate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, action: 'duplicate' }),
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch {
      alert('Failed to duplicate campaign.');
    }
  };

  const handleDeleteCampaign = async (campaignId: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"?`)) return;
    try {
      const res = await fetch(`/api/automate?id=${campaignId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch {
      alert('Failed to delete campaign.');
    }
  };

  const filteredStateSuggestions = statesList.filter((st) => {
    if (!stateSearchQuery.trim()) return true;
    return st.state_name.toLowerCase().includes(stateSearchQuery.toLowerCase().trim());
  });

  const toggleSelectState = (stateName: string) => {
    if (selectedStates.includes(stateName)) {
      setSelectedStates(selectedStates.filter((s) => s !== stateName));
    } else {
      setSelectedStates([...selectedStates, stateName]);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
            RUNNING
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
            PAUSED
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Clock className="w-3 h-3 text-indigo-600" />
            SCHEDULED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            COMPLETED
          </span>
        );
      case 'STOPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            STOPPED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Bot className="w-7 h-7 text-blue-600" />
              <span>Automated B2B Campaign Hub</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure multi-keyword x location matrix campaigns with daily email limits &amp; US State automation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCampaigns}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
            >
              Sync Campaigns
            </Button>
            <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              Create Campaign
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search campaigns, keywords, or creator..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Campaigns ({campaigns.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('my');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'my' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              My Campaigns ({campaigns.filter((c) => c.created_by_user_id === currentUserId).length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('running');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'running' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Running
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('paused');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'paused' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Paused
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('completed');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'completed' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Campaign Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-xs h-64 animate-pulse" />
            <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-xs h-64 animate-pulse" />
          </div>
        ) : paginatedCampaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-blue-100 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Campaigns Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || activeFilter !== 'all'
                ? 'No campaigns match your active search or filter criteria.'
                : 'Create your first B2B matrix campaign to automate lead discovery and outreach.'}
            </p>
            <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {paginatedCampaigns.map((camp) => {
              const canManage = currentUserRole === 'Admin' || camp.created_by_user_id === currentUserId;
              const progressPct = Math.min(Math.round(((camp.email_sent_count || 0) / (camp.target_emails || 1)) * 100), 100);

              const timeTakenText = (seconds?: number, startedAt?: string | null, status?: string) => {
                let totalSec = seconds || 0;
                if (status === 'RUNNING' && startedAt) {
                  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
                  if (elapsed > 0) totalSec = Math.max(totalSec, elapsed);
                }
                if (totalSec <= 0) return '0s';
                const m = Math.floor(totalSec / 60);
                const s = totalSec % 60;
                return m === 0 ? `${s}s` : `${m}m ${s}s`;
              };

              return (
                <div
                  key={camp.id}
                  className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                          <span>{camp.campaign_name}</span>
                          {camp.is_state_campaign && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                              🇺🇸 US State Campaign
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-blue-500" />
                            Created by: @{camp.created_by_username || 'user'} ({camp.created_by_full_name || 'User'})
                          </span>
                          <span>·</span>
                          <span>⏱️ {timeTakenText(camp.time_taken_seconds, camp.started_at, camp.status)}</span>
                        </div>
                      </div>
                      {getStatusBadge(camp.status)}
                    </div>

                    {/* Active Target Badge */}
                    {camp.current_combination && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs font-semibold text-blue-950">
                        <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Active Target: <strong className="text-blue-700">{camp.current_combination}</strong></span>
                      </div>
                    )}

                    {/* Status Bar */}
                    {camp.last_update && (
                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                          camp.last_update.startsWith('Failed') || camp.last_update.startsWith('Error') || camp.last_update.startsWith('SMTP Failure')
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : camp.status === 'RUNNING'
                            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                            : camp.status === 'SCHEDULED'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {camp.status === 'RUNNING' ? (
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="truncate">{camp.last_update}</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Outreach Progress</span>
                        <span>{progressPct}% ({camp.email_sent_count || 0} / {camp.target_emails})</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-blue-50 overflow-hidden border border-blue-100">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Real-time Counters */}
                    <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                      <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                        <span className="text-[10px] uppercase font-bold text-blue-400 block">Searches</span>
                        <span className="text-sm font-extrabold text-blue-900">{camp.searches_count || 0}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                        <span className="text-[10px] uppercase font-bold text-blue-400 block">Leads</span>
                        <span className="text-sm font-extrabold text-blue-900">{camp.leads_found_count || 0}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                        <span className="text-[10px] uppercase font-bold text-blue-400 block">Enhanced</span>
                        <span className="text-sm font-extrabold text-blue-900">{camp.leads_enhanced_count || 0}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 block">Sent</span>
                        <span className="text-sm font-extrabold text-emerald-900">{camp.email_sent_count || 0}</span>
                      </div>
                    </div>

                    {/* Matrix & Credits Used */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-slate-700">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Format: {camp.email_format_name || 'Generic Default'}</span>
                        </div>
                        <span className="text-blue-700 font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {camp.credits_used || 0} Credits Used
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    {canManage ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {camp.status !== 'RUNNING' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStatusChange(camp.id, 'RUNNING')}
                            leftIcon={<Play className="w-3.5 h-3.5 fill-white" />}
                          >
                            {camp.status === 'PAUSED' ? 'Continue' : 'Start'}
                          </Button>
                        )}

                        {camp.status === 'RUNNING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(camp.id, 'PAUSED')}
                            leftIcon={<Pause className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />}
                          >
                            Pause
                          </Button>
                        )}

                        {(camp.status === 'RUNNING' || camp.status === 'PAUSED' || camp.status === 'SCHEDULED') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(camp.id, 'STOPPED')}
                            leftIcon={<Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />}
                          >
                            Stop
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestartCampaign(camp.id, camp.campaign_name)}
                          leftIcon={<RotateCcw className="w-3.5 h-3.5 text-blue-600" />}
                        >
                          Restart
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(camp)}
                          leftIcon={<Edit2 className="w-3.5 h-3.5 text-slate-600" />}
                        >
                          Edit
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-semibold italic">
                        Only campaign creator (@{camp.created_by_username || 'user'}) or admin can manage this campaign.
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateCampaign(camp.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Duplicate Campaign"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(camp.id, camp.campaign_name)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-blue-100 text-xs font-semibold">
            <span className="text-slate-500">
              Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredCampaigns.length} Total Campaigns)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New / Edit Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl w-full max-w-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                <span>{editingCampaignId ? 'Edit Campaign Parameters' : 'Create Automated B2B Campaign'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrUpdateCampaign} className="space-y-4">
              <Input
                label="Campaign Name"
                placeholder="e.g. US Software Development Outreach Q3"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Target Total Email Goal"
                  type="number"
                  placeholder="50"
                  value={targetEmails}
                  onChange={(e) => setTargetEmails(e.target.value)}
                  required
                />

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Daily Email Limit
                  </label>
                  <select
                    value={dailyEmailLimit}
                    onChange={(e) => setDailyEmailLimit(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="10">10 emails / day</option>
                    <option value="20">20 emails / day</option>
                    <option value="50">50 emails / day (Recommended)</option>
                    <option value="100">100 emails / day</option>
                    <option value="500">500 emails / day</option>
                    <option value="0">No Limit (Continuous)</option>
                  </select>
                </div>
              </div>

              {/* Keywords Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Target Keywords (Comma Separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Software Development, Web Development, Custom CRM"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* State Campaign Checkbox */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-blue-950">
                  <input
                    type="checkbox"
                    checked={isStateCampaign}
                    onChange={(e) => setIsStateCampaign(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>🇺🇸 Enable State Campaign (Automate Top 30 Cities per Selected US State)</span>
                </label>

                {isStateCampaign ? (
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] text-slate-500">
                      Select US States below. The discovery engine will iterate through the top 30 cities per state in order.
                    </p>

                    <Input
                      placeholder="Search US States (e.g. Texas, California, Florida)..."
                      value={stateSearchQuery}
                      onChange={(e) => setStateSearchQuery(e.target.value)}
                      leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                    />

                    {/* Selected States Chips */}
                    {selectedStates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedStates.map((st) => (
                          <span
                            key={st}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <span>📍 {st}</span>
                            <button
                              type="button"
                              onClick={() => toggleSelectState(st)}
                              className="hover:text-rose-200 cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* State Selection Suggestions */}
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {filteredStateSuggestions.slice(0, 30).map((st) => {
                        const isSel = selectedStates.includes(st.state_name);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => toggleSelectState(st.state_name)}
                            className={`p-1.5 rounded-lg text-left text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                              isSel ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{st.state_name}</span>
                            {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Target Locations (Comma Separated)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Texas, New York, California"
                      value={locationsInput}
                      onChange={(e) => setLocationsInput(e.target.value)}
                      className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Email Format Selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Email Offer Format
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsFormatModalOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Format</span>
                  </button>
                </div>
                <select
                  value={selectedFormatId}
                  onChange={(e) => {
                    if (e.target.value === 'ADD_NEW') {
                      setIsFormatModalOpen(true);
                    } else {
                      setSelectedFormatId(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                >
                  {formats.map((fmt) => (
                    <option key={fmt.id} value={fmt.id}>
                      {fmt.format_name}
                    </option>
                  ))}
                  <option value="ADD_NEW">+ Add New Custom Format...</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting} leftIcon={<Sparkles className="w-4 h-4" />}>
                  {editingCampaignId ? 'Save Campaign Changes' : 'Launch Campaign'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Format Modal */}
      {isFormatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Add Custom Email Format</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFormatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickSaveFormat} className="space-y-4">
              <Input
                label="Format Name"
                placeholder="e.g. Enterprise AI Proposal 2026"
                value={newFormatName}
                onChange={(e) => setNewFormatName(e.target.value)}
                required
              />
              <Input
                label="Email Subject"
                placeholder="Partnership Offer for ${company_name}"
                value={newFormatSubject}
                onChange={(e) => setNewFormatSubject(e.target.value)}
                required
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Email Body HTML / Text
                </label>
                <textarea
                  rows={6}
                  placeholder="Hi ${company_name}, we build custom AI & Web solutions..."
                  value={newFormatBody}
                  onChange={(e) => setNewFormatBody(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsFormatModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSavingFormat} leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                  Save &amp; Select Format
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
