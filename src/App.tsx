import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Suspense, lazy } from 'react';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));

const OwnerLayout = lazy(() => import('./pages/owner/OwnerLayout').then(m => ({ default: m.OwnerLayout })));
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const Settings = lazy(() => import('./pages/owner/Settings').then(m => ({ default: m.Settings })));
const VisitorManagement = lazy(() => import('./pages/shared/VisitorManagement').then(m => ({ default: m.VisitorManagement })));
const SeatManagement = lazy(() => import('./pages/owner/SeatManagement').then(m => ({ default: m.SeatManagement })));
const StudentManagement = lazy(() => import('./pages/owner/StudentManagement').then(m => ({ default: m.StudentManagement })));
const FeeManagement = lazy(() => import('./pages/owner/FeeManagement').then(m => ({ default: m.FeeManagement })));
const ExpenseManagement = lazy(() => import('./pages/owner/ExpenseManagement').then(m => ({ default: m.ExpenseManagement })));
const Reports = lazy(() => import('./pages/owner/Reports').then(m => ({ default: m.Reports })));
const StaffManagement = lazy(() => import('./pages/owner/StaffManagement').then(m => ({ default: m.StaffManagement })));

const StudentLayout = lazy(() => import('./pages/student/StudentLayout').then(m => ({ default: m.StudentLayout })));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const StudentNotices = lazy(() => import('./pages/student/StudentNotices').then(m => ({ default: m.StudentNotices })));

const StaffLayout = lazy(() => import('./pages/staff/StaffLayout').then(m => ({ default: m.StaffLayout })));
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard').then(m => ({ default: m.StaffDashboard })));
const StaffProfile = lazy(() => import('./pages/staff/StaffProfile').then(m => ({ default: m.StaffProfile })));
const NoticeManagement = lazy(() => import('./pages/shared/NoticeManagement').then(m => ({ default: m.NoticeManagement })));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LibraryManagement = lazy(() => import('./pages/admin/LibraryManagement').then(m => ({ default: m.LibraryManagement })));
const OwnerManagement = lazy(() => import('./pages/admin/OwnerManagement').then(m => ({ default: m.OwnerManagement })));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

const SeedAdmin = lazy(() => import('./pages/SeedAdmin').then(m => ({ default: m.SeedAdmin })));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/seed-admin" element={<SeedAdmin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="libraries" element={<LibraryManagement />} />
              <Route path="owners" element={<OwnerManagement />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Owner Routes */}
            <Route path="/owner" element={<ProtectedRoute allowedRoles={["LIBRARY_OWNER"]}><OwnerLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<OwnerDashboard />} />
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="seats" element={<SeatManagement />} />
              <Route path="fees" element={<FeeManagement />} />
              <Route path="expenses" element={<ExpenseManagement />} />
              <Route path="attendance" element={<div className="flex flex-col items-center justify-center h-full p-8 text-center"><div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-md"><h3 className="text-xl font-bold text-slate-800 mb-2">Attendance</h3><p className="text-slate-500">Coming Soon. This module will be added in the next step.</p></div></div>} />
              <Route path="reports" element={<Reports />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="visitors" element={<VisitorManagement />} />
              <Route path="notices" element={<NoticeManagement />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Student Routes */}
            <Route path="/student" element={<ProtectedRoute allowedRoles={["STUDENT"]}><StudentLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="profile" element={<div className="flex flex-col items-center justify-center h-full p-8 text-center"><div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-md"><h3 className="text-xl font-bold text-slate-800 mb-2">My Profile</h3><p className="text-slate-500">Coming Soon. This module will be added in the next step.</p></div></div>} />
              <Route path="attendance" element={<div className="flex flex-col items-center justify-center h-full p-8 text-center"><div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-md"><h3 className="text-xl font-bold text-slate-800 mb-2">Attendance</h3><p className="text-slate-500">Coming Soon. This module will be added in the next step.</p></div></div>} />
              <Route path="fees" element={<div className="flex flex-col items-center justify-center h-full p-8 text-center"><div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-md"><h3 className="text-xl font-bold text-slate-800 mb-2">Fee Details</h3><p className="text-slate-500">Coming Soon. This module will be added in the next step.</p></div></div>} />
              <Route path="notifications" element={<StudentNotices />} />
              <Route path="settings" element={<div className="flex flex-col items-center justify-center h-full p-8 text-center"><div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-md"><h3 className="text-xl font-bold text-slate-800 mb-2">Settings</h3><p className="text-slate-500">Coming Soon. This module will be added in the next step.</p></div></div>} />
            </Route>

            {/* Staff Routes */}
            <Route path="/staff" element={<ProtectedRoute allowedRoles={["MANAGER", "RECEPTIONIST", "ACCOUNTANT", "LIBRARIAN", "CUSTOM"]}><StaffLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<StaffDashboard />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="seats" element={<SeatManagement />} />
              <Route path="fees" element={<FeeManagement />} />
              <Route path="visitors" element={<VisitorManagement />} />
              <Route path="notices" element={<NoticeManagement />} />
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="profile" element={<StaffProfile />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
