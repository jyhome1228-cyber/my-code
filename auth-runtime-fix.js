import { firebaseConfig } from './firebase-client.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

window.setTimeout(bindAuthOverrides, 0);

function bindAuthOverrides() {
  const dialog = document.querySelector('#authDialog');
  const googleButton = document.querySelector('#googleLoginButton');
  const emailButton = document.querySelector('#emailLoginButton');
  const emailInput = document.querySelector('#authEmail');
  const passwordInput = document.querySelector('#authPassword');
  const message = document.querySelector('#authMessage');

  if (googleButton && !googleButton.dataset.authOverride) {
    googleButton.dataset.authOverride = 'true';
    googleButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearMessage(message);
      setBusy(googleButton, true, 'Google 로그인 중...');

      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const credential = await signInWithPopup(auth, provider);
        await ensureBasicProfile(credential.user, 'google');
        dialog?.close();
      } catch (error) {
        console.error('[MY CODE] Google sign-in error:', error?.code, error);
        if (error?.code === 'auth/popup-blocked') {
          if (message) message.textContent = '팝업이 차단되어 Google 로그인 페이지로 이동합니다.';
          try {
            await signInWithRedirect(auth, new GoogleAuthProvider());
            return;
          } catch (redirectError) {
            console.error('[MY CODE] Google redirect error:', redirectError?.code, redirectError);
            if (message) message.textContent = authErrorMessage(redirectError);
          }
        } else if (message) {
          message.textContent = authErrorMessage(error);
        }
      } finally {
        setBusy(googleButton, false, 'Google로 계속하기');
      }
    }, true);
  }

  if (emailButton && !emailButton.dataset.authOverride) {
    emailButton.dataset.authOverride = 'true';
    emailButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearMessage(message);

      const email = emailInput?.value.trim() || '';
      const password = passwordInput?.value || '';
      if (!email || !password) {
        if (message) message.textContent = '이메일과 비밀번호를 입력해주세요.';
        return;
      }

      setBusy(emailButton, true, '로그인 중...');
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await ensureBasicProfile(credential.user, 'email');
        dialog?.close();
      } catch (error) {
        console.error('[MY CODE] Email sign-in error:', error?.code, error);
        if (message) message.textContent = authErrorMessage(error);
      } finally {
        setBusy(emailButton, false, '로그인');
      }
    }, true);
  }
}

async function ensureBasicProfile(user, method) {
  if (!user?.uid) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const snapshot = await getDoc(ref);
    const existing = snapshot.exists() ? snapshot.data() : {};
    const payload = {
      email: user.email || existing.email || '',
      name: user.displayName || existing.name || '',
      plan: existing.plan || 'FREE',
      signupMethod: existing.signupMethod || method,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (!snapshot.exists()) payload.createdAt = serverTimestamp();
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    // Authentication itself succeeded. Profile persistence must not invalidate login.
    console.warn('[MY CODE] Profile sync skipped:', error?.code, error);
  }
}

function setBusy(button, busy, text) {
  button.disabled = busy;
  button.textContent = text;
}

function clearMessage(node) {
  if (node) node.textContent = '';
}

function authErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'auth/unauthorized-domain') return '현재 사이트 주소가 Firebase 승인 도메인에 등록되지 않았습니다.';
  if (code === 'auth/operation-not-allowed') return 'Firebase에서 해당 로그인 제공업체가 활성화되지 않았습니다.';
  if (code === 'auth/popup-closed-by-user') return 'Google 로그인 창이 닫혔습니다. 다시 시도해주세요.';
  if (code === 'auth/cancelled-popup-request') return '다른 로그인 요청이 진행 중입니다. 잠시 후 다시 시도해주세요.';
  if (code === 'auth/account-exists-with-different-credential') return '같은 이메일로 다른 로그인 방식의 계정이 이미 있습니다. 기존 방식으로 먼저 로그인해주세요.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return '이메일 또는 비밀번호를 확인해주세요.';
  if (code === 'auth/too-many-requests') return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (code === 'auth/network-request-failed') return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
  if (code === 'auth/api-key-not-valid') return 'Firebase API 키 설정을 확인해주세요.';
  return code ? `로그인 오류: ${code}` : '로그인 처리 중 오류가 발생했습니다.';
}
