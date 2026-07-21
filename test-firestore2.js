import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(config);
const db = getFirestore(app);

async function test() {
  try {
    console.log("Testing firestore connection...");
    const userDoc = await getDoc(doc(db, 'users', 'test_uid'));
    console.log('Success:', userDoc.exists());
    process.exit(0);
  } catch (err) {
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    process.exit(1);
  }
}
test();
