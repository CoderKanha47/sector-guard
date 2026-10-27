'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Star,
  Receipt,
  CalendarCheck2,
  ShieldCheck,
  AlertTriangle,
  ShieldX,
  Briefcase,
  MapPin,
  Lock,
  CheckCircle2,
  DollarSign,
  Clock,
  DollarSign as DollarSignIcon
} from 'lucide-react';
import ReceiptFolders from './ReceiptFolders';

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

interface EmployeeRecordsProps {
  employeeId: string;
}

interface PayoutRecord {
  id: string;
  year: number;
  month: number;
  status: string;
  totalClaimed: number;
  totalClaimedUsd?: number;
  totalReimbursement: number;
  totalReimbursementUsd?: number;
  expenseCount: number;
  paidAt: string | null;
}

interface MyProfile {
  id: string;
  name: string;
  department: string;
  designation: string;
  address: string;
  tierLimit: number;
  tierLimitCurrency: string;
  rating: number;
  billsUploaded: number;
  totalClaimed: number;
  totalClaimedUsd: number;
  totalApproved: number;
  totalApprovedUsd: number;
  totalPaid: number;
  totalPaidUsd: number;
  reimbursementsPaid: number;
  reimbursementsPaidUsd: number;
  approvedCount: number;
  flaggedCount: number;
  deniedCount: number;
  monthsReimbursed: number;
  currencyBreakdown: Record<string, { claimed: number; claimedUsd: number; approved: number; approvedUsd: number; paid: number; paidUsd: number }>;
  payouts: PayoutRecord[];
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeeRecords({ employeeId }: EmployeeRecordsProps) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const fetchProfile = useCallback(() => {
    fetch(`/api/employees/${employeeId}`)
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (res.status === 403) {
          setError('Access denied.');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.success) setProfile(data.employee);
        else if (data?.error) setError(data.error);
      })
      .catch(() => setError('Failed to connect to the server.'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return <p className="text-slate-500 text-sm font-mono">Loading your records...</p>;
  }

  if (error || !profile) {
    return <p className="text-red-400 text-sm font-mono">{error || 'Profile not found.'}</p>;
  }

  const statCards = [
    {
      label: 'Bills Uploaded',
      value: profile.billsUploaded,
      icon: Receipt,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'Total Paid',
      value: profile.totalPaidUsd > 0 
        ? `$${profile.totalPaidUsd.toFixed(2)} USD` 
        : (profile.totalPaid > 0 ? `${profile.tierLimitCurrency} ${profile.totalPaid.toFixed(2)}` : '—'),
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Months Reimbursed',
      value: profile.monthsReimbursed,
      icon: CalendarCheck2,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10'
    },
    {
      label: 'Approved',
      value: profile.approvedCount,
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Flagged',
      value: profile.flaggedCount,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10'
    },
    {
      label: 'Denied',
      value: profile.deniedCount,
      icon: ShieldX,
      color: 'text-red-400',
      bg: 'bg-red-500/10'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* PROFILE HEADER */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-black text-white">{profile.name}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
              <Briefcase className="w-3.5 h-3.5" /> {profile.designation} · {profile.department}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5" /> {profile.address}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tier Limit: <span className="font-mono text-slate-300">{profile.tierLimit} {profile.tierLimitCurrency}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
            <Star className="w-4 h-4" />
            <span className="font-bold text-sm">{profile.rating.toFixed(0)}</span>
            <span className="text-[10px] text-amber-400/60 font-mono uppercase">trust</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5">
          {statCards.map(card => (
            <div key={card.label} className="flex items-center gap-3">
              <div className={`p-2 ${card.bg} rounded-lg ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">{card.label}</span>
                <span className="text-sm font-bold text-white">{card.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PAYOUT HISTORY */}
      {profile.payouts.length > 0 && (
        <div className="bg-white/5 border border-white/5 rounded-xl p-6">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
            Reimbursement History ({profile.payouts.length} month{profile.payouts.length !== 1 ? 's' : ''} processed)
          </h3>
          <div className="space-y-2">
            {profile.payouts.map(payout => (
              <div
                key={payout.id}
                className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {payout.status === 'PAID' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-blue-300" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-white">
                      {MONTH_ABBR[payout.month - 1]} {payout.year}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {payout.expenseCount} bill{payout.expenseCount !== 1 ? 's' : ''} closed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">
                    claimed {payout.totalClaimed.toFixed(2)}
                    {payout.totalClaimedUsd != null && <span className="text-slate-400 ml-1">(≈${payout.totalClaimedUsd.toFixed(2)} USD)</span>}
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {payout.totalReimbursement.toFixed(2)}
                    {payout.totalReimbursementUsd != null && <span className="text-slate-400 ml-1">(≈${payout.totalReimbursementUsd.toFixed(2)} USD)</span>}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      payout.status === 'PAID'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    }`}
                  >
                    {payout.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FINANCIAL SUMMARY */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
          Financial Summary
        </h3>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <DollarSignIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Claimed (USD)</span>
                <span className="text-sm font-bold text-white">
                  {profile.totalClaimedUsd >= 0 ? formatCurrency(profile.totalClaimedUsd) : '—'}
                </span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Approved (USD)</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {profile.totalApprovedUsd >= 0 ? formatCurrency(profile.totalApprovedUsd) : '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <DollarSignIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Paid (USD)</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {profile.totalPaidUsd >= 0 ? formatCurrency(profile.totalPaidUsd) : '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Pending Review</span>
                  <span className="text-sm font-bold text-amber-400">
                    {profile.billsUploaded > profile.approvedCount + profile.deniedCount 
                      ? profile.billsUploaded - profile.approvedCount - profile.deniedCount 
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="lg:col-span-4 border-t border-white/5 pt-6">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
              Monthly Claim/Payout Summary
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-mono uppercase text-slate-500 border-b border-white/10">
                    <th className="pb-2 pr-6 whitespace-nowrap">Month</th>
                    <th className="pb-2 pr-6 whitespace-nowrap text-right">Claimed (USD)</th>
                    <th className="pb-2 pr-6 whitespace-nowrap text-right">Approved (USD)</th>
                    <th className="pb-2 pr-6 whitespace-nowrap text-right">Paid (USD)</th>
                    <th className="pb-2 pr-6 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.payouts.slice(0, 12).map(payout => (
                    <tr key={payout.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-6 font-mono text-slate-300 whitespace-nowrap">
                        {new Date(payout.year, payout.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 pr-6 text-blue-400 font-mono font-tabular-nums text-right whitespace-nowrap">
                        {payout.totalClaimedUsd != null ? formatCurrency(payout.totalClaimedUsd) : formatCurrency(payout.totalClaimed)}
                        {payout.totalClaimedUsd != null && <span className="text-slate-400 ml-1 text-[10px]">(orig: {formatNumber(payout.totalClaimed)})</span>}
                      </td>
                      <td className="py-3 pr-6 text-emerald-400 font-mono font-tabular-nums text-right whitespace-nowrap">
                        {payout.totalReimbursementUsd != null ? formatCurrency(payout.totalReimbursementUsd) : formatCurrency(payout.totalReimbursement)}
                        {payout.totalReimbursementUsd != null && <span className="text-slate-400 ml-1 text-[10px]">(orig: {formatNumber(payout.totalReimbursement)})</span>}
                      </td>
                      <td className="py-3 pr-6 text-emerald-400 font-mono font-tabular-nums text-right whitespace-nowrap">
                        {payout.paidAt && payout.totalReimbursementUsd != null ? formatCurrency(payout.totalReimbursementUsd) : 
                         payout.paidAt ? formatCurrency(payout.totalReimbursement) : '—'}
                        {payout.paidAt && payout.totalReimbursementUsd != null && <span className="text-slate-400 ml-1 text-[10px]">(orig: {formatNumber(payout.totalReimbursement)})</span>}
                      </td>
                      <td className="py-3 pr-6 whitespace-nowrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          payout.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          payout.status === 'PENDING' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                          'bg-slate-500/10 border-slate-500/30 text-slate-400'
                        }`}>
                          {payout.status}
                          {payout.paidAt && <span className="ml-1">✓</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {profile.payouts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 text-sm font-mono">
                        No monthly payout data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Original Currency Breakdown */}
          <div className="lg:col-span-4 border-t border-white/5 pt-6">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
              Original Currency Breakdown
            </h4>
            {Object.keys(profile.currencyBreakdown).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-mono uppercase text-slate-500 border-b border-white/10">
                      <th className="pb-2 pr-6 whitespace-nowrap">Currency</th>
                      <th className="pb-2 pr-6 whitespace-nowrap text-right">Claimed</th>
                      <th className="pb-2 pr-6 whitespace-nowrap text-right">Claimed (USD)</th>
                      <th className="pb-2 pr-6 whitespace-nowrap text-right">Approved</th>
                      <th className="pb-2 pr-6 whitespace-nowrap text-right">Approved (USD)</th>
                      <th className="pb-2 pr-6 whitespace-nowrap text-right">Paid (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(profile.currencyBreakdown).map(([currency, data]) => (
                      <tr key={currency} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-6 font-mono font-bold text-white whitespace-nowrap">{currency}</td>
                        <td className="py-3 pr-6 text-slate-300 font-mono font-tabular-nums text-right whitespace-nowrap">{formatNumber(data.claimed)}</td>
                        <td className="py-3 pr-6 text-blue-400 font-mono font-tabular-nums text-right whitespace-nowrap">
                          {data.claimedUsd > 0 ? formatCurrency(data.claimedUsd) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="py-3 pr-6 text-emerald-300 font-mono font-tabular-nums text-right whitespace-nowrap">{formatNumber(data.approved)}</td>
                        <td className="py-3 pr-6 text-emerald-400 font-mono font-tabular-nums text-right whitespace-nowrap">
                          {data.approvedUsd > 0 ? formatCurrency(data.approvedUsd) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="py-3 pr-6 text-emerald-400 font-mono font-tabular-nums text-right whitespace-nowrap">
                          {data.paidUsd > 0 ? formatCurrency(data.paidUsd) : <span className="text-slate-500">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-4 text-slate-500 text-sm font-mono">
                No currency breakdown data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RECEIPT FOLDERS */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
          My Receipt Folders — organised by year & month
        </h3>
        <ReceiptFolders
          employeeId={employeeId}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>
    </div>
  );
}
