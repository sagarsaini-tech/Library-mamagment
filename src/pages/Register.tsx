import React from 'react';
import { useNavigate, Link } from 'react-router';
import { Library, ShieldAlert } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-[#FDFCF8] text-[#3A3A2F] font-sans items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-[#E5E5DE] shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-serif text-[#2C2C24] mb-3">Self-Registration Disabled</h2>
        <p className="text-sm text-[#707060] leading-relaxed mb-6">
          Public registration is disabled. All user accounts (Staff & Students) are managed directly by the Library Administrator.
        </p>

        <div className="bg-[#F5F5F0] p-4 rounded-xl border border-[#E5E5DE] text-xs text-[#5A5A40] text-left mb-6 space-y-2">
          <p className="font-bold">Need an account?</p>
          <p>• If you are a student, please contact your library owner for admission and login setup.</p>
          <p>• If you are staff, ask your library owner to add you in Staff Management.</p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full py-3.5 bg-[#5A5A40] text-white font-bold rounded-xl shadow-md hover:bg-[#4A4A35] transition-colors text-sm"
        >
          Return to Sign In
        </button>
      </div>
    </div>
  );
};

