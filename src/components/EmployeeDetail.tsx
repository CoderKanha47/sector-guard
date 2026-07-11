'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, MapPin, Briefcase, Receipt, IndianRupee, Lock, Trash2, Pencil, Save, X } from 'lucide-react';
import { UploadCloud, Store, Coins, Fingerprint, CheckCircle2 } from 'lucide-react';
import AnomalyCard from './AnomalyCard';

interface EmployeeDetailProps {
  employeeId: string;
  onBack: () => void;
}

interface ExpenseHistoryItem {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  timestamp: string;
  category: string;
  audit: {
    status: 'APPROVED' | 'FLAGGED' | 'DENIED';
    riskScore: number;
    calculatedReimbursement: number;
  } | null;
}

interface EmployeeProfile {
  id: string;
  name: string;
  department: string;
  designation: string;
  address: string;
  tierLimit: number;
  rating: number;
  billsUploaded: number;
  reimbursementsPaid: number;
  history: ExpenseHistoryItem[];
}

export default function EmployeeDetail({ employeeId, onBack }: EmployeeDetailProps) {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [payoutYear, setPayoutYear] = useState(now.getFullYear());
  const [payoutMonth, setPayoutMonth] = useState(now.getMonth() + 1);
  const [closing, setClosing] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [closeResult, setCloseResult] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    department: '',
    designation: '',
    address: '',
    tierLimit: ''
  });
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      alert('Failed to connect to the server.');
    } finally {
      setSaving(false);
    }
  };

  const fetchProfile = () => {
    setLoading(true);
    fetch(`/api/employees/${employeeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setEmployee(data.employee);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, [employeeId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setBatchResults([]);
    const results: any[] = [];

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
      } catch (err) {
        results.push({ fileName: files[i].name, success: false, error: 'Connection failed.' });
      }
    }

    setBatchResults(results);
    setFiles([]);
    setUploading(false);
    fetchProfile();
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
          year: payoutYear,
          month: payoutMonth
        })
      });
      const data = await res.json();
      if (data.success) {
        setCloseResult(data.payout);
        setCloseMessage(null);
      } else {
        setCloseMessage(data.details || data.error || 'Failed to close month.');
      }
    } catch (err) {
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
    } catch (err) {
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
                Tier Limit: <span className="font-mono text-slate-300">{employee.tierLimit}</span>
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
            <p className="text-xs text-slate-400 font-mono">
              Processing {currentUploadIndex + 1} of {files.length}...
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={files.length === 0 || uploading}
              className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 font-semibold text-xs rounded-xl tracking-wide uppercase transition-all duration-200 disabled:cursor-not-allowed"
            >
              {uploading ? 'Analyzing...' : `Run Audit Analytics${files.length > 1 ? ` (${files.length})` : ''}`}
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
                        {result.data.expense.currency} {result.data.expense.amount}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${result.data.audit.status === 'DENIED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                          result.data.audit.status === 'FLAGGED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                            'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                        {result.data.audit.status}
                      </span>
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

          <div className="flex items-center gap-2">
            <select
              value={payoutMonth}
              onChange={e => setPayoutMonth(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m} className="bg-slate-900">
                  {new Date(2000, m - 1).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
            <select
              value={payoutYear}
              onChange={e => setPayoutYear(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <option key={y} value={y} className="bg-slate-900">{y}</option>
              ))}
            </select>
            <button
              onClick={handleCloseMonth}
              disabled={closing}
              className="flex items-center gap-2 px-4 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg uppercase tracking-wide transition-all shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              {closing ? 'Closing...' : 'Close'}
            </button>
          </div>
        </div>

        {closeMessage && (
          <p className="text-xs text-red-400 mt-3 font-mono">{closeMessage}</p>
        )}

        {closeResult && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Claimed</span>
                <span className="text-sm font-bold text-white">₹{closeResult.totalClaimed.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Paid (Capped at Tier Limit)</span>
                <span className="text-sm font-bold text-emerald-400">₹{closeResult.totalReimbursement.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {Object.entries(closeResult.categoryBreakdown as Record<string, number>).map(([bucket, amount]) => (
                <div key={bucket} className="bg-white/5 rounded-lg p-2 text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">{bucket}</span>
                  <span className="text-xs font-bold text-white">₹{amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expense History */}
      <div className="space-y-3">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block font-bold">
          Overall History ({employee.history.length})
        </span>
        <div className="space-y-2">
          {employee.history.map(exp => (
            <div
              key={exp.id}
              className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-bold text-white">{exp.merchant}</p>
                <p className="text-xs text-slate-500">
                  {exp.category} · {new Date(exp.timestamp).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-white">{exp.currency} {exp.amount.toFixed(2)}</span>
                {exp.audit && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${exp.audit.status === 'DENIED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    exp.audit.status === 'FLAGGED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                    {exp.audit.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}