'use client';

import React, { useEffect, useState } from 'react';
import { 
  DollarSign, Users, Clock, AlertTriangle, XCircle, CheckCircle2, 
  BarChart2, TrendingUp, FileText, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, Calendar, Download
} from 'lucide-react';

interface CompanySummaryData {
  totalAmountClaimed: number;
  totalAmountClaimedUsd: number;
  totalAmountApproved: number;
  totalAmountApprovedUsd: number;
  totalAmountPaid: number;
  totalAmountPaidUsd: number;
  pendingReviewCount: number;
  pendingReviewAmountUsd: number;
  deniedCount: number;
  deniedAmountUsd: number;
  employeeCount: number;
  currencyBreakdown: Record<string, { claimed: number; claimedUsd: number; approved: number; approvedUsd: number }>;
  monthlyTrends: Array<{ month: string; claimed: number; claimedUsd: number; approved: number; approvedUsd: number; paid: number; paidUsd: number }>;
  fxMetadata: { referenceDate: string; version: string; source: string; supportedCurrencies: string[] };
  employees: Array<{
    id: string;
    name: string;
    department: string;
    designation: string;
    rating: number;
    totalClaimed: number;
    totalClaimedUsd: number;
    totalApproved: number;
    totalApprovedUsd: number;
    totalPaid: number;
    totalPaidUsd: number;
    pendingReviewCount: number;
    deniedCount: number;
  }>;
}

interface CompanySummaryProps {
  onBack?: () => void;
}

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

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const METRIC_CARDS = [
  {
    key: 'totalAmountClaimedUsd',
    label: 'Total Amount Claimed',
    icon: DollarSign,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'Total claimed across all receipts',
    showOriginal: true
  },
  {
    key: 'totalAmountApprovedUsd',
    label: 'Total Amount Approved',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    description: 'Approved by audit workflow',
    showOriginal: true
  },
  {
    key: 'totalAmountPaidUsd',
    label: 'Total Amount Paid',
    icon: DollarSign,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    description: 'Actually paid to employees',
    showOriginal: true
  },
  {
    key: 'pendingReviewCount',
    label: 'Pending Review',
    icon: Clock,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Receipts awaiting review',
    showOriginal: false
  },
  {
    key: 'deniedCount',
    label: 'Denied Claims',
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'Denied by audit workflow',
    showOriginal: false
  },
  {
    key: 'employeeCount',
    label: 'Active Employees',
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: 'Total active employees',
    showOriginal: false
  }
];

