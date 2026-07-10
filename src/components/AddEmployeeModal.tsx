'use client';

import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

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
    tierLimit: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to create employee.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" /> Add Employee
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="Employee ID (e.g. emp_priya_2026)"
            value={form.id}
            onChange={e => handleChange('id', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <input
            required
            placeholder="Full Name"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <input
            required
            placeholder="Department"
            value={form.department}
            onChange={e => handleChange('department', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <input
            placeholder="Designation"
            value={form.designation}
            onChange={e => handleChange('designation', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={e => handleChange('address', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <input
            required
            type="number"
            placeholder="Tier Limit (e.g. 5000)"
            value={form.tierLimit}
            onChange={e => handleChange('tierLimit', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
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
      </div>
    </div>
  );
}