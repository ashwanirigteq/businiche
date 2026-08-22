'use client';

import React, { useState } from 'react';
import { Mail, Sparkles, Send, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail?: string;
  recipientCompany?: string;
  recipientIndustry?: string;
  leadId?: string;
  isBulk?: boolean;
  selectedLeadIds?: string[];
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
  totalRecipientsCount = 1,
  onClose,
  onSuccess,
}: EmailModalProps) {
  const [toEmail, setToEmail] = useState(recipientEmail);
  const companyName = recipientCompany;
  const [contactName, setContactName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isBulk && (!toEmail || !toEmail.includes('@'))) {
      setError('Please enter a valid recipient email address.');
      return;
    }

    setIsSending(true);

    try {
      if (isBulk) {
        // Bulk campaign
        const res = await fetch('/api/email/send-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadIds: selectedLeadIds.length > 0 ? selectedLeadIds : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to dispatch bulk email campaign.');

        setSuccessMessage(`Bulk campaign sent! Delivered: ${data.sentCount}, Failed/Skipped: ${data.failedCount}.`);
        if (onSuccess) onSuccess();
      } else {
        // Single lead email
        const res = await fetch('/api/email/send-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            to: toEmail.trim(),
            companyName: companyName.trim() || 'Valued Partner',
            contactName: contactName.trim() || undefined,
            industry: recipientIndustry || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send email.');

        setSuccessMessage(`Collaboration offer successfully delivered to ${toEmail.trim()}!`);
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
      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{successMessage}</p>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-emerald-700 underline mt-1 cursor-pointer font-medium"
            >
              Close Dialog
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Email Delivery Error</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!successMessage && (
        <form onSubmit={handleSend} className="space-y-4">
          {isBulk ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Bulk Email Campaign ({selectedLeadIds.length > 0 ? `${selectedLeadIds.length} Selected Leads` : `All Leads with Email (~${totalRecipientsCount})`})</span>
              </div>
              <p className="text-slate-500 pt-1">
                Each company will receive a personalized, high-converting offer email from <strong>Rigteq Software</strong> referencing their company name and industry.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Recipient Email"
                required
                type="email"
                placeholder="decision-maker@company.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <Input
                label="Contact / Decision Maker Name (Optional)"
                placeholder="e.g. Alex (CEO / Founder)"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Email Preview Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Rigteq Software Offer Preview</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">From: Rigteq Software &lt;devsharma1991111@gmail.com&gt;</span>
            </div>

            <div className="space-y-2 text-slate-700 leading-relaxed font-sans bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
              <div className="font-semibold text-slate-900 text-xs">
                Subject: Partnership Proposal: Accelerating {companyName || '[Company Name]'}&apos;s Software Engineering | Rigteq Software
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2 text-slate-600 text-[11px]">
                <p>Hi {contactName || `${companyName || 'Team'}`},</p>
                <p>
                  I’ve been following <strong>{companyName || '[Company]'}</strong>{recipientIndustry ? ` in the ${recipientIndustry} space` : ''} and wanted to reach out directly.
                </p>
                <p>
                  At <strong>Rigteq Software</strong>, we partner with forward-thinking businesses to build, modernize, and scale mission-critical digital products (Web, Mobile, AI & Cloud).
                </p>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-100 font-medium text-slate-800">
                  ✨ <strong>Value Proposition:</strong> Full-Lifecycle Engineering • Dedicated Agile Pods • 40% Cost Savings • Free Architecture Audit &amp; 1-Week POC.
                </div>
                <p className="text-slate-500">
                  Best regards,<br />
                  <strong>Dev Sharma</strong> — Partnerships &amp; Solutions Lead, Rigteq Software
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSending}
              leftIcon={<Send className="w-4 h-4" />}
            >
              {isSending ? 'Delivering via SMTP...' : isBulk ? 'Send Bulk Campaign' : 'Send Offer Email'}
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
      title={props.isBulk ? 'Send Bulk Rigteq Software Offer' : `Send Collaboration Offer — ${props.recipientCompany || 'Lead'}`}
      maxWidth="lg"
    >
      <EmailModalContent {...props} />
    </Modal>
  );
}
