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
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetCount = validEmailCount !== undefined ? validEmailCount : (selectedLeadIds.length > 0 ? selectedLeadIds.length : totalRecipientsCount);

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
              Close
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
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
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-900">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Bulk Email Campaign ({targetCount} Valid Email Leads)</span>
              </div>
              <p className="text-blue-700 pt-1 text-xs">
                Recipients with valid email addresses will receive a personalized partnership offer. (5 credits per lead emailed)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Recipient Email"
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

          {/* Email Preview Card */}
          <div className="rounded-xl border border-blue-100 bg-slate-50/50 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-100">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Offer Email Preview</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">From: sales@rigteq.com</span>
            </div>

            <div className="space-y-2 text-slate-700 leading-relaxed font-sans bg-white p-3.5 rounded-lg border border-blue-100 shadow-xs text-xs">
              <div className="font-semibold text-slate-900">
                Subject: Partnership Proposal: Accelerating {companyName || '[Company]'}&apos;s Digital Growth | Rigteq Software
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2 text-slate-600 text-[11px]">
                <p>Hi {contactName || `${companyName || 'Team'}`},</p>
                <p>
                  I’ve been following <strong>{companyName || '[Company]'}</strong>{recipientIndustry ? ` in ${recipientIndustry}` : ''} and wanted to connect directly.
                </p>
                <p>
                  At <strong>Rigteq Software</strong>, we partner with growth-focused businesses to build, modernize, and scale mission-critical digital products.
                </p>
                <p className="text-slate-500">
                  Best regards,<br />
                  <strong>Dev Sharma</strong> — Rigteq Software (sales@rigteq.com)
                </p>
              </div>
            </div>
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
      title={props.isBulk ? 'Send Bulk Campaign' : `Email — ${props.recipientCompany || 'Lead'}`}
      maxWidth="lg"
    >
      <EmailModalContent {...props} />
    </Modal>
  );
}
