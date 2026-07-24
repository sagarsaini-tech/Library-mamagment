import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { 
  collection, query, onSnapshot, doc, 
  serverTimestamp, runTransaction, writeBatch, orderBy, getDocs
} from 'firebase/firestore';
import { 
  IndianRupee, TrendingUp, Users, AlertCircle, Search, 
  Download, Printer, CheckCircle2, Loader2, Eye, Receipt as ReceiptIcon, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  mobile: string;
  seatNumber: string;
  monthlyFee: number;
  feeDueDate: string;
  feeStatus: string;
  pendingAmount?: number;
  lastPaymentDate?: string;
  status: string;
}

interface Payment {
  id: string;
  paymentId: string;
  receiptNumber: string;
  studentId: string;
  studentDocId: string;
  studentName: string;
  seatNumber: string;
  feeMonth: string;
  monthlyFee: number;
  pendingAmount: number;
  amountReceived: number;
  remainingBalance: number;
  paymentDate: string;
  paymentMode: string;
  transactionId: string;
  remarks: string;
  status: string;
  createdAt: any;
}

export const FeeManagement: React.FC = () => {
  const { user } = useAuth();
  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : (user?.libraryId || user?.id);
  const canDeletePayment = user?.role === 'LIBRARY_OWNER' || user?.role === 'SUPER_ADMIN';
  
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');
  const [filterMonth, setFilterMonth] = useState<'All' | 'Current'>('All');
  const [filterMode, setFilterMode] = useState<'All' | 'Cash' | 'UPI' | 'Bank Transfer' | 'Card'>('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modals
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [selectedStudentDocId, setSelectedStudentDocId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [formSaving, setFormSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ownerUid) return;
    
    // Fetch Students
    const studentsRef = collection(db, `libraries/${ownerUid}/students`);
    const unsubStudents = onSnapshot(query(studentsRef), (snapshot) => {
      const studs: Student[] = [];
      snapshot.forEach(doc => {
        studs.push({ id: doc.id, ...doc.data() } as Student);
      });
      setStudents(studs);
    });

    // Fetch Payments
    const paymentsRef = collection(db, `libraries/${ownerUid}/payments`);
    const unsubPayments = onSnapshot(query(paymentsRef, orderBy('createdAt', 'desc')), (snapshot) => {
      const pyts: Payment[] = [];
      snapshot.forEach(doc => {
        pyts.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(pyts);
      setLoading(false);
    });

    return () => {
      unsubStudents();
      unsubPayments();
    };
  }, [user, ownerUid]);

  // Auto Due Management Check (runs when students change and component is mounted)
  useEffect(() => {
    if (!user || students.length === 0) return;
    
    const runAutoDueManagement = async () => {
      const today = new Date().toISOString().split('T')[0];
      const batch = writeBatch(db);
      let updatesCount = 0;
      
      students.forEach(student => {
        let newStatus = student.feeStatus;
        if (student.feeDueDate) {
          if (today > student.feeDueDate && student.feeStatus !== 'Overdue') {
            newStatus = 'Overdue';
          }
        }
        
        if (newStatus !== student.feeStatus) {
          const ref = doc(db, `libraries/${ownerUid}/students`, student.id);
          batch.update(ref, { feeStatus: newStatus });
          updatesCount++;
        }
      });
      
      if (updatesCount > 0) {
        try {
          await batch.commit();
        } catch (e) {
          console.error("Error auto-updating due status:", e);
        }
      }
    };
    
    runAutoDueManagement();
  }, [students, user]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openCollectModal = () => {
    setSelectedStudentDocId('');
    setAmountReceived('');
    setPaymentMode('UPI');
    setTransactionId('');
    setRemarks('');
    setIsCollectModalOpen(true);
  };

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const docId = e.target.value;
    setSelectedStudentDocId(docId);
    
    const student = students.find(s => s.id === docId);
    if (student) {
      const totalPayable = student.monthlyFee + (student.pendingAmount || 0);
      setAmountReceived(totalPayable.toString());
    } else {
      setAmountReceived('');
    }
  };

  const submitFeeCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudentDocId || !amountReceived) return;
    
    const student = students.find(s => s.id === selectedStudentDocId);
    if (!student) return;

    setFormSaving(true);
    
    try {
      const receivedAmt = Number(amountReceived);
      const prevPending = student.pendingAmount || 0;
      const totalPayable = student.monthlyFee + prevPending;
      const newBalance = totalPayable - receivedAmt;
      
      // Calculate next due date (add 1 month)
      const currentDueDate = new Date(student.feeDueDate || new Date().toISOString());
      currentDueDate.setMonth(currentDueDate.getMonth() + 1);
      const nextDueDateStr = currentDueDate.toISOString().split('T')[0];
      
      // Format Fee Month (e.g., "May 2024")
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonthDate = new Date(student.feeDueDate || new Date().toISOString());
      const feeMonthStr = `${monthNames[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`;
      
      const todayStr = new Date().toISOString().split('T')[0];
      
      const paymentDocRef = doc(collection(db, `libraries/${ownerUid}/payments`));
      
      // Generate unique Receipt Number
      const receiptNum = `REC-${Date.now().toString().slice(-6)}`;
      const paymentId = `PAY-${Date.now().toString().slice(-6)}`;
      
      let newFeeStatus = 'Paid';
      if (newBalance > 0) {
        newFeeStatus = 'Pending'; // or keep Paid if you don't care about balance
      }

      await runTransaction(db, async (transaction) => {
        const studentRef = doc(db, `libraries/${ownerUid}/students`, student.id);
        
        const paymentData: Payment = {
          id: paymentDocRef.id,
          paymentId,
          receiptNumber: receiptNum,
          studentId: student.studentId,
          studentDocId: student.id,
          studentName: student.fullName,
          seatNumber: student.seatNumber,
          feeMonth: feeMonthStr,
          monthlyFee: student.monthlyFee,
          pendingAmount: prevPending,
          amountReceived: receivedAmt,
          remainingBalance: newBalance,
          paymentDate: todayStr,
          paymentMode,
          transactionId,
          remarks,
          status: 'Completed',
          createdAt: serverTimestamp()
        };
        
        transaction.set(paymentDocRef, paymentData);
        
        transaction.update(studentRef, {
          lastPaymentDate: todayStr,
          feeDueDate: nextDueDateStr,
          feeStatus: newFeeStatus,
          pendingAmount: newBalance,
          updatedAt: serverTimestamp()
        });
      });

      showToast('success', 'Fee collected successfully!');
      setIsCollectModalOpen(false);
      
      // Open receipt
      const createdPayment = payments.find(p => p.receiptNumber === receiptNum);
      if (createdPayment) {
         // It might not be in state yet, we can simulate or wait
      }
      
    } catch (error: any) {
      console.error("Error collecting fee:", error);
      showToast('error', error.message || 'Failed to collect fee');
    } finally {
      setFormSaving(false);
    }
  };

  const viewReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsReceiptModalOpen(true);
  };

  const viewProfile = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setIsProfileModalOpen(true);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  // Derived state for the selected student in the collect modal
  const collectStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentDocId) || null;
  }, [students, selectedStudentDocId]);

  const collectTotalPayable = collectStudent ? collectStudent.monthlyFee + (collectStudent.pendingAmount || 0) : 0;
  const collectRemainingBalance = collectTotalPayable - (Number(amountReceived) || 0);

  // Filters & Pagination for Payments list
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        p.studentName.toLowerCase().includes(term) ||
        p.receiptNumber.toLowerCase().includes(term) ||
        p.seatNumber.toLowerCase().includes(term) ||
        (students.find(s => s.id === p.studentDocId)?.mobile || '').includes(term);
        
      const matchesMode = filterMode === 'All' || p.paymentMode === filterMode;
      
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const matchesMonth = filterMonth === 'All' || p.paymentDate.startsWith(currentMonth);
      
      return matchesSearch && matchesMode && matchesMonth;
    });
  }, [payments, searchTerm, filterMode, filterMonth, students]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  // Dashboard Stats Calculation
  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    let amountCollectedThisMonth = 0;
    payments.forEach(p => {
      if (p.paymentDate.startsWith(currentMonth)) {
        amountCollectedThisMonth += p.amountReceived;
      }
    });

    let totalMonthlyExpected = 0;
    let totalPendingAmount = 0;
    let overdueCount = 0;
    let paidCount = 0;
    let expectedActiveStudents = 0;

    students.forEach(s => {
      if (s.status === 'Active') {
        totalMonthlyExpected += s.monthlyFee;
        expectedActiveStudents++;
      }
      totalPendingAmount += (s.pendingAmount || 0);
      
      if (s.feeStatus === 'Overdue' && s.status === 'Active') {
        overdueCount++;
      }
      if (s.feeStatus === 'Paid' && s.status === 'Active') {
        paidCount++;
      }
    });

    const collectionPercentage = totalMonthlyExpected > 0 
      ? Math.round((amountCollectedThisMonth / totalMonthlyExpected) * 100) 
      : 0;

    return {
      totalMonthlyExpected,
      amountCollectedThisMonth,
      totalPendingAmount,
      overdueCount,
      collectionPercentage,
      paidCount,
      expectedActiveStudents
    };
  }, [payments, students]);

  // Chart Data
  const revenueChartData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Initialize last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyData[key] = 0;
    }

    payments.forEach(p => {
      const pd = new Date(p.paymentDate);
      const key = `${monthNames[pd.getMonth()]} ${pd.getFullYear()}`;
      if (monthlyData[key] !== undefined) {
        monthlyData[key] += p.amountReceived;
      }
    });

    return Object.keys(monthlyData).map(k => ({
      name: k,
      revenue: monthlyData[k]
    }));
  }, [payments]);

  const paymentModeData = useMemo(() => {
    const modes: Record<string, number> = { 'UPI': 0, 'Cash': 0, 'Bank Transfer': 0, 'Card': 0 };
    payments.forEach(p => {
      if (modes[p.paymentMode] !== undefined) {
        modes[p.paymentMode] += p.amountReceived;
      } else {
        modes[p.paymentMode] = p.amountReceived;
      }
    });
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'];
    return Object.keys(modes).filter(k => modes[k] > 0).map((k, i) => ({
      name: k,
      value: modes[k],
      color: COLORS[i % COLORS.length]
    }));
  }, [payments]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-receipt, #printable-receipt * { visibility: visible; }
            #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* Toast Notification */}
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Fee Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage payments, track dues, and generate receipts.</p>
        </div>
        <button 
          onClick={openCollectModal}
          className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
        >
          <IndianRupee className="w-4 h-4 mr-2" />
          Collect Fee
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 no-print">
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Monthly Revenue Expected</p>
          <h3 className="text-2xl font-bold text-slate-800">₹{stats.totalMonthlyExpected}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Collected This Month</p>
          <h3 className="text-2xl font-bold text-slate-800">₹{stats.amountCollectedThisMonth}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">Total Pending Amount</p>
          <h3 className="text-2xl font-bold text-slate-800">₹{stats.totalPendingAmount}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">Overdue Students</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.overdueCount}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Collection %</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-2xl font-bold text-slate-800">{stats.collectionPercentage}%</h3>
            <span className="text-xs text-slate-500 mb-1">of expected</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Revenue Collection (Last 6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₹${value}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Payment Modes</h3>
          <div className="h-64 flex flex-col items-center justify-center">
            {paymentModeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentModeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [`₹${value}`, 'Amount']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">No data available</div>
            )}
            <div className="flex flex-wrap justify-center gap-3 mt-2 w-full">
              {paymentModeData.map(entry => (
                <div key={entry.name} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center no-print">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterMonth}
              onChange={(e) => { setFilterMonth(e.target.value as any); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="All">All Time</option>
              <option value="Current">This Month</option>
            </select>
            <select
              value={filterMode}
              onChange={(e) => { setFilterMode(e.target.value as any); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="All">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-pulse no-print">
          <div className="p-4 border-b border-slate-100 flex gap-4">
             <div className="h-6 bg-slate-200 rounded w-1/4"></div>
             <div className="h-6 bg-slate-200 rounded w-1/4"></div>
             <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 flex items-center justify-between">
                <div className="h-4 bg-slate-200 rounded w-32"></div>
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-4 bg-slate-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center no-print">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <ReceiptIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No payments found</h3>
          <p className="text-slate-500 text-sm mb-6">There are no payment records matching your criteria.</p>
          <button 
            onClick={openCollectModal}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <IndianRupee className="w-4 h-4 mr-2" />
            Collect Fee
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt No.</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{payment.receiptNumber}</p>
                      <p className="text-xs text-slate-500">{payment.paymentDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => viewProfile(payment.studentDocId)} className="text-sm font-bold text-indigo-700 hover:underline text-left">
                        {payment.studentName}
                      </button>
                      <p className="text-xs text-slate-500">Seat: {payment.seatNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-emerald-600">₹{payment.amountReceived}</p>
                      {payment.remainingBalance > 0 && (
                         <p className="text-xs text-rose-500 font-medium">Bal: ₹{payment.remainingBalance}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-medium">{payment.paymentMode}</p>
                      <p className="text-[10px] text-slate-500">{payment.feeMonth}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => viewReceipt(payment)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Receipt"
                        >
                          <ReceiptIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm text-slate-500 font-medium">
              Showing {filteredPayments.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
            </span>
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Fee Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <IndianRupee className="w-5 h-5 mr-2 text-indigo-600" />
                Collect Fee
              </h3>
              <button onClick={() => setIsCollectModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={submitFeeCollection} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Student</label>
                  <select 
                    required 
                    value={selectedStudentDocId} 
                    onChange={handleStudentSelect}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                  >
                    <option value="">-- Choose a student --</option>
                    {students.filter(s => s.status === 'Active').map(student => (
                      <option key={student.id} value={student.id}>
                        {student.fullName} (Seat: {student.seatNumber}) - Due: {student.feeDueDate}
                      </option>
                    ))}
                  </select>
                </div>

                {collectStudent && (
                  <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monthly Fee</p>
                      <p className="font-bold text-slate-800">₹{collectStudent.monthlyFee}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Previous Dues</p>
                      <p className="font-bold text-rose-600">₹{collectStudent.pendingAmount || 0}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Payable</p>
                      <p className="text-2xl font-black text-indigo-700">₹{collectTotalPayable}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount Received (₹) *</label>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      value={amountReceived} 
                      onChange={(e) => setAmountReceived(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-bold text-lg" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Mode *</label>
                    <select 
                      value={paymentMode} 
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                    >
                      <option>UPI</option>
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>Card</option>
                    </select>
                  </div>
                </div>

                {collectStudent && collectRemainingBalance !== 0 && (
                  <div className={`p-4 rounded-xl border ${collectRemainingBalance > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      <span className="font-bold">
                        {collectRemainingBalance > 0 ? `Remaining Balance: ₹${collectRemainingBalance}` : `Advance Payment: ₹${Math.abs(collectRemainingBalance)}`}
                      </span>
                    </div>
                    <p className="text-sm mt-1 opacity-80">
                      {collectRemainingBalance > 0 ? 'This amount will be carried over to the next billing cycle.' : 'This credit will be adjusted in the next billing cycle.'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Transaction ID (Optional)</label>
                    <input 
                      type="text" 
                      value={transactionId} 
                      onChange={(e) => setTransactionId(e.target.value)} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks</label>
                    <input 
                      type="text" 
                      value={remarks} 
                      onChange={(e) => setRemarks(e.target.value)} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCollectModalOpen(false)} className="px-6 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={formSaving || !collectStudent} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-70 flex items-center">
                  {formSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {isReceiptModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                Payment Receipt
              </h3>
              <div className="flex gap-2">
                <button onClick={printReceipt} className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors p-2 rounded-lg flex items-center text-sm font-medium">
                  <Printer className="w-4 h-4 mr-2" /> Print
                </button>
                <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-8" id="printable-receipt" ref={receiptRef}>
              <div className="text-center mb-8 border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Receipt</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Thank you for your payment</p>
              </div>
              
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Receipt Number</p>
                  <p className="font-bold text-slate-800 text-lg">{selectedPayment.receiptNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Date</p>
                  <p className="font-bold text-slate-800 text-lg">{selectedPayment.paymentDate}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Name</p>
                    <p className="font-bold text-slate-800">{selectedPayment.studentName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Seat Number</p>
                    <p className="font-bold text-slate-800">{selectedPayment.seatNumber}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed">
                  <span className="text-slate-600 font-medium">Fee Month</span>
                  <span className="text-slate-900 font-bold">{selectedPayment.feeMonth}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed">
                  <span className="text-slate-600 font-medium">Monthly Fee</span>
                  <span className="text-slate-900 font-bold">₹{selectedPayment.monthlyFee}</span>
                </div>
                {selectedPayment.pendingAmount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed">
                    <span className="text-slate-600 font-medium">Previous Dues</span>
                    <span className="text-slate-900 font-bold">₹{selectedPayment.pendingAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-4">
                  <span className="text-slate-900 font-bold text-lg">Total Paid</span>
                  <span className="text-emerald-600 font-black text-2xl">₹{selectedPayment.amountReceived}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Mode</p>
                  <p className="font-bold text-slate-800">{selectedPayment.paymentMode}</p>
                </div>
                {selectedPayment.remainingBalance > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Balance Due</p>
                    <p className="font-bold text-rose-600">₹{selectedPayment.remainingBalance}</p>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
                <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                   <span className="text-xs text-slate-400 font-medium">QR Placeholder</span>
                </div>
                <div className="text-center w-48">
                  <div className="border-b-2 border-slate-800 mb-2 h-10"></div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Student Profile Modal - Simplistic for payment history */}
      {isProfileModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                Fee Profile: {selectedStudent.fullName}
              </h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Seat</p>
                  <p className="font-bold text-slate-800 text-lg">{selectedStudent.seatNumber}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Fee</p>
                  <p className="font-bold text-slate-800 text-lg">₹{selectedStudent.monthlyFee}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                  <p className="font-bold text-slate-800 text-lg">{selectedStudent.feeDueDate}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex w-fit items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${
                    selectedStudent.feeStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    selectedStudent.feeStatus === 'Overdue' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedStudent.feeStatus}
                  </span>
                </div>
              </div>

              <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Payment History</h4>
              
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.filter(p => p.studentDocId === selectedStudent.id).map(payment => (
                      <tr key={payment.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm text-slate-700">{payment.paymentDate}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{payment.receiptNumber}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{payment.feeMonth}</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600">₹{payment.amountReceived}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{payment.paymentMode}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => viewReceipt(payment)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View Receipt</button>
                        </td>
                      </tr>
                    ))}
                    {payments.filter(p => p.studentDocId === selectedStudent.id).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">No payment history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
