'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, Key, User, BadgeCheck, AlertTriangle, Shield } from 'lucide-react';

interface EmployeeAccessCode {
  id: string;
  name: string;
  department: string;
  designation: string;
  accessCode: string;
  rating: number;
  tierLimit: number;
  tierLimitCurrency: string;
}

export default function EmployeeAccessCodesView() {
  const [employees, setEmployees] = useState<EmployeeAccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({});

  const fetchAccessCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/employee-access-codes?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.status === 403) {
        return;
      }
      const data = await res.json();
      if (data?.success) setEmployees(data.employees);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessCodes();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 90) return { label: 'Excellent', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: BadgeCheck };
    if (rating >= 70) return { label: 'Good', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: Shield };
    return { label: 'Review', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: AlertTriangle };
  };

  if (loading) {
    return <p className="text-slate-500 text-sm font-mono">Loading access codes...</p>;
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-xl">
        <Key className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400 font-semibold">No employees found</p>
        <p className="text-xs text-slate-600 mt-1">Add employees from the Employees tab to generate access codes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
          Employee Access Codes
        </h3>
        <button
          onClick={fetchAccessCodes}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/20 text-slate-200 font-semibold text-xs rounded-xl uppercase tracking-wide transition-all"
        >
          <BadgeCheck className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-mono uppercase text-slate-500 border-b border-white/10">
              <th className="pb-2 pr-4">Employee</th>
              <th className="pb-2 pr-4">Dept / Designation</th>
              <th className="pb-2 pr-4">User ID</th>
              <th className="pb-2 pr-4">Access Code</th>
              <th className="pb-2">Tier Limit</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const badge = getRatingBadge(emp.rating);
              const BadgeIcon = badge.icon;
              const isVisible = showCodes[emp.id];

              return (
                <tr key={emp.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-white">{emp.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-400">
                    <div className="flex flex-col gap-0.5">
                      <span>{emp.department}</span>
                      <span className="text-xs">{emp.designation}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-300 bg-white/5 px-2 py-1 rounded text-[10px]">
                    {emp.id}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[11px] bg-white/5 px-2 py-1 rounded ${isVisible ? 'text-white' : 'text-slate-500'} flex-1 min-w-0`}>
                        {isVisible ? emp.accessCode : '••••••••'}
                      </span>
                      <button
                        onClick={() => setShowCodes(prev => ({ ...prev, [emp.id]: !isVisible }))}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                        title={isVisible ? 'Hide' : 'Show'}
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(emp.accessCode, emp.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${copiedId === emp.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        title={copiedId === emp.id ? 'Copied!' : 'Copy'}
                      >
                        {copiedId === emp.id ? (
                          <BadgeCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">{copiedId === emp.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-slate-300 text-sm">
                    {emp.tierLimitCurrency} {emp.tierLimit.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500 bg-white/5 border border-white/10 rounded-lg p-3">
        <p className="font-mono text-slate-400 mb-1">Usage Instructions:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Share the <strong>User ID</strong> and <strong>Access Code</strong> with each employee for login at <code className="bg-white/5 px-1 rounded">/login</code></li>
          <li>Access codes are hashed in the database; only the initial code is shown here</li>
          <li>Click <Copy className="w-3 h-3 inline" /> to copy the access code to clipboard</li>
          <li>Click <Eye className="w-3 h-3 inline" /> to reveal/hide the access code</li>
        </ul>
      </div>
    </div>
  );
}