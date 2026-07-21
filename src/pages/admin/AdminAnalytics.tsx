import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Activity, Users, Building2, TrendingUp } from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const AdminAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [libraryData, setLibraryData] = useState<any[]>([]);
  const [stateData, setStateData] = useState<any[]>([]);
  
  // Placeholder growth data
  const growthData = [
    { month: 'Jan', libraries: 12, students: 120, revenue: 15000 },
    { month: 'Feb', libraries: 19, students: 230, revenue: 28000 },
    { month: 'Mar', libraries: 25, students: 380, revenue: 45000 },
    { month: 'Apr', libraries: 32, students: 540, revenue: 62000 },
    { month: 'May', libraries: 48, students: 850, revenue: 98000 },
    { month: 'Jun', libraries: 65, students: 1200, revenue: 145000 },
    { month: 'Jul', libraries: 85, students: 1650, revenue: 195000 },
  ];

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    const q = query(collection(db, 'libraries'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statesCount: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.state) {
          statesCount[data.state] = (statesCount[data.state] || 0) + 1;
        } else {
          statesCount['Unknown'] = (statesCount['Unknown'] || 0) + 1;
        }
      });

      const formattedStateData = Object.keys(statesCount).map(state => ({
        name: state,
        value: statesCount[state]
      })).sort((a, b) => b.value - a.value);

      setStateData(formattedStateData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">System Analytics</h2>
          <p className="text-sm text-slate-500">Platform growth and performance metrics.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Libraries Growth */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center">
                <Building2 className="w-5 h-5 text-indigo-500 mr-2" />
                Libraries Growth Trend
              </h3>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLibs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="libraries" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorLibs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Students Growth */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center">
                <Users className="w-5 h-5 text-emerald-500 mr-2" />
                Students Growth Trend
              </h3>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="students" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center">
                <TrendingUp className="w-5 h-5 text-amber-500 mr-2" />
                Revenue Trend (Placeholder)
              </h3>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `₹${value/1000}k`} />
                <RechartsTooltip 
                  formatter={(value: number) => [`₹${value?.toLocaleString?.() || value}`, 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* State-wise Libraries */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center">
                <Activity className="w-5 h-5 text-rose-500 mr-2" />
                State-wise Libraries
              </h3>
            </div>
          </div>
          <div className="h-72 flex flex-col justify-center">
            {loading ? (
              <div className="text-center text-slate-400">Loading states data...</div>
            ) : stateData.length === 0 ? (
              <div className="text-center text-slate-400">No location data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {stateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    formatter={(value, entry: any) => <span className="text-xs text-slate-600">{value} ({entry.payload.value})</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
