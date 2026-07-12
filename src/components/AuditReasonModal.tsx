'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, ShieldAlert, Fingerprint } from 'lucide-react';

interface Anomaly {
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface AuditReasonModalProps {
  merchant: string;
  amount: number;
  currency: string;
  status: 'FLAGGED' | 'DENIED';
  riskScore: number;
  anomalies: Anomaly[];
  onClose: () => void;
}

export default function AuditReasonModal({
  merchant, amount, currency, status, riskScore, anomalies, onClose
}: AuditReasonModalProps) {
  const isDenied = status === 'DENIED';

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDenied ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {isDenied ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isDenied ? 'Claim Requires Investigation' : 'Flagged for Manual Review'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {merchant} · {currency} {amount}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-mono text-slate-400">Risk Score:</span>
          <span className={`text-sm font-black ${riskScore >= 60 ? 'text-red-400' : 'text-amber-400'}`}>
            {riskScore}/100
          </span>
        </div>

        <div className="space-y-2 mb-5">
          {anomalies.map((a, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-3 border text-xs ${
                a.severity === 'HIGH' ? 'bg-red-500/5 border-red-500/20 text-red-300' :
                a.severity === 'MEDIUM' ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' :
                'bg-slate-500/5 border-slate-500/20 text-slate-300'
              }`}
            >
              <span className="font-bold uppercase tracking-wide">{a.type.replace(/_/g, ' ')}</span>
              <p className="mt-1 text-slate-400 leading-relaxed">{a.description}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-lg p-3 text-xs font-medium ${isDenied ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>
          {isDenied
            ? "This claim requires further investigation before reimbursement can be processed. Please review with the employee before taking action."
            : "This claim has been flagged for manual review. It will not be included in the automatic monthly payout until resolved."}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}