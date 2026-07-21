import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  UserSquare2, Search, Edit, Trash2, ShieldAlert, ShieldCheck, 
  Eye, AlertCircle, CheckCircle2, Phone, Mail
} from 'lucide-react';

export const OwnerManagement: React.FC = () => {
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    const q = query(collection(db, 'users'), where('role', '==', 'LIBRARY_OWNER'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ownersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      ownersData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setOwners(ownersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    if (!window.confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this owner account?`)) return;
    
    try {
      await updateDoc(doc(db, 'users', id), {
        status: newStatus
      });
      setMessage({ type: 'success', text: `Owner account successfully ${newStatus === 'suspended' ? 'suspended' : 'activated'}` });
    } catch (error: any) {
      console.error("Error updating status:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const deleteOwner = async (id: string) => {
    if (!window.confirm('WARNING: This will permanently delete the owner profile. Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setMessage({ type: 'success', text: 'Owner account deleted successfully' });
    } catch (error: any) {
      console.error("Error deleting owner:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const filteredOwners = owners.filter(owner => {
    const matchesSearch = 
      (owner.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (owner.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || owner.status === statusFilter || (!owner.status && statusFilter === 'active');
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Owner Management</h2>
          <p className="text-sm text-slate-500">Manage all Library Owners registered on the platform.</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
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
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading owners...</div>
          ) : filteredOwners.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No owners found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">Owner Profile</th>
                  <th className="p-4 font-semibold">Contact Info</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Registered</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOwners.map((owner) => (
                  <tr key={owner.id} className="hover:bg-slate-50 transition-colors group text-sm">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3 flex-shrink-0">
                          {owner.profileImage ? <img src={owner.profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" /> : (owner.fullName?.charAt(0) || 'O')}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 block text-base">{owner.fullName || 'Unnamed'}</span>
                          <span className="text-xs text-slate-500">{owner.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center mb-1"><Mail className="w-3 h-3 mr-1.5" /> {owner.email || '-'}</div>
                      <div className="flex items-center text-xs"><Phone className="w-3 h-3 mr-1.5" /> {owner.phone || owner.mobile || '-'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        owner.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {owner.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      {owner.createdAt?.toDate ? owner.createdAt.toDate().toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end space-x-1.5">
                        {owner.status === 'suspended' ? (
                          <button 
                            onClick={() => updateStatus(owner.id, 'active')}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Activate Account"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => updateStatus(owner.id, 'suspended')}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Suspend Account"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteOwner(owner.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Account"
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
    </div>
  );
};
