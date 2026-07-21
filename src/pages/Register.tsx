import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Library, Lock, Mail, User, AlertCircle, Shield } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { updateUserRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      console.log("Using Firebase Project ID:", auth.app.options.projectId);
      console.log("Using Auth Instance:", auth.name);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile name
      await updateProfile(user, { displayName: name });
      
      // We manually update local context because firestore read won't be ready fast enough
      await updateUserRole(user.uid, role, name);

      // Store extra user details in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        fullName: name,
        email,
        role,
        createdAt: new Date().toISOString()
      });

      setSuccess('Account created successfully! Redirecting...');
      
      setTimeout(() => {
        if (role === 'LIBRARY_OWNER') {
          navigate('/owner/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }, 1500);

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
          setError('Email is already registered.');
      } else if (err.code === 'auth/weak-password') {
          setError('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'unavailable' || err.message?.includes('offline')) {
          setError('Cannot connect to database. Please ensure Cloud Firestore API is enabled in your Firebase project settings.');
      } else {
          setError(`Error (${err.code}): ${err.message}`);
      }
    } finally {
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
                <p className="text-sm text-[#8A8A7A]">Tailored dashboards for Super Admins, Owners, and Students.</p>
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
      <div className="flex flex-1 flex-col justify-center p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center lg:hidden text-[#5A5A40] mb-8">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-lg flex items-center justify-center text-white mr-3">
              <Library className="w-6 h-6" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-[#3A3A2F]">StudyLibrary OS</span>
          </div>
          <div className="mb-10">
            <h2 className="text-3xl font-serif text-[#2C2C24] mb-2">Create an account</h2>
            <p className="text-[#8A8A7A]">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#5A5A40] hover:underline">
                Sign in
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
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-start">
              <Shield className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5DE] bg-[#FDFCF8] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
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
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5DE] bg-[#FDFCF8] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={`py-3 px-2 text-xs font-bold rounded-lg transition-all ${
                    role === 'STUDENT'
                      ? 'border-2 border-[#5A5A40] bg-[#F5F5F0] text-[#5A5A40]'
                      : 'border border-[#E5E5DE] bg-white text-[#8A8A7A] hover:bg-[#FDFCF8]'
                  }`}
                >
                  STUDENT
                </button>
                <button
                  type="button"
                  onClick={() => setRole('LIBRARY_OWNER')}
                  className={`py-3 px-2 text-xs font-bold rounded-lg transition-all ${
                    role === 'LIBRARY_OWNER'
                      ? 'border-2 border-[#5A5A40] bg-[#F5F5F0] text-[#5A5A40]'
                      : 'border border-[#E5E5DE] bg-white text-[#8A8A7A] hover:bg-[#FDFCF8]'
                  }`}
                >
                  OWNER
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#5A5A40] text-white font-bold rounded-xl shadow-lg shadow-[#5A5A4022] hover:bg-[#4A4A35] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};
