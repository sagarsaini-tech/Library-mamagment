import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Building2, Search, Edit, Trash2, ShieldAlert, ShieldCheck, 
  Eye, AlertCircle, CheckCircle2, MoreVertical 
} from 'lucide-react';

export const LibraryManagement: React.FC = () => {
  const [libraries, setLibraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    const q = query(collection(db, 'libraries'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const libData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      libData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setLibraries(libData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    if (!window.confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this library?`)) return;
    
    try {
      await updateDoc(doc(db, 'libraries', id), {
        status: newStatus
      });
      setMessage({ type: 'success', text: `Library successfully ${newStatus === 'suspended' ? 'suspended' : 'activated'}` });
    } catch (error: any) {
      console.error("Error updating status:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const deleteLibrary = async (id: string) => {
    if (!window.confirm('WARNING: This will permanently delete the library. Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'libraries', id));
      setMessage({ type: 'success', text: 'Library deleted successfully' });
    } catch (error: any) {
      console.error("Error deleting library:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const filteredLibraries = libraries.filter(lib => {
    const matchesSearch = 
      (lib.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lib.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lib.state || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || lib.status === statusFilter || (!lib.status && statusFilter === 'active');
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Library Management</h2>
          <p className="text-sm text-slate-500">View and manage all registered libraries.</p>
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
              placeholder="Search by name, city, or state..."
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
            <div className="p-8 text-center text-slate-500">Loading libraries...</div>
          ) : filteredLibraries.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No libraries found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">Library Name</th>
                  <th className="p-4 font-semibold">Location</th>
                  <th className="p-4 font-semibold">Total Seats</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Registered</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLibraries.map((lib) => (
                  <tr key={lib.id} className="hover:bg-slate-50 transition-colors group text-sm">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3 flex-shrink-0">
                          {lib.logo ? <img src={lib.logo} alt="Logo" className="w-full h-full rounded-lg object-cover" /> : (lib.name?.charAt(0) || 'L')}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 block text-base">{lib.name || 'Unnamed Library'}</span>
                          <span className="text-xs text-slate-500">{lib.email || 'No email provided'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div>{lib.city || '-'}</div>
                      <div className="text-xs">{lib.state || '-'}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {lib.totalSeats || 0}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        lib.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {lib.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      {lib.createdAt?.toDate ? lib.createdAt.toDate().toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end space-x-1.5">
                        {lib.status === 'suspended' ? (
                          <button 
                            onClick={() => updateStatus(lib.id, 'active')}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Activate Library"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => updateStatus(lib.id, 'suspended')}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Suspend Library"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteLibrary(lib.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Library"
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
