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
  const [closing, setClosing] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [editing, setEditing] = useState(false);
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
      tierLimit: String((employee as any).tierLimit ?? '')
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
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setAuditResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', employeeId);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setAuditResult(data);
        setFile(null);
        fetchProfile(); // refresh bills/reimbursements/rating/history
      } else {
        alert(data.error || 'Pipeline parsing anomaly encountered.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to the internal Sector Guard system.');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseMonth = async () => {
    const now = new Date();
    setClosing(true);
    setCloseMessage(null);
    try {
      const res = await fetch('/api/payouts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          year: now.getFullYear(),
          month: now.getMonth() + 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setCloseMessage(`Month closed. Total reimbursement: ${data.payout.totalReimbursement.toFixed(2)}`);
      } else {
        setCloseMessage(data.details || data.error || 'Failed to close month.');
      }
    } catch (err) {
      setCloseMessage('Failed to connect to the payout engine.');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return <p className="text-slate-500 text-sm font-mono">Loading employee profile...</p>;
  }

  if (!employee) {
    return <p className="text-red-400 text-sm font-mono">Employee not found.</p>;
  }

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
        onBack(); // return to employee list, which will refetch
      } else {
        alert(data.error || 'Failed to delete employee.');
      }
    } catch (err) {
      alert('Failed to connect to the server.');
    }
  };

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
          <div>
            <h2 className="text-lg font-black text-white">{employee.name}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
              <Briefcase className="w-3.5 h-3.5" /> {employee.designation} · {employee.department}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5" /> {employee.address}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
            <Star className="w-4 h-4" />
            <span className="font-bold text-sm">{employee.rating.toFixed(0)}</span>
            <span className="text-[10px] text-amber-400/60 font-mono uppercase">trust</span>
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

      {/* Close Month Action */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Close Current Month Payout</p>
          <p className="text-xs text-slate-500 mt-0.5">Locks in the reimbursement total for this month.</p>
          {closeMessage && (
            <p className="text-xs text-blue-400 mt-2 font-mono">{closeMessage}</p>
          )}
        </div>
        <button
          onClick={handleCloseMonth}
          disabled={closing}
          className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl uppercase tracking-wide transition-all shrink-0"
        >
          <Lock className="w-3.5 h-3.5" />
          {closing ? 'Closing...' : 'Close Month'}
        </button>
      </div>

      {/* Upload Receipt for this Employee */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
          Upload Receipt for {employee.name}
        </h3>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="border border-dashed border-white/10 hover:border-white/20 rounded-xl p-6 flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 transition-all relative cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="text-center space-y-2 flex flex-col items-center">
              <UploadCloud className={`w-5 h-5 ${file ? 'text-blue-400' : 'text-slate-400'}`} />
              <p className={`text-xs font-semibold ${file ? 'text-blue-400' : 'text-slate-300'}`}>
                {file ? file.name : 'Click to browse or drop a receipt image'}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 font-semibold text-xs rounded-xl tracking-wide uppercase transition-all duration-200 disabled:cursor-not-allowed"
            >
              {uploading ? 'Analyzing...' : 'Run Audit Analytics'}
            </button>
          </div>
        </form>

        {auditResult && (
          <div className="mt-5 pt-5 border-t border-white/5 space-y-4 animate-utility-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-2">
                <Store className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-white">{auditResult.expense.merchant}</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-2">
                <Coins className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-white">
                  {auditResult.expense.currency} {auditResult.expense.amount}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${auditResult.audit.status === 'DENIED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    auditResult.audit.status === 'FLAGGED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                    {auditResult.audit.status}
                  </span>
                </div>
                <span className="text-sm font-black text-white">{auditResult.audit.riskScore}/100</span>
              </div>
            </div>

            {auditResult.audit.anomalies.length === 0 ? (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>No anomalies detected.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {auditResult.audit.anomalies.map((a: any) => (
                  <AnomalyCard key={a.id || a.type} type={a.type} description={a.description} severity={a.severity} />
                ))}
              </div>
            )}
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