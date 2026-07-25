import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, firebaseConfig } from '../../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Users, UserCheck, UserMinus, ShieldAlert, Plus, Search, 
  MoreVertical, Edit, Trash2, Key, Shield, User, X
} from 'lucide-react';

interface Staff {
  id: string;
  employeeId: string;
  fullName: string;
  mobile: string;
  email: string;
  role: string;
  address?: string;
  emergencyContact?: string;
  status: string;
  joiningDate: string;
  permissions: string[];
}

const ROLES = ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'LIBRARIAN', 'CUSTOM'];
const PERMISSIONS = [
  'Dashboard', 'Students', 'Seats', 'Fee Management', 
  'Expense Management', 'Reports', 'Library Settings', 
  'Staff Management', 'Notifications'
];

export const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : user?.libraryId;
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '', mobile: '', email: '', password: '', 
    role: 'RECEPTIONIST', status: 'Active', joiningDate: '', address: '', emergencyContact: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!ownerUid) return;

    const staffRef = collection(db, `libraries/${ownerUid}/staff`);
    const q = query(staffRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData: Staff[] = [];
      snapshot.forEach((doc) => {
        staffData.push({ id: doc.id, ...doc.data() } as Staff);
      });
      setStaff(staffData);
    });

    return () => unsubscribe();
  }, [user, ownerUid]);

  const generateEmployeeId = () => {
    return 'EMP' + Math.random().toString().slice(2, 8);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid) return;
    setLoading(true);
    setMessage('');
    
    try {
      // 1. Create user in Firebase Auth using secondary app to avoid logging out
      const tempApp = initializeApp(firebaseConfig, "TempStaffApp_" + Date.now());
      const tempAuth = getAuth(tempApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth, 
        formData.email, 
        formData.password
      );
      
      const staffUid = userCredential.user.uid;
      await deleteApp(tempApp);

      // 2. Save globally to users collection for routing
      await setDoc(doc(db, 'users', staffUid), {
        uid: staffUid,
        name: formData.fullName,
        fullName: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        role: formData.role.toUpperCase(),
        status: 'active',
        libraryId: ownerUid,
        createdAt: new Date().toISOString()
      });

      // 3. Save locally in library staff collection
      const empId = generateEmployeeId();
      await setDoc(doc(db, `libraries/${ownerUid}/staff`, staffUid), {
        staffId: staffUid,
        employeeId: empId,
        fullName: formData.fullName,
        mobile: formData.mobile,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setMessage('Staff added successfully!');
      setTimeout(() => {
        setIsAddOpen(false);
        setMessage('');
        setFormData({
          fullName: '', mobile: '', email: '', password: '', 
          role: 'RECEPTIONIST', status: 'Active', joiningDate: '', address: '', emergencyContact: ''
        });
      }, 1500);

    } catch (error: any) {
      console.error(error);
      setMessage(error.message || 'Error creating staff account');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (staffId: string, permission: string, currentPermissions: string[]) => {
    if (!ownerUid) return;
    try {
      let updated;
      if (currentPermissions.includes(permission)) {
        updated = currentPermissions.filter(p => p !== permission);
      } else {
        updated = [...currentPermissions, permission];
      }
      
      await updateDoc(doc(db, `libraries/${ownerUid}/staff`, staffId), {
        permissions: updated,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating permissions:", error);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if(!user) return;
    if(window.confirm('Are you sure you want to remove this staff member? This will not delete their Auth account completely, but removes access.')) {
      try {
        await deleteDoc(doc(db, `libraries/${ownerUid}/staff`, staffId));
        // Note: Full auth deletion needs Admin SDK. For UI we just remove the doc.
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredStaff = staff.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.status === 'Active').length,
    inactive: staff.filter(s => s.status === 'Inactive').length,
    online: Math.floor(staff.length * 0.4) // Simulated online metric
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Shield className="w-6 h-6 mr-2 text-indigo-600" />
            Staff Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage staff roles and access permissions.</p>
        </div>
        
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Staff</p>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.active}</h3>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Inactive Staff</p>
            <UserMinus className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.inactive}</h3>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Online Now</p>
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{stats.online}</h3>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Info</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No staff found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 border border-indigo-200">
                          {s.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{s.fullName}</p>
                          <p className="text-xs text-slate-500 font-mono">{s.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase tracking-wider border border-slate-200">
                        {s.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-700 font-medium">{s.mobile}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                        s.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => { setSelectedStaff(s); setIsPermissionsOpen(true); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Manage Permissions"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(s.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-6">Add New Staff</h3>
            
            {message && (
              <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" required
                  value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input 
                    type="tel" required
                    value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input 
                    type="date" required
                    value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email (For Login)</label>
                <input 
                  type="email" required
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <input 
                  type="password" required minLength={6}
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                <input 
                  type="text" 
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Emergency Contact</label>
                <input 
                  type="text" 
                  value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                  <select 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {isPermissionsOpen && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
            <button 
              onClick={() => {setIsPermissionsOpen(false); setSelectedStaff(null);}}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Role Permissions</h3>
            <p className="text-sm text-slate-500 mb-6">Enable or disable module access for <span className="font-bold text-slate-700">{selectedStaff.fullName}</span>.</p>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {PERMISSIONS.map(permission => {
                const isGranted = (selectedStaff.permissions || []).includes(permission);
                return (
                  <div key={permission} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-semibold text-slate-700">{permission}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isGranted}
                        onChange={() => handleTogglePermission(selectedStaff.id, permission, selectedStaff.permissions || [])}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => {setIsPermissionsOpen(false); setSelectedStaff(null);}}
                className="px-5 py-2 bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
