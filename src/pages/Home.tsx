import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { LogOut, User as UserIcon, Shield, Building2, BookOpen } from 'lucide-react';

export const Home: React.FC = () => {
  const { user, logout } = useAuth();

  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === 'LIBRARY_OWNER') {
    return <Navigate to="/owner/dashboard" replace />;
  }
  
  if (user?.role === 'STUDENT' && window.location.pathname === '/') {
    return <Navigate to="/student/dashboard" replace />;
  }

  const staffRoles = ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'LIBRARIAN', 'CUSTOM'];
  if (staffRoles.includes(user?.role || '') && window.location.pathname === '/') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN': return <Shield className="w-12 h-12 text-purple-600 mb-4" />;
      case 'LIBRARY_OWNER': return <Building2 className="w-12 h-12 text-blue-600 mb-4" />;
      case 'STUDENT': return <BookOpen className="w-12 h-12 text-green-600 mb-4" />;
      default: return <UserIcon className="w-12 h-12 text-gray-600 mb-4" />;
    }
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN': return 'Super Admin Access';
      case 'LIBRARY_OWNER': return 'Library Owner Portal';
      case 'STUDENT': return 'Student Space';
      default: return 'User Portal';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col font-sans text-[#3A3A2F]">
      <header className="px-10 py-6 flex items-center justify-between border-b border-[#E5E5DE] bg-white">
        <h1 className="text-xl font-serif text-[#2C2C24]">StudySync Pro</h1>
        <button
          onClick={logout}
          className="flex items-center text-sm font-bold text-[#5A5A40] hover:text-[#4A4A35] transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </header>

      <main className="flex-1 w-full mx-auto p-6 md:p-12 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg shadow-[#5A5A4011] border border-[#E5E5DE] p-10 w-full max-w-md text-center flex flex-col items-center">
          <div className="text-[#5A5A40]">
            {getRoleIcon()}
          </div>
          <h2 className="text-2xl font-serif text-[#2C2C24] mb-2">Welcome, {user?.name}!</h2>
          <p className="text-[#8A8A7A] mb-6">{user?.email}</p>
          
          <div className="bg-[#F5F5F0] rounded-lg p-4 w-full border border-[#E5E5DE]">
            <span className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-1">
              Current Role
            </span>
            <span className="block text-lg font-bold text-[#3A3A2F]">
              {getRoleTitle()}
            </span>
          </div>

          <div className="mt-8 text-sm text-[#8A8A7A]">
            <p>Authentication & Routing is configured.</p>
            <p>Dashboard features will be implemented next.</p>
          </div>
        </div>
      </main>
      
      {/* Footer Status Bar */}
      <footer className="px-10 py-4 bg-[#F5F5F0] border-t border-[#E5E5DE] flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] text-[#8A8A7A] font-medium uppercase tracking-tighter">System Online</span>
          </div>
          <span className="text-[10px] text-[#8A8A7A] font-medium uppercase tracking-tighter">Firebase Auth Active</span>
          <span className="text-[10px] text-[#8A8A7A] font-medium uppercase tracking-tighter">Firestore Sync</span>
        </div>
        <div className="text-[10px] text-[#8A8A7A] font-medium">
          &copy; 2026 StudySync Pro. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
