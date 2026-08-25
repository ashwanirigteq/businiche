'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Sparkles, Send, AlertCircle, CheckCircle2, User, Save, BookmarkCheck, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { EmailFormat } from '@/lib/types';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail?: string;
  recipientCompany?: string;
  recipientIndustry?: string;
  leadId?: string;
  isBulk?: boolean;
  selectedLeadIds?: string[];
  validEmailCount?: number;
  totalRecipientsCount?: number;
  onSuccess?: () => void;
}

function EmailModalContent({
  recipientEmail = '',
  recipientCompany = '',
  recipientIndustry = '',
  leadId,
  isBulk = false,
  selectedLeadIds = [],
  validEmailCount,
  totalRecipientsCount = 1,
  onClose,
  onSuccess,
}: EmailModalProps) {
  const [toEmail, setToEmail] = useState(recipientEmail);
  const companyName = recipientCompany;
  const [contactName, setContactName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');

  const [formats, setFormats] = useState<EmailFormat[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [isSavingFormat, setIsSavingFormat] = useState(false);
  const [newFormatName, setNewFormatName] = useState('');
  const [showSaveFormatInput, setShowSaveFormatInput] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetCount = validEmailCount !== undefined ? validEmailCount : (selectedLeadIds.length > 0 ? selectedLeadIds.length : totalRecipientsCount);

  // Fetch Formats
  const fetchFormats = useCallback(async () => {
    try {
      const res = await fetch('/api/email/formats');
      if (res.ok) {
        const data = await res.json();
        setFormats(data.formats || []);
        if (data.formats?.length > 0 && !subject && !bodyText) {
          const first = data.formats[0];
          setSelectedFormatId(first.id);
          setSubject(first.subject);
          setBodyText(first.format_large_text);
        }
      }
    } catch {}
  }, [subject, bodyText]);

  useEffect(() => {
    fetchFormats();
  }, [fetchFormats]);

  const handleSelectFormat = (fmtId: string) => {
    setSelectedFormatId(fmtId);
    const found = formats.find((f) => f.id === fmtId);
    if (found) {
      setSubject(found.subject);
      setBodyText(found.format_large_text);
    }
  };

  const handleSaveCurrentFormat = async () => {
    if (!newFormatName.trim()) {
      alert('Please enter a format name (e.g. "SaaS Partnership Offer")');
      return;
    }

    setIsSavingFormat(true);
    try {
      const res = await fetch('/api/email/formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formatName: newFormatName.trim(),
          subject: subject.trim(),
          formatLargeText: bodyText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save format template.');

      alert(`Email format "${newFormatName.trim()}" saved successfully!`);
      setNewFormatName('');
      setShowSaveFormatInput(false);
      fetchFormats();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving format template.');
    } finally {
      setIsSavingFormat(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isBulk && (!toEmail || !toEmail.includes('@'))) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSending(true);

    try {
      if (isBulk) {
        const res = await fetch('/api/email/send-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadIds: selectedLeadIds.length > 0 ? selectedLeadIds : undefined,
            customSubject: subject,
            customBody: bodyText,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bulk campaign failed.');

        if (data.remainingCredits !== undefined) {
          window.dispatchEvent(
            new CustomEvent('bn_credits_updated', {
              detail: { remaining: data.remainingCredits, nextCreditDate: data.nextCreditDate },
            })
          );
        }

        setSuccessMessage(`Bulk email campaign finished. Delivered: ${data.sentCount}.`);
        if (onSuccess) onSuccess();
      } else {
        const res = await fetch('/api/email/send-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            to: toEmail.trim(),
            companyName: companyName.trim() || 'Valued Partner',
            contactName: contactName.trim() || undefined,
            industry: recipientIndustry || undefined,
            customSubject: subject,
            customBody: bodyText,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send email.');

        if (data.remainingCredits !== undefined) {
          window.dispatchEvent(
            new CustomEvent('bn_credits_updated', {
              detail: { remaining: data.remainingCredits, nextCreditDate: data.nextCreditDate },
            })
          );
        }

        setSuccessMessage(`Offer email delivered to ${toEmail.trim()}.`);
        if (onSuccess) onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending email';
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{successMessage}</p>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-emerald-700 underline mt-1 cursor-pointer font-medium"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Email Delivery Error</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
          <div className="pt-1.5 border-t border-rose-200/60 flex justify-end">
            <a
              href="/profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Add / Update Email Details on Profile Page →
            </a>
          </div>
        </div>
      )}

      {!successMessage && (
        <form onSubmit={handleSend} className="space-y-4">
          {/* Top Form Controls: Recipient Email & Format Selector */}
          {isBulk ? (
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-900">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Bulk Email Outreach ({targetCount} Valid Email Leads)</span>
              </div>
              <p className="text-blue-700 text-xs">
                Dispatches personalized emails replacing dynamic variables (5 credits per lead).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="To (Recipient Email)"
                required
                type="email"
                placeholder="contact@company.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <Input
                label="Contact Name (Optional)"
                placeholder="e.g. Alex"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Load Format & Save Format Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-1">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <label className="text-xs font-bold text-slate-700 shrink-0">Load Format:</label>
              <select
                value={selectedFormatId}
                onChange={(e) => handleSelectFormat(e.target.value)}
                className="w-full py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {formats.map((fmt) => (
                  <option key={fmt.id} value={fmt.id}>
                    {fmt.format_name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSaveFormatInput(!showSaveFormatInput)}
              leftIcon={<Save className="w-3.5 h-3.5 text-blue-600" />}
              className="shrink-0"
            >
              {showSaveFormatInput ? 'Cancel Save' : 'Save Format Template'}
            </Button>
          </div>

          {/* Save Format Input Drawer */}
          {showSaveFormatInput && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center gap-2 animate-in fade-in duration-150">
              <input
                type="text"
                placeholder="Enter new format name..."
                value={newFormatName}
                onChange={(e) => setNewFormatName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveCurrentFormat}
                isLoading={isSavingFormat}
                leftIcon={<BookmarkCheck className="w-3.5 h-3.5" />}
              >
                Save
              </Button>
            </div>
          )}

          {/* Subject Field */}
          <Input
            label="Subject Line"
            required
            placeholder="Partnership Proposal: Accelerating ${company_name}'s Growth"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          {/* Body Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Email Body (HTML / Plain Text)</label>
              <span className="text-[10px] text-slate-400 font-mono">
                Placeholders: {"${company_name}"}, {"${industry}"}, {"${user_full_name}"}, {"${user_company_name}"}, {"${user_email}"}
              </span>
            </div>
            <textarea
              rows={7}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSending}
              leftIcon={<Send className="w-4 h-4" />}
            >
              {isSending ? 'Sending Mail...' : isBulk ? `Send Bulk Email (${targetCount})` : 'Send Offer Email'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function EmailModal(props: EmailModalProps) {
  if (!props.isOpen) return null;

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.isBulk ? 'Send Bulk Campaign' : `Outreach Email — ${props.recipientCompany || 'Lead'}`}
      maxWidth="lg"
    >
      <EmailModalContent {...props} />
    </Modal>
  );
}
