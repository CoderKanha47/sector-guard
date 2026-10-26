'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Copy } from 'lucide-react';

interface AddEmployeeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddEmployeeModal({ onClose, onSuccess }: AddEmployeeModalProps) {
  const [form, setForm] = useState({
    id: '',
    name: '',
    department: '',
    designation: '',
    address: '',
    tierLimit: '',
    accessCode: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tierLimit: Number(form.tierLimit)
        })
      });
      const data = await res.json();

      if (data.success) {
        setCreatedCode(data.initialAccessCode || null);
        onSuccess();
      } else {
        setError(data.error || 'Failed to create employee.');
      }
    } catch {
      setError('Failed to connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (createdCode) {
      try {
        await navigator.clipboard.writeText(createdCode);
      } catch {
        setError('Could not copy to clipboard.');
      }
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50";

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" /> Add Employee
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdCode ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-300 font-mono uppercase tracking-wider mb-2">Employee created</p>
              <p className="text-3xl font-black text-emerald-300 tracking-[0.3em] font-mono">{createdCode}</p>
              <p className="text-xs text-slate-400 mt-2">Share this access code with the employee to log in.</p>
            </div>
            <button
              onClick={copyCode}
              className="w-full px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs rounded-xl uppercase tracking-wide transition-all"
            >
              <Copy className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Copy Code
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl uppercase tracking-wide transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              placeholder="Employee ID"
              value={form.id}
              onChange={e => handleChange('id', e.target.value)}
              className={inputClass}
            />
            <input
              required
              placeholder="Full Name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className={inputClass}
            />
            <input
              required
              placeholder="Department"
              value={form.department}
              onChange={e => handleChange('department', e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Designation"
              value={form.designation}
              onChange={e => handleChange('designation', e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
              className={inputClass}
            />
            <input
              required
              type="number"
              placeholder="Tier Limit (e.g. 5000)"
              value={form.tierLimit}
              onChange={e => handleChange('tierLimit', e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Access Code (leave blank to auto-generate)"
              value={form.accessCode}
              onChange={e => handleChange('accessCode', e.target.value)}
              className={inputClass}
            />

            {error && (
              <p className="text-xs text-red-400 font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl tracking-wide uppercase transition-all duration-200"
            >
              {submitting ? 'Creating...' : 'Create Employee'}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(modalContent, document.body);
}