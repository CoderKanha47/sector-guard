'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Binary, Shield, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'admin' | 'employee'>('admin');
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const endpoint = mode === 'admin' ? '/api/auth/admin-login' : '/api/auth/employee-login';
    const body = mode === 'admin' ? { password } : { employeeId, accessCode };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900/40 border border-white/10 rounded-3xl p-10 backdrop-blur-2xl shadow-2xl shadow-black/40">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <Binary className="text-white w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white">Sector Guard</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'admin' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}
          >
            <Shield className="w-3.5 h-3.5" /> Admin
          </button>
          <button
            onClick={() => setMode('employee')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'employee' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}
          >
            <User className="w-3.5 h-3.5" /> Employee
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          {mode === 'admin' ? (
            <input
              required
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          ) : (
            <>
              <input
                required
                placeholder="Employee ID"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <input
                required
                type="password"
                placeholder="Access code"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </>
          )}

          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl uppercase tracking-wide transition-all"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}