import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const SeedAdmin: React.FC = () => {
  const [status, setStatus] = useState('Click to create super admin');

  const handleSeed = async () => {
    try {
      setStatus('Creating user...');
      const userCredential = await createUserWithEmailAndPassword(auth, 'admin@studysync.com', 'admin123');
      const user = userCredential.user;
      
      setStatus('Saving to Firestore...');
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        fullName: 'Super Admin',
        email: 'admin@studysync.com',
        role: 'SUPER_ADMIN',
        createdAt: new Date().toISOString()
      });
      
      setStatus('Success! You can now login with admin@studysync.com / admin123');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setStatus('Admin user already exists. Login with admin@studysync.com / admin123');
      } else {
        setStatus(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-xl shadow-sm text-center space-y-4">
        <h2 className="text-xl font-bold">Seed Super Admin</h2>
        <button 
          onClick={handleSeed}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create Admin
        </button>
        <p className="text-sm text-slate-600">{status}</p>
      </div>
    </div>
  );
};
