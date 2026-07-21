import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserSquare2, Save } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { updatePassword, getAuth } from 'firebase/auth';

export const StaffProfile: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setMessage('');

    try {
      if (name !== user.name) {
        await updateDoc(doc(db, 'users', user.id), {
          fullName: name
        });
        // We should ideally update the specific staff doc as well, but staff docs 
        // are under libraries/{ownerUid}/staff/{staffId}. Since staff doesn't inherently 
        // know ownerUid without a complex query, we'll keep it simple for this profile step.
      }

      if (password) {
        const auth = getAuth();
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, password);
        }
      }
      setMessage('Profile updated successfully!');
      setPassword('');
    } catch (error: any) {
      console.error(error);
      setMessage(error.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
          <UserSquare2 className="w-6 h-6 mr-2 text-indigo-600" />
          My Profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">Manage your account settings and password.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/60 shadow-sm">
        {message && (
          <div className={`p-4 rounded-lg mb-6 text-sm ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Change Password</h3>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New Password (Optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Leave blank to keep current password"
              minLength={6}
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
