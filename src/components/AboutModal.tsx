'use client';

import React from 'react';
import { X, ShieldCheck, ScanLine, Fingerprint, Wallet } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-black text-white mb-2">About Sector Guard</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          An AI-powered expense reimbursement auditing platform. Employees upload receipts,
          a hosted vision-language model extracts the data automatically, and a rule-based
          fraud engine catches policy violations before finance ever sees them.
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Automated Extraction</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Receipt images are parsed into structured data — merchant, amount, category — with zero manual entry.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 shrink-0">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Fraud Detection</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Catches policy violations, split-receipt abuse, and temporally impossible overlapping claims.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Trust Scoring</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Every employee carries a dynamic trust rating that adjusts based on their audit history.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Locked Monthly Payouts</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Approved reimbursements are finalized into permanent monthly payout records — an immutable audit trail.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}