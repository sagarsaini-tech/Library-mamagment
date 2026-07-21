import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

import { 
  Users, UserSquare2, Receipt, AlertCircle, UserPlus, FileCheck, CheckCircle2,
  TrendingUp, Activity, CreditCard
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

// --- DUMMY DATA ---


const incomeData = [
  { name: 'Jan', amount: 8000 },
  { name: 'Feb', amount: 9500 },
  { name: 'Mar', amount: 11000 },
  { name: 'Apr', amount: 10500 },
  { name: 'May', amount: 12000 },
  { name: 'Jun', amount: 12500 },
];

const occupancyData = [
  { name: 'Occupied', value: 120 },
  { name: 'Vacant', value: 30 },
];
const COLORS = ['#4f46e5', '#e2e8f0']; // Indigo for occupied, slate for vacant





export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState('');
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, occupied: 0, revenue: 0 });
  const [growthData, setGrowthData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const ownerUid = user.role === 'LIBRARY_OWNER' ? user.id : user.libraryId;
    if (!ownerUid) return;

    const unsubs: (() => void)[] = [];

    // Fetch students
    const qStudents = query(collection(db, `libraries/${ownerUid}/students`));
    unsubs.push(onSnapshot(qStudents, (snapshot) => {
      let total = 0;
      let active = 0;
      const students: any[] = [];
      const growthMap: any = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        total++;
        if (data.status === 'Active') active++;
        students.push({ id: doc.id, ...data });

        // simple growth data
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        const month = date.toLocaleString('default', { month: 'short' });
        growthMap[month] = (growthMap[month] || 0) + 1;
      });

      // Sort recent students
      students.sort((a, b) => {
        const t1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const t2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return t2 - t1;
      });
      
      const recent = students.slice(0, 5).map(s => ({
        id: s.id,
        name: s.fullName,
        seat: s.seatNumber || 'Unassigned',
        phone: s.mobile,
        status: s.status,
        feeStatus: s.feeStatus,
        date: s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : 'N/A'
      }));
      setRecentStudents(recent);
      
      const gData = Object.keys(growthMap).map(k => ({ name: k, students: growthMap[k] }));
      setGrowthData(gData);
      
      setStats(prev => ({ ...prev, total, active }));
    }, (err) => console.error(err)));

    // Fetch seats
    const qSeats = query(collection(db, `libraries/${ownerUid}/seats`));
    unsubs.push(onSnapshot(qSeats, (snapshot) => {
      let occupied = 0;
      snapshot.forEach(doc => {
        if (doc.data().status === 'Occupied') occupied++;
      });
      setStats(prev => ({ ...prev, occupied }));
    }, (err) => console.error(err)));

    // Fetch payments
    const qPayments = query(collection(db, `libraries/${ownerUid}/payments`));
    unsubs.push(onSnapshot(qPayments, (snapshot) => {
      let revenue = 0;
      const currentMonth = new Date().toISOString().slice(0, 7);
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.paymentDate?.startsWith(currentMonth)) {
          revenue += Number(data.amountReceived || 0);
        }
      });
      setStats(prev => ({ ...prev, revenue }));
    }, (err) => console.error(err)));

    return () => unsubs.forEach(unsub => unsub());
  }, [user]);

  const showToast = () => {
    setToastMessage('Functionality will be added in the next step.');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const statCards = [
    { title: 'Total Students', value: stats.total, icon: <Users className="w-5 h-5 text-blue-600" />, trend: 'Active students' },
    { title: 'Active Students', value: stats.active, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, trend: 'Currently studying' },
    { title: 'Occupied Seats', value: stats.occupied, icon: <UserSquare2 className="w-5 h-5 text-indigo-600" />, trend: 'Allocated seats' },
    { title: 'Monthly Revenue', value: `₹${(stats.revenue || 0).toLocaleString()}`, icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, trend: 'This month' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 z-50 animate-in slide-in-from-bottom-5">
          <Activity className="w-5 h-5 text-indigo-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>
        <p className="text-sm text-slate-500 mt-1">Monitor your library's performance and recent activities.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">{stat.title}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 flex items-center">
                {stat.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800">Monthly Revenue</h3>
            <select className="text-sm bg-slate-50 border-none rounded-lg text-slate-600 font-medium py-1.5 focus:ring-0">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Donut */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col">
          <h3 className="text-base font-bold text-slate-800 mb-6">Seat Occupancy</h3>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {occupancyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-800">80%</span>
                <span className="text-xs text-slate-500 font-medium">Filled</span>
              </div>
            </div>
            <div className="flex justify-center space-x-6 mt-4 w-full">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                <span className="text-sm text-slate-600 font-medium">Occupied</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                <span className="text-sm text-slate-600 font-medium">Vacant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={showToast} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-slate-800 group-hover:text-indigo-900">Add Student</span>
                  <span className="block text-xs text-slate-500">Register new member</span>
                </div>
              </div>
            </button>
            <button onClick={showToast} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                  <UserSquare2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-slate-800 group-hover:text-emerald-900">Allocate Seat</span>
                  <span className="block text-xs text-slate-500">Manage seating plan</span>
                </div>
              </div>
            </button>
            <button onClick={showToast} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-slate-800 group-hover:text-blue-900">Collect Fee</span>
                  <span className="block text-xs text-slate-500">Record a payment</span>
                </div>
              </div>
            </button>
            <button onClick={showToast} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-100 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-slate-800 group-hover:text-amber-900">Mark Attendance</span>
                  <span className="block text-xs text-slate-500">Daily entry register</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Student Growth Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-800 mb-6">Student Growth</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="students" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Recent Admissions</h3>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Seat Number</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admission Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                        {student.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{student.seat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.feeStatus === 'Paid' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {student.feeStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
