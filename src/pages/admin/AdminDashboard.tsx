import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { collection, query, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { 
  Building2, Users, AlertTriangle, CheckCircle2, 
  DollarSign, UserPlus, Activity, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalLibraries: 0,
    activeLibraries: 0,
    suspendedLibraries: 0,
    totalOwners: 0,
    totalStaff: 0,
    totalStudents: 0,
    newRegistrations: 0,
    revenue: 0 // Placeholder
  });

  const [recentLibraries, setRecentLibraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    // Listen to libraries
    const librariesQuery = query(collection(db, 'libraries'));
    const unsubscribeLibraries = onSnapshot(librariesQuery, (snapshot) => {
      let active = 0;
      let suspended = 0;
      let newReg = 0;
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const librariesList: any[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        librariesList.push({ id: doc.id, ...data });
        
        if (data.status === 'suspended') {
          suspended++;
        } else {
          active++;
        }

        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
        if (createdAt && createdAt > thirtyDaysAgo) {
          newReg++;
        }
      });

      // Sort by creation date
      librariesList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setRecentLibraries(librariesList.slice(0, 5));

      setStats(prev => ({
        ...prev,
        totalLibraries: snapshot.size,
        activeLibraries: active,
        suspendedLibraries: suspended,
        newRegistrations: newReg
      }));
    });

    // Listen to users
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      let owners = 0;
      let students = 0;
      let staff = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.role === 'LIBRARY_OWNER') owners++;
        else if (data.role === 'STUDENT') students++;
        else if (['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'LIBRARIAN'].includes(data.role)) staff++;
      });

      setStats(prev => ({
        ...prev,
        totalOwners: owners,
        totalStudents: students,
        totalStaff: staff,
        revenue: 245000 // Placeholder
      }));
      setLoading(false);
    });

    return () => {
      unsubscribeLibraries();
      unsubscribeUsers();
    };
  }, []);

  const statCards = [
    { title: "Total Libraries", value: stats.totalLibraries, icon: <Building2 className="w-6 h-6 text-indigo-600" />, bg: "bg-indigo-50", text: "text-indigo-600" },
    { title: "Active Libraries", value: stats.activeLibraries, icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />, bg: "bg-emerald-50", text: "text-emerald-600" },
    { title: "Suspended", value: stats.suspendedLibraries, icon: <AlertTriangle className="w-6 h-6 text-rose-600" />, bg: "bg-rose-50", text: "text-rose-600" },
    { title: "Total Owners", value: stats.totalOwners, icon: <ShieldCheck className="w-6 h-6 text-amber-600" />, bg: "bg-amber-50", text: "text-amber-600" },
    { title: "Total Students", value: stats.totalStudents, icon: <Users className="w-6 h-6 text-blue-600" />, bg: "bg-blue-50", text: "text-blue-600" },
    { title: "Total Staff", value: stats.totalStaff, icon: <UserPlus className="w-6 h-6 text-violet-600" />, bg: "bg-violet-50", text: "text-violet-600" },
    { title: "Total Revenue", value: `₹${(stats.revenue || 0).toLocaleString()}`, icon: <DollarSign className="w-6 h-6 text-emerald-600" />, bg: "bg-emerald-50", text: "text-emerald-600" },
    { title: "New (30 Days)", value: stats.newRegistrations, icon: <Activity className="w-6 h-6 text-indigo-600" />, bg: "bg-indigo-50", text: "text-indigo-600" }
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.text}`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center">
              <Building2 className="w-5 h-5 text-indigo-600 mr-2" />
              <h3 className="font-bold text-slate-800">Recent Libraries</h3>
            </div>
            <Link to="/admin/libraries" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          <div className="p-6 flex-1">
            {recentLibraries.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No libraries found.</div>
            ) : (
              <div className="space-y-4">
                {recentLibraries.map(library => (
                  <div key={library.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {library.name?.charAt(0) || 'L'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{library.name}</h4>
                        <p className="text-xs text-slate-500">{library.city}, {library.state}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        library.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {library.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-indigo-600 mr-2" />
              <h3 className="font-bold text-slate-800">System Analytics</h3>
            </div>
            <Link to="/admin/analytics" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View Details</Link>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[300px] text-center">
             <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-slate-400" />
             </div>
             <h4 className="text-lg font-bold text-slate-700 mb-2">Analytics Overview</h4>
             <p className="text-sm text-slate-500 max-w-sm">Comprehensive charts and growth metrics are available in the Analytics module.</p>
             <Link to="/admin/analytics" className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
               View Full Analytics
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
