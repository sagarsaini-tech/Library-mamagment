import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { 
  collection, query, onSnapshot, doc, setDoc, deleteDoc, 
  serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { 
  UserSquare2, Search, Filter, Plus, Grid, List as ListIcon, 
  MoreVertical, Edit, Trash2, CheckCircle2, AlertCircle, X,
  LayoutGrid, Users, Loader2
} from 'lucide-react';

type SeatStatus = 'Vacant' | 'Occupied' | 'Reserved' | 'Maintenance';
type SeatCategory = 'Boys' | 'Girls' | 'General';

interface Seat {
  id: string;
  seatNumber: string;
  floor: string;
  category: SeatCategory;
  monthlyFee: number;
  status: SeatStatus;
  studentId?: string;
  studentName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const SeatManagement: React.FC = () => {
  const { user } = useAuth();
  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : (user?.libraryId || user?.id);
  
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SeatStatus | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<SeatCategory | 'All'>('All');
  const [filterFloor, setFilterFloor] = useState<string>('All');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [seatToDelete, setSeatToDelete] = useState<Seat | null>(null);
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    seatNumber: '',
    floor: 'Ground',
    category: 'General' as SeatCategory,
    monthlyFee: '',
    status: 'Vacant' as SeatStatus,
  });
  
  // Bulk Form State
  const [bulkData, setBulkData] = useState({
    prefix: '',
    startNumber: '',
    endNumber: '',
    floor: 'Ground',
    category: 'General' as SeatCategory,
    monthlyFee: '',
  });

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!ownerUid) return;
    
    const q = query(collection(db, `libraries/${ownerUid}/seats`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const seatsData: Seat[] = [];
      snapshot.forEach((doc) => {
        seatsData.push({ id: doc.id, ...doc.data() } as Seat);
      });
      // Sort by seat number naturally if possible
      seatsData.sort((a, b) => {
        const aNum = parseInt(a.seatNumber.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.seatNumber.replace(/\D/g, '')) || 0;
        if (aNum === bNum) return a.seatNumber.localeCompare(b.seatNumber);
        return aNum - bNum;
      });
      
      setSeats(seatsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching seats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, ownerUid]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBulkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBulkData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = (seat?: Seat) => {
    if (seat) {
      setEditingSeat(seat);
      setFormData({
        seatNumber: seat.seatNumber,
        floor: seat.floor,
        category: seat.category,
        monthlyFee: seat.monthlyFee.toString(),
        status: seat.status,
      });
    } else {
      setEditingSeat(null);
      setFormData({
        seatNumber: '',
        floor: 'Ground',
        category: 'General',
        monthlyFee: '',
        status: 'Vacant',
      });
    }
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setEditingSeat(null);
  };

  const saveSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid) return;
    
    if (!formData.seatNumber) {
      showToast('error', 'Seat Number is required');
      return;
    }

    try {
      const seatRef = doc(collection(db, `libraries/${ownerUid}/seats`), editingSeat ? editingSeat.id : formData.seatNumber);
      
      await setDoc(seatRef, {
        seatNumber: formData.seatNumber,
        floor: formData.floor,
        category: formData.category,
        monthlyFee: Number(formData.monthlyFee) || 0,
        status: formData.status,
        updatedAt: serverTimestamp(),
        ...(!editingSeat && { createdAt: serverTimestamp() })
      }, { merge: true });
      
      showToast('success', editingSeat ? 'Seat updated successfully' : 'Seat added successfully');
      closeAddModal();
    } catch (error: any) {
      console.error("Error saving seat:", error);
      showToast('error', error.message || 'Failed to save seat');
    }
  };

  const saveBulkSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid) return;
    
    const start = parseInt(bulkData.startNumber);
    const end = parseInt(bulkData.endNumber);
    
    if (isNaN(start) || isNaN(end) || start > end) {
      showToast('error', 'Invalid start or end number');
      return;
    }
    
    if (end - start > 500) {
      showToast('error', 'You can add a maximum of 500 seats at once');
      return;
    }

    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      for (let i = start; i <= end; i++) {
        const seatNumStr = `${bulkData.prefix}${i}`;
        const seatRef = doc(collection(db, `libraries/${ownerUid}/seats`), seatNumStr);
        batch.set(seatRef, {
          seatNumber: seatNumStr,
          floor: bulkData.floor,
          category: bulkData.category,
          monthlyFee: Number(bulkData.monthlyFee) || 0,
          status: 'Vacant',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      showToast('success', `${end - start + 1} seats added successfully`);
      setIsBulkModalOpen(false);
      setBulkData({
        prefix: '',
        startNumber: '',
        endNumber: '',
        floor: 'Ground',
        category: 'General',
        monthlyFee: '',
      });
    } catch (error: any) {
      console.error("Error adding bulk seats:", error);
      showToast('error', error.message || 'Failed to add seats');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteSeat = (seat: Seat) => {
    setSeatToDelete(seat);
    setIsDeleteModalOpen(true);
  };

  const deleteSeat = async () => {
    if (!user || !seatToDelete) return;
    
    try {
      await deleteDoc(doc(db, `libraries/${ownerUid}/seats`, seatToDelete.id));
      showToast('success', 'Seat deleted successfully');
      setIsDeleteModalOpen(false);
      setSeatToDelete(null);
    } catch (error: any) {
      console.error("Error deleting seat:", error);
      showToast('error', error.message || 'Failed to delete seat');
    }
  };

  const filteredSeats = useMemo(() => {
    return seats.filter(seat => {
      const matchesSearch = 
        seat.seatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (seat.studentName && seat.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'All' || seat.status === filterStatus;
      const matchesCategory = filterCategory === 'All' || seat.category === filterCategory;
      const matchesFloor = filterFloor === 'All' || seat.floor === filterFloor;
      
      return matchesSearch && matchesStatus && matchesCategory && matchesFloor;
    });
  }, [seats, searchTerm, filterStatus, filterCategory, filterFloor]);

  const uniqueFloors = useMemo(() => {
    const floors = new Set<string>();
    seats.forEach(s => {
      if (s.floor) floors.add(s.floor);
    });
    return Array.from(floors).sort();
  }, [seats]);

  const stats = useMemo(() => {
    let occupied = 0, vacant = 0, boys = 0, girls = 0;
    seats.forEach(seat => {
      if (seat.status === 'Occupied') occupied++;
      if (seat.status === 'Vacant') vacant++;
      if (seat.category === 'Boys') boys++;
      if (seat.category === 'Girls') girls++;
    });
    return { total: seats.length, occupied, vacant, boys, girls };
  }, [seats]);

  const getStatusColor = (status: SeatStatus) => {
    switch (status) {
      case 'Vacant': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Occupied': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Reserved': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Maintenance': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Seat Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage library seating, layout, and allocations.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Bulk Add
          </button>
          <button 
            onClick={() => openAddModal()}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Seat
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Seats</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-500">Occupied</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.occupied}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-500">Vacant</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.vacant}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserSquare2 className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-500">Boys Seats</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.boys}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <UserSquare2 className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-500">Girls Seats</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.girls}</h3>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search seat or student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="All">All Status</option>
              <option value="Vacant">Vacant</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Maintenance">Maintenance</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="All">All Categories</option>
              <option value="General">General</option>
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </select>
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="All">All Floors</option>
              {uniqueFloors.map(floor => (
                <option key={floor} value={floor}>{floor}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredSeats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No seats found</h3>
          <p className="text-slate-500 text-sm mb-6">Try adjusting your filters or add a new seat.</p>
          <button 
            onClick={() => openAddModal()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Seat
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Seat</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Floor</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSeats.map(seat => (
                  <tr key={seat.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {seat.seatNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(seat.status)}`}>
                        {seat.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{seat.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{seat.floor}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {seat.studentName ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {seat.studentName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-800">{seat.studentName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">₹{seat.monthlyFee}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openAddModal(seat)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDeleteSeat(seat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {filteredSeats.map(seat => (
            <div 
              key={seat.id} 
              className={`relative group rounded-xl border p-4 text-center cursor-pointer transition-all hover:shadow-md ${
                seat.status === 'Vacant' ? 'bg-white border-emerald-200 hover:border-emerald-300' :
                seat.status === 'Occupied' ? 'bg-white border-rose-200 hover:border-rose-300' :
                seat.status === 'Reserved' ? 'bg-white border-amber-200 hover:border-amber-300' :
                'bg-slate-50 border-slate-200'
              }`}
              onClick={() => openAddModal(seat)}
            >
              <div className="absolute top-2 right-2">
                <div className={`w-2 h-2 rounded-full ${
                  seat.status === 'Vacant' ? 'bg-emerald-500' :
                  seat.status === 'Occupied' ? 'bg-rose-500' :
                  seat.status === 'Reserved' ? 'bg-amber-500' :
                  'bg-slate-400'
                }`}></div>
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-1">{seat.seatNumber}</h4>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">{seat.category}</p>
              {seat.studentName ? (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-700 truncate">{seat.studentName}</p>
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-400 italic">Available</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSeat ? 'Edit Seat' : 'Add New Seat'}
              </h3>
              <button onClick={closeAddModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveSeat} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Seat Number *</label>
                <input 
                  type="text"
                  name="seatNumber"
                  required
                  value={formData.seatNumber}
                  onChange={handleFormChange}
                  disabled={!!editingSeat} // Prevent changing seat ID after creation for simplicity
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
                  placeholder="e.g. A-12 or 101"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Floor</label>
                  <input 
                    type="text"
                    name="floor"
                    value={formData.floor}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="e.g. Ground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="General">General</option>
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Fee (₹)</label>
                  <input 
                    type="number"
                    name="monthlyFee"
                    min="0"
                    value={formData.monthlyFee}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    disabled={editingSeat?.status === 'Occupied'} // Prevent changing status if occupied by a student manually here ideally
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  {editingSeat ? 'Save Changes' : 'Add Seat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Bulk Add Seats
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveBulkSeats} className="p-5 space-y-4">
              <div className="bg-indigo-50 text-indigo-800 p-3 rounded-lg text-sm mb-4">
                Quickly generate multiple seats. E.g., Start 1, End 50, Prefix "A-" creates A-1 to A-50.
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prefix (Optional)</label>
                <input 
                  type="text"
                  name="prefix"
                  value={bulkData.prefix}
                  onChange={handleBulkChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="e.g. A-, B-, S"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Number *</label>
                  <input 
                    type="number"
                    name="startNumber"
                    required
                    min="1"
                    value={bulkData.startNumber}
                    onChange={handleBulkChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Number *</label>
                  <input 
                    type="number"
                    name="endNumber"
                    required
                    min="1"
                    value={bulkData.endNumber}
                    onChange={handleBulkChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Floor</label>
                  <input 
                    type="text"
                    name="floor"
                    value={bulkData.floor}
                    onChange={handleBulkChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Ground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                  <select 
                    name="category"
                    value={bulkData.category}
                    onChange={handleBulkChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="General">General</option>
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Fee (₹)</label>
                <input 
                  type="number"
                  name="monthlyFee"
                  min="0"
                  value={bulkData.monthlyFee}
                  onChange={handleBulkChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="1000"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-70 flex items-center justify-center"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Generate Seats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && seatToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center p-6">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Seat {seatToDelete.seatNumber}?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this seat? This action cannot be undone.
              {seatToDelete.status === 'Occupied' && (
                <span className="block mt-2 font-semibold text-rose-600">
                  Warning: This seat is currently occupied by a student!
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={deleteSeat}
                className="flex-1 px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
