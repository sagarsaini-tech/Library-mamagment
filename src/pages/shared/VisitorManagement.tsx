import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Users, Search, Edit, Trash2, Plus, Calendar, MapPin, Phone, Mail, CheckCircle2, AlertCircle, X, ChevronDown, Clock, MessageSquare, ArrowRight , UserSquare2 } from 'lucide-react';

interface FollowUp {
  id: string;
  date: string;
  remark: string;
  nextFollowUpDate: string;
}

interface Visitor {
  id: string;
  visitorName: string;
  mobile: string;
  email: string;
  city: string;
  purpose: string;
  interestedSeatType: string;
  expectedJoiningDate: string;
  referenceSource: string;
  remarks: string;
  status: 'New' | 'Interested' | 'Follow-up' | 'Admitted' | 'Cancelled';
  createdAt: any;
  followUps?: FollowUp[];
}

export const VisitorManagement: React.FC = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [activeVisitor, setActiveVisitor] = useState<Visitor | null>(null);

  const [formData, setFormData] = useState({
    visitorName: '',
    mobile: '',
    email: '',
    city: '',
    purpose: '',
    interestedSeatType: '',
    expectedJoiningDate: '',
    referenceSource: '',
    remarks: '',
    status: 'New' as const
  });

  const [followUpData, setFollowUpData] = useState({
    remark: '',
    nextFollowUpDate: ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : user?.libraryId;

  useEffect(() => {
    if (!ownerUid) return;

    const q = query(collection(db, `libraries/${ownerUid}/visitors`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visitorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Visitor[];
      // sort by created date (newest first)
      visitorsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setVisitors(visitorsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching visitors:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ownerUid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFollowUpChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFollowUpData({ ...followUpData, [e.target.name]: e.target.value });
  };

  const openModal = (visitor?: Visitor) => {
    if (visitor) {
      setEditingVisitor(visitor);
      setFormData({
        visitorName: visitor.visitorName,
        mobile: visitor.mobile,
        email: visitor.email || '',
        city: visitor.city || '',
        purpose: visitor.purpose || '',
        interestedSeatType: visitor.interestedSeatType || '',
        expectedJoiningDate: visitor.expectedJoiningDate || '',
        referenceSource: visitor.referenceSource || '',
        remarks: visitor.remarks || '',
        status: visitor.status
      });
    } else {
      setEditingVisitor(null);
      setFormData({
        visitorName: '',
        mobile: '',
        email: '',
        city: '',
        purpose: '',
        interestedSeatType: '',
        expectedJoiningDate: '',
        referenceSource: '',
        remarks: '',
        status: 'New'
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVisitor(null);
  };

  const saveVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid) return;

    try {
      if (editingVisitor) {
        await updateDoc(doc(db, `libraries/${ownerUid}/visitors`, editingVisitor.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        setMessage({ type: 'success', text: 'Visitor updated successfully!' });
      } else {
        const newRef = doc(collection(db, `libraries/${ownerUid}/visitors`));
        await setDoc(newRef, {
          ...formData,
          followUps: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setMessage({ type: 'success', text: 'Visitor added successfully!' });
      }
      closeModal();
    } catch (error: any) {
      console.error("Error saving visitor:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const deleteVisitor = async (id: string) => {
    if (!ownerUid || !window.confirm('Are you sure you want to delete this visitor?')) return;
    try {
      await deleteDoc(doc(db, `libraries/${ownerUid}/visitors`, id));
      setMessage({ type: 'success', text: 'Visitor deleted successfully!' });
    } catch (error: any) {
      console.error("Error deleting visitor:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const updateStatus = async (id: string, status: string) => {
    if (!ownerUid) return;
    try {
      await updateDoc(doc(db, `libraries/${ownerUid}/visitors`, id), {
        status,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: `Status updated to ${status}` });
    } catch (error: any) {
      console.error("Error updating status:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const openFollowUpModal = (visitor: Visitor) => {
    setActiveVisitor(visitor);
    setFollowUpData({
      remark: '',
      nextFollowUpDate: ''
    });
    setShowFollowUpModal(true);
  };

  const saveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid || !activeVisitor) return;

    try {
      const newFollowUp: FollowUp = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        remark: followUpData.remark,
        nextFollowUpDate: followUpData.nextFollowUpDate
      };

      const updatedFollowUps = [...(activeVisitor.followUps || []), newFollowUp];

      await updateDoc(doc(db, `libraries/${ownerUid}/visitors`, activeVisitor.id), {
        followUps: updatedFollowUps,
        status: 'Follow-up', // Automatically change status
        updatedAt: serverTimestamp()
      });

      setMessage({ type: 'success', text: 'Follow-up added successfully!' });
      setShowFollowUpModal(false);
      setActiveVisitor(null);
    } catch (error: any) {
      console.error("Error adding follow-up:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const convertToStudent = (visitor: Visitor) => {
    // Navigate to student management with prefilled data or just show message.
    // Assuming we don't have direct prop-passing to students tab, we'll just show message for now.
    alert(`To convert ${visitor.visitorName} to a student, please go to Student Management and use their details.`);
  };

  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = 
      visitor.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.mobile.includes(searchTerm) ||
      (visitor.email && visitor.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || visitor.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: visitors.length,
    today: visitors.filter(v => {
      if(!v.createdAt) return false;
      const created = v.createdAt.toDate ? v.createdAt.toDate() : new Date(v.createdAt);
      return new Date().toDateString() === new Date(created).toDateString();
    }).length,
    new: visitors.filter(v => v.status === 'New').length,
    admissions: visitors.filter(v => v.status === 'Admitted' && v.createdAt?.toDate && new Date(v.createdAt.toDate()).toDateString() === new Date().toDateString()).length,
    pendingFollowUps: visitors.filter(v => v.status === 'Follow-up').length
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Visitor & Enquiry Management</h2>
          <p className="text-sm text-slate-500">Track and manage library enquiries.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Visitor
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <Users className="w-6 h-6 text-indigo-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Visitors</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <Calendar className="w-6 h-6 text-sky-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.today}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Visitors</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <MessageSquare className="w-6 h-6 text-amber-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.new}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">New Enquiries</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.admissions}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admissions Today</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <Clock className="w-6 h-6 text-rose-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.pendingFollowUps}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Follow-ups</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, mobile, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[150px]"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Interested">Interested</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Admitted">Admitted</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading visitors...</div>
          ) : filteredVisitors.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No visitors found matching your criteria.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">Visitor Details</th>
                  <th className="p-4 font-semibold">Purpose / Seat Type</th>
                  <th className="p-4 font-semibold">Expected Joining</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Follow-ups</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-slate-50 transition-colors group text-sm">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-base">{visitor.visitorName}</span>
                        <div className="flex flex-col text-xs text-slate-500 mt-1 space-y-1">
                          <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1.5"/> {visitor.mobile}</span>
                          {visitor.city && <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5"/> {visitor.city}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="font-medium text-slate-700">{visitor.purpose || '-'}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center">
                         {visitor.interestedSeatType || 'Any seat type'}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {visitor.expectedJoiningDate ? new Date(visitor.expectedJoiningDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      <select
                        value={visitor.status}
                        onChange={(e) => updateStatus(visitor.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 cursor-pointer shadow-sm outline-none transition-colors ${
                          visitor.status === 'New' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                          visitor.status === 'Interested' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                          visitor.status === 'Follow-up' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                          visitor.status === 'Admitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                          'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <option value="New">New</option>
                        <option value="Interested">Interested</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Admitted">Admitted</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start space-y-1.5">
                        <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                          {visitor.followUps?.length || 0} Records
                        </span>
                        {visitor.followUps && visitor.followUps.length > 0 && (
                          <span className="text-xs text-slate-500 truncate max-w-[140px] flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(visitor.followUps[visitor.followUps.length - 1].date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button 
                          onClick={() => openFollowUpModal(visitor)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                          title="Schedule Follow-up"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => convertToStudent(visitor)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                          title="Convert to Student"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openModal(visitor)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Edit Visitor"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteVisitor(visitor.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          title="Delete Visitor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Visitor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h3 className="text-xl font-bold text-slate-800">
                {editingVisitor ? 'Edit Visitor' : 'Add New Visitor'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveVisitor} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Visitor Name *</label>
                  <input type="text" name="visitorName" required value={formData.visitorName} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Mobile Number *</label>
                  <input type="tel" name="mobile" required value={formData.mobile} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Purpose</label>
                  <input type="text" name="purpose" placeholder="e.g. Enquiry, Admission" value={formData.purpose} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Interested Seat Type</label>
                  <input type="text" name="interestedSeatType" placeholder="e.g. AC, Non-AC, Cabin" value={formData.interestedSeatType} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Expected Joining Date</label>
                  <input type="date" name="expectedJoiningDate" value={formData.expectedJoiningDate} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Reference Source</label>
                  <select name="referenceSource" value={formData.referenceSource} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="">Select Source</option>
                    <option value="Google">Google</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Friend/Student">Friend / Student</option>
                    <option value="Flyer/Banner">Flyer / Banner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Remarks</label>
                  <textarea name="remarks" rows={3} value={formData.remarks} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Initial Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="New">New</option>
                    <option value="Interested">Interested</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                  {editingVisitor ? 'Update Visitor' : 'Save Visitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow Up Modal */}
      {showFollowUpModal && activeVisitor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Add Follow-up</h3>
              <button onClick={() => setShowFollowUpModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveFollowUp} className="p-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Visitor</label>
                <div className="px-4 py-3 bg-slate-50 rounded-xl text-slate-700 text-sm font-medium border border-slate-200 flex items-center">
                  <UserSquare2 className="w-5 h-5 text-slate-400 mr-2" />
                  {activeVisitor.visitorName} ({activeVisitor.mobile})
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Follow-up Remarks *</label>
                <textarea required name="remark" rows={3} value={followUpData.remark} onChange={handleFollowUpChange} placeholder="What was discussed?" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Next Follow-up Date (Optional)</label>
                <input type="date" name="nextFollowUpDate" value={followUpData.nextFollowUpDate} onChange={handleFollowUpChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowFollowUpModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">Save Follow-up</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
