import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);

async function test() {
  try {
    const email = 'test' + Date.now() + '@example.com';
    const userCredential = await createUserWithEmailAndPassword(auth, email, 'password123');
    console.log('Success:', userCredential.user.uid);
    process.exit(0);
  } catch (err) {
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    process.exit(1);
  }
}
test();
