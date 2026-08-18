import { firebaseConfig } from './firebase-client.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

const loginButton = document.querySelector('#cloudLoginButton');
const logoutButton = document.querySelector('#cloudLogoutButton');
const authDialog = document.querySelector('#authDialog');
const googleButton = document.querySelector('#googleLoginButton');
const emailLoginButton = document.querySelector('#emailLoginButton');
const emailSignupButton = document.querySelector('#emailSignupButton');
const emailInput = document.querySelector('#authEmail');
const passwordInput = document.querySelector('#authPassword');
const authMessage = document.querySelector('#authMessage');
const locked = document.querySelector('#cloudLocked');
const content = document.querySelector('#cloudContent');
const search = document.querySelector('#cloudSearch');
const grid = document.querySelector('#cloudGrid');
const count = document.querySelector('#cloudCount');
const empty = document.querySelector('#cloudEmpty');
const accountName = document.querySelector('#cloudAccountName');
let currentUser = null;
let assets = [];

loginButton?.addEventListener('click', () => authDialog.showModal());
logoutButton?.addEventListener('click', () => signOut(auth));
googleButton?.addEventListener('click', async () => {
  setBusy(true);
  try { await signInWithPopup(auth, new GoogleAuthProvider()); authDialog.close(); }
  catch (e) { authMessage.textContent = authError(e); }
  finally { setBusy(false); }
});
emailLoginButton?.addEventListener('click', async () => {
  if (!emailInput.value || !passwordInput.value) return authMessage.textContent = '이메일과 비밀번호를 입력해주세요.';
  setBusy(true);
  try { await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value); authDialog.close(); }
  catch (e) { authMessage.textContent = authError(e); }
  finally { setBusy(false); }
});
emailSignupButton?.addEventListener('click', async () => {
  if (!emailInput.value || passwordInput.value.length < 6) return authMessage.textContent = '이메일과 6자 이상의 비밀번호를 입력해주세요.';
  setBusy(true);
  try { await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value); authDialog.close(); }
  catch (e) { authMessage.textContent = authError(e); }
  finally { setBusy(false); }
});
search?.addEventListener('input', render);

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    locked.hidden = true;
    content.hidden = false;
    logoutButton.hidden = false;
    loginButton.hidden = true;
    accountName.textContent = user.displayName || user.email || 'MY CODE USER';
    await loadAssets();
  } else {
    locked.hidden = false;
    content.hidden = true;
    logoutButton.hidden = true;
    loginButton.hidden = false;
    accountName.textContent = '로그인이 필요합니다.';
    assets = [];
    grid.innerHTML = '';
  }
});

async function loadAssets() {
  count.textContent = '불러오는 중';
  try {
    const ref = collection(db, 'users', currentUser.uid, 'assets');
    const snapshot = await getDocs(query(ref, orderBy('createdAt', 'desc')));
    assets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    count.textContent = `${assets.length}개 저장됨`;
    render();
  } catch (e) {
    console.error(e);
    count.textContent = '불러오기 실패';
    empty.hidden = false;
    empty.textContent = 'My Cloud 데이터를 불러오지 못했습니다. Firestore 규칙을 확인해주세요.';
  }
}

function render() {
  if (!currentUser) return;
  const keyword = (search.value || '').trim().toLowerCase();
  const list = assets.filter(a => (a.filename || '').toLowerCase().includes(keyword));
  grid.innerHTML = '';
  empty.hidden = list.length > 0;
  grid.hidden = list.length === 0;
  if (!list.length) {
    empty.textContent = keyword ? '검색 결과가 없습니다.' : '아직 My Cloud에 저장한 이미지가 없습니다.';
    return;
  }
  list.forEach(asset => grid.appendChild(card(asset)));
}

function card(asset) {
  const el = document.createElement('article');
  el.className = 'library-card';
  const date = asset.createdAt?.toDate ? asset.createdAt.toDate() : null;
  const dateText = date ? new Intl.DateTimeFormat('ko-KR', { dateStyle:'medium' }).format(date) : '최근 저장';
  el.innerHTML = `<div class="library-thumb"><img src="${escapeHtml(asset.imageUrl || '')}" alt="${escapeHtml(asset.filename || '이미지')}" loading="lazy"></div><div class="library-body"><p class="library-meta">MY CLOUD / ${escapeHtml(dateText)}</p><h3 class="library-title">${escapeHtml(asset.filename || 'Untitled')}</h3><div class="library-code-row"><button class="copy-button url">URL 복사</button><button class="copy-button html">HTML 복사</button><button class="copy-button css">CSS 복사</button></div><div class="library-card-footer"><span class="library-meta">${formatBytes(asset.fileSize || 0)}</span><button class="delete-library-button">삭제</button></div></div>`;
  bindCopy(el.querySelector('.url'), asset.imageUrl || '');
  bindCopy(el.querySelector('.html'), asset.htmlCode || `<img src="${asset.imageUrl || ''}" alt="">`);
  bindCopy(el.querySelector('.css'), asset.cssCode || `background-image: url("${asset.imageUrl || ''}");`);
  el.querySelector('.delete-library-button').addEventListener('click', async () => {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'assets', asset.id));
    assets = assets.filter(a => a.id !== asset.id);
    count.textContent = `${assets.length}개 저장됨`;
    render();
  });
  return el;
}

function bindCopy(button, value) {
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(value);
    const before = button.textContent;
    button.textContent = '복사 완료';
    setTimeout(() => button.textContent = before, 900);
  });
}
function setBusy(v) { [googleButton,emailLoginButton,emailSignupButton].forEach(b => { if(b) b.disabled=v; }); }
function formatBytes(bytes) { if (!bytes) return '0 B'; const u=['B','KB','MB','GB']; const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),u.length-1); return `${(bytes/Math.pow(1024,i)).toFixed(i?1:0)} ${u[i]}`; }
function authError(e) { const c=e?.code||''; if(c.includes('unauthorized-domain')) return 'Firebase 승인 도메인 설정을 확인해주세요.'; if(c.includes('invalid-credential')) return '이메일 또는 비밀번호를 확인해주세요.'; if(c.includes('email-already-in-use')) return '이미 가입된 이메일입니다.'; return '로그인 처리 중 오류가 발생했습니다.'; }
function escapeHtml(v) { return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
