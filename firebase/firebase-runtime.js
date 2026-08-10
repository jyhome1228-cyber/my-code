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
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';

const config = window.MYCODE_FIREBASE_CONFIG;
if (!config?.projectId) throw new Error('MYCODE_FIREBASE_CONFIG is missing.');

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

async function ensureUserDocument(user) {
  if (!user) return;
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    plan: 'free',
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserDocument(result.user);
  return result.user;
}

async function logout() {
  await signOut(auth);
}

async function uploadImage({ blob, filename, id, metadata = {} }) {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error('AUTH_REQUIRED');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const extension = (filename.split('.').pop() || 'webp').toLowerCase();
  const storagePath = `users/${user.uid}/images/${id}/optimized.${extension}`;
  const storageRef = ref(storage, storagePath);

  const result = await uploadBytes(storageRef, blob, {
    contentType: blob.type || 'image/webp',
    cacheControl: 'public,max-age=31536000,immutable',
    customMetadata: {
      imageId: id,
      originalName: metadata.originalName || filename
    }
  });

  const storageDownloadUrl = await getDownloadURL(result.ref);

  await setDoc(doc(db, 'users', user.uid, 'images', id), {
    imageId: id,
    originalName: metadata.originalName || filename,
    displayName: filename,
    storagePath,
    storageDownloadUrl,
    shortCode: null,
    publicUrl: null,
    format: blob.type || 'image/webp',
    width: metadata.width || null,
    height: metadata.height || null,
    originalSize: metadata.originalSize || null,
    optimizedSize: blob.size,
    projectId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    key: storagePath,
    storageDownloadUrl,
    url: null,
    provider: 'firebase'
  };
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
  storage,
  signInWithGoogle,
  logout,
  uploadImage,
  getCurrentUser: () => auth.currentUser
};

window.dispatchEvent(new CustomEvent('mycode:firebase-ready'));
