import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings, Save, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    platformName: 'StudySync Pro',
    supportEmail: 'support@studysync.com',
    supportMobile: '+91 9876543210',
    maintenanceMode: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'system', 'settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData({
            ...formData,
            ...docSnap.data()
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await setDoc(doc(db, 'system', 'settings'), formData, { merge: true });
      setMessage({ type: 'success', text: 'System settings updated successfully.' });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">Loading settings...</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
          <p className="text-sm text-slate-500">Manage global platform configuration.</p>
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center bg-slate-50">
          <Settings className="w-5 h-5 text-indigo-600 mr-2" />
          <h3 className="font-bold text-slate-800">Global Configuration</h3>
        </div>
        
        <form onSubmit={handleSave} className="p-6 md:p-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Platform Name</label>
                <input
                  type="text"
                  name="platformName"
                  value={formData.platformName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Platform Logo URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <p className="text-xs text-slate-500">Leave blank to use default icon.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Support Email</label>
                <input
                  type="email"
                  name="supportEmail"
                  value={formData.supportEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Support Mobile</label>
                <input
                  type="text"
                  name="supportMobile"
                  value={formData.supportMobile}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-start bg-rose-50 border border-rose-100 rounded-xl p-6">
                <div className="flex items-center h-5 mt-1">
                  <input
                    id="maintenanceMode"
                    name="maintenanceMode"
                    type="checkbox"
                    checked={formData.maintenanceMode}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                </div>
                <div className="ml-4">
                  <label htmlFor="maintenanceMode" className="text-base font-bold text-rose-800 cursor-pointer flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-2" />
                    Enable Maintenance Mode
                  </label>
                  <p className="text-sm text-rose-600 mt-1">
                    When active, all users (except Super Admin) will be locked out of the platform and will see a maintenance screen.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
