import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Library, Users, Settings, LogOut, 
  Menu, X, Bell, UserSquare2, Activity, ShieldCheck
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
    { name: 'Libraries', path: '/admin/libraries', icon: <Library className="w-5 h-5 mr-3" /> },
    { name: 'Owners', path: '/admin/owners', icon: <UserSquare2 className="w-5 h-5 mr-3" /> },
    { name: 'Analytics', path: '/admin/analytics', icon: <Activity className="w-5 h-5 mr-3" /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white transition-all duration-300 z-20">
        <div className="p-6 flex items-center justify-center border-b border-slate-800">
          <ShieldCheck className="w-8 h-8 text-indigo-400 mr-2" />
          <h1 className="text-xl font-bold text-white tracking-tight">Super Admin</h1>
        </div>
        
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30">
              {user.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-900/20' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors`}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-rose-400 rounded-xl transition-colors group"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-400 group-hover:text-rose-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out z-40 md:hidden flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center">
            <ShieldCheck className="w-8 h-8 text-indigo-400 mr-2" />
            <h1 className="text-xl font-bold text-white tracking-tight">Super Admin</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-900/20' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors`}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => {
              setSidebarOpen(false);
              logout();
            }}
            className="flex items-center w-full px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-rose-400 rounded-xl transition-colors group"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-400 group-hover:text-rose-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 mr-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <ShieldCheck className="w-6 h-6 text-indigo-600 mr-2" />
            <h1 className="text-lg font-bold text-slate-800">Super Admin</h1>
          </div>
          <div className="flex items-center">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Desktop Topbar */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Admin Control Panel</h2>
            <p className="text-sm text-slate-500">Manage all libraries and system settings.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
