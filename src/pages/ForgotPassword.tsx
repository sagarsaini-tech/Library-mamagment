import React, { useState } from 'react';
import { Link } from 'react-router';
import { Mail, Library, AlertCircle, CheckCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Check your inbox for further instructions');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
          setError('No user found with this email address.');
      } else {
          setError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] text-[#3A3A2F] font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-lg shadow-[#5A5A4011] border border-[#E5E5DE]">
        <div>
          <div className="flex justify-center text-[#5A5A40]">
            <Library className="w-12 h-12" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-serif text-[#2C2C24]">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-[#8A8A7A]">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-start">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E5DE] bg-[#FDFCF8] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#5A5A40] text-white font-bold rounded-xl shadow-lg shadow-[#5A5A4022] hover:bg-[#4A4A35] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </div>
          
          <div className="text-center">
            <Link to="/login" className="text-sm font-bold text-[#5A5A40] hover:underline transition-colors">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
