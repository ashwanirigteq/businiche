'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowLeft,
  Phone,
  Globe,
  MapPin,
  Mail,
  ExternalLink,
  Calendar,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Save,
  X,
  Zap,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmailModal } from '@/components/EmailModal';
import {
  type Lead,
  type Comment,
  type LeadStatus,
  type UserRole,
  LEAD_STATUS_OPTIONS,
} from '@/lib/types';

function truncate(str: string | null, max = 25): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

interface ExtendedLead extends Lead {
  additional_emails?: string[];
  additional_phones?: string[];
}

interface EnrichResult {
  emails: string[];
  phones: string[];
  foundCount: number;
  error?: string;
  isTimedOut?: boolean;
  statusMessage?: string;
}

export default function LeadDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const leadId = resolvedParams.id;

  const [currentUser, setCurrentUser] = useState<{
    fullName: string;
    username: string;
    role: UserRole;
    credits?: number;
  } | null>(null);

  const [lead, setLead] = useState<ExtendedLead | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [isLoadingLead, setIsLoadingLead] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment form
  const [commentText, setCommentText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('New');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);

  // Edit contact details
  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [newExtraEmail, setNewExtraEmail] = useState('');
  const [newExtraPhone, setNewExtraPhone] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Email modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [targetEmailForModal, setTargetEmailForModal] = useState<string>('');

  // Enhance Lead (web scraper)
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);

  const fetchUser = useCallback(() => {
    fetch('/api/auth/me')
      .then((res) => { if (res.ok) return res.json(); throw new Error(); })
      .then((data) => setCurrentUser(data.user))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // Fetch lead + comments
  const fetchLead = useCallback(async () => {
    setIsLoadingLead(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch lead');
      setLead(data.lead);
      setSelectedStatus(data.lead.status || 'New');
      setEditEmail(data.lead.email || '');
      setEditPhone(data.lead.phone || '');
      setEditWebsite(data.lead.website || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading lead');
    } finally {
      setIsLoadingLead(false);
    }
  }, [leadId]);

  const fetchComments = useCallback(async (page = 1) => {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/comments?page=${page}&limit=10`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments || []);
        setTotalComments(data.total || 0);
        setCommentsTotalPages(data.totalPages || 1);
        setCommentsPage(data.page || 1);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
    fetchComments(1);
  }, [fetchLead, fetchComments]);

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    setCommentSuccess(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: commentText.trim(), status: selectedStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add comment');
      setCommentText('');
      setCommentSuccess(`Status set to "${selectedStatus}"`);
      if (lead) setLead({ ...lead, status: selectedStatus });
      fetchComments(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post note');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchComments(commentsPage);
    } catch {
      alert('Failed to delete comment.');
    }
  };

  // Update lead fields in DB
  const updateLeadFields = async (patchData: Partial<Lead> & { additional_emails?: string[]; additional_phones?: string[] }) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update lead');
      setLead(data.lead);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  // Edit specific email item in-place
  const handleEditEmailItem = async (oldEmail: string) => {
    const newEmail = prompt('Edit email address:', oldEmail);
    if (newEmail === null || newEmail.trim() === oldEmail) return;
    const cleanNew = newEmail.trim();

    if (!lead) return;
    let mainEmail = lead.email;
    let extraEmails = Array.isArray(lead.additional_emails) ? [...lead.additional_emails] : [];

    if (mainEmail === oldEmail) {
      mainEmail = cleanNew || null;
    } else {
      extraEmails = extraEmails.map((e) => (e === oldEmail ? cleanNew : e)).filter(Boolean);
    }

    await updateLeadFields({ email: mainEmail, additional_emails: extraEmails });
  };

  // Delete specific email item in-place
  const handleDeleteEmailItem = async (targetEmail: string) => {
    if (!confirm(`Delete email address "${targetEmail}"?`)) return;

    if (!lead) return;
    let mainEmail = lead.email;
    let extraEmails = Array.isArray(lead.additional_emails) ? [...lead.additional_emails] : [];

    if (mainEmail === targetEmail) {
      mainEmail = extraEmails.length > 0 ? extraEmails.shift()! : null;
    } else {
      extraEmails = extraEmails.filter((e) => e !== targetEmail);
    }

    await updateLeadFields({ email: mainEmail, additional_emails: extraEmails });
  };

  // Edit specific phone item in-place
  const handleEditPhoneItem = async (oldPhone: string) => {
    const newPhone = prompt('Edit phone number:', oldPhone);
    if (newPhone === null || newPhone.trim() === oldPhone) return;
    const cleanNew = newPhone.trim();

    if (!lead) return;
    let mainPhone = lead.phone;
    let extraPhones = Array.isArray(lead.additional_phones) ? [...lead.additional_phones] : [];

    if (mainPhone === oldPhone) {
      mainPhone = cleanNew || null;
    } else {
      extraPhones = extraPhones.map((p) => (p === oldPhone ? cleanNew : p)).filter(Boolean);
    }

    await updateLeadFields({ phone: mainPhone, additional_phones: extraPhones });
  };

  // Delete specific phone item in-place
  const handleDeletePhoneItem = async (targetPhone: string) => {
    if (!confirm(`Delete phone number "${targetPhone}"?`)) return;

    if (!lead) return;
    let mainPhone = lead.phone;
    let extraPhones = Array.isArray(lead.additional_phones) ? [...lead.additional_phones] : [];

    if (mainPhone === targetPhone) {
      mainPhone = extraPhones.length > 0 ? extraPhones.shift()! : null;
    } else {
      extraPhones = extraPhones.filter((p) => p !== targetPhone);
    }

    await updateLeadFields({ phone: mainPhone, additional_phones: extraPhones });
  };

  // Save edited contact details & additional emails/phones
  const handleSaveContactEdit = async () => {
    if (!lead) return;
    setIsSavingEdit(true);
    try {
      const extraEmails = Array.isArray(lead.additional_emails) ? [...lead.additional_emails] : [];
      if (newExtraEmail.trim() && !extraEmails.includes(newExtraEmail.trim())) {
        extraEmails.push(newExtraEmail.trim());
      }

      const extraPhones = Array.isArray(lead.additional_phones) ? [...lead.additional_phones] : [];
      if (newExtraPhone.trim() && !extraPhones.includes(newExtraPhone.trim())) {
        extraPhones.push(newExtraPhone.trim());
      }

      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          website: editWebsite.trim() || null,
          additional_emails: extraEmails,
          additional_phones: extraPhones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setLead(data.lead);
      setNewExtraEmail('');
      setNewExtraPhone('');
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Enhance Lead
  const handleEnhanceLead = async () => {
    setIsEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/enhance`, { method: 'POST' });
      const data: EnrichResult & { remainingCredits?: number; nextCreditDate?: string } = await res.json();
      setEnrichResult(data);
      if (data.remainingCredits !== undefined) {
        window.dispatchEvent(
          new CustomEvent('bn_credits_updated', {
            detail: { remaining: data.remainingCredits, nextCreditDate: data.nextCreditDate },
          })
        );
      }
      await fetchLead();
      fetchUser();
    } catch {
      setEnrichResult({ emails: [], phones: [], foundCount: 0, error: 'Timed out' });
    } finally {
      setIsEnriching(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateString; }
  };

  const cleanWebsite = (w: string) => w.replace(/^https?:\/\/(www\.)?/, '');

  const openEmailModalFor = (email: string) => {
    setTargetEmailForModal(email);
    setIsEmailModalOpen(true);
  };

  const allEmails = Array.from(
    new Set([
      ...(lead?.email ? [lead.email] : []),
      ...(Array.isArray(lead?.additional_emails) ? lead.additional_emails : []),
    ])
  );

  const allPhones = Array.from(
    new Set([
      ...(lead?.phone ? [lead.phone] : []),
      ...(Array.isArray(lead?.additional_phones) ? lead.additional_phones : []),
    ])
  );

  return (
    <div className="min-h-screen bg-[#f0f6ff] flex flex-col pb-12">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Leads</span>
          </Link>

          <div className="flex items-center gap-2">
            {lead?.website && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={isEnriching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                onClick={handleEnhanceLead}
                disabled={isEnriching}
              >
                {isEnriching ? 'Enriching...' : 'Enhance Lead'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Mail className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => openEmailModalFor(lead?.email || '')}
              disabled={allEmails.length === 0}
            >
              Send Email
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLead}>Retry</Button>
          </div>
        )}

        {/* Enhancement Result Banner */}
        {enrichResult && (
          <div className={`mb-5 p-4 rounded-xl border text-xs ${
            enrichResult.error
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>
                  {enrichResult.foundCount > 0
                    ? `Discovered ${enrichResult.foundCount} new contact detail(s)`
                    : enrichResult.statusMessage || 'No new contacts found'}
                </span>
              </div>
              <button onClick={() => setEnrichResult(null)} className="text-blue-500 hover:underline cursor-pointer">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Lead Details Card */}
        {isLoadingLead ? (
          <div className="bg-white rounded-2xl border border-blue-100 p-8 space-y-6 shadow-xs animate-pulse">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : lead ? (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 sm:p-8 mb-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{lead.company_name}</h1>
                    <StatusBadge status={lead.status} />
                    <Badge variant="primary" size="md">{lead.industry}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>Source: {lead.source}</span>
                    <span>•</span>
                    <span className="font-mono">Added {formatDate(lead.created_on)}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition-colors cursor-pointer shrink-0"
              >
                {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                <span>{isEditing ? 'Cancel' : 'Edit Contact'}</span>
              </button>
            </div>

            {/* Editing Form vs Read-Only Details */}
            {isEditing ? (
              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">Edit Contacts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="Primary Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} leftIcon={<Mail className="w-4 h-4" />} />
                  <Input label="Primary Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} leftIcon={<Phone className="w-4 h-4" />} />
                  <Input label="Website" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} leftIcon={<Globe className="w-4 h-4" />} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-blue-100">
                  <Input
                    label="Add Extra Email"
                    placeholder="secondary@company.com"
                    value={newExtraEmail}
                    onChange={(e) => setNewExtraEmail(e.target.value)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  />
                  <Input
                    label="Add Extra Phone"
                    placeholder="+1 555 987 6543"
                    value={newExtraPhone}
                    onChange={(e) => setNewExtraPhone(e.target.value)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" isLoading={isSavingEdit} leftIcon={<Save className="w-3.5 h-3.5" />} onClick={handleSaveContactEdit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-blue-50/40 border border-blue-100 text-xs">
                {/* Emails Column */}
                <div className="space-y-1.5">
                  <span className="text-blue-500 font-bold uppercase tracking-wider text-[10px] block">Emails ({allEmails.length})</span>
                  {allEmails.length > 0 ? (
                    <div className="space-y-1.5">
                      {allEmails.map((em, idx) => (
                        <div key={em} className="group flex items-center justify-between gap-1 py-0.5 border-b border-blue-50/60 last:border-0">
                          <button
                            type="button"
                            onClick={() => openEmailModalFor(em)}
                            title={em}
                            className="inline-flex items-center gap-1.5 text-blue-700 font-medium hover:underline text-xs truncate flex-1 text-left"
                          >
                            <Mail className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                            <span className="truncate">{truncate(em, 20)}</span>
                            {idx === 0 && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded shrink-0">main</span>}
                          </button>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditEmailItem(em)}
                              className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                              title="Edit Email"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmailItem(em)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Delete Email"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No email</span>
                  )}
                </div>

                {/* Phones Column */}
                <div className="space-y-1.5">
                  <span className="text-blue-500 font-bold uppercase tracking-wider text-[10px] block">Phones ({allPhones.length})</span>
                  {allPhones.length > 0 ? (
                    <div className="space-y-1.5">
                      {allPhones.map((ph, idx) => (
                        <div key={ph} className="group flex items-center justify-between gap-1 py-0.5 border-b border-slate-50 last:border-0">
                          <a
                            href={`tel:${ph}`}
                            className="inline-flex items-center gap-1.5 text-slate-800 font-mono font-medium hover:underline text-xs truncate flex-1 text-left"
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">{ph}</span>
                            {idx === 0 && <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-sans shrink-0">main</span>}
                          </a>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditPhoneItem(ph)}
                              className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                              title="Edit Phone"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePhoneItem(ph)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Delete Phone"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </div>

                {/* Website Column */}
                <div>
                  <span className="text-blue-500 font-bold uppercase tracking-wider text-[10px] block mb-1.5">Website</span>
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={lead.website}
                      className="inline-flex items-center gap-1.5 text-blue-600 font-medium hover:underline text-xs"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{truncate(cleanWebsite(lead.website), 22)}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </div>

                {/* Address Column */}
                <div>
                  <span className="text-blue-500 font-bold uppercase tracking-wider text-[10px] block mb-1.5">Address</span>
                  {lead.address ? (
                    <div className="flex items-start gap-1 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{lead.address}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Add Activity Note */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 sm:p-8 mb-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50">
            <MessageSquare className="w-4.5 h-4.5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Add Activity Note</h2>
          </div>

          {commentSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{commentSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAddComment} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5">Update Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                className="w-full sm:w-64 py-2 px-3 rounded-xl border border-blue-100 text-xs font-semibold text-slate-800 bg-white"
              >
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <textarea
                required
                rows={3}
                placeholder="Log meeting notes, call feedback, or follow-up details..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-blue-100 text-xs text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md" isLoading={isSubmittingComment} leftIcon={<Send className="w-3.5 h-3.5" />}>
                Post Note
              </Button>
            </div>
          </form>
        </div>

        {/* Activity Notes History */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50">
            <Clock className="w-4.5 h-4.5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Activity History ({totalComments})</h2>
          </div>

          {isLoadingComments ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : comments.length > 0 ? (
            <div className="divide-y divide-blue-50">
              {comments.map((c) => (
                <div key={c.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold uppercase">
                        {(c.full_name || c.username || 'U').charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{c.full_name || `@${c.username}`}</span>
                      <StatusBadge status={c.status} />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">{formatDate(c.created_at)}</span>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-rose-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 pl-8 whitespace-pre-wrap leading-relaxed">{c.comment_text}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={MessageSquare} title="No notes yet" description="Add your first activity note above." />
          )}
        </div>
      </main>

      {/* Email Modal */}
      {lead && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          leadId={lead.id}
          recipientEmail={targetEmailForModal || lead.email || ''}
          recipientCompany={lead.company_name}
          recipientIndustry={lead.industry}
          onSuccess={() => {
            fetchLead();
            fetchComments(1);
          }}
        />
      )}
    </div>
  );
}
