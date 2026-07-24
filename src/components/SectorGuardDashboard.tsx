'use client';

import React, { useState } from 'react';
import { Home, Users, Binary, Rocket, BookOpen, ChevronRight } from 'lucide-react';
import EmployeeList from '@/components/EmployeeList';
import EmployeeDetail from '@/components/EmployeeDetail';
import AboutModal from '@/components/AboutModal';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UsageIndicator from './UsageIndicator';

export default function SectorGuardDashboard() {
    const [activeTab, setActiveTab] = useState<'home' | 'employees'>('home');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [showAbout, setShowAbout] = useState(false);

    const handleTabChange = (tab: 'home' | 'employees') => {
        setActiveTab(tab);
        if (tab !== 'employees') {
            setSelectedEmployeeId(null);
        }
    };

    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans antialiased overflow-x-hidden selection:bg-blue-500/30">

            {/* LEFT NAVIGATION SIDEBAR */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-slate-900/40 backdrop-blur-xl p-4 md:p-6 flex flex-row md:flex-col justify-between items-center md:items-stretch shrink-0">
                <div className="flex flex-row md:flex-col items-center md:items-stretch gap-4 md:gap-0 md:space-y-8">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                            <Binary className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-black text-sm tracking-wider uppercase bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                Sector Guard
                            </h2>
                            <span className="text-[10px] font-mono opacity-40">v1.3 // WELCOME</span>
                        </div>
                    </div>

                    <nav className="flex flex-row md:flex-col gap-2 md:space-y-2 md:gap-0">
                        <button
                            onClick={() => handleTabChange('home')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-full border transition-all duration-200 ${activeTab === 'home'
                                ? 'bg-linear-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/40 text-blue-300 shadow-lg shadow-blue-500/5'
                                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                        >
                            <Home className="w-4 h-4" />
                            <span>Home</span>
                        </button>

                        <button
                            onClick={() => handleTabChange('employees')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-full border transition-all duration-200 ${activeTab === 'employees'
                                ? 'bg-white/10 border-white/20 text-white shadow-md'
                                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            <span>Employees</span>
                        </button>
                    </nav>
                </div>

                {/* usageIndicator */}
                <UsageIndicator />

                {/* user indicator */}

                <div className="hidden md:flex items-center justify-between gap-2 px-2 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                            KK
                        </div>
                        <div className="truncate">
                            <p className="text-xs font-bold text-slate-200 truncate">Kiran Kumar</p>
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Session
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                        title="Log out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </aside>

            {/* RIGHT CONTAINER - MAIN DECK */}
            <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto max-w-6xl mx-auto w-full">

                {activeTab === 'home' ? (
                    <section className="flex-1 flex items-center justify-center p-8">
                        <div className="w-500 max-w-200 bg-slate-900/40 border border-white/10 rounded-3xl p-10 backdrop-blur-2xl shadow-2xl shadow-black/40 flex flex-col items-center text-center">

                            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                                <Binary className="text-white w-8 h-8" />
                            </div>

                            <h1 className="text-2xl font-black bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                                Sector Guard
                            </h1>
                            <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-8">
                                An AI system that reviews expense claims, extracts details from receipts, detects potential fraud, and highlights expenses that need a closer look
                            </p>

                            <div className="w-full space-y-3">
                                <button
                                    onClick={() => handleTabChange('employees')}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl tracking-wide uppercase transition-all duration-200 shadow-lg shadow-blue-500/20"
                                >
                                    <ChevronRight className="w-4 h-4" /> Start
                                </button>
                                <button
                                    onClick={() => setShowAbout(true)}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-slate-200 font-semibold text-sm rounded-xl tracking-wide uppercase transition-all duration-200"
                                >
                                    <BookOpen className="w-4 h-4" /> Read
                                </button>
                            </div>

                            <div className="w-full flex items-center gap-3 mt-8 pt-6 border-t border-white/5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                    System Online // Qwen 3.6 27B
                                </span>
                            </div>

                        </div>
                    </section>
                ) : (
                    <section className="bg-slate-900/30 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
                        <header className="mb-4">
                            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 font-bold">
                                {selectedEmployeeId ? 'Employee Profile' : 'Employee Records'}
                            </h3>
                        </header>

                        {selectedEmployeeId ? (
                            <EmployeeDetail
                                employeeId={selectedEmployeeId}
                                onBack={() => setSelectedEmployeeId(null)}
                            />
                        ) : (
                            <EmployeeList onSelectEmployee={(id) => setSelectedEmployeeId(id)} />
                        )}
                    </section>
                )}

            </div>

            {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
        </main>
    );
}