import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace all page imports with lazy imports
const standardImports = `import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
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
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));`;

content = content.replace(/^.*export default function App\(\) \{/s, standardImports + '\n\nexport default function App() {');

// Add Suspense
const fallback = `const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);`;

content = content.replace('export default function App() {', fallback + '\n\nexport default function App() {');

content = content.replace('<Routes>', '<Suspense fallback={<LoadingFallback />}>\n        <Routes>');
content = content.replace('</Routes>', '</Routes>\n        </Suspense>');

fs.writeFileSync('src/App.tsx', content);
