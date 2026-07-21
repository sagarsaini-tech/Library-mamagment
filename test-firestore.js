import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

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
