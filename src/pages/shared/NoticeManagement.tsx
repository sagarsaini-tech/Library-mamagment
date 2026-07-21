import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Megaphone, Search, Edit, Trash2, Plus, Calendar, Image as ImageIcon, Paperclip, CheckCircle2, AlertCircle, X, Clock, Archive, Copy, Eye, EyeOff } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  targetAudience: string;
  status: 'Draft' | 'Published' | 'Scheduled' | 'Archive';
  attachment: string;
  image: string;
  publishDate: string;
  expiryDate: string;
  createdAt: any;
  updatedAt: any;
}

export const NoticeManagement: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General Announcement',
    priority: 'Medium',
    targetAudience: 'All Students',
    status: 'Draft' as const,
    publishDate: '',
    expiryDate: ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const ownerUid = user?.role === 'LIBRARY_OWNER' ? user.id : user?.libraryId;

  useEffect(() => {
    if (!ownerUid) return;

    const q = query(collection(db, `libraries/${ownerUid}/notices`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const noticesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notice[];
      
      noticesData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setNotices(noticesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ownerUid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'attachment') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'image') {
        setImageFile(e.target.files[0]);
      } else {
        setAttachmentFile(e.target.files[0]);
      }
    }
  };

  const openModal = (notice?: Notice, duplicate = false) => {
    if (notice) {
      if (duplicate) {
        setEditingNotice(null);
        setFormData({
          title: `Copy of ${notice.title}`,
          description: notice.description,
          category: notice.category,
          priority: notice.priority,
          targetAudience: notice.targetAudience,
          status: 'Draft',
          publishDate: notice.publishDate,
          expiryDate: notice.expiryDate
        });
      } else {
        setEditingNotice(notice);
        setFormData({
          title: notice.title,
          description: notice.description,
          category: notice.category || 'General Announcement',
          priority: notice.priority || 'Medium',
          targetAudience: notice.targetAudience || 'All Students',
          status: notice.status || 'Draft',
          publishDate: notice.publishDate || '',
          expiryDate: notice.expiryDate || ''
        });
      }
    } else {
      setEditingNotice(null);
      setFormData({
        title: '',
        description: '',
        category: 'General Announcement',
        priority: 'Medium',
        targetAudience: 'All Students',
        status: 'Draft',
        publishDate: '',
        expiryDate: ''
      });
    }
    setImageFile(null);
    setAttachmentFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNotice(null);
    setImageFile(null);
    setAttachmentFile(null);
  };

  const uploadFile = async (file: File, folder: string) => {
    if (!ownerUid) return '';
    const fileRef = ref(storage, `libraries/${ownerUid}/notices/${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const saveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid) return;

    try {
      setUploading(true);
      let imageUrl = editingNotice?.image || '';
      let attachmentUrl = editingNotice?.attachment || '';

      if (imageFile) {
        imageUrl = await uploadFile(imageFile, 'images');
      }
      if (attachmentFile) {
        attachmentUrl = await uploadFile(attachmentFile, 'attachments');
      }

      const noticeData = {
        ...formData,
        image: imageUrl,
        attachment: attachmentUrl,
        updatedAt: serverTimestamp()
      };

      if (editingNotice) {
        await updateDoc(doc(db, `libraries/${ownerUid}/notices`, editingNotice.id), noticeData);
        setMessage({ type: 'success', text: 'Notice updated successfully!' });
      } else {
        const newRef = doc(collection(db, `libraries/${ownerUid}/notices`));
        await setDoc(newRef, {
          ...noticeData,
          noticeId: newRef.id,
          createdAt: serverTimestamp()
        });
        setMessage({ type: 'success', text: 'Notice created successfully!' });
      }
      closeModal();
    } catch (error: any) {
      console.error("Error saving notice:", error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const deleteNotice = async (id: string) => {
    if (!ownerUid || !window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await deleteDoc(doc(db, `libraries/${ownerUid}/notices`, id));
      setMessage({ type: 'success', text: 'Notice deleted successfully!' });
    } catch (error: any) {
      console.error("Error deleting notice:", error);
      setMessage({ type: 'error', text: error.message });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const updateStatus = async (id: string, status: string) => {
    if (!ownerUid) return;
    try {
      await updateDoc(doc(db, `libraries/${ownerUid}/notices`, id), {
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

  const filteredNotices = notices.filter(notice => {
    const matchesSearch = 
      notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || notice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const now = new Date();
  
  const stats = {
    total: notices.length,
    active: notices.filter(n => n.status === 'Published' && (!n.expiryDate || new Date(n.expiryDate) >= now)).length,
    expired: notices.filter(n => n.status === 'Published' && n.expiryDate && new Date(n.expiryDate) < now).length,
    scheduled: notices.filter(n => n.status === 'Scheduled').length
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notice Board</h2>
          <p className="text-sm text-slate-500">Manage announcements and alerts for students.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Notice
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <Megaphone className="w-6 h-6 text-indigo-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.active}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Notices</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <Clock className="w-6 h-6 text-amber-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.scheduled}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-6 h-6 text-rose-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.expired}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expired</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <Archive className="w-6 h-6 text-slate-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Notices</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notices..."
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
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Archive">Archive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading notices...</div>
          ) : filteredNotices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No notices found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">Title & Category</th>
                  <th className="p-4 font-semibold">Priority</th>
                  <th className="p-4 font-semibold">Dates</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotices.map((notice) => (
                  <tr key={notice.id} className="hover:bg-slate-50 transition-colors group text-sm">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-base">{notice.title}</span>
                        <div className="flex items-center text-xs text-slate-500 mt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{notice.category}</span>
                          <span className="mx-2">•</span>
                          <span>{notice.targetAudience}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        notice.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                        notice.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {notice.priority}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div><span className="font-medium">Pub:</span> {notice.publishDate ? new Date(notice.publishDate).toLocaleDateString() : '-'}</div>
                      <div className="mt-1"><span className="font-medium">Exp:</span> {notice.expiryDate ? new Date(notice.expiryDate).toLocaleDateString() : '-'}</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={notice.status}
                        onChange={(e) => updateStatus(notice.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer outline-none transition-colors ${
                          notice.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                          notice.status === 'Draft' ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100' :
                          notice.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                          'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Published">Published</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Archive">Archive</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button 
                          onClick={() => openModal(notice, true)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Duplicate Notice"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openModal(notice)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Notice"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteNotice(notice.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Notice"
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

      {/* Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h3 className="text-xl font-bold text-slate-800">
                {editingNotice && !formData.title.startsWith('Copy of') ? 'Edit Notice' : 'Add New Notice'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveNotice} className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Notice Title *</label>
                <input type="text" name="title" required value={formData.title} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Description *</label>
                <textarea 
                  name="description" 
                  required 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  rows={6}
                  placeholder="Enter notice details..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="Notice">Notice</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Fee Reminder">Fee Reminder</option>
                    <option value="Library Rules">Library Rules</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="General Announcement">General Announcement</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Target Audience</label>
                  <select name="targetAudience" value={formData.targetAudience} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="All Students">All Students</option>
                    <option value="Only Boys">Only Boys</option>
                    <option value="Only Girls">Only Girls</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Archive">Archive</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Publish Date</label>
                  <input type="datetime-local" name="publishDate" value={formData.publishDate} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Expiry Date</label>
                  <input type="datetime-local" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Image (Optional)</label>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                  {editingNotice?.image && !imageFile && (
                    <a href={editingNotice.image} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center mt-1"><ImageIcon className="w-3 h-3 mr-1" /> View Current Image</a>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Attachment (Optional)</label>
                  <input type="file" onChange={(e) => handleFileChange(e, 'attachment')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                  {editingNotice?.attachment && !attachmentFile && (
                    <a href={editingNotice.attachment} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center mt-1"><Paperclip className="w-3 h-3 mr-1" /> View Current Attachment</a>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={uploading} className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 flex items-center">
                  {uploading ? 'Saving...' : (editingNotice && !formData.title.startsWith('Copy of') ? 'Update Notice' : 'Save Notice')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
