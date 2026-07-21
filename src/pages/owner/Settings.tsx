import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Building2, Settings as SettingsIcon, Palette, User, 
  Database, Bell, Printer, Save, Camera, Check, 
  AlertCircle, Loader2, Image as ImageIcon, MapPin, Smartphone, 
  Globe, Clock, Banknote, Users, Key, Lock, Mail, Download, Upload, Shield
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : user?.libraryId;
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    // General
    libraryName: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    address: '',
    googleMapsUrl: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    language: 'English',
    logoUrl: '',
    coverUrl: '',
    
    // System
    openingTime: '08:00',
    closingTime: '22:00',
    defaultMonthlyFee: '',
    defaultSecurityDeposit: '',
    maxSeats: '',
    autoSeatGeneration: false,
    autoStudentIdGeneration: true,
    autoReceiptGeneration: true,
    
    // Theme
    themeMode: 'light',
    primaryColor: '#4f46e5',
    secondaryColor: '#1e293b',
    sidebarStyle: 'default',
    compactSidebar: false,

    // Account (Settings flags)
    twoFactorAuth: false,

    // Notifications
    enableSms: false,
    enableEmail: true,
    enableWhatsapp: false,
    enablePush: true,

    // Print
    receiptSize: 'A4',
    idCardSize: 'CR80',
    printHeader: '',
    printFooter: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  // Account specific form states (not saved to config)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [emailForm, setEmailForm] = useState({ newEmail: '' });

  useEffect(() => {
    if (!ownerUid) return;
    
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, `libraries/${ownerUid}/settings/config`));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setFormData(prev => ({ ...prev, ...data }));
          setLogoPreview(data.logoUrl || '');
          setCoverPreview(data.coverUrl || '');
        } else {
          // Try to migrate basic details from main library doc if settings don't exist
          const libDoc = await getDoc(doc(db, 'libraries', ownerUid || ''));
          if(libDoc.exists()) {
             const data = libDoc.data();
             setFormData(prev => ({
               ...prev,
               libraryName: data.name || '',
               address: data.address || '',
               phone: data.phone || '',
               whatsapp: data.whatsapp || '',
               openingTime: data.openingTime || '08:00',
               closingTime: data.closingTime || '22:00',
               defaultMonthlyFee: data.monthlyFee || '',
               maxSeats: data.totalSeats || '',
               logoUrl: data.logoUrl || '',
               coverUrl: data.coverUrl || ''
             }));
             setLogoPreview(data.logoUrl || '');
             setCoverPreview(data.coverUrl || '');
          }
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [user, ownerUid]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(previewUrl);
      } else {
        setCoverFile(file);
        setCoverPreview(previewUrl);
      }
    }
  };

  const uploadImage = async (file: File, type: 'logo' | 'cover'): Promise<string> => {
    if (!ownerUid) return '';
    try {
      const storageRef = ref(storage, `libraries/${ownerUid}/${type}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      throw new Error(`Failed to upload ${type} image.`);
    }
  };

  const handleSave = async () => {
    if (!ownerUid) return;
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      let currentLogoUrl = formData.logoUrl;
      let currentCoverUrl = formData.coverUrl;
      
      if (logoFile) currentLogoUrl = await uploadImage(logoFile, 'logo');
      if (coverFile) currentCoverUrl = await uploadImage(coverFile, 'cover');
      
      const configData = {
        ...formData,
        logoUrl: currentLogoUrl,
        coverUrl: currentCoverUrl,
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, `libraries/${ownerUid}/settings/config`), configData, { merge: true });
      
      // Also update basic info in main library doc for backward compatibility
      await setDoc(doc(db, 'libraries', ownerUid || ''), {
        name: formData.libraryName,
        phone: formData.phone,
        address: formData.address,
        logoUrl: currentLogoUrl,
        coverUrl: currentCoverUrl,
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
        monthlyFee: Number(formData.defaultMonthlyFee) || 0,
        totalSeats: Number(formData.maxSeats) || 0,
      }, { merge: true });
      
      setFormData(prev => ({ ...prev, logoUrl: currentLogoUrl, coverUrl: currentCoverUrl }));
      setLogoFile(null);
      setCoverFile(null);
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Building2 className="w-4 h-4 mr-2" /> },
    { id: 'system', label: 'System', icon: <SettingsIcon className="w-4 h-4 mr-2" /> },
    { id: 'theme', label: 'Theme', icon: <Palette className="w-4 h-4 mr-2" /> },
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4 mr-2" /> },
    { id: 'backup', label: 'Backup', icon: <Database className="w-4 h-4 mr-2" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4 mr-2" /> },
    { id: 'print', label: 'Print', icon: <Printer className="w-4 h-4 mr-2" /> },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">Manage all aspects of your library management system.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 min-h-[500px]">
          
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">General Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Cover Image</label>
                  <div className="relative w-full h-40 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center group hover:bg-slate-50 transition-colors">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-sm font-medium">Upload Cover Image</span>
                      </div>
                    )}
                    <label className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center shadow-sm">
                        <Camera className="w-4 h-4 mr-2" /> Change
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'cover')} />
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Library Logo</label>
                    <div className="relative w-24 h-24 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center group hover:bg-slate-50 transition-colors">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-400" />
                      )}
                      <label className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} />
                      </label>
                    </div>
                  </div>
                  <div className="flex-1 text-sm text-slate-500 pt-6">
                    <p>Upload a square logo (1:1 ratio).</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Library Name</label>
                    <input type="text" name="libraryName" value={formData.libraryName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Owner Name</label>
                    <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                    <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Website</label>
                    <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                  <textarea name="address" rows={2} value={formData.address} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Google Maps Location URL</label>
                  <input type="url" name="googleMapsUrl" value={formData.googleMapsUrl} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Timezone</label>
                    <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Currency</label>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Language</label>
                    <select name="language" value={formData.language} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">System Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Opening Time</label>
                  <input type="time" name="openingTime" value={formData.openingTime} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Closing Time</label>
                  <input type="time" name="closingTime" value={formData.closingTime} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Default Monthly Fee</label>
                  <input type="number" name="defaultMonthlyFee" value={formData.defaultMonthlyFee} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Default Security Deposit</label>
                  <input type="number" name="defaultSecurityDeposit" value={formData.defaultSecurityDeposit} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Maximum Seats</label>
                  <input type="number" name="maxSeats" value={formData.maxSeats} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <h4 className="text-sm font-bold text-slate-800">Automations</h4>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Auto Seat Number Generation</p>
                    <p className="text-xs text-slate-500">Automatically assign seat numbers based on availability.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="autoSeatGeneration" checked={formData.autoSeatGeneration} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Student ID Auto Generation</p>
                    <p className="text-xs text-slate-500">Automatically generate unique IDs for new students.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="autoStudentIdGeneration" checked={formData.autoStudentIdGeneration} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Receipt Number Auto Generation</p>
                    <p className="text-xs text-slate-500">Automatically generate sequential receipt numbers.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="autoReceiptGeneration" checked={formData.autoReceiptGeneration} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Theme Settings */}
          {activeTab === 'theme' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Theme Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" name="themeMode" value="light" checked={formData.themeMode === 'light'} onChange={handleChange} className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-slate-700">Light Mode</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" name="themeMode" value="dark" checked={formData.themeMode === 'dark'} onChange={handleChange} className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-slate-700">Dark Mode</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Color</label>
                    <div className="flex items-center space-x-3">
                      <input type="color" name="primaryColor" value={formData.primaryColor} onChange={handleChange} className="w-10 h-10 rounded border border-slate-200 p-0.5 cursor-pointer" />
                      <input type="text" value={formData.primaryColor} readOnly className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Secondary Color</label>
                    <div className="flex items-center space-x-3">
                      <input type="color" name="secondaryColor" value={formData.secondaryColor} onChange={handleChange} className="w-10 h-10 rounded border border-slate-200 p-0.5 cursor-pointer" />
                      <input type="text" value={formData.secondaryColor} readOnly className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-mono" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Sidebar Style</label>
                  <select name="sidebarStyle" value={formData.sidebarStyle} onChange={handleChange} className="w-full max-w-md px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="default">Default (White)</option>
                    <option value="dark">Dark</option>
                    <option value="colored">Colored (Primary)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Compact Sidebar</p>
                    <p className="text-xs text-slate-500">Use icons only to save space.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="compactSidebar" checked={formData.compactSidebar} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Account Settings</h3>
              
              <div className="space-y-4 max-w-md">
                <h4 className="text-sm font-bold text-slate-800 flex items-center"><Key className="w-4 h-4 mr-2" /> Change Password</h4>
                <div>
                  <input type="password" placeholder="Current Password" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} className="w-full px-4 py-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  <input type="password" placeholder="New Password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full px-4 py-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  <input type="password" placeholder="Confirm New Password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full px-4 py-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  <button className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700">Update Password</button>
                </div>
              </div>

              <div className="space-y-4 max-w-md pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center"><Mail className="w-4 h-4 mr-2" /> Change Email</h4>
                <div>
                  <input type="email" placeholder="New Email Address" value={emailForm.newEmail} onChange={e => setEmailForm({newEmail: e.target.value})} className="w-full px-4 py-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  <button className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700">Update Email</button>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center"><Shield className="w-4 h-4 mr-2" /> Security</h4>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Two Factor Authentication</p>
                    <p className="text-xs text-slate-500">Require an extra step for login.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="twoFactorAuth" checked={formData.twoFactorAuth} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center"><Smartphone className="w-4 h-4 mr-2" /> Active Sessions</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-w-2xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-4 py-2">Device</th>
                        <th className="px-4 py-2">Location</th>
                        <th className="px-4 py-2">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-800">Chrome on Mac OS X</td>
                        <td className="px-4 py-3 text-slate-500">Mumbai, India</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">Active Now (Current Session)</td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-4 py-3 font-medium text-slate-800">Safari on iPhone</td>
                        <td className="px-4 py-3 text-slate-500">Mumbai, India</td>
                        <td className="px-4 py-3 text-slate-500">2 hours ago</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Backup Settings */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Backup & Restore</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-colors bg-slate-50 text-center">
                  <Download className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 mb-1">Export Database</h4>
                  <p className="text-xs text-slate-500 mb-4">Download all records as CSV/JSON.</p>
                  <button className="px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg text-sm w-full hover:bg-indigo-200">Export Now</button>
                </div>
                
                <div className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-colors bg-slate-50 text-center">
                  <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 mb-1">Import Database</h4>
                  <p className="text-xs text-slate-500 mb-4">Upload records from a file.</p>
                  <button className="px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg text-sm w-full hover:bg-indigo-200">Import File</button>
                </div>

                <div className="border border-slate-200 rounded-xl p-5 hover:border-emerald-300 transition-colors bg-slate-50 text-center">
                  <Database className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 mb-1">Create Cloud Backup</h4>
                  <p className="text-xs text-slate-500 mb-4">Save a snapshot to secure storage.</p>
                  <button className="px-4 py-2 bg-emerald-100 text-emerald-700 font-medium rounded-lg text-sm w-full hover:bg-emerald-200">Backup Now</button>
                </div>

                <div className="border border-slate-200 rounded-xl p-5 hover:border-rose-300 transition-colors bg-slate-50 text-center">
                  <Lock className="w-8 h-8 text-rose-600 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 mb-1">Restore Backup</h4>
                  <p className="text-xs text-slate-500 mb-4">Revert to a previous snapshot.</p>
                  <button className="px-4 py-2 bg-rose-100 text-rose-700 font-medium rounded-lg text-sm w-full hover:bg-rose-200">Restore Data</button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Notification Settings</h3>
              
              <div className="space-y-4 max-w-md">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">SMS Notifications</p>
                    <p className="text-xs text-slate-500">Send fee reminders via SMS.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="enableSms" checked={formData.enableSms} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Email Notifications</p>
                    <p className="text-xs text-slate-500">Send receipts and updates via email.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="enableEmail" checked={formData.enableEmail} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">WhatsApp Notifications</p>
                    <p className="text-xs text-slate-500">Send messages via WhatsApp API.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="enableWhatsapp" checked={formData.enableWhatsapp} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Push Notifications</p>
                    <p className="text-xs text-slate-500">Receive alerts in this browser.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="enablePush" checked={formData.enablePush} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Print Settings */}
          {activeTab === 'print' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Print & Receipt Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Receipt Size</label>
                  <select name="receiptSize" value={formData.receiptSize} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="A4">A4 Size</option>
                    <option value="A5">A5 Size</option>
                    <option value="Thermal">Thermal (80mm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">ID Card Size</label>
                  <select name="idCardSize" value={formData.idCardSize} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="CR80">Standard (CR80 - 86x54mm)</option>
                    <option value="Vertical">Vertical (54x86mm)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Custom Print Header (Optional)</label>
                  <textarea name="printHeader" rows={3} value={formData.printHeader} onChange={handleChange} placeholder="e.g. Thanks for joining our Library!" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Custom Print Footer (Optional)</label>
                  <textarea name="printFooter" rows={3} value={formData.printFooter} onChange={handleChange} placeholder="e.g. Terms: Fees are non-refundable." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
