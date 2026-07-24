'use client';

import React, { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';

export default function UsageIndicator() {
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    fetch('/api/usage')
      .then(res => res.json())
      .then(data => {
        if (data.success) setUsage({ used: data.used, limit: data.limit });
      })
      .catch(() => {});
  }, []);

  if (!usage) return null;

  const isNearLimit = usage.used >= 25;
  const isAtLimit = usage.used >= usage.limit;

  return (
    <div className="px-2 py-2 border-t border-white/5">
      <div className="flex items-center gap-2 mb-1.5">
        <Gauge className={`w-3.5 h-3.5 ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-slate-500'}`} />
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Daily Uploads</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-slate-300'}`}>
          {usage.used} / {usage.limit}
        </span>
        <span className="text-[9px] text-slate-600 font-mono">resets 12am</span>
      </div>
      <div className="w-full h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}