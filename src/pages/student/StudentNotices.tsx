import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Megaphone, Bell, Calendar, MapPin, Eye, Search, AlertCircle, Pin, Paperclip, Image as ImageIcon } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  targetAudience: string;
  status: string;
  attachment: string;
  image: string;
  publishDate: string;
  expiryDate: string;
  createdAt: any;
}

export const StudentNotices: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [readNotices, setReadNotices] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.libraryId) return;

    const q = query(collection(db, `libraries/${user.libraryId}/notices`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const noticesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notice[];
      
      const activeNotices = noticesData.filter(notice => {
        if (notice.status !== 'Published') return false;
        
        // Target Audience filter
        if (notice.targetAudience !== 'All Students') {
          // If user.gender exists and we are filtering by gender
          const gender = user?.profile?.gender || user?.gender;
          if (notice.targetAudience === 'Only Boys' && gender !== 'Male') return false;
          if (notice.targetAudience === 'Only Girls' && gender !== 'Female') return false;
        }

        const pubDate = notice.publishDate ? new Date(notice.publishDate) : new Date(notice.createdAt?.toMillis() || 0);
        const expDate = notice.expiryDate ? new Date(notice.expiryDate) : null;
        
        if (pubDate > now) return false;
        if (expDate && expDate < now) return false;

        return true;
      });
      
      activeNotices.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setNotices(activeNotices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Read status logic
  useEffect(() => {
    if (!user) return;
    const storedReads = localStorage.getItem(`read_notices_${user.id}`);
    if (storedReads) {
      try {
        setReadNotices(JSON.parse(storedReads));
      } catch (e) { }
    }
  }, [user]);

  const markAsRead = (id: string) => {
    if (!readNotices.includes(id) && user) {
      const newReads = [...readNotices, id];
      setReadNotices(newReads);
      localStorage.setItem(`read_notices_${user.id}`, JSON.stringify(newReads));
    }
  };

  const handleNoticeClick = (notice: Notice) => {
    markAsRead(notice.id);
    setSelectedNotice(notice);
  };

  const filteredNotices = notices.filter(notice => 
    notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notice.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedNotices = filteredNotices.filter(n => n.priority === 'High');
  const regularNotices = filteredNotices.filter(n => n.priority !== 'High');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notice Board</h2>
          <p className="text-sm text-slate-500">Stay updated with the latest announcements.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search announcements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse h-32"></div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No new notices</h3>
          <p className="text-slate-500 mt-1">You are all caught up!</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            {pinnedNotices.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                  <Pin className="w-4 h-4 mr-2 text-rose-500" /> 
                  Important Alerts
                </h3>
                <div className="space-y-3">
                  {pinnedNotices.map(notice => (
                    <div 
                      key={notice.id} 
                      onClick={() => handleNoticeClick(notice)}
                      className={`p-4 rounded-xl cursor-pointer border transition-all ${
                        selectedNotice?.id === notice.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 
                        readNotices.includes(notice.id) ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-rose-50 border-rose-100 hover:border-rose-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">{notice.category}</span>
                        {!readNotices.includes(notice.id) && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                      </div>
                      <h4 className="font-bold text-slate-800 line-clamp-2 mt-2">{notice.title}</h4>
                      <p className="text-xs text-slate-500 mt-2 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(notice.publishDate || (notice.createdAt?.toMillis ? notice.createdAt.toMillis() : Date.now())).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                <Megaphone className="w-4 h-4 mr-2 text-indigo-500" /> 
                Latest Notices
              </h3>
              <div className="space-y-3">
                {regularNotices.length === 0 && <p className="text-sm text-slate-500">No general notices.</p>}
                {regularNotices.map(notice => (
                  <div 
                    key={notice.id} 
                    onClick={() => handleNoticeClick(notice)}
                    className={`p-4 rounded-xl cursor-pointer border transition-all ${
                      selectedNotice?.id === notice.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 
                      readNotices.includes(notice.id) ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-blue-50 border-blue-100 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{notice.category}</span>
                      {!readNotices.includes(notice.id) && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                    </div>
                    <h4 className="font-bold text-slate-800 line-clamp-2 mt-2">{notice.title}</h4>
                    <p className="text-xs text-slate-500 mt-2 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(notice.publishDate || (notice.createdAt?.toMillis ? notice.createdAt.toMillis() : Date.now())).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedNotice ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                {selectedNotice.image && (
                  <div className="w-full h-48 sm:h-64 bg-slate-100 relative">
                    <img src={selectedNotice.image} alt={selectedNotice.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedNotice.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                      selectedNotice.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {selectedNotice.priority} Priority
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {selectedNotice.category}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4">{selectedNotice.title}</h2>
                  
                  <div className="flex items-center text-sm text-slate-500 mb-8 pb-6 border-b border-slate-100">
                    <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> Published on {new Date(selectedNotice.publishDate || (selectedNotice.createdAt?.toMillis ? selectedNotice.createdAt.toMillis() : Date.now())).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="prose prose-slate max-w-none mb-8 whitespace-pre-wrap">
                    {selectedNotice.description}
                  </div>
                  
                  {selectedNotice.attachment && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attachments
                      </h4>
                      <a 
                        href={selectedNotice.attachment} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-indigo-600 transition-colors"
                      >
                        View Attachment
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Bell className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a notice to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
