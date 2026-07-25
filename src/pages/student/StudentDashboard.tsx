import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router';
import { 
  UserSquare2, Building2, CalendarCheck, Receipt, Clock, Bell,
  CheckCircle2, AlertCircle, ChevronRight, User, Mail, Phone, MapPin
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [libraryName, setLibraryName] = useState<string>('Study Library');
  
  // Dummy Data
  const studentData = {
    libraryName: libraryName,
    seatNumber: "A-12",
    status: "Active",
    nextFeeDate: "15 Nov 2023",
    attendancePercent: "92%",
    todayStatus: "Present",
    checkInTime: "08:15 AM",
    planType: "Monthly (AC)",
    joinDate: "15 Oct 2023",
    phone: "+91 9876543210",
    email: user?.email || "student@example.com",
    address: "123 Study Lane, Knowledge City",
    emergencyContact: "+91 9876543211",
  };

  useEffect(() => {
    if (!user?.libraryId) return;

    // Listen to library settings/config
    const unsubConfig = onSnapshot(doc(db, `libraries/${user.libraryId}/settings/config`), (docSnap) => {
      if (docSnap.exists() && docSnap.data().libraryName) {
        setLibraryName(docSnap.data().libraryName);
      } else {
        getDoc(doc(db, 'libraries', user.libraryId!)).then(libSnap => {
          if (libSnap.exists() && libSnap.data()?.name) {
            setLibraryName(libSnap.data().name);
          }
        }).catch(console.error);
      }
    });

    return () => unsubConfig();
  }, [user?.libraryId]);

  useEffect(() => {
    if (!user?.libraryId) return;

    const q = query(
      collection(db, `libraries/${user.libraryId}/notices`),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const noticesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      const activeNotices = noticesData.filter(notice => {
        if (notice.status !== 'Published') return false;
        
        // Target Audience filter
        if (notice.targetAudience !== 'All Students') {
          const gender = user?.profile?.gender || user?.gender;
          if (notice.targetAudience === 'Only Boys' && gender !== 'Male') return false;
          if (notice.targetAudience === 'Only Girls' && gender !== 'Female') return false;
        }

        const pubDate = notice.publishDate ? new Date(notice.publishDate) : new Date(notice.createdAt?.toMillis() || 0);
        const expDate = notice.expiryDate ? new Date(notice.expiryDate) : null;
        
        if (pubDate > now) return false;
        if (expDate && expDate < now) return false;

        return true;
      });
      
      setRecentNotices(activeNotices.slice(0, 3));
    });

    return () => unsubscribe();
  }, [user]);

  const feeHistory = [
    { id: 1, month: "October", amount: 1200, status: "Paid", date: "15 Oct 2023" },
    { id: 2, month: "September", amount: 1200, status: "Paid", date: "14 Sep 2023" },
    { id: 3, month: "August", amount: 1200, status: "Paid", date: "15 Aug 2023" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & Profile Summary */}
      <div className="bg-indigo-600 rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        {/* Background Decorative Pattern */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5"></div>
        <div className="absolute bottom-0 right-32 -mb-12 w-32 h-32 rounded-full bg-white opacity-5"></div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {user?.name.split(' ')[0]}!</h2>
            <p className="text-indigo-100 mb-6 max-w-lg">
              You are currently checked in at {studentData.libraryName}. Have a great study session today.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-500/50 text-sm font-medium backdrop-blur-sm border border-indigo-400/30">
                <Building2 className="w-4 h-4 mr-2" /> {studentData.libraryName}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500/50 text-sm font-medium backdrop-blur-sm border border-emerald-400/30">
                <UserSquare2 className="w-4 h-4 mr-2" /> Seat {studentData.seatNumber}
              </span>
            </div>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
              <span className="text-4xl font-bold">{user?.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              {studentData.status}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-800">Membership</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">{studentData.planType}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-800">{studentData.nextFeeDate}</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Next Fee Due</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-800">{studentData.attendancePercent}</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Attendance Rate</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-800">{studentData.todayStatus}</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Today ({studentData.checkInTime})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center">
              <User className="w-5 h-5 mr-2 text-indigo-600" />
              My Profile
            </h3>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Edit</button>
          </div>
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-2xl mb-3 shadow-sm border border-indigo-200">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <h4 className="text-lg font-bold text-slate-800">{user?.name}</h4>
            <span className="text-sm text-slate-500">Joined {studentData.joinDate}</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-sm">
              <Mail className="w-4 h-4 text-slate-400 mr-3" />
              <span className="text-slate-700 truncate">{studentData.email}</span>
            </div>
            <div className="flex items-center text-sm">
              <Phone className="w-4 h-4 text-slate-400 mr-3" />
              <span className="text-slate-700">{studentData.phone}</span>
            </div>
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
              <span className="text-slate-700">{studentData.address}</span>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100">
              <div className="flex items-center text-sm">
                <AlertCircle className="w-4 h-4 text-slate-400 mr-3" />
                <div>
                  <span className="block text-xs text-slate-500">Emergency Contact</span>
                  <span className="text-slate-700 font-medium">{studentData.emergencyContact}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications and History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Notifications */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-indigo-600" />
                Announcements
              </h3>
              <Link to="/student/notifications" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</Link>
            </div>
            <div className="space-y-4">
              {recentNotices.length === 0 && <p className="text-sm text-slate-500">No recent announcements.</p>}
              {recentNotices.map(notice => (
                <div key={notice.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="mt-1">
                    {notice.priority === 'High' ? (
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-bold text-slate-800">{notice.title}</h4>
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap ml-2">
                        {new Date(notice.publishDate || (notice.createdAt?.toMillis ? notice.createdAt.toMillis() : Date.now())).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-1">{notice.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fee History */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-indigo-600" />
                Recent Payments
              </h3>
              <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</button>
            </div>
            <div className="space-y-4">
              {feeHistory.map(fee => (
                <div key={fee.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                      ₹
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{fee.month} Fee</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{fee.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">₹{fee.amount}</p>
                    <p className="text-xs font-medium text-emerald-600 mt-0.5">{fee.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
