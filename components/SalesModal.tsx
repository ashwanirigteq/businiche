'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Zap, CheckCircle2, Shield, Mail, AlertCircle } from 'lucide-react';

interface SalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SalesModal({ isOpen, onClose }: SalesModalProps) {
  const [selectedPack, setSelectedPack] = useState<'starter' | 'growth'>('starter');
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const packs = [
    {
      id: 'starter' as const,
      name: 'Starter Credit Refill',
      credits: 10000,
      priceUsd: 100,
      perLeadCost: '$0.01 / lead',
      popular: false,
      features: [
        '10,000 Extra Lead Credits',
        'Instant Credit Allocation',
        'Valid for 1 Year',
        'Bulk Email Outreach Enabled',
      ],
    },
    {
      id: 'growth' as const,
      name: 'Growth Enterprise Pack',
      credits: 100000,
      priceUsd: 499,
      perLeadCost: '$0.005 / lead (50% Off)',
      popular: true,
      features: [
        '100,000 Extra Lead Credits',
        'Instant Credit Allocation',
        'Dedicated Campaign Runner',
        'Priority Phone & Email Support',
      ],
    },
  ];

  const handleRequestPaymentLink = async () => {
    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    const pack = packs.find((p) => p.id === selectedPack)!;

    try {
      const res = await fetch('/api/credits/request-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pack.id,
          packageName: pack.name,
          creditsCount: pack.credits,
          priceUsd: pack.priceUsd,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send payment link.');

      setSuccessMessage(data.message || 'Payment link sent to your email address!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request payment link.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Instant Credit Packs & Top-Up" maxWidth="lg">
      <div className="space-y-6">
        {successMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">Payment Request Delivered!</h3>
            <p className="text-xs text-emerald-700 max-w-sm mx-auto">{successMessage}</p>
            <Button variant="outline" size="sm" onClick={onClose} className="mt-2 bg-white">
              Close Window
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPack(pack.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    selectedPack === pack.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                      Best Value
                    </span>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{pack.name}</h4>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-blue-900">${pack.priceUsd}</span>
                      <span className="text-xs text-slate-500">/ one-time</span>
                    </div>
                    <p className="text-xs font-semibold text-blue-600 mt-1">{pack.credits.toLocaleString()} Credits</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{pack.perLeadCost}</p>

                    <ul className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      {pack.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <input
                      type="radio"
                      name="pack_select"
                      checked={selectedPack === pack.id}
                      onChange={() => setSelectedPack(pack.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-xs font-bold text-slate-700">Select Package</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Includes 100% money-back guarantee &amp; instant credit receipt.</span>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleRequestPaymentLink}
                isLoading={isSending}
                leftIcon={<Mail className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Send Payment Link To Email
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
