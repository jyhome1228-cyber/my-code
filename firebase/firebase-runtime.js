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
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';

const config = window.MYCODE_FIREBASE_CONFIG;
if (!config?.projectId) throw new Error('MYCODE_FIREBASE_CONFIG is missing.');

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function timestampToIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date(value).toISOString();
}

function randomShortCode(length = 8) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
}

async function ensureUserDocument(user) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const base = {
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    plan: snapshot.exists() ? (snapshot.data()?.plan || 'free') : 'free',
    storageMode: 'firebase',
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
    cacheControl: 'public,max-age=31536000',
    customMetadata: {
      imageId: id,
      originalName: metadata.originalName || filename
    }
  });

  const downloadUrl = await getDownloadURL(result.ref);
  const shortCode = randomShortCode();
  const now = metadata.createdAt || new Date().toISOString();

  await setDoc(doc(db, 'users', user.uid, 'images', id), {
    imageId: id,
    originalName: metadata.originalName || filename,
    displayName: filename,
    storagePath,
    publicUrl: downloadUrl,
    shortCode,
    format: blob.type || 'image/webp',
    width: metadata.width || null,
    height: metadata.height || null,
    originalSize: metadata.originalSize || null,
    optimizedSize: blob.size,
    projectId: metadata.projectId || null,
    createdAt: metadata.createdAt ? metadata.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Short-link mapping is optional until the updated Firestore Rules + Hosting function are deployed.
  // A failure here must never make the actual image upload fail.
  try {
    await setDoc(doc(db, 'shortLinks', shortCode), {
      shortCode,
      ownerUid: user.uid,
      imageId: id,
      storagePath,
      targetUrl: downloadUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.info('Short-link mapping is not active yet.', error?.code || error);
  }

  return {
    key: storagePath,
    url: downloadUrl,
    shortCode,
    provider: 'firebase',
    createdAt: now
  };
}

async function listImages() {
  const user = auth.currentUser;
  if (!user) return [];
  const snapshot = await getDocs(collection(db, 'users', user.uid, 'images'));
  return snapshot.docs.map(entry => {
    const data = entry.data();
    return {
      id: data.imageId || entry.id,
      originalName: data.originalName || data.displayName || 'image',
      name: data.displayName || 'image.webp',
      mime: data.format || 'image/webp',
      originalSize: data.originalSize || data.optimizedSize || 0,
      size: data.optimizedSize || 0,
      width: data.width || null,
      height: data.height || null,
      createdAt: timestampToIso(data.createdAt),
      projectId: data.projectId || null,
      publicUrl: data.publicUrl || null,
      shortCode: data.shortCode || null,
      storageKey: data.storagePath || null,
      storageMode: 'firebase'
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function deleteImage(id, storagePath, shortCode = null) {
  const user = auth.currentUser;
  if (!user) return;
  if (storagePath) {
    try { await deleteObject(ref(storage, storagePath)); } catch (error) {
      if (error?.code !== 'storage/object-not-found') throw error;
    }
  }
  await deleteDoc(doc(db, 'users', user.uid, 'images', id));
  if (shortCode) await deleteDoc(doc(db, 'shortLinks', shortCode)).catch(() => {});
}

async function updateImageProject(id, projectId) {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, 'users', user.uid, 'images', id), {
    projectId: projectId || null,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function saveProject(project) {
  const user = auth.currentUser;
  if (!user || !project?.id) return;
  await setDoc(doc(db, 'users', user.uid, 'projects', project.id), {
    id: project.id,
    name: project.name || '프로젝트',
    createdAt: project.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function listProjects() {
  const user = auth.currentUser;
  if (!user) return [];
  const snapshot = await getDocs(collection(db, 'users', user.uid, 'projects'));
  return snapshot.docs.map(entry => {
    const data = entry.data();
    return {
      id: data.id || entry.id,
      name: data.name || '프로젝트',
      createdAt: timestampToIso(data.createdAt)
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
  ensureUserDocument,
  uploadImage,
  listImages,
  deleteImage,
  updateImageProject,
  saveProject,
  listProjects,
  getCurrentUser: () => auth.currentUser,
  storageEnabled: true
};

window.dispatchEvent(new CustomEvent('mycode:firebase-ready'));
