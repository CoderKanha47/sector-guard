'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  Folder,
  FolderOpen,
  DollarSign,
  CalendarDays,
  Lock,
  CheckCircle2
} from 'lucide-react';
import AuditReasonModal from './AuditReasonModal';

export interface MonthFolder {
  month: number;
  monthName: string;
  count: number;
  totalAmount: number;
  approvedCount: number;
  flaggedCount: number;
  deniedCount: number;
  payout: {
    status: string;
    totalClaimed: number;
    totalReimbursement: number;
    paidAt: string | null;
  } | null;
}

export interface YearFolder {
  year: number;
  totalReceipts: number;
  months: MonthFolder[];
}

export interface FolderReceipt {
  id: string;
  merchant: string;
  amount: number;
  amountUsd?: number;
  currency: string;
  fxRate?: number;
  fxRateDate?: string;
  fxProvider?: string;
  conversionStatus?: string;
  timestamp: string;
  category: string;
  status: 'APPROVED' | 'FLAGGED' | 'DENIED' | null;
  riskScore: number | null;
  calculatedReimbursement: number | null;
  calculatedReimbursementUsd?: number;
  policyLimitUsd?: number;
  anomalies: Array<{ type: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }>;
}

interface ReceiptFoldersProps {
  employeeId: string;
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  DENIED: 'bg-red-500/10 border-red-500/30 text-red-400',
  FLAGGED: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  APPROVED: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReceiptFolders({ employeeId, selectedYear, onYearChange, selectedMonth, onMonthChange }: ReceiptFoldersProps) {
  const [folders, setFolders] = useState<YearFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMonth, setOpenMonth] = useState<{ year: number; folder: MonthFolder } | null>(null);
  const [receipts, setReceipts] = useState<FolderReceipt[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [reasonReceipt, setReasonReceipt] = useState<FolderReceipt | null>(null);

  const fetchFolders = useCallback(() => {
    fetch(`/api/employees/${employeeId}/receipts`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const tree: YearFolder[] = data.folders;
          const byYear = new Map(tree.map(y => [y.year, y]));
          const full: YearFolder[] = [];
          for (let y = 2000; y <= 2099; y++) {
            full.push(byYear.get(y) ?? { year: y, totalReceipts: 0, months: [] });
          }
          setFolders(full);
        }
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const openMonthFolder = (year: number, folder: MonthFolder) => {
    setOpenMonth({ year, folder });
    setLoadingMonth(true);
    setReceipts([]);
    fetch(`/api/employees/${employeeId}/receipts?year=${year}&month=${folder.month}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setReceipts(data.receipts);
      })
      .finally(() => setLoadingMonth(false));
  };

  const closeMonthFolder = () => {
    setOpenMonth(null);
    setReceipts([]);
  };

  const handleYearChange = (year: number) => {
    onYearChange(year);
  };

  if (loading) {
    return <p className="text-slate-500 text-sm font-mono">Loading receipt folders...</p>;
  }

  const currentYear = folders.find(y => y.year === selectedYear) ?? { year: selectedYear, totalReceipts: 0, months: [] };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* YEAR SELECTOR - Single dropdown replacing the button grid */}
      {!openMonth && (
        <div className="flex items-center gap-3 flex-wrap">
          <CalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Year</span>
          <select
            value={selectedYear}
            onChange={e => handleYearChange(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 shrink-0"
          >
            {Array.from({ length: 100 }, (_, i) => 2000 + i).map(y => (
              <option key={y} value={y} className="bg-slate-900">{y}</option>
            ))}
          </select>
          <span className="text-xs font-mono text-slate-500 opacity-60">
            {currentYear.totalReceipts} receipt{currentYear.totalReceipts !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {openMonth ? (
        /* INSIDE A MONTH FOLDER */
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={closeMonthFolder}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to {openMonth.year}
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-bold text-white">
                {openMonth.folder.monthName} {openMonth.year}
              </span>
              <span className="font-mono opacity-60">
                {receipts.length || openMonth.folder.count} receipt{openMonth.folder.count !== 1 ? 's' : ''}
              </span>
              {openMonth.folder.payout && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    openMonth.folder.payout.status === 'PAID'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  }`}
                >
                  {openMonth.folder.payout.status === 'PAID' ? (
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  ) : (
                    <Lock className="w-2.5 h-2.5" />
                  )}
                  {openMonth.folder.payout.status === 'PAID' ? 'PAID' : 'CLOSED'}
                </span>
              )}
            </div>
          </div>

          {loadingMonth ? (
            <p className="text-slate-500 text-sm font-mono">Loading receipts...</p>
          ) : receipts.length === 0 ? (
            <p className="text-slate-500 text-xs font-mono py-6 text-center bg-white/5 border border-dashed border-white/10 rounded-xl">
              No receipts in this month.
            </p>
          ) : (
            <div className="space-y-2">
              {receipts.map(receipt => (
                <div
                  key={receipt.id}
                  className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{receipt.merchant}</p>
                    <p className="text-xs text-slate-500">
                      {receipt.category} · {new Date(receipt.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-white">
                      {receipt.currency} {receipt.amount.toFixed(2)}
                      {receipt.conversionStatus === 'CONVERTED' && receipt.amountUsd != null && (
                        <span className="text-slate-400 ml-1">(≈${receipt.amountUsd.toFixed(2)} USD)</span>
                      )}
                      {(receipt.conversionStatus === 'PENDING_REVIEW' || receipt.conversionStatus === 'FAILED') && (
                        <span className="text-amber-400 ml-1 text-xs">(Conversion unavailable)</span>
                      )}
                    </span>
                    {receipt.status && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          STATUS_BADGE_CLASSES[receipt.status] ?? 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                        }`}
                      >
                        {receipt.status}
                      </span>
                    )}
                    {(receipt.status === 'FLAGGED' || receipt.status === 'DENIED') && (
                      <button
                        onClick={() => setReasonReceipt(receipt)}
                        className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
                      >
                        View Reason
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 12-MONTH CALENDAR GRID FOR THE SELECTED YEAR */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(monthNum => {
            const folder = currentYear.months.find(m => m.month === monthNum);
            const hasReceipts = !!folder && folder.count > 0;
            const isSelected = selectedMonth === monthNum;

            return (
              <button
                key={monthNum}
                onClick={() => {
                  onMonthChange(monthNum);
                  if (hasReceipts && folder) {
                    openMonthFolder(currentYear.year, folder);
                  }
                }}
                className={`text-left rounded-xl p-4 border transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/50'
                    : hasReceipts
                    ? 'bg-white/5 border-white/5 hover:border-blue-500/40 hover:bg-white/10 cursor-pointer'
                    : 'bg-white/[0.02] border-white/5 opacity-60 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {hasReceipts ? (
                    <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${hasReceipts ? 'text-white' : 'text-slate-500'}`}>
                    {folder?.monthName ?? MONTH_NAMES[monthNum - 1]}
                  </span>
                </div>
                {hasReceipts && folder ? (
                  <>
                    <p className="text-lg font-black text-white leading-none">
                      {folder.count}
                      <span className="text-[10px] font-mono font-normal text-slate-500 ml-1">receipts</span>
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1.5 flex items-center gap-1">
                      <DollarSign className="w-2.5 h-2.5" />
                      {folder.totalAmount.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {folder.approvedCount > 0 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          {folder.approvedCount} ✓
                        </span>
                      )}
                      {folder.flaggedCount > 0 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          {folder.flaggedCount} !
                        </span>
                      )}
                      {folder.deniedCount > 0 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                          {folder.deniedCount} ✕
                        </span>
                      )}
                      {folder.payout && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${
                            folder.payout.status === 'PAID'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          }`}
                        >
                          {folder.payout.status === 'PAID' ? 'PAID' : 'CLOSED'}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] font-mono text-slate-600 mt-1">No receipts</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {reasonReceipt && (
        <AuditReasonModal
          merchant={reasonReceipt.merchant}
          amount={reasonReceipt.amount}
          amountUsd={reasonReceipt.amountUsd}
          currency={reasonReceipt.currency}
          status={reasonReceipt.status === 'DENIED' ? 'DENIED' : 'FLAGGED'}
          riskScore={reasonReceipt.riskScore ?? 0}
          anomalies={reasonReceipt.anomalies}
          onClose={() => setReasonReceipt(null)}
        />
      )}
    </div>
  );
}
