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
  } | null>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [isLoadingLead, setIsLoadingLead] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Comment Form State
  const [commentText, setCommentText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('New');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);

  // Edit Lead Modal / State
  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Fetch Current User
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Unauthenticated');
      })
      .then((data) => setCurrentUser(data.user))
      .catch(() => {});
  }, []);

  // Fetch Lead Details
  const fetchLead = useCallback(async () => {
    setIsLoadingLead(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch lead details');
      }

      setLead(data.lead);
      setSelectedStatus(data.lead.status || 'New');
      setEditEmail(data.lead.email || '');
      setEditPhone(data.lead.phone || '');
      setEditWebsite(data.lead.website || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading lead';
      setError(msg);
    } finally {
      setIsLoadingLead(false);
    }
  }, [leadId]);

  // Fetch Comments
  const fetchComments = useCallback(
    async (page: number = 1) => {
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
    },
    [leadId]
  );

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [leadRes, commRes] = await Promise.all([
          fetch(`/api/leads/${leadId}`),
          fetch(`/api/leads/${leadId}/comments?page=1&limit=10`),
        ]);

        if (ignore) return;

        if (leadRes.ok) {
          const leadData = await leadRes.json();
          setLead(leadData.lead);
          setSelectedStatus(leadData.lead.status || 'New');
          setEditEmail(leadData.lead.email || '');
          setEditPhone(leadData.lead.phone || '');
          setEditWebsite(leadData.lead.website || '');
        }

        if (commRes.ok) {
          const commData = await commRes.json();
          setComments(commData.comments || []);
          setTotalComments(commData.total || 0);
          setCommentsTotalPages(commData.totalPages || 1);
          setCommentsPage(1);
        }
      } catch (loadErr: unknown) {
        if (!ignore) {
          const msg = loadErr instanceof Error ? loadErr.message : 'Error loading lead details';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoadingLead(false);
          setIsLoadingComments(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [leadId]);

  // Add Comment Handler
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    setCommentSuccess(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_text: commentText.trim(),
          status: selectedStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add comment');
      }

      setCommentText('');
      setCommentSuccess(`Status updated to "${selectedStatus}" and comment recorded.`);
      // Update local lead status
      if (lead) {
        setLead({ ...lead, status: selectedStatus });
      }
      // Refresh comments from page 1
      fetchComments(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      setError(msg);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Save Lead Contact Details
  const handleSaveContactEdit = async () => {
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          website: editWebsite.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save lead');

      setLead(data.lead);
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      alert(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Breadcrumb & Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Leads</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Mail className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => setIsEmailModalOpen(true)}
            >
              Send Offer Email
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLead} className="bg-white">
              Retry
            </Button>
          </div>
        )}

        {/* Lead Main Card */}
        {isLoadingLead ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6 shadow-xs animate-pulse">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        ) : lead ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 mb-8 space-y-6">
            {/* Header / Company Info */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      {lead.company_name}
                    </h1>
                    <StatusBadge status={lead.status} />
                    <Badge variant="primary" size="md">
                      {lead.industry}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>Source: {lead.source}</span>
                    <span>•</span>
                    <span className="font-mono">Created: {formatDate(lead.created_on)}</span>
                  </p>
                </div>
              </div>

              {/* Edit Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                </button>
              </div>
            </div>

            {/* Editable Contact Info or Standard Display */}
            {isEditing ? (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Edit Lead
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="contact@company.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                  <Input
                    label="Phone Number"
                    placeholder="(555) 123-4567"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                  <Input
                    label="Website URL"
                    placeholder="https://company.com"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    leftIcon={<Globe className="w-4 h-4" />}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isSavingEdit}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                    onClick={handleSaveContactEdit}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                {/* Email */}
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">
                    Email
                  </span>
                  {lead.email ? (
                    <button
                      type="button"
                      onClick={() => setIsEmailModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-blue-600 font-medium hover:underline text-xs"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-slate-400 italic hover:text-slate-600 underline flex items-center gap-1"
                    >
                      <span>+ Add email</span>
                    </button>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">
                    Phone
                  </span>
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 text-slate-800 font-mono font-medium hover:underline text-xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{lead.phone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </div>

                {/* Website */}
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">
                    Website
                  </span>
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 font-medium hover:underline text-xs"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </div>

                {/* Location / Maps */}
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">
                    Location
                  </span>
                  {lead.address ? (
                    <div className="flex items-start gap-1 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
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

        {/* Add Comment Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 mb-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">
                Add Comment
              </h2>
            </div>
          </div>

          {commentSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{commentSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAddComment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                className="w-full sm:w-64 py-2.5 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer font-medium"
              >
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Notes
              </label>
              <textarea
                required
                rows={3}
                placeholder="Log notes about call, email discussion, follow-up date and feedback, or any other relevant details."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmittingComment}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Post Comment
              </Button>
            </div>
          </form>
        </div>

        {/* Comments History List (Latest First) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">
                Comment &amp; Activity History ({totalComments})
              </h2>
            </div>
          </div>

          {isLoadingComments ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {comments.map((comment) => (
                <div key={comment.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold uppercase">
                        {(comment.full_name || comment.username || 'U').charAt(0)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {comment.full_name || `@${comment.username}` || 'User'}
                        </span>
                        <StatusBadge status={comment.status} />
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(comment.created_at)}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 pl-9 whitespace-pre-wrap leading-relaxed">
                    {comment.comment_text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No comments recorded yet"
              description="Be the first to add an interaction note, discussion update, or status change for this lead above."
            />
          )}

          {/* Comments Pagination */}
          {commentsTotalPages > 1 && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {commentsPage} of {commentsTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={commentsPage <= 1 || isLoadingComments}
                  onClick={() => fetchComments(commentsPage - 1)}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={commentsPage >= commentsTotalPages || isLoadingComments}
                  onClick={() => fetchComments(commentsPage + 1)}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Email Offer Modal */}
      {lead && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          leadId={lead.id}
          recipientEmail={lead.email || ''}
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
