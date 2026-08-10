import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const config = window.MYCODE_FIREBASE_CONFIG;
if (!config?.projectId) throw new Error('MYCODE_FIREBASE_CONFIG is missing.');

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

async function ensureUserDocument(user) {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const base = {
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    plan: snapshot.exists() ? (snapshot.data()?.plan || 'free') : 'free',
    storageMode: 'browser',
    updatedAt: serverTimestamp()
  };

  if (!snapshot.exists()) base.createdAt = serverTimestamp();
  await setDoc(userRef, base, { merge: true });
}

async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserDocument(result.user);
  return result.user;
}

async function logout() {
  await signOut(auth);
}

onAuthStateChanged(auth, async user => {
  if (user) {
    try { await ensureUserDocument(user); } catch (error) { console.error(error); }
  }
  window.dispatchEvent(new CustomEvent('mycode:auth', { detail: { user } }));
});

window.MyCodeFirebase = {
  auth,
  db,
  signInWithGoogle,
  logout,
  ensureUserDocument,
  getCurrentUser: () => auth.currentUser,
  storageEnabled: false
};

window.dispatchEvent(new CustomEvent('mycode:firebase-ready'));