function MetricCard({ data, metric, originalData }: { 
  data: any; 
  metric: typeof METRIC_CARDS[0]; 
  originalData: any;
}) {
  const value = data[metric.key];
  const originalValue = metric.showOriginal ? originalData[metric.key.replace('Usd', '')] : null;
  
  return (
    <div className={`bg-white/5 border rounded-xl p-5 ${metric.bgColor} ${metric.borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <metric.icon className={`w-4 h-4 ${metric.color}`} />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider truncate">{metric.label}</span>
          </div>
          <div className="text-2xl font-black text-white truncate">
            {metric.key.includes('Count') || metric.key === 'employeeCount' 
              ? formatNumber(value) 
              : formatCurrency(value)}
          </div>
          {originalValue && metric.showOriginal && (
            <span className="text-xs text-slate-500 block mt-1">
              (Original: {formatNumber(originalValue)})
            </span>
          )}
          <p className="text-[10px] text-slate-500 mt-2">{metric.description}</p>
        </div>
        <div className={metric.color.replace('text-', 'bg-').replace('400', '500/20') + ' p-3 rounded-lg'}>
          <metric.icon className={`w-6 h-6 ${metric.color}`} />
        </div>
      </div>
    </div>
  );
}

function EmployeeRatingsTable({ employees }: { employees: CompanySummaryData['employees'] }) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'totalApprovedUsd', 
    direction: 'desc' 
  });

  const sortedEmployees = [...employees].sort((a, b) => {
    const aVal = a[sortConfig.key as keyof typeof a];
    const bVal = b[sortConfig.key as keyof typeof b];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortableKeys = [
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'rating', label: 'Rating' },
    { key: 'totalClaimedUsd', label: 'Claimed (USD)' },
    { key: 'totalApprovedUsd', label: 'Approved (USD)' },
    { key: 'totalPaidUsd', label: 'Paid (USD)' },
    { key: 'pendingReviewCount', label: 'Pending' },
    { key: 'deniedCount', label: 'Denied' }
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-mono uppercase text-slate-500 border-b border-white/10">
            {sortableKeys.map(({ key, label }) => (
              <th key={key} className="pb-2 pr-4 cursor-pointer hover:text-white select-none" 
                  onClick={() => handleSort(key)}>
                <div className="flex items-center gap-1">
                  {label}
                  {sortConfig.key === key && (
                    <span className="text-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
            ))}
            <th className="pb-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedEmployees.map(emp => (
            <tr key={emp.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <td className="py-3 pr-4 font-medium text-white">{emp.name}</td>
              <td className="py-3 pr-4 text-slate-400">{emp.department}</td>
              <td className="py-3 pr-4">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-mono ${
                  emp.rating >= 90 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  emp.rating >= 70 ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                  'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {emp.rating.toFixed(0)}
                </span>
              </td>
              <td className="py-3 pr-4 text-white font-mono">{formatCurrency(emp.totalClaimedUsd)}</td>
              <td className="py-3 pr-4 text-emerald-400 font-mono">{formatCurrency(emp.totalApprovedUsd)}</td>
              <td className="py-3 pr-4 text-emerald-400 font-mono">{formatCurrency(emp.totalPaidUsd)}</td>
              <td className="py-3 pr-4 text-amber-400 font-mono">{emp.pendingReviewCount}</td>
              <td className="py-3 pr-4 text-red-400 font-mono">{emp.deniedCount}</td>
              <td className="py-3 pr-4">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-mono ${
                  emp.pendingReviewCount > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  emp.deniedCount > 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                  'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  {emp.pendingReviewCount > 0 ? 'Pending' : emp.deniedCount > 0 ? 'Denied' : 'Clean'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyTrendsChart({ trends }: { trends: CompanySummaryData['monthlyTrends'] }) {
  if (trends.length === 0) {
    return (
      <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl">
        <BarChart2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400 font-semibold">No financial data available</p>
        <p className="text-xs text-slate-600 mt-1">Submit receipts to see monthly trends</p>
      </div>
    );
  }

  const maxValue = Math.max(...trends.flatMap(t => [t.claimedUsd, t.approvedUsd, t.paidUsd]));

  const chartBars = trends.map((trend) => {
    const claimedTitle = `Claimed: $${trend.claimedUsd.toFixed(2)}`;
    const approvedTitle = `Approved: $${trend.approvedUsd.toFixed(2)}`;
    const paidTitle = `Paid: $${trend.paidUsd.toFixed(2)}`;
    const claimedHeight = trend.claimedUsd > 0 ? (trend.claimedUsd / (maxValue || 1)) * 150 : 0;
    const approvedHeight = trend.approvedUsd > 0 ? (trend.approvedUsd / (maxValue || 1)) * 150 : 0;
    const paidHeight = trend.paidUsd > 0 ? (trend.paidUsd / (maxValue || 1)) * 150 : 0;
    const claimedMinHeight = trend.claimedUsd > 0 ? '4px' : '0';
    const approvedMinHeight = trend.approvedUsd > 0 ? '4px' : '0';
    const paidMinHeight = trend.paidUsd > 0 ? '4px' : '0';

    return (
      <div key={trend.month} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-[40px]">
        <div className="w-full flex justify-center gap-1">
          <div
            className="bg-blue-500/60 rounded-t"
            style={{ height: `${claimedHeight}px`, minHeight: claimedMinHeight }}
            title={claimedTitle}
          />
          <div
            className="bg-emerald-500/60 rounded-t"
            style={{ height: `${approvedHeight}px`, minHeight: approvedMinHeight }}
            title={approvedTitle}
          />
          <div
            className="bg-emerald-400/80 rounded-t"
            style={{ height: `${paidHeight}px`, minHeight: paidMinHeight }}
            title={paidTitle}
          />
        </div>
        <span className="text-[9px] font-mono text-slate-500">{formatMonthKey(trend.month)}</span>
      </div>
    );
  });

  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-6">
      <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
        Monthly Financial Trends (USD)
      </h3>
      <div className="flex items-end justify-between h-[200px] gap-2">
        {chartBars}
        <div className="flex justify-center gap-6 mt-4 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500/60 rounded" />
            <span className="text-slate-400">Claimed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500/60 rounded" />
            <span className="text-slate-400">Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-400/80 rounded" />
            <span className="text-slate-400">Paid</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrencyBreakdown({ breakdown }: { breakdown: CompanySummaryData['currencyBreakdown'] }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-6">
      <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
        Currency Breakdown
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-mono uppercase text-slate-500 border-b border-white/10">
              <th className="pb-2 pr-4">Currency</th>
              <th className="pb-2 pr-4">Claimed</th>
              <th className="pb-2 pr-4">Claimed (USD)</th>
              <th className="pb-2 pr-4">Approved</th>
              <th className="pb-2 pr-4">Approved (USD)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(breakdown).map(([currency, data]) => (
              <tr key={currency} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 pr-4 font-mono font-bold text-white">{currency}</td>
                <td className="py-3 pr-4 text-slate-300 font-mono">{formatNumber(data.claimed)}</td>
                <td className="py-3 pr-4 text-blue-400 font-mono">{formatCurrency(data.claimedUsd)}</td>
                <td className="py-3 pr-4 text-emerald-300 font-mono">{formatNumber(data.approved)}</td>
                <td className="py-3 pr-4 text-emerald-400 font-mono">{formatCurrency(data.approvedUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CompanySummary({ onBack }: CompanySummaryProps) {
  const [data, setData] = useState<CompanySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'summary' | 'employees' | 'trends' | 'currency'>('summary');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedYear) params.set('year', String(selectedYear));
    if (selectedMonth) params.set('month', String(selectedMonth));
    
    setLoading(true);
    fetch(`/api/admin/company-summary?${params.toString()}`)
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (res.status === 403) {
          throw new Error('Access denied. Admin access required.');
        }
        return res.json();
      })
      .then(data => {
        if (data?.success) setData(data);
        else if (data?.error) throw new Error(data.error);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]);

  if (loading) {
    return <p className="text-slate-500 text-sm font-mono">Loading company summary...</p>;
  }

  if (error) {
    return <p className="text-red-400 text-sm font-mono">{error}</p>;
  }

  if (!data) {
    return <p className="text-red-400 text-sm font-mono">No data available.</p>;
  }

  const originalData = {
    totalAmountClaimed: data.summary.totalAmountClaimed,
    totalAmountApproved: data.summary.totalAmountApproved,
    totalAmountPaid: data.summary.totalAmountPaid,
    totalAmountClaimedUsd: data.summary.totalAmountClaimedUsd,
    totalAmountApprovedUsd: data.summary.totalAmountApprovedUsd,
    totalAmountPaidUsd: data.summary.totalAmountPaidUsd,
    pendingReviewCount: data.summary.pendingReviewCount,
    deniedCount: data.summary.deniedCount,
    employeeCount: data.summary.employeeCount,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with period selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Company Summary
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Financial overview across all employees • FX rates: {data.summary.fxMetadata.referenceDate} ({data.summary.fxMetadata.version})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={selectedMonth || ''}
            onChange={e => setSelectedMonth(e.target.value ? parseInt(e.target.value) : undefined)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString('default', { month: 'short' })}
              </option>
            ))}
          </select>
          <button
            onClick={() => { if (onBack) onBack(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/20 text-slate-200 font-semibold text-xs rounded-xl uppercase tracking-wide transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {[
          { key: 'summary', label: 'Summary', icon: FileText },
          { key: 'employees', label: 'Employees', icon: Users },
          { key: 'trends', label: 'Trends', icon: TrendingUp },
          { key: 'currency', label: 'Currency', icon: DollarSign }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border transition-all ${
              view === tab.key
                ? 'bg-white/10 border-white/20 text-white shadow-md'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'summary' && data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {METRIC_CARDS.map(metric => (
              <MetricCard key={metric.key} data={data.summary} metric={metric} originalData={originalData} />
            ))}
          </div>

          {/* Currency Breakdown */}
          <CurrencyBreakdown breakdown={data.summary.currencyBreakdown} />

          {/* FX Metadata */}
          <div className="text-xs text-slate-500 bg-white/5 border border-white/10 rounded-lg p-3 font-mono">
            FX Rate Source: {data.summary.fxMetadata.source} • Reference Date: {data.summary.fxMetadata.referenceDate} • Version: {data.summary.fxMetadata.version}
            <br />
            Supported: {data.summary.fxMetadata.supportedCurrencies.join(', ')}
          </div>
        </div>
      )}

      {view === 'employees' && data && (
        <EmployeeRatingsTable employees={data.employees} />
      )}

      {view === 'trends' && data && (
        <MonthlyTrendsChart trends={data.summary.monthlyTrends} />
      )}

      {view === 'currency' && data && (
        <CurrencyBreakdown breakdown={data.summary.currencyBreakdown} />
      )}

      {!data && !loading && !error && (
        <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl">
          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-semibold">No data available</p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { formatCurrency, formatNumber, formatMonthKey } from './CompanySummary';

// Re-export the helper functions and components
export { formatCurrency, formatNumber, formatMonthKey };
export { MetricCard, EmployeeRatingsTable, MonthlyTrendsChart, CurrencyBreakdown };