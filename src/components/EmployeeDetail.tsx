'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { 
  ArrowLeft, Star, MapPin, Briefcase, Receipt, IndianRupee, Lock, Trash2, Pencil, Save, X,
  DollarSign, CheckCircle2, Clock
} from 'lucide-react';
import { UploadCloud, Store } from 'lucide-react';
import AuditReasonModal from './AuditReasonModal';
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

interface EmployeeDetailProps {
  employeeId: string;
  onBack: () => void;
  onUsageChange?: (usage: { used: number; limit: number }) => void;
}

interface EmployeeProfile {
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
  payouts: Array<{
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
  }>;
}

interface AuditData {
  status: 'APPROVED' | 'FLAGGED' | 'DENIED';
  riskScore: number;
  calculatedReimbursement: number;
  calculatedReimbursementUsd?: number;
  policyLimitUsd?: number;
  anomalies: Array<{ type: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }>;
}

interface UploadPayload {
  expense: { merchant: string; amount: number; currency: string; amountUsd?: number; fxRate?: number; conversionStatus?: string };
  audit: AuditData;
}

type UploadResult =
  | { fileName: string; success: true; data: UploadPayload }
  | { fileName: string; success: false; error: string };

interface CloseResult {
  totalClaimed: number;
  totalClaimedUsd?: number;
  totalReimbursement: number;
  totalReimbursementUsd?: number;
  categoryBreakdown: Record<string, number>;
  categoryBreakdownUsd?: Record<string, number>;
}

