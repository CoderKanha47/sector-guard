'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Star,
  Receipt,
  IndianRupee,
  CalendarCheck2,
  ShieldCheck,
  AlertTriangle,
  ShieldX,
  Briefcase,
  MapPin,
  Lock,
  CheckCircle2
} from 'lucide-react';
import ReceiptFolders from './ReceiptFolders';

interface EmployeeRecordsProps {
  employeeId: string;
}

interface PayoutRecord {
  id: string;
  year: number;
  month: number;
  status: string;
  totalClaimed: number;
  totalReimbursement: number;
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
  rating: number;
  billsUploaded: number;
  reimbursementsPaid: number;
  approvedCount: number;
  flaggedCount: number;
  deniedCount: number;
  monthsReimbursed: number;
  payouts: PayoutRecord[];
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeeRecords({ employeeId }: EmployeeRecordsProps) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      label: 'Reimbursements Paid',
      value: `₹${profile.reimbursementsPaid.toFixed(2)}`,
      icon: IndianRupee,
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
              Tier Limit: <span className="font-mono text-slate-300">{profile.tierLimit}</span>
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
                    claimed ₹{payout.totalClaimed.toFixed(2)}
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    ₹{payout.totalReimbursement.toFixed(2)}
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

      {/* RECEIPT FOLDERS */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
          My Receipt Folders — organised by year &amp; month
        </h3>
        <ReceiptFolders employeeId={employeeId} />
      </div>
    </div>
  );
}
