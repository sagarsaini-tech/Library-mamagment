import fs from 'fs';

const content = `import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { 
  Users, UserCheck, Armchair, TrendingUp, TrendingDown, DollarSign, 
  Clock, Download, FileSpreadsheet, FileText, Printer, FileBarChart, Lightbulb
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

// Type definitions based on existing models
interface Student {
  id: string;
  status: string;
  feeStatus: string;
  pendingAmount?: number;
  createdAt: any;
}

interface Seat {
  id: string;
  seatNumber: string;
  isOccupied: boolean;
}

interface Payment {
  id: string;
  amountReceived: number;
  paymentDate: string;
  status: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  status: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const Reports: React.FC = () => {
  const { user } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState('This Year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (!user) return;

    const unsubs: (() => void)[] = [];

    // Fetch Students
    const studentsRef = collection(db, \\\`libraries/\\\${user.uid}/students\\\`);
    unsubs.push(onSnapshot(query(studentsRef), (snapshot) => {
      const data: Student[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Student));
      setStudents(data);
    }));

    // Fetch Seats
    const seatsRef = collection(db, \\\`libraries/\\\${user.uid}/seats\\\`);
    unsubs.push(onSnapshot(query(seatsRef), (snapshot) => {
      const data: Seat[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Seat));
      setSeats(data);
    }));

    // Fetch Payments
    const paymentsRef = collection(db, \\\`libraries/\\\${user.uid}/payments\\\`);
    unsubs.push(onSnapshot(query(paymentsRef), (snapshot) => {
      const data: Payment[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Payment));
      setPayments(data);
    }));

    // Fetch Expenses
    const expensesRef = collection(db, \\\`libraries/\\\${user.uid}/expenses\\\`);
    unsubs.push(onSnapshot(query(expensesRef), (snapshot) => {
      const data: Expense[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(data);
      setLoading(false); // Assume last to load
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [user]);

  const getDateFilter = () => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    
    if (dateRange === 'Current Month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateRange === 'Last Month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (dateRange === 'This Year') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    } else if (dateRange === 'Custom Date' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
    } else {
      // Default all time (10 years back)
      start = new Date(today.getFullYear() - 10, 0, 1);
    }

    return { 
      startStr: start.toISOString().split('T')[0], 
      endStr: end.toISOString().split('T')[0],
      startObj: start,
      endObj: end
    };
  };

  const { startStr, endStr } = getDateFilter();

  const filteredPayments = useMemo(() => {
    return payments.filter(p => p.paymentDate >= startStr && p.paymentDate <= endStr && p.status !== 'Failed');
  }, [payments, startStr, endStr]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.date >= startStr && e.date <= endStr && e.status === 'Paid');
  }, [expenses, startStr, endStr]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'Active').length;
    
    const totalSeats = seats.length;
    const occupiedSeats = seats.filter(s => s.isOccupied).length;
    const vacantSeats = totalSeats - occupiedSeats;
    const occupancyPercentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    let totalIncome = 0;
    filteredPayments.forEach(p => totalIncome += (p.amountReceived || 0));

    let totalExpense = 0;
    filteredExpenses.forEach(e => totalExpense += e.amount);

    const netProfit = totalIncome - totalExpense;

    let pendingFeesCount = 0;
    let pendingFeesAmount = 0;
    students.forEach(s => {
      if (s.feeStatus === 'Pending' || s.feeStatus === 'Overdue') {
        pendingFeesCount++;
        pendingFeesAmount += (s.pendingAmount || 0);
      }
    });

    return {
      totalStudents, activeStudents, totalSeats, occupiedSeats, vacantSeats,
      occupancyPercentage, totalIncome, totalExpense, netProfit, 
      pendingFeesCount, pendingFeesAmount
    };
  }, [students, seats, filteredPayments, filteredExpenses]);

  // Insights
  const insights = useMemo(() => {
    // Highest income month
    const monthlyIncome: Record<string, number> = {};
    payments.filter(p => p.status !== 'Failed').forEach(p => {
      if(!p.paymentDate) return;
      const month = p.paymentDate.slice(0, 7);
      monthlyIncome[month] = (monthlyIncome[month] || 0) + (p.amountReceived || 0);
    });
    
    let highestIncomeMonth = 'N/A';
    let highestIncomeVal = 0;
    Object.entries(monthlyIncome).forEach(([month, val]) => {
      if (val > highestIncomeVal) {
        highestIncomeVal = val;
        highestIncomeMonth = month; // YYYY-MM
      }
    });

    // Format YYYY-MM to Month YYYY
    if (highestIncomeMonth !== 'N/A') {
      const d = new Date(highestIncomeMonth + '-01');
      highestIncomeMonth = d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    }

    // Highest expense category
    const categoryExpenses: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      categoryExpenses[e.category] = (categoryExpenses[e.category] || 0) + e.amount;
    });
    let highestExpenseCategory = 'N/A';
    let highestExpenseVal = 0;
    Object.entries(categoryExpenses).forEach(([cat, val]) => {
      if (val > highestExpenseVal) {
        highestExpenseVal = val;
        highestExpenseCategory = cat;
      }
    });

    return { highestIncomeMonth, highestExpenseCategory, highestIncomeVal, highestExpenseVal };
  }, [payments, filteredExpenses]);

  // Charts Data
  const financialChartData = useMemo(() => {
    const dataMap: Record<string, { income: number, expense: number }> = {};
    
    // Group by month based on date range
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Initialize months in range
    const { startObj, endObj } = getDateFilter();
    let current = new Date(startObj);
    current.setDate(1); // Set to 1st to avoid month skipping
    while (current <= endObj) {
      const key = \\\`\\\${current.getFullYear()}-\\\${String(current.getMonth() + 1).padStart(2, '0')}\\\`;
      dataMap[key] = { income: 0, expense: 0 };
      current.setMonth(current.getMonth() + 1);
    }

    filteredPayments.forEach(p => {
      const key = p.paymentDate.slice(0, 7);
      if (dataMap[key]) {
        dataMap[key].income += (p.amountReceived || 0);
      }
    });

    filteredExpenses.forEach(e => {
      const key = e.date.slice(0, 7);
      if (dataMap[key]) {
        dataMap[key].expense += e.amount;
      }
    });

    return Object.keys(dataMap).sort().map(k => {
      const [year, month] = k.split('-');
      return {
        name: \\\`\\\${monthNames[parseInt(month) - 1]} \\\${year}\\\`,
        Income: dataMap[k].income,
        Expense: dataMap[k].expense,
        Profit: dataMap[k].income - dataMap[k].expense
      };
    });
  }, [filteredPayments, filteredExpenses, dateRange, customStartDate, customEndDate]);

  const expenseCategoryData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      dataMap[e.category] = (dataMap[e.category] || 0) + e.amount;
    });
    return Object.keys(dataMap).map(k => ({ name: k, value: dataMap[k] })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Export Functions
  const exportCSV = (type: string) => {
    let csv = '';
    let filename = '';

    if (type === 'overview') {
      csv = "Metric,Value\\n";
      csv += \\\`Total Students,\\\${stats.totalStudents}\\n\\\`;
      csv += \\\`Active Students,\\\${stats.activeStudents}\\n\\\`;
      csv += \\\`Occupied Seats,\\\${stats.occupiedSeats}\\n\\\`;
      csv += \\\`Vacant Seats,\\\${stats.vacantSeats}\\n\\\`;
      csv += \\\`Income,\\\${stats.totalIncome}\\n\\\`;
      csv += \\\`Expenses,\\\${stats.totalExpense}\\n\\\`;
      csv += \\\`Net Profit,\\\${stats.netProfit}\\n\\\`;
      filename = "Library_Overview_Report.csv";
    }

    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    }
  };

  const exportPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Print Styles */}
      <style>
        {\\\`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
            .print-break { page-break-before: always; }
          }
        \\\`}
      </style>

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <FileBarChart className="w-6 h-6 mr-2 text-indigo-600" />
            Reports & Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-1">Comprehensive view of your library's performance.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="Current Month">Current Month</option>
            <option value="Last Month">Last Month</option>
            <option value="This Year">This Year</option>
            <option value="Custom Date">Custom Date</option>
          </select>
          
          {dateRange === 'Custom Date' && (
            <div className="flex items-center space-x-2">
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
          )}

          <div className="flex gap-2 border-l border-slate-200 pl-3">
            <button onClick={() => exportCSV('overview')} className="flex items-center justify-center p-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm" title="Export CSV">
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button onClick={exportPrint} className="flex items-center justify-center p-2.5 bg-indigo-600 border border-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm" title="Print/PDF">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div id="printable-report" className="space-y-6">
        <div className="hidden print:block p-4 border-b border-slate-200 mb-6">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Library Analytics Report</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Generated on {new Date().toLocaleDateString()} | Range: {dateRange}</p>
        </div>

        {/* Top Insights */}
        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex flex-wrap gap-6 items-center">
          <div className="flex items-center text-indigo-800">
            <Lightbulb className="w-5 h-5 mr-2 text-amber-500" />
            <span className="text-sm font-bold uppercase tracking-wider mr-2">Insights:</span>
          </div>
          <div className="text-sm text-slate-700 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Highest Income: <span className="text-indigo-700 font-bold">{insights.highestIncomeMonth} (₹{insights.highestIncomeVal})</span>
          </div>
          <div className="text-sm text-slate-700 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Top Expense: <span className="text-rose-600 font-bold">{insights.highestExpenseCategory}</span>
          </div>
          <div className="text-sm text-slate-700 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Occupancy: <span className="text-emerald-600 font-bold">{stats.occupancyPercentage}%</span>
          </div>
          <div className="text-sm text-slate-700 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Pending Fees: <span className="text-amber-600 font-bold">{stats.pendingFeesCount} Students (₹{stats.pendingFeesAmount})</span>
          </div>
        </div>

        {/* Dashboard Cards Grid 1: Students & Seats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalStudents}</h3>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Students</p>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{stats.activeStudents}</h3>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Occupied Seats</p>
              <Armchair className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{stats.occupiedSeats}</h3>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Vacant Seats</p>
              <Armchair className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{stats.vacantSeats}</h3>
          </div>
        </div>

        {/* Dashboard Cards Grid 2: Financials */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Income ({dateRange})</p>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">₹{stats.totalIncome.toLocaleString()}</h3>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Expenses ({dateRange})</p>
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">₹{stats.totalExpense.toLocaleString()}</h3>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Net Profit ({dateRange})</p>
              <DollarSign className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className={\`text-2xl font-bold \${stats.netProfit >= 0 ? 'text-indigo-700' : 'text-rose-600'}\`}>
              ₹{stats.netProfit.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Fees</p>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">₹{stats.pendingFeesAmount.toLocaleString()}</h3>
          </div>
        </div>

        {/* Charts: Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-break">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Income vs Expense Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \\\`₹\\\${val}\\\`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Profit Comparison</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \\\`₹\\\${val}\\\`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15} />
                  <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={15} />
                  <Bar dataKey="Profit" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts: Composition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Expense Categories ({dateRange})</h3>
            <div className="h-64 flex flex-col items-center justify-center">
              {expenseCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={\\\`cell-\\\${index}\\\`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [\\\`₹\\\${value.toLocaleString()}\\\`, 'Amount']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-sm">No expenses in this period</div>
              )}
              <div className="flex flex-wrap justify-center gap-3 mt-4 w-full">
                {expenseCategoryData.slice(0, 5).map((entry, index) => (
                  <div key={entry.name} className="flex items-center text-xs">
                    <div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-slate-600 font-medium">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Seat Occupancy</h3>
            <div className="h-64 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Occupied', value: stats.occupiedSeats },
                      { name: 'Vacant', value: stats.vacantSeats }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#cbd5e1" />
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Seats']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase">Occupied</p>
                  <p className="text-lg font-black text-emerald-600">{stats.occupiedSeats}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase">Vacant</p>
                  <p className="text-lg font-black text-slate-500">{stats.vacantSeats}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/pages/owner/Reports.tsx', content);
console.log('Reports.tsx written successfully');