export default function EmployeeDetail({ employeeId, onBack, onUsageChange }: EmployeeDetailProps) {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [batchResults, setBatchResults] = useState<UploadResult[]>([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [closeResult, setCloseResult] = useState<CloseResult | null>(null);
  const [reasonModalData, setReasonModalData] = useState<UploadPayload | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    department: '',
    designation: '',
    address: '',
    tierLimit: ''
  });
  const [saving, setSaving] = useState(false);
  const [folderRefreshKey, setFolderRefreshKey] = useState(0);

  // Unified year/month state shared between folder view and close payout
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const startEditing = () => {
    if (!employee) return;
    setEditForm({
      name: employee.name,
      department: employee.department,
      designation: employee.designation,
      address: employee.address,
      tierLimit: String(employee.tierLimit ?? '')
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          tierLimit: Number(editForm.tierLimit)
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditing(false);
        fetchProfile();
      } else {
        alert(data.error || 'Failed to update employee.');
      }
    } catch {
      alert('Failed to connect to the server.');
    } finally {
      setSaving(false);
    }
  };

  const fetchProfile = useCallback(() => {
    setLoading(true);
    fetch(`/api/employees/${employeeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setEmployee(data.employee);
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const syncUsage = () => {
    if (!onUsageChange) return;
    fetch('/api/usage')
      .then(res => res.json())
      .then(data => {
        if (data.success) onUsageChange({ used: data.used, limit: data.limit });
      })
      .catch(() => {});
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setBatchResults([]);
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      setCurrentUploadIndex(i);
      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('employeeId', employeeId);

      try {
        const response = await fetch('/api/audit', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          results.push({ fileName: files[i].name, success: true, data });
        } else {
          results.push({ fileName: files[i].name, success: false, error: data.error });
        }
        syncUsage();
      } catch {
        results.push({ fileName: files[i].name, success: false, error: 'Connection failed.' });
      }
    }

    setBatchResults(results);
    setFiles([]);
    setUploading(false);
    fetchProfile();
    setFolderRefreshKey(key => key + 1);

    // Auto-surface the first flagged/denied result, if any
    const firstProblem = results.find(
      r => r.success && (r.data.audit.status === 'FLAGGED' || r.data.audit.status === 'DENIED')
    );
    if (firstProblem?.success) {
      setReasonModalData(firstProblem.data);
    }
  };

  const handleCloseMonth = async () => {
    setClosing(true);
    setCloseMessage(null);
    setCloseResult(null);
    try {
      const res = await fetch('/api/payouts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          year: selectedYear,
          month: selectedMonth
        })
      });
      const data = await res.json();
      if (data.success) {
        setCloseResult(data.payout);
        setCloseMessage(null);
      } else {
        setCloseMessage(data.details || data.error || 'Failed to close month.');
      }
    } catch {
      setCloseMessage('Failed to connect to the payout engine.');
    } finally {
      setClosing(false);
    }
  };

  const handleDeleteEmployee = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${employee?.name}? This will also delete all their expenses, audits, and payout history. This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        onBack();
      } else {
        alert(data.error || 'Failed to delete employee.');
      }
    } catch {
      alert('Failed to connect to the server.');
    }
  };

  if (loading) {
    return <p className="text-slate-500 text-sm font-mono">Loading employee profile...</p>;
  }

  if (!employee) {
    return <p className="text-red-400 text-sm font-mono">Employee not found.</p>;
  }

  return (
    <div className="space-y-6 animate-utility-fadeIn">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Employees
        </button>

        <button
          onClick={handleDeleteEmployee}
          className="flex items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Employee
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <div className="flex justify-between items-start mb-4">
          {editing ? (
            <div className="space-y-2 flex-1 mr-4">
              <input
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editForm.department}
                  onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Department"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
                <input
                  value={editForm.designation}
                  onChange={e => setEditForm(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="Designation"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <input
                value={editForm.address}
                onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="number"
                value={editForm.tierLimit}
                onChange={e => setEditForm(prev => ({ ...prev, tierLimit: e.target.value }))}
                placeholder="Tier Limit"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-black text-white">{employee.name}</h2>
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                <Briefcase className="w-3.5 h-3.5" /> {employee.designation} · {employee.department}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5" /> {employee.address}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tier Limit: <span className="font-mono text-slate-300">{employee.tierLimit} {employee.tierLimitCurrency}</span>
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold rounded-lg transition-all"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4" />
              <span className="font-bold text-sm">{employee.rating.toFixed(0)}</span>
              <span className="text-[10px] text-amber-400/60 font-mono uppercase">trust</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Bills Uploaded</span>
              <span className="text-sm font-bold text-white">{employee.billsUploaded}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Reimbursements Paid</span>
              <span className="text-sm font-bold text-white">{employee.reimbursementsPaid.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Receipts for this Employee */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
          Upload Receipts for {employee.name}
        </h3>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="border border-dashed border-white/10 hover:border-white/20 rounded-xl p-6 flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 transition-all relative cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="text-center space-y-2 flex flex-col items-center">
              <UploadCloud className={`w-5 h-5 ${files.length > 0 ? 'text-blue-400' : 'text-slate-400'}`} />
              <p className={`text-xs font-semibold ${files.length > 0 ? 'text-blue-400' : 'text-slate-300'}`}>
                {files.length > 0
                  ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                  : 'Click to browse or drop receipt images (multiple allowed)'}
              </p>
            </div>
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-600 via-indigo-400 to-blue-600 animate-pulse transition-all duration-300"
                  style={{ width: `${Math.max(((currentUploadIndex + 1) / files.length) * 100, 8)}%` }}
                />
              </div>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                Analyzing {currentUploadIndex + 1} / {files.length}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={files.length === 0 || uploading}
              className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 font-semibold text-xs rounded-xl tracking-wide uppercase transition-all duration-200 disabled:cursor-not-allowed"
            >
              {uploading ? <span className="inline-block animate-pulse">Analyzing</span> : `Run Audit Analytics${files.length > 1 ? ` (${files.length})` : ''}`}
            </button>
          </div>
        </form>

        {batchResults.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/5 space-y-3 animate-utility-fadeIn">
            {batchResults.map((result, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3">
                {result.success ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-bold text-white">{result.data.expense.merchant}</span>
                      <span className="text-xs text-slate-500">({result.fileName})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-white">
                        {result.data.expense.currency} {result.data.expense.amount.toFixed(2)}
                        {result.data.expense.amountUsd != null && (
                          <span className="text-slate-400 ml-1">(≈${result.data.expense.amountUsd.toFixed(2)} USD)</span>
                        )}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${result.data.audit.status === 'DENIED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        result.data.audit.status === 'FLAGGED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                          'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                        {result.data.audit.status}
                      </span>
                      {(result.data.audit.status === 'FLAGGED' || result.data.audit.status === 'DENIED') && (
                        <button
                          onClick={() => result.success && setReasonModalData(result.data)}
                          className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
                        >
                          View Reason
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <span className="font-bold">{result.fileName}:</span>
                    <span>{result.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close Month Action */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-white">Close Monthly Payout</p>
            <p className="text-xs text-slate-500 mt-0.5">Locks in the reimbursement total for the selected month.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Year</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 shrink-0"
              >
                {Array.from({ length: 100 }, (_, i) => 2000 + i).map(y => (
                  <option key={y} value={y} className="bg-slate-900">{y}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Month</span>
              <span className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white shrink-0 min-w-[90px]">
                {new Date(2000, selectedMonth - 1).toLocaleString('default', { month: 'short' })}
              </span>
            </div>

            <button
              onClick={handleCloseMonth}
              disabled={closing || !selectedMonth}
              className="flex items-center gap-2 px-4 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg uppercase tracking-wide transition-all shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              {closing ? 'Closing...' : 'Close'}
            </button>
          </div>
        </div>

        {!selectedMonth && (
          <p className="text-xs text-amber-400 mt-3 font-mono text-center">
            Click a month in the Receipt Folders below to select a month for payout closure.
          </p>
        )}

        {closeMessage && (
          <p className="text-xs text-red-400 mt-3 font-mono">{closeMessage}</p>
        )}

        {closeResult && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Claimed</span>
                <span className="text-sm font-bold text-white">{closeResult.totalClaimed.toFixed(2)}</span>
                {closeResult.totalClaimedUsd != null && (
                  <span className="text-xs text-slate-400 block mt-0.5">≈${closeResult.totalClaimedUsd.toFixed(2)} USD</span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Paid (Capped at Tier Limit)</span>
                <span className="text-sm font-bold text-emerald-400">{closeResult.totalReimbursement.toFixed(2)}</span>
                {closeResult.totalReimbursementUsd != null && (
                  <span className="text-xs text-slate-400 block mt-0.5">≈${closeResult.totalReimbursementUsd.toFixed(2)} USD</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(closeResult.categoryBreakdown).map(([bucket, amount]) => (
                <div key={bucket} className="bg-white/5 rounded-lg p-2 text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">{bucket}</span>
                  <span className="text-xs font-bold text-white">{amount.toFixed(0)}</span>
                  {closeResult.categoryBreakdownUsd?.[bucket] != null && (
                    <span className="text-[9px] text-slate-400 block mt-0.5">≈${closeResult.categoryBreakdownUsd[bucket].toFixed(0)} USD</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
          Financial Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Claimed (USD)</span>
                <span className="text-sm font-bold text-white">
                  {employee.totalClaimedUsd > 0 ? formatCurrency(employee.totalClaimedUsd) : '—'}
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
                    {employee.totalApprovedUsd > 0 ? formatCurrency(employee.totalApprovedUsd) : '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Paid (USD)</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {employee.totalPaidUsd > 0 ? formatCurrency(employee.totalPaidUsd) : '—'}
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
                    {employee.billsUploaded > employee.approvedCount + employee.deniedCount 
                      ? employee.billsUploaded - employee.approvedCount - employee.deniedCount 
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="border-t border-white/5 pt-6">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
              Monthly Claim/Payout Summary
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-mono uppercase text-slate-500 border-b border-white/10">
                    <th className="pb-2 pr-4">Month</th>
                    <th className="pb-2 pr-4">Claimed (USD)</th>
                    <th className="pb-2 pr-4">Approved (USD)</th>
                    <th className="pb-2 pr-4">Paid (USD)</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.payouts.slice(0, 12).map(payout => (
                    <tr key={payout.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 pr-4 font-mono text-slate-300">
                        {new Date(payout.year, payout.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-2 pr-4 text-blue-400 font-mono">
                        {payout.totalClaimedUsd != null ? formatCurrency(payout.totalClaimedUsd) : formatCurrency(payout.totalClaimed)}
                        {payout.totalClaimedUsd != null && <span className="text-slate-400 ml-1 text-[10px]">(orig: {formatNumber(payout.totalClaimed)})</span>}
                      </td>
                      <td className="py-2 pr-4 text-emerald-400 font-mono">
                        {payout.totalReimbursementUsd != null ? formatCurrency(payout.totalReimbursementUsd) : formatCurrency(payout.totalReimbursement)}
                        {payout.totalReimbursementUsd != null && <span className="text-slate-400 ml-1 text-[10px]">(orig: {formatNumber(payout.totalReimbursement)})</span>}
                      </td>
                      <td className="py-2 pr-4 text-emerald-400 font-mono">
                        {payout.totalReimbursementUsd != null ? formatCurrency(payout.totalReimbursementUsd) : formatCurrency(payout.totalReimbursement)}
                        {payout.totalReimbursementUsd != null && <span className="text-slate-400 ml-1 text-[10px]">(orig: {formatNumber(payout.totalReimbursement)})</span>}
                      </td>
                      <td className="py-2 pr-4">
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
                  {employee.payouts.length === 0 && (
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
          <div className="border-t border-white/5 pt-6">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
              Original Currency Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(employee.payouts.reduce((acc, payout) => {
                const curr = 'USD'; // We don't have currency per payout in current model
                if (!acc[curr]) acc[curr] = { claimed: 0, approved: 0, paid: 0 };
                acc[curr].claimed += payout.totalClaimed;
                acc[curr].approved += payout.totalReimbursement;
                acc[curr].paid += payout.status === 'PAID' ? payout.totalReimbursement : 0;
                return acc;
              }, {} as Record<string, { claimed: number; approved: number; paid: number }>)).map(([currency, data]) => (
                <div key={currency} className="bg-white/5 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-slate-400 uppercase">Currency</span>
                    <span className="font-bold text-white font-mono">{currency}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] font-mono text-slate-500 block">Claimed</span>
                      <span className="text-sm font-bold text-slate-300">{formatNumber(data.claimed)}</span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] font-mono text-slate-500 block">Approved</span>
                      <span className="text-sm font-bold text-emerald-400">{formatNumber(data.approved)}</span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] font-mono text-slate-500 block">Paid</span>
                      <span className="text-sm font-bold text-emerald-400">{formatNumber(data.paid)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Receipts for this Employee */}
      <div className="space-y-3">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block font-bold">
          Receipt Folders — organised by year & month
        </span>
        <ReceiptFolders
          key={folderRefreshKey}
          employeeId={employeeId}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
/>
        {reasonModalData && (
          <AuditReasonModal
            merchant={reasonModalData.expense.merchant}
            amount={reasonModalData.expense.amount}
            amountUsd={reasonModalData.expense.amountUsd}
            currency={reasonModalData.expense.currency}
            status={reasonModalData.audit.status === 'DENIED' ? 'DENIED' : 'FLAGGED'}
            riskScore={reasonModalData.audit.riskScore}
            anomalies={reasonModalData.audit.anomalies}
            onClose={() => setReasonModalData(null)}
          />
        )}
      </div>
    </div>
  );
}