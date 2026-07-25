import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage, firebaseConfig } from '../../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, query, onSnapshot, doc, deleteDoc, setDoc,
  serverTimestamp, writeBatch, getDoc, runTransaction 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Users, UserPlus, Search, Edit, Trash2, 
  CheckCircle2, AlertCircle, X, LayoutGrid, Receipt, 
  UserSquare2, Loader2, Camera, Eye, MapPin, Phone, Mail, Calendar
} from 'lucide-react';

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  photoUrl: string;
  gender: string;
  dob: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  
  fatherName: string;
  motherName: string;
  parentMobile: string;
  
  seatId: string;
  seatNumber: string;
  
  joiningDate: string;
  monthlyFee: number;
  securityDeposit: number;
  registrationFee: number;
  feeDueDate: string;
  
  status: 'Active' | 'Inactive';
  feeStatus: 'Paid' | 'Pending';
  
  emergencyContactName: string;
  emergencyContactMobile: string;
  
  createdAt?: any;
  updatedAt?: any;
}

interface Seat {
  id: string;
  seatNumber: string;
  status: string;
  category: string;
  monthlyFee: number;
}

export const StudentManagement: React.FC = () => {
  const { user } = useAuth();
  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : (user?.libraryId || user?.id);
  const canDeleteStudent = user?.role === 'LIBRARY_OWNER' || user?.role === 'SUPER_ADMIN';
  
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [filterFeeStatus, setFilterFeeStatus] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [filterGender, setFilterGender] = useState<'All' | 'Boys' | 'Girls'>('All');
  
  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const initialFormState = {
    fullName: '',
    gender: 'Male',
    dob: '',
    mobile: '',
    email: '',
    aadhaar: '',
    address: '',
    fatherName: '',
    motherName: '',
    parentMobile: '',
    seatId: '',
    seatNumber: '',
    joiningDate: new Date().toISOString().split('T')[0],
    monthlyFee: '',
    securityDeposit: '',
    registrationFee: '',
    feeDueDate: '',
    status: 'Active' as const,
    feeStatus: 'Paid' as const,
    emergencyContactName: '',
    emergencyContactMobile: '',
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Student Auth Account Creation state
  const [createLoginAccount, setCreateLoginAccount] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const canCreateAccount = user?.role === 'LIBRARY_OWNER' || user?.role === 'SUPER_ADMIN';

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!ownerUid) return;
    
    // Fetch Students
    const studentsRef = collection(db, `libraries/${ownerUid}/students`);
    const qStudents = query(studentsRef);
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const studs: Student[] = [];
      snapshot.forEach(doc => {
        studs.push({ id: doc.id, ...doc.data() } as Student);
      });
      studs.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setStudents(studs);
    }, (error) => {
      console.error("Error fetching students:", error);
    });

    // Fetch Seats
    const seatsRef = collection(db, `libraries/${ownerUid}/seats`);
    const qSeats = query(seatsRef);
    const unsubSeats = onSnapshot(qSeats, (snapshot) => {
      const sts: Seat[] = [];
      snapshot.forEach(doc => {
        sts.push({ id: doc.id, ...doc.data() } as Seat);
      });
      setSeats(sts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching seats:", error);
      setLoading(false);
    });

    return () => {
      unsubStudents();
      unsubSeats();
    };
  }, [user, ownerUid]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'seatId') {
      const selectedSeat = seats.find(s => s.id === value);
      setFormData(prev => ({ 
        ...prev, 
        seatId: value, 
        seatNumber: selectedSeat ? selectedSeat.seatNumber : '',
        monthlyFee: selectedSeat ? selectedSeat.monthlyFee.toString() : prev.monthlyFee
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const openAddModal = (student?: Student) => {
    setCreateLoginAccount(false);
    setLoginPassword('');
    if (student) {
      setEditingStudent(student);
      setFormData({
        fullName: student.fullName || '',
        gender: student.gender || 'Male',
        dob: student.dob || '',
        mobile: student.mobile || '',
        email: student.email || '',
        aadhaar: student.aadhaar || '',
        address: student.address || '',
        fatherName: student.fatherName || '',
        motherName: student.motherName || '',
        parentMobile: student.parentMobile || '',
        seatId: student.seatId || '',
        seatNumber: student.seatNumber || '',
        joiningDate: student.joiningDate || '',
        monthlyFee: student.monthlyFee?.toString() || '',
        securityDeposit: student.securityDeposit?.toString() || '',
        registrationFee: student.registrationFee?.toString() || '',
        feeDueDate: student.feeDueDate || '',
        status: student.status || 'Active',
        feeStatus: student.feeStatus || 'Paid',
        emergencyContactName: student.emergencyContactName || '',
        emergencyContactMobile: student.emergencyContactMobile || '',
      });
      setPhotoPreview(student.photoUrl || '');
    } else {
      setEditingStudent(null);
      setFormData(initialFormState);
      setPhotoPreview('');
    }
    setPhotoFile(null);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setEditingStudent(null);
    setCreateLoginAccount(false);
    setLoginPassword('');
  };

  const saveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid) return;
    
    if (!formData.fullName || !formData.mobile || !formData.seatId) {
      showToast('error', 'Please fill required fields and assign a seat.');
      return;
    }

    if (createLoginAccount && canCreateAccount && !editingStudent) {
      if (!formData.email) {
        showToast('error', 'Student email is required to create a login account.');
        return;
      }
      if (!loginPassword || loginPassword.length < 6) {
        showToast('error', 'Password must be at least 6 characters.');
        return;
      }
    }

    setFormSaving(true);
    
    try {
      let photoUrl = editingStudent?.photoUrl || '';
      
      if (photoFile) {
        const storageRef = ref(storage, `libraries/${ownerUid}/students/${Date.now()}_${photoFile.name}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      }
      
      const isNew = !editingStudent;
      const studentDocId = isNew ? doc(collection(db, `libraries/${ownerUid}/students`)).id : editingStudent!.id;
      const genStudentId = isNew ? `STU-${Date.now().toString().slice(-6)}` : editingStudent!.studentId;
      
      let studentUid = '';

      // If Create Login Account is checked and permitted
      if (isNew && createLoginAccount && canCreateAccount && formData.email) {
        try {
          const tempApp = initializeApp(firebaseConfig, "TempStudentApp_" + Date.now());
          const tempAuth = getAuth(tempApp);
          
          const userCredential = await createUserWithEmailAndPassword(
            tempAuth,
            formData.email,
            loginPassword
          );
          
          studentUid = userCredential.user.uid;
          await deleteApp(tempApp);

          // Create global user doc for authentication & role lookup
          await setDoc(doc(db, 'users', studentUid), {
            uid: studentUid,
            studentId: genStudentId,
            email: formData.email,
            name: formData.fullName,
            fullName: formData.fullName,
            role: 'STUDENT',
            status: 'active',
            libraryId: ownerUid,
            createdAt: new Date().toISOString()
          });
        } catch (authErr: any) {
          console.error("Auth creation error:", authErr);
          showToast('error', authErr.message || 'Failed to create student auth account');
          setFormSaving(false);
          return;
        }
      }

      const oldSeatId = editingStudent?.seatId;
      const newSeatId = formData.seatId;
      
      await runTransaction(db, async (transaction) => {
        const studentRef = doc(db, `libraries/${ownerUid}/students`, studentDocId);
        
        // Handle Seat Swapping if seat changed
        if (!isNew && oldSeatId && oldSeatId !== newSeatId) {
          const oldSeatRef = doc(db, `libraries/${ownerUid}/seats`, oldSeatId);
          transaction.update(oldSeatRef, {
            status: 'Vacant',
            studentId: null,
            studentName: null,
            updatedAt: serverTimestamp()
          });
        }
        
        if (newSeatId) {
          const newSeatRef = doc(db, `libraries/${ownerUid}/seats`, newSeatId);
          const seatSnap = await transaction.get(newSeatRef);
          
          if (!seatSnap.exists()) {
            throw new Error("Assigned seat does not exist.");
          }
          if (seatSnap.data().status !== 'Vacant' && newSeatId !== oldSeatId) {
            throw new Error("Assigned seat is no longer vacant.");
          }
          
          transaction.update(newSeatRef, {
            status: 'Occupied',
            studentId: studentDocId,
            studentName: formData.fullName,
            updatedAt: serverTimestamp()
          });
        }

        const studentData = {
          studentId: genStudentId,
          fullName: formData.fullName,
          photoUrl: photoUrl,
          gender: formData.gender,
          dob: formData.dob,
          mobile: formData.mobile,
          email: formData.email,
          aadhaar: formData.aadhaar,
          address: formData.address,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          parentMobile: formData.parentMobile,
          seatId: formData.seatId,
          seatNumber: formData.seatNumber,
          joiningDate: formData.joiningDate,
          monthlyFee: Number(formData.monthlyFee) || 0,
          securityDeposit: Number(formData.securityDeposit) || 0,
          registrationFee: Number(formData.registrationFee) || 0,
          feeDueDate: formData.feeDueDate,
          status: formData.status,
          feeStatus: formData.feeStatus,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactMobile: formData.emergencyContactMobile,
          ...(studentUid && { userUid: studentUid, hasLoginAccount: true }),
          updatedAt: serverTimestamp(),
          ...(isNew && { createdAt: serverTimestamp() })
        };
        
        transaction.set(studentRef, studentData, { merge: true });
      });

      showToast('success', isNew ? 'Student added successfully!' : 'Student updated successfully!');
      closeAddModal();
    } catch (error: any) {
      console.error("Error saving student:", error);
      showToast('error', error.message || 'Failed to save student');
    } finally {
      setFormSaving(false);
    }
  };

  const confirmDelete = (student: Student) => {
    if (!canDeleteStudent) {
      showToast('error', 'Only Library Owners can delete students permanently.');
      return;
    }
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const deleteStudent = async () => {
    if (!user || !selectedStudent || !canDeleteStudent) return;
    
    try {
      setFormSaving(true);
      await runTransaction(db, async (transaction) => {
        const studentRef = doc(db, `libraries/${ownerUid}/students`, selectedStudent.id);
        const seatRef = selectedStudent.seatId ? doc(db, `libraries/${ownerUid}/seats`, selectedStudent.seatId) : null;
        
        if (seatRef) {
          transaction.update(seatRef, {
            status: 'Vacant',
            studentId: null,
            studentName: null,
            updatedAt: serverTimestamp()
          });
        }
        
        transaction.delete(studentRef);
      });
      
      showToast('success', 'Student deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedStudent(null);
    } catch (error: any) {
      console.error("Error deleting student:", error);
      showToast('error', error.message || 'Failed to delete student');
    } finally {
      setFormSaving(false);
    }
  };

  const viewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        (student.fullName?.toLowerCase().includes(term)) ||
        (student.mobile?.includes(term)) ||
        (student.studentId?.toLowerCase().includes(term)) ||
        (student.seatNumber?.toLowerCase().includes(term));
        
      const matchesStatus = filterStatus === 'All' || student.status === filterStatus;
      const matchesFeeStatus = filterFeeStatus === 'All' || student.feeStatus === filterFeeStatus;
      
      let matchesGender = true;
      if (filterGender === 'Boys') matchesGender = student.gender === 'Male';
      if (filterGender === 'Girls') matchesGender = student.gender === 'Female';
      
      return matchesSearch && matchesStatus && matchesFeeStatus && matchesGender;
    });
  }, [students, searchTerm, filterStatus, filterFeeStatus, filterGender]);

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'createdAt') {
        aVal = a.createdAt?.toMillis() || 0;
        bVal = b.createdAt?.toMillis() || 0;
      }
      if (sortField === 'seatNumber') {
        aVal = parseInt(a.seatNumber.replace(/\D/g, '')) || 0;
        bVal = parseInt(b.seatNumber.replace(/\D/g, '')) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredStudents, sortField, sortDirection]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedStudents, currentPage]);

  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterFeeStatus, filterGender]);

  const stats = useMemo(() => {
    let active = 0, inactive = 0, pending = 0;
    let vacantSeats = 0, occupiedSeats = 0;
    
    students.forEach(s => {
      if (s.status === 'Active') active++;
      if (s.status === 'Inactive') inactive++;
      if (s.feeStatus === 'Pending') pending++;
    });
    
    seats.forEach(s => {
      if (s.status === 'Vacant') vacantSeats++;
      if (s.status === 'Occupied') occupiedSeats++;
    });
    
    return { 
      totalStudents: students.length, 
      active, 
      inactive, 
      pending,
      vacantSeats,
      occupiedSeats
    };
  }, [students, seats]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 z-50 animate-in slide-in-from-bottom-5 ${
          toastMessage.type === 'success' ? 'bg-emerald-900 text-white' : 'bg-rose-900 text-white'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Student Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage admissions, profiles, and seat assignments.</p>
        </div>
        <button 
          onClick={() => openAddModal()}
          className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Student
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Students</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.totalStudents}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Active</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.active}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Inactive</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.inactive}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Pending Fees</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.pending}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Vacant Seats</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.vacantSeats}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Occupied Seats</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.occupiedSeats}</h3>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, seat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select
              value={filterFeeStatus}
              onChange={(e) => setFilterFeeStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="All">All Fees</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="All">All Genders</option>
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-pulse">
          <div className="p-4 border-b border-slate-100 flex gap-4">
             <div className="h-6 bg-slate-200 rounded w-1/4"></div>
             <div className="h-6 bg-slate-200 rounded w-1/4"></div>
             <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                    <div className="h-3 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-3 bg-slate-200 rounded w-20"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-3 bg-slate-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No students found</h3>
          <p className="text-slate-500 text-sm mb-6">Try adjusting your filters or add a new student.</p>
          <button 
            onClick={() => openAddModal()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Student
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('fullName')}>
                    Student Details {sortField === 'fullName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('seatNumber')}>
                    Seat Info {sortField === 'seatNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('monthlyFee')}>
                    Fee Details {sortField === 'monthlyFee' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {student.fullName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{student.fullName}</p>
                          <p className="text-xs text-slate-500 font-medium">{student.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{student.mobile}</p>
                      <p className="text-xs text-slate-500">{student.parentMobile} (P)</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-indigo-700">{student.seatNumber}</p>
                      <p className="text-xs text-slate-500">Since {new Date(student.joiningDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-medium">₹{student.monthlyFee}</p>
                      <p className="text-xs text-slate-500">Due: {student.feeDueDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          student.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {student.status}
                        </span>
                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          student.feeStatus === 'Paid' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          Fee: {student.feeStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => viewStudent(student)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openAddModal(student)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {canDeleteStudent && (
                          <button 
                            onClick={() => confirmDelete(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
              Showing {sortedStudents.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, sortedStudents.length)} of {sortedStudents.length} students
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

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                {editingStudent ? <Edit className="w-5 h-5 mr-2 text-indigo-600" /> : <UserPlus className="w-5 h-5 mr-2 text-indigo-600" />}
                {editingStudent ? 'Edit Student Profile' : 'New Admission'}
              </h3>
              <button onClick={closeAddModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveStudent} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Column 1: Photo & Basic Details */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Personal Information</h4>
                    <div className="mb-4">
                      <div className="flex items-center justify-center w-full">
                        <label className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors group">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Camera className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-xs text-slate-500 font-medium">Upload Photo</span>
                            </>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-semibold">Change</span>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </label>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                        <input type="text" name="fullName" required value={formData.fullName} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label>
                          <select name="gender" value={formData.gender} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date of Birth</label>
                          <input type="date" name="dob" value={formData.dob} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mobile Number *</label>
                        <input type="tel" name="mobile" required value={formData.mobile} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Aadhaar Number</label>
                        <input type="text" name="aadhaar" value={formData.aadhaar} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Address</label>
                        <textarea name="address" rows={2} value={formData.address} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Parent & Emergency Details */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Parent Details</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Father's Name</label>
                        <input type="text" name="fatherName" value={formData.fatherName} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mother's Name</label>
                        <input type="text" name="motherName" value={formData.motherName} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Parent Mobile Number</label>
                        <input type="tel" name="parentMobile" value={formData.parentMobile} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 mt-6">Emergency Contact</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact Name</label>
                        <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact Mobile</label>
                        <input type="tel" name="emergencyContactMobile" value={formData.emergencyContactMobile} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Library Details */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Library & Seat Details</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Seat *</label>
                        <select 
                          name="seatId" 
                          required 
                          value={formData.seatId} 
                          onChange={handleFormChange} 
                          className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
                        >
                          <option value="">Select a vacant seat</option>
                          {editingStudent && (
                            <option value={editingStudent.seatId}>{editingStudent.seatNumber} (Current)</option>
                          )}
                          {seats.filter(s => s.status === 'Vacant').map(seat => (
                            <option key={seat.id} value={seat.id}>{seat.seatNumber} ({seat.category}) - ₹{seat.monthlyFee}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Joining Date *</label>
                        <input type="date" name="joiningDate" required value={formData.joiningDate} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Monthly Fee (₹) *</label>
                          <input type="number" name="monthlyFee" required min="0" value={formData.monthlyFee} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Registration (₹)</label>
                          <input type="number" name="registrationFee" min="0" value={formData.registrationFee} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Security Dep. (₹)</label>
                          <input type="number" name="securityDeposit" min="0" value={formData.securityDeposit} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Next Fee Due</label>
                          <input type="date" name="feeDueDate" value={formData.feeDueDate} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Student Status</label>
                          <select name="status" value={formData.status} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                            <option>Active</option>
                            <option>Inactive</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fee Status</label>
                          <select name="feeStatus" value={formData.feeStatus} onChange={handleFormChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                            <option>Paid</option>
                            <option>Pending</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
              
              {/* Create Login Account Option (Owner/Admin only) */}
              {canCreateAccount && !editingStudent && (
                <div className="mt-6 p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={createLoginAccount} 
                      onChange={e => setCreateLoginAccount(e.target.checked)} 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-800">Create Login Account</span>
                  </label>
                  {createLoginAccount && (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs text-slate-600">
                        The student will be able to log in with their email (<span className="font-semibold">{formData.email || 'enter email above'}</span>) or Google Login.
                      </p>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Password for Student Login *
                        </label>
                        <input 
                          type="password" 
                          required={createLoginAccount}
                          minLength={6}
                          placeholder="Minimum 6 characters"
                          value={loginPassword} 
                          onChange={e => setLoginPassword(e.target.value)} 
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={closeAddModal} className="px-6 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={formSaving} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-70 flex items-center">
                  {formSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingStudent ? 'Save Changes' : 'Complete Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Modal */}
      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                Student Profile
              </h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Photo & Status */}
                <div className="flex flex-col items-center space-y-3 w-full sm:w-1/3">
                  {selectedStudent.photoUrl ? (
                    <img src={selectedStudent.photoUrl} alt="" className="w-32 h-32 rounded-2xl object-cover border-2 border-slate-200 shadow-sm" />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-4xl shadow-sm">
                      {selectedStudent.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedStudent.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedStudent.status}
                    </span>
                    <p className="text-xs text-slate-500 font-medium mt-2">ID: {selectedStudent.studentId}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <h4 className="text-2xl font-bold text-slate-900">{selectedStudent.fullName}</h4>
                    <div className="mt-2 flex flex-col space-y-2 text-sm text-slate-600">
                      <p className="flex items-center"><Phone className="w-4 h-4 mr-2 text-slate-400" /> {selectedStudent.mobile}</p>
                      {selectedStudent.email && <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-slate-400" /> {selectedStudent.email}</p>}
                      <p className="flex items-start"><MapPin className="w-4 h-4 mr-2 text-slate-400 shrink-0 mt-0.5" /> {selectedStudent.address || 'No address provided'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned Seat</p>
                      <p className="font-bold text-indigo-700 text-lg flex items-center">
                        <UserSquare2 className="w-5 h-5 mr-1.5" /> {selectedStudent.seatNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Joining Date</p>
                      <p className="font-semibold text-slate-800 flex items-center">
                        <Calendar className="w-4 h-4 mr-1.5 text-slate-400" /> {new Date(selectedStudent.joiningDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h5 className="text-sm font-bold text-slate-800 mb-3">Parent Details</h5>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <p><span className="text-slate-500">Father:</span> <span className="font-medium text-slate-700">{selectedStudent.fatherName || '-'}</span></p>
                      <p><span className="text-slate-500">Mother:</span> <span className="font-medium text-slate-700">{selectedStudent.motherName || '-'}</span></p>
                      <p className="col-span-2"><span className="text-slate-500">Parent Mobile:</span> <span className="font-medium text-slate-700">{selectedStudent.parentMobile || '-'}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => { setIsViewModalOpen(false); openAddModal(selectedStudent); }} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center">
                <Edit className="w-4 h-4 mr-2" /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center p-6">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Student?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to remove <strong>{selectedStudent.fullName}</strong>? 
              <br/><br/>
              This will also release seat <strong>{selectedStudent.seatNumber}</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={deleteStudent}
                disabled={formSaving}
                className="flex-1 px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors text-sm disabled:opacity-70 flex items-center justify-center"
              >
                {formSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
