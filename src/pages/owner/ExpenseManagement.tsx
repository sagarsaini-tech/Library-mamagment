import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { 
  collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { 
  Plus, Edit, Trash2, Search, Download, TrendingDown, TrendingUp, 
  DollarSign, Clock, X, CheckCircle2, AlertCircle, FileText, Printer, FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

interface Expense {
  id: string;
  expenseId: string;
  category: string;
  title: string;
  amount: number;
  date: string;
  paymentMode: string;
  status: string;
  remarks: string;
  receiptUrl?: string;
  createdAt: any;
  updatedAt: any;
}

interface Payment {
  id: string;
  amountReceived: number;
  paymentDate: string;
  status: string;
}

const CATEGORIES = [
  'Electricity Bill', 'Internet Bill', 'Rent', 'Staff Salary', 
  'Water Bill', 'Cleaning', 'Maintenance', 'Furniture', 
  'Office Supplies', 'Marketing', 'Other'
];

export const ExpenseManagement: React.FC = () => {
  const { user } = useAuth();
  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : user?.libraryId;
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMonth, setFilterMonth] = useState('Current');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formSaving, setFormSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    status: 'Paid',
    remarks: ''
  });

  useEffect(() => {
    if (!ownerUid) return;

    // Fetch Expenses
    const expensesRef = collection(db, `libraries/${ownerUid}/expenses`);
    const unsubExpenses = onSnapshot(query(expensesRef, orderBy('date', 'desc')), (snapshot) => {
      const exps: Expense[] = [];
      snapshot.forEach(doc => {
        exps.push({ id: doc.id, ...doc.data() } as Expense);
      });
      setExpenses(exps);
      setLoading(false);
    });

    // Fetch Payments for Income calculation
    const paymentsRef = collection(db, `libraries/${ownerUid}/payments`);
    const unsubPayments = onSnapshot(query(paymentsRef), (snapshot) => {
      const pyts: Payment[] = [];
      snapshot.forEach(doc => {
        pyts.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(pyts);
    });

    return () => {
      unsubExpenses();
      unsubPayments();
    };
  }, [user, ownerUid]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      category: CATEGORIES[0],
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'Cash',
      status: 'Paid',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      title: expense.title,
      amount: expense.amount.toString(),
      date: expense.date,
      paymentMode: expense.paymentMode,
      status: expense.status || 'Paid',
      remarks: expense.remarks || ''
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid) return;
    setFormSaving(true);

    try {
      const expenseData = {
        category: formData.category,
        title: formData.title,
        amount: Number(formData.amount),
        date: formData.date,
        paymentMode: formData.paymentMode,
        status: formData.status,
        remarks: formData.remarks,
        updatedAt: serverTimestamp()
      };

      if (editingExpense) {
        const docRef = doc(db, `libraries/${ownerUid}/expenses`, editingExpense.id);
        await setDoc(docRef, expenseData, { merge: true });
        showToast('success', 'Expense updated successfully');
      } else {
        const newRef = doc(collection(db, `libraries/${ownerUid}/expenses`));
        const expenseId = `EXP-${Date.now().toString().slice(-6)}`;
        await setDoc(newRef, {
          ...expenseData,
          expenseId,
          createdAt: serverTimestamp()
        });
        showToast('success', 'Expense added successfully');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      showToast('error', error.message || 'Failed to save expense');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !deletingId) return;
    setFormSaving(true);
    try {
      await deleteDoc(doc(db, `libraries/${ownerUid}/expenses`, deletingId));
      showToast('success', 'Expense deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      showToast('error', error.message || 'Failed to delete expense');
    } finally {
      setFormSaving(false);
      setDeletingId(null);
    }
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    
    let totalMonthlyIncome = 0;
    payments.forEach(p => {
      if (p.paymentDate?.startsWith(currentMonthPrefix) && p.status !== 'Failed') {
        totalMonthlyIncome += (p.amountReceived || 0);
      }
    });

    let totalMonthlyExpenses = 0;
    let pendingExpensesAmount = 0;
    
    expenses.forEach(e => {
      if (e.date.startsWith(currentMonthPrefix)) {
        if (e.status === 'Paid') {
          totalMonthlyExpenses += e.amount;
        }
      }
      if (e.status === 'Pending') {
        pendingExpensesAmount += e.amount;
      }
    });

    const netProfit = totalMonthlyIncome - totalMonthlyExpenses;

    return { totalMonthlyIncome, totalMonthlyExpenses, netProfit, pendingExpensesAmount };
  }, [payments, expenses]);

  // Filters & Pagination
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        e.title.toLowerCase().includes(term) || 
        e.expenseId.toLowerCase().includes(term) ||
        e.remarks?.toLowerCase().includes(term);
        
      const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
      const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const matchesMonth = filterMonth === 'All' || e.date.startsWith(currentMonth);
      
      return matchesSearch && matchesCategory && matchesStatus && matchesMonth;
    });
  }, [expenses, searchTerm, filterCategory, filterMonth, filterStatus]);

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  // Chart Data
  const chartData = useMemo(() => {
    const data: Record<string, { income: number; expense: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const numericKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      data[numericKey] = { income: 0, expense: 0 };
    }

    payments.forEach(p => {
      if (!p.paymentDate || p.status === 'Failed') return;
      const key = p.paymentDate.slice(0, 7);
      if (data[key] !== undefined) {
        data[key].income += p.amountReceived;
      }
    });

    expenses.forEach(e => {
      if (e.status !== 'Paid') return;
      const key = e.date.slice(0, 7);
      if (data[key] !== undefined) {
        data[key].expense += e.amount;
      }
    });

    return Object.keys(data).sort().map(k => {
      const [year, month] = k.split('-');
      const monthName = monthNames[parseInt(month) - 1];
      return {
        name: `${monthName} ${year}`,
        Income: data[k].income,
        Expense: data[k].expense,
        Profit: data[k].income - data[k].expense
      };
    });
  }, [payments, expenses]);

  const exportExcel = () => {
    let csv = "Expense ID,Category,Title,Amount,Date,Payment Mode,Status,Remarks\n";
    filteredExpenses.forEach(e => {
      csv += `"${e.expenseId}","${e.category}","${e.title}",${e.amount},"${e.date}","${e.paymentMode}","${e.status}","${e.remarks || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-expenses, #printable-expenses * { visibility: visible; }
            #printable-expenses { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 z-50 animate-in slide-in-from-bottom-5 no-print ${
          toastMessage.type === 'success' ? 'bg-emerald-900 text-white' : 'bg-rose-900 text-white'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Expense Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track library expenses, analyze profits, and generate reports.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={exportExcel} className="flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </button>
          <button onClick={exportPDF} className="flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm">
            <Printer className="w-4 h-4 mr-2" />
            PDF
          </button>
          <button onClick={openAddModal} className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Income</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">₹{(stats?.totalMonthlyIncome || 0).toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Current Month</p>
        </div>
        
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Total Expenses</p>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">₹{(stats?.totalMonthlyExpenses || 0).toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Current Month</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Net Profit</p>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
            ₹{(stats?.netProfit || 0).toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Current Month</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Expenses</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">₹{(stats?.pendingExpensesAmount || 0).toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Unpaid Dues</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Income vs Expense (Last 6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Net Profit Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="Profit" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center no-print">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full md:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterMonth}
              onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="All">All Time</option>
              <option value="Current">This Month</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div id="printable-expenses" className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="hidden print:block p-8 border-b border-slate-200">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Expense Report</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Generated on {new Date().toLocaleDateString()}</p>
        </div>
        
        {loading ? (
          <div className="animate-pulse p-4">
            <div className="h-10 bg-slate-100 rounded mb-4"></div>
            <div className="h-10 bg-slate-100 rounded mb-4"></div>
            <div className="h-10 bg-slate-100 rounded mb-4"></div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center no-print">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No expenses found</h3>
            <p className="text-slate-500 text-sm mb-6">There are no expense records matching your criteria.</p>
            <button onClick={openAddModal} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expense ID & Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title & Category</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExpenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{expense.expenseId}</p>
                      <p className="text-xs text-slate-500">{expense.date}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{expense.title}</p>
                      <p className="text-xs text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded mt-1">{expense.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">₹{(expense?.amount || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-medium">{expense.paymentMode}</p>
                      {expense.remarks && <p className="text-[10px] text-slate-500 max-w-[150px] truncate" title={expense.remarks}>{expense.remarks}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        expense.status === 'Paid' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right no-print">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => openEditModal(expense)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => openDeleteModal(expense.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {filteredExpenses.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 no-print">
            <span className="text-sm text-slate-500 font-medium">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length}
            </span>
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition-all shadow-sm"
              >
                Prev
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category *</label>
                  <select 
                    required 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title / Description *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. June Electricity Bill"
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    placeholder="0.00"
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-bold"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Mode *</label>
                  <select 
                    required 
                    value={formData.paymentMode} 
                    onChange={e => setFormData({...formData, paymentMode: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank">Bank</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status *</label>
                  <select 
                    required 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks (Optional)</label>
                  <textarea 
                    rows={2}
                    placeholder="Add any additional notes here..."
                    value={formData.remarks} 
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={formSaving} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-70 flex items-center">
                  {formSaving ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Add Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Expense</h3>
              <p className="text-slate-500 text-sm">Are you sure you want to delete this expense record? This action cannot be undone.</p>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={formSaving} className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors text-sm disabled:opacity-70">
                {formSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
