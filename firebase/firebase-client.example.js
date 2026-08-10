// Firebase client integration example for my:code.
// This file is intentionally not loaded by index.html until a real Firebase project config is supplied.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';

const config = window.MYCODE_FIREBASE_CONFIG;
if (!config?.projectId) {
  throw new Error('MYCODE_FIREBASE_CONFIG is not configured.');
}

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function logout() {
  return signOut(auth);
}

export async function ensureUserDocument(user, plan = 'free') {
  if (!user) throw new Error('Authentication required.');
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    email: user.email || '',
    displayName: user.displayName || '',
    plan,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function uploadOptimizedImage({ user, imageId, blob, filename, metadata = {} }) {
  if (!user) throw new Error('Authentication required.');

  const storagePath = `users/${user.uid}/images/${imageId}/optimized.webp`;
  const storageRef = ref(storage, storagePath);
  const uploadResult = await uploadBytes(storageRef, blob, {
    contentType: blob.type || 'image/webp',
    customMetadata: {
      originalName: metadata.originalName || filename || '',
      imageId
    }
  });

  const downloadUrl = await getDownloadURL(uploadResult.ref);
  const imageRef = doc(collection(db, 'users', user.uid, 'images'), imageId);

  await setDoc(imageRef, {
    imageId,
    originalName: metadata.originalName || filename || '',
    displayName: filename || `${imageId}.webp`,
    storagePath,
    storageDownloadUrl: downloadUrl,
    shortCode: null,
    publicUrl: null,
    format: blob.type || 'image/webp',
    width: metadata.width || null,
    height: metadata.height || null,
    originalSize: metadata.originalSize || null,
    optimizedSize: blob.size,
    projectId: metadata.projectId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    storagePath,
    downloadUrl,
    publicUrl: null,
    shortCode: null
  };
}
