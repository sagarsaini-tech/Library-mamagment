import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUserRole: (uid: string, role: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Fetch user profile from Firestore by UID or Email
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let userData = userDoc.exists() ? userDoc.data() : null;

          if (!userData && firebaseUser.email) {
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email.toLowerCase()));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              userData = querySnap.docs[0].data();
            } else {
              const qCase = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              const querySnapCase = await getDocs(qCase);
              if (!querySnapCase.empty) {
                userData = querySnapCase.docs[0].data();
              }
            }
          }

          if (userData) {
            setUser({
              id: firebaseUser.uid,
              name: userData.fullName || userData.name || firebaseUser.displayName || '',
              email: userData.email || firebaseUser.email || '',
              role: userData.role || 'STUDENT',
              createdAt: userData.createdAt,
              libraryId: userData.libraryId,
            });
          } else {
            // Document does not exist: user is not authorized
            await firebaseSignOut(auth);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user data from Firestore:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUserRole = async (uid: string, role: string, name: string) => {
    if (auth.currentUser?.email) {
      setUser({
        id: uid,
        name: name,
        email: auth.currentUser.email,
        role: role as any,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, logout, loading, updateUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


