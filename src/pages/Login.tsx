import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Library, AlertCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
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

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      const userData = await checkUserAuthorized(firebaseUser.uid, firebaseUser.email);

      if (!userData) {
        await signOut(auth);
        setError('Your account is not authorized. Please contact the library administrator.');
        setLoading(false);
        return;
      }

      handleRedirect(userData.role || 'STUDENT');
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign in process was cancelled.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
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
              Sign in with your authorized library account.
            </p>
          </div>

          <div>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#E5E5DE] bg-white rounded-xl text-sm font-bold text-[#3A3A2F] hover:bg-[#FDFCF8] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E5DE]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-[#8A8A7A] font-semibold">Or with Email & Password</span>
              </div>
            </div>

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

