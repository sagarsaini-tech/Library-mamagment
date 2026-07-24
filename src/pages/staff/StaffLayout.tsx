import React, { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, UserSquare2, LogOut, Library, Menu, X, ChevronDown, Bell, Contact, Users, LayoutGrid, IndianRupee } from 'lucide-react';

export const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const staffRoles = ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'LIBRARIAN', 'CUSTOM'];
  if (!staffRoles.includes(user?.role || '')) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/staff', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
    { name: 'Students', path: '/staff/students', icon: <Users className="w-5 h-5 mr-3" /> },
    { name: 'Seats', path: '/staff/seats', icon: <LayoutGrid className="w-5 h-5 mr-3" /> },
    { name: 'Fee Management', path: '/staff/fees', icon: <IndianRupee className="w-5 h-5 mr-3" /> },
    { name: 'Visitors', path: '/staff/visitors', icon: <Contact className="w-5 h-5 mr-3" /> },
    { name: 'Notice Board', path: '/staff/notices', icon: <Bell className="w-5 h-5 mr-3" /> },
    { name: 'My Profile', path: '/staff/profile', icon: <UserSquare2 className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white mr-3 shadow-sm">
              <Library className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">StudySync</span>
          </div>
          <button className="md:hidden text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/staff'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center">
            <button 
              className="md:hidden mr-4 text-slate-500 hover:text-slate-700 focus:outline-none"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-800 hidden sm:block">
              Staff Portal
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors focus:outline-none">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border border-white"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            
            <button className="flex items-center space-x-3 focus:outline-none hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm border border-indigo-200 shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="flex flex-col items-start hidden sm:flex">
                <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{user?.name}</span>
                <span className="text-xs text-slate-500 font-medium capitalize">{user?.role?.toLowerCase() || 'Staff'}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
