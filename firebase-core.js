import { firebaseConfig } from './firebase-client.js?v=20260818-32';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('[MY CODE] Firebase auth persistence fallback:', error?.code || error);
});

export { app, auth, db };
