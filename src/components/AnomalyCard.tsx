import React from 'react';

interface AnomalyProps {
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function AnomalyCard({ type, description, severity }: AnomalyProps) {
  const severityColors = {
    LOW: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200',
    MEDIUM: 'bg-orange-500/10 border-orange-500/30 text-orange-200',
    HIGH: 'bg-red-500/10 border-red-500/30 text-red-200',
  };

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${severityColors[severity]} shadow-lg`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono tracking-widest uppercase font-bold opacity-80">{type.replace('_', ' ')}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 font-medium">{severity}</span>
      </div>
      <p className="text-sm leading-relaxed opacity-90">{description}</p>
    </div>
  );
}