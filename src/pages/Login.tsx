import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Library, AlertCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRedirect = (role: string) => {
    if (role === 'SUPER_ADMIN') {
      navigate('/admin');
    } else if (role === 'LIBRARY_OWNER') {
      navigate('/owner/dashboard');
    } else if (['RECEPTIONIST', 'MANAGER', 'ACCOUNTANT', 'LIBRARIAN', 'CUSTOM'].includes(role)) {
      navigate('/staff/dashboard');
    } else if (role === 'STUDENT') {
      navigate('/student/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  useEffect(() => {
    if (user) {
      handleRedirect(user.role);
    }
  }, [user, navigate]);

  const checkUserAuthorized = async (uid: string, userEmail: string | null) => {
    // 1. Check doc by UID
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }

    // 2. Check by email if UID doc doesn't exist
    if (userEmail) {
      const q = query(collection(db, 'users'), where('email', '==', userEmail.toLowerCase()));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        return querySnap.docs[0].data();
      }
      
      const qCase = query(collection(db, 'users'), where('email', '==', userEmail));
      const querySnapCase = await getDocs(qCase);
      if (!querySnapCase.empty) {
        return querySnapCase.docs[0].data();
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await checkUserAuthorized(userCredential.user.uid, userCredential.user.email);
      
      if (!userData) {
        await signOut(auth);
        setError('Your account is not authorized. Please contact the library administrator.');
        setLoading(false);
        return;
      }
      
      handleRedirect(userData.role || 'STUDENT');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'unavailable' || err.message?.includes('offline')) {
        setError('Cannot connect to database. Please ensure Cloud Firestore API is enabled in your Firebase project settings.');
      } else {
        setError(err.message || 'Failed to login. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FDFCF8] text-[#3A3A2F] font-sans">
      {/* Left Banner */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F5F5F0] p-16 flex-col justify-center border-r border-[#E5E5DE]">
        <div className="max-w-md">
          <span className="inline-block px-3 py-1 bg-[#E8E8DF] text-[#5A5A40] text-xs font-bold uppercase tracking-widest rounded-full mb-6">
            Reading Room Management
          </span>
          <h1 className="text-4xl md:text-5xl font-serif text-[#2C2C24] leading-tight mb-6">
            Focus. Manage. <br />Succeed.
          </h1>
          <p className="text-[#707060] text-lg leading-relaxed mb-10">
            The definitive infrastructure for private study libraries. Scalable management for owners, distraction-free coordination for students.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-white border border-[#E5E5DE] rounded-full flex items-center justify-center shrink-0">
                <span className="text-[#5A5A40] font-bold text-xs">01</span>
              </div>
              <div>
                <h3 className="font-bold text-[#3A3A2F]">Role-Based Access</h3>
                <p className="text-sm text-[#8A8A7A]">Tailored dashboards for Super Admins, Owners, Staff, and Students.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-white border border-[#E5E5DE] rounded-full flex items-center justify-center shrink-0">
                <span className="text-[#5A5A40] font-bold text-xs">02</span>
              </div>
              <div>
                <h3 className="font-bold text-[#3A3A2F]">Real-time Seat Tracking</h3>
                <p className="text-sm text-[#8A8A7A]">Optimized space utilization for 24/7 study environments.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex flex-1 flex-col justify-center p-8 sm:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center lg:hidden text-[#5A5A40] mb-8">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-lg flex items-center justify-center text-white mr-3">
              <Library className="w-6 h-6" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-[#3A3A2F]">StudyLibrary OS</span>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-serif text-[#2C2C24] mb-2">Welcome Back</h2>
            <p className="text-[#8A8A7A] text-sm">
              Sign in to your account or{' '}
              <Link to="/register" className="font-bold text-[#5A5A40] hover:underline">
                create an account
              </Link>
            </p>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5DE] bg-[#FDFCF8] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                    Password
                  </label>
                  <div className="text-xs">
                    <Link to="/forgot-password" className="text-[#8A8A7A] hover:underline">
                      Forgot?
                    </Link>
                  </div>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5DE] bg-[#FDFCF8] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#5A5A40] text-white font-bold rounded-xl shadow-lg shadow-[#5A5A4022] hover:bg-[#4A4A35] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

