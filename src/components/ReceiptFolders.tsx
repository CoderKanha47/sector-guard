'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  Folder,
  FolderOpen,
  IndianRupee,
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
  currency: string;
  timestamp: string;
  category: string;
  status: 'APPROVED' | 'FLAGGED' | 'DENIED' | null;
  riskScore: number | null;
  calculatedReimbursement: number | null;
  anomalies: Array<{ type: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }>;
}

interface ReceiptFoldersProps {
  employeeId: string;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  DENIED: 'bg-red-500/10 border-red-500/30 text-red-400',
  FLAGGED: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  APPROVED: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
};

export default function ReceiptFolders({ employeeId, selectedYear: controlledYear, onYearChange }: ReceiptFoldersProps) {
  const [folders, setFolders] = useState<YearFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
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
          const yearToUse = controlledYear ?? ((prev: number | null) => {
            if (prev !== null && full.some(y => y.year === prev)) return prev;
            const firstWithData = full.find(y => y.totalReceipts > 0);
            return firstWithData ? firstWithData.year : new Date().getFullYear();
          });
          setSelectedYear(prev => typeof yearToUse === 'function' ? yearToUse(prev) : yearToUse);
        }
      })
      .finally(() => setLoading(false));
  }, [employeeId, controlledYear]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Sync with parent when controlled year changes
  useEffect(() => {
    if (controlledYear !== undefined && controlledYear !== selectedYear) {
      setSelectedYear(controlledYear);
    }
  }, [controlledYear, selectedYear]);

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
    // Don't reset selectedYear or refetch folders - keep parent in sync
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    onYearChange?.(year);
  };

  if (loading) {
    return <p className="text-slate-500 text-sm font-mono">Loading receipt folders...</p>;
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl">
        <Folder className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400 font-semibold">No receipts recorded yet</p>
        <p className="text-xs text-slate-600 mt-1">Uploaded receipts are filed here by year and month.</p>
      </div>
    );
  }

  const currentYear = folders.find(y => y.year === selectedYear) ?? folders.find(y => y.year === new Date().getFullYear()) ?? folders[0];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* YEAR SELECTOR */}
      {!openMonth && (
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
          {folders.map(y => (
            <button
              key={y.year}
              onClick={() => handleYearChange(y.year)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                currentYear.year === y.year
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {y.year}
              <span className="ml-1.5 font-mono text-[10px] opacity-60">{y.totalReceipts}</span>
            </button>
          ))}
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

            return (
              <button
                key={monthNum}
                onClick={() => hasReceipts && folder && openMonthFolder(currentYear.year, folder)}
                disabled={!hasReceipts}
                className={`text-left rounded-xl p-4 border transition-all duration-200 ${
                  hasReceipts
                    ? 'bg-white/5 border-white/5 hover:border-blue-500/40 hover:bg-white/10 cursor-pointer'
                    : 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {hasReceipts ? (
                    <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${hasReceipts ? 'text-white' : 'text-slate-500'}`}>
                    {folder?.monthName ?? new Date(2000, monthNum - 1).toLocaleString('default', { month: 'long' })}
                  </span>
                </div>
                {hasReceipts && folder ? (
                  <>
                    <p className="text-lg font-black text-white leading-none">
                      {folder.count}
                      <span className="text-[10px] font-mono font-normal text-slate-500 ml-1">receipts</span>
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1.5 flex items-center gap-1">
                      <IndianRupee className="w-2.5 h-2.5" />
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
