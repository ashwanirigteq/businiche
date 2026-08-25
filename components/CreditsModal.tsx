'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Zap, CreditCard, Mail, ShieldCheck, Clock } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  role: string;
  nextCreditDate?: string | null;
  onOpenSalesModal?: () => void;
}

export function CreditsModal({
  isOpen,
  onClose,
  credits,
  role,
  nextCreditDate,
  onOpenSalesModal,
}: CreditsModalProps) {
  const isInfinite = role === 'Admin' || credits === Infinity;

  const formattedNextDate = nextCreditDate
    ? new Date(nextCreditDate).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lead Intelligence Credits" maxWidth="md">
      <div className="space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Current Balance
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur border border-white/20">
              10,000 Weekly Free Refill
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight">
              {isInfinite ? '∞' : credits.toLocaleString()}
            </span>
            <span className="text-sm text-blue-200">Credits Available</span>
          </div>
          <p className="text-xs text-blue-100 mt-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {formattedNextDate
                ? `Next Weekly Refresh: ${formattedNextDate} (Resets to 10,000 Cr)`
                : 'Resets every 7 days to 10,000 weekly credits.'}
            </span>
          </p>
        </div>

        {/* Rate Sheet */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Credit Usage Rates
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
              <div className="text-xs text-blue-600 font-semibold mb-1">Generate</div>
              <div className="text-base font-bold text-blue-900">10 Cr / lead</div>
              <div className="text-[10px] text-blue-500 mt-0.5">30 leads = 300 Cr</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
              <div className="text-xs text-blue-600 font-semibold mb-1">Outreach Email</div>
              <div className="text-base font-bold text-blue-900">5 Cr / email</div>
              <div className="text-[10px] text-blue-500 mt-0.5">SMTP Delivered</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
              <div className="text-xs text-blue-600 font-semibold mb-1">Enhance Lead</div>
              <div className="text-base font-bold text-blue-900">5 Cr / scrape</div>
              <div className="text-[10px] text-blue-500 mt-0.5">AI Web Extract</div>
            </div>
          </div>
        </div>

        {/* Upgrade & Pricing Info */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Need Additional Credits?
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Need extra lead capacity for your campaigns? Request an instant payment invoice link for 10,000 or 100,000 extra credit packs.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => {
                onClose();
                if (onOpenSalesModal) onOpenSalesModal();
              }}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Instant Credit Top-Up
            </Button>
            <a href="mailto:ops@rigteq.com?subject=Credit%20Refill%20Request" className="flex-1">
              <Button
                variant="outline"
                size="md"
                className="w-full"
                leftIcon={<Mail className="w-4 h-4 text-blue-600" />}
              >
                Contact Ops Team
              </Button>
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
