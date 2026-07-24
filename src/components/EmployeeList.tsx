'use client';

import React, { useEffect, useState } from 'react';
import { Star, Receipt, IndianRupee, UserPlus } from 'lucide-react';
import AddEmployeeModal from './AddEmployeeModal';

interface EmployeeSummary {
  id: string;
  name: string;
  department: string;
  designation: string;
  rating: number;
  billsUploaded: number;
  reimbursementsPaid: number;
}

interface EmployeeListProps {
  onSelectEmployee: (id: string) => void;
}

export default function EmployeeList({ onSelectEmployee }: EmployeeListProps) {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchEmployees = () => {
    setLoading(true);
    fetch('/api/employees')
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.success) setEmployees(data.employees);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  if (loading) {
    return <p className="text-slate-500 text-sm font-mono">Loading employee records...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-white/20 text-slate-200 font-semibold text-xs rounded-xl uppercase tracking-wide transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {employees.map(emp => (
          <button
            key={emp.id}
            onClick={() => onSelectEmployee(emp.id)}
            className="text-left bg-white/5 border border-white/5 hover:border-white/20 rounded-xl p-4 transition-all duration-200 hover:bg-white/10"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-bold text-white">{emp.name}</p>
                <p className="text-xs text-slate-500">{emp.designation} · {emp.department}</p>
              </div>
              <div className="flex items-center gap-1 text-amber-400 text-xs font-mono">
                <Star className="w-3.5 h-3.5" />
                {emp.rating.toFixed(0)}
              </div>
            </div>
            <div className="flex gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5" /> {emp.billsUploaded} bills
              </span>
              <span className="flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5" /> {emp.reimbursementsPaid.toFixed(2)} paid
              </span>
            </div>
          </button>
        ))}
      </div>

      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchEmployees}
        />
      )}
    </div>
  );
}