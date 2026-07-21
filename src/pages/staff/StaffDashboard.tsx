import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard } from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  
  const getDashboardTitle = () => {
    switch (user?.role) {
      case 'MANAGER': return 'Manager Dashboard';
      case 'RECEPTIONIST': return 'Reception Dashboard';
      case 'ACCOUNTANT': return 'Accounts Dashboard';
      case 'LIBRARIAN': return 'Library Dashboard';
      default: return 'Staff Dashboard';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <LayoutDashboard className="w-6 h-6 mr-2 text-indigo-600" />
            {getDashboardTitle()}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {user?.name}. Here is your overview.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200/60 shadow-sm text-center">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Module Active</h3>
        <p className="text-slate-500">Your role-specific features will appear here.</p>
      </div>
    </div>
  );
};
