import { auth, db } from './firebase-core.js?v=20260818-32';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, getDocs, getDoc, deleteDoc, doc, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import './auth-signup.js?v=20260818-32';

const PAID_PLANS = new Set(['STARTER', 'STANDARD', 'PRO', 'TEAM', 'ENTERPRISE']);

const loginButton = document.querySelector('#cloudLoginButton');
const logoutButton = document.querySelector('#cloudLogoutButton');
const lockedLoginButton = document.querySelector('#cloudLockedLoginButton');
const authDialog = document.querySelector('#authDialog');
const emailLoginButton = document.querySelector('#emailLoginButton');
const emailInput = document.querySelector('#authEmail');
const passwordInput = document.querySelector('#authPassword');
const authMessage = document.querySelector('#authMessage');
const locked = document.querySelector('#cloudLocked');
const content = document.querySelector('#cloudContent');
const search = document.querySelector('#cloudSearch');
const sortSelect = document.querySelector('#cloudSort');
const refreshButton = document.querySelector('#cloudRefresh');
const grid = document.querySelector('#cloudGrid');
const count = document.querySelector('#cloudCount');
const empty = document.querySelector('#cloudEmpty');
const accountName = document.querySelector('#cloudAccountName');
const totalAssets = document.querySelector('#cloudTotalAssets');
const storageUsed = document.querySelector('#cloudStorageUsed');
const recentDate = document.querySelector('#cloudRecentDate');
const userName = document.querySelector('#cloudUserName');
const userEmail = document.querySelector('#cloudUserEmail');
const plan = document.querySelector('#cloudPlan');
const freeUsage = document.querySelector('#cloudFreeUsage');
const freeRemaining = document.querySelector('#cloudFreeRemaining');

let currentUser = null;
let assets = [];

loginButton?.addEventListener('click', openLogin);
lockedLoginButton?.addEventListener('click', openLogin);
logoutButton?.addEventListener('click', () => signOut(auth));
refreshButton?.addEventListener('click', loadAssets);
search?.addEventListener('input', render);
sortSelect?.addEventListener('change', render);

authDialog?.addEventListener('click', (event) => {
  if (event.target === authDialog) authDialog.close();
});

emailLoginButton?.addEventListener('click', async () => {
  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';
  if (!email || !password) {
    if (authMessage) authMessage.textContent = '이메일과 비밀번호를 입력해주세요.';
    return;
  }
  setBusy(true);
  clearAuthMessage();
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authDialog.close();
  } catch (e) {
    if (authMessage) authMessage.textContent = authError(e);
  } finally {
    setBusy(false);
  }
});

passwordInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') emailLoginButton?.click();
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    if (locked) locked.hidden = true;
    if (content) content.hidden = false;
    if (logoutButton) logoutButton.hidden = false;
    if (loginButton) loginButton.hidden = true;
    if (accountName) accountName.textContent = `${user.displayName || user.email || 'MY CODE USER'} 계정`;
    await Promise.all([loadAccountProfile(), loadAssets()]);
  } else {
    if (locked) locked.hidden = false;
    if (content) content.hidden = true;
    if (logoutButton) logoutButton.hidden = true;
    if (loginButton) loginButton.hidden = false;
    if (accountName) accountName.textContent = '로그인이 필요합니다.';
    assets = [];
    if (grid) grid.innerHTML = '';
    resetAccountProfile();
    updateStats();
  }
}, (error) => {
  console.error('[MY CODE] Firebase auth state error:', error);
  if (accountName) accountName.textContent = '계정 정보를 불러오지 못했습니다.';
});

function openLogin() {
  clearAuthMessage();
  if (authDialog && !authDialog.open) authDialog.showModal();
}

async function loadAccountProfile() {
  if (!currentUser) return;
  const display = currentUser.displayName || currentUser.email?.split('@')[0] || 'MY CODE USER';
  if (userName) userName.textContent = display;
  if (userEmail) userEmail.textContent = currentUser.email || '—';

  let planName = 'FREE';
  let usedToday = false;
  try {
    const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
    if (snapshot.exists()) {
      const data = snapshot.data() || {};
      planName = String(data.plan || 'FREE').toUpperCase();
      usedToday = data.dailyFreeDate === todayKey() && data.dailyFreeUsed === true;
      if (data.name && userName) userName.textContent = data.name;
    }
  } catch (e) {
    console.warn('Account profile fallback:', e);
  }

  if (plan) plan.textContent = planName;
  if (PAID_PLANS.has(planName)) {
    if (freeUsage) freeUsage.textContent = '제한 없음';
    if (freeRemaining) freeRemaining.textContent = '유료 플랜';
  } else {
    if (freeUsage) freeUsage.textContent = `${usedToday ? 1 : 0} / 1`;
    if (freeRemaining) freeRemaining.textContent = usedToday ? '오늘 무료 사용 완료' : '오늘 1회 남음';
  }
}

function resetAccountProfile() {
  if (userName) userName.textContent = 'MY CODE USER';
  if (userEmail) userEmail.textContent = '—';
  if (plan) plan.textContent = 'FREE';
  if (freeUsage) freeUsage.textContent = '0 / 1';
  if (freeRemaining) freeRemaining.textContent = '오늘 1회 남음';
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadAssets() {
  if (!currentUser) return;
  if (count) count.textContent = '불러오는 중';
  if (refreshButton) refreshButton.disabled = true;
  try {
    const ref = collection(db, 'users', currentUser.uid, 'assets');
    const snapshot = await getDocs(query(ref, orderBy('createdAt', 'desc')));
    assets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    render();
  } catch (e) {
    console.error(e);
    if (count) count.textContent = '불러오기 실패';
    if (empty) {
      empty.hidden = false;
      empty.textContent = 'My Cloud 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
    }
  } finally {
    if (refreshButton) refreshButton.disabled = false;
  }
}

function updateStats() {
  const totalBytes = assets.reduce((sum, asset) => sum + Number(asset.fileSize || 0), 0);
  const newest = [...assets].sort((a, b) => timeValue(b) - timeValue(a))[0];
  if (totalAssets) totalAssets.textContent = String(assets.length);
  if (storageUsed) storageUsed.textContent = formatBytes(totalBytes);
  if (recentDate) {
    const date = newest?.createdAt?.toDate ? newest.createdAt.toDate() : null;
    recentDate.textContent = date ? new Intl.DateTimeFormat('ko-KR', { month:'short', day:'numeric' }).format(date) : '—';
  }
  if (count) count.textContent = `${assets.length}개 저장됨`;
}

function render() {
  if (!currentUser || !grid || !empty) return;
  const keyword = (search?.value || '').trim().toLowerCase();
  const mode = sortSelect?.value || 'newest';
  let list = assets.filter(a => (a.filename || '').toLowerCase().includes(keyword));

  list = [...list].sort((a, b) => {
    if (mode === 'oldest') return timeValue(a) - timeValue(b);
    if (mode === 'name') return String(a.filename || '').localeCompare(String(b.filename || ''), 'ko');
    if (mode === 'size') return Number(b.fileSize || 0) - Number(a.fileSize || 0);
    return timeValue(b) - timeValue(a);
  });

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

  el.innerHTML = `
    <div class="library-thumb"><img src="${escapeHtml(asset.imageUrl || '')}" alt="${escapeHtml(asset.filename || '이미지')}" loading="lazy"></div>
    <div class="library-body">
      <p class="library-meta">MY CLOUD / ${escapeHtml(dateText)}</p>
      <h3 class="library-title">${escapeHtml(asset.filename || 'Untitled')}</h3>
      <div class="library-code-row">
        <button class="copy-button url" type="button">URL 복사</button>
        <button class="copy-button html" type="button">HTML 복사</button>
        <button class="copy-button css" type="button">CSS 복사</button>
      </div>
      <div class="library-card-footer">
        <span class="library-meta">${formatBytes(asset.fileSize || 0)}</span>
        <button class="delete-library-button" type="button">삭제</button>
      </div>
    </div>`;

  bindCopy(el.querySelector('.url'), asset.imageUrl || '');
  bindCopy(el.querySelector('.html'), asset.htmlCode || `<img src="${asset.imageUrl || ''}" alt="">`);
  bindCopy(el.querySelector('.css'), asset.cssCode || `background-image: url("${asset.imageUrl || ''}");`);

  el.querySelector('.library-thumb')?.addEventListener('click', () => {
    if (asset.imageUrl) window.open(asset.imageUrl, '_blank', 'noopener,noreferrer');
  });

  el.querySelector('.delete-library-button')?.addEventListener('click', async () => {
    if (!confirm(`'${asset.filename || '이 이미지'}'를 My Cloud에서 삭제할까요?`)) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'assets', asset.id));
      assets = assets.filter(a => a.id !== asset.id);
      updateStats();
      render();
    } catch (e) {
      console.error(e);
      alert('삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  });
  return el;
}

function timeValue(asset) {
  if (asset?.createdAt?.toMillis) return asset.createdAt.toMillis();
  if (asset?.createdAt?.seconds) return Number(asset.createdAt.seconds) * 1000;
  return 0;
}

function bindCopy(button, value) {
  button?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(value);
      const before = button.textContent;
      button.textContent = '복사 완료';
      setTimeout(() => button.textContent = before, 900);
    } catch (e) {
      button.textContent = '복사 실패';
    }
  });
}

function clearAuthMessage() {
  if (authMessage) authMessage.textContent = '';
}

function setBusy(value) {
  if (emailLoginButton) emailLoginButton.disabled = value;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B','KB','MB','GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function authError(error) {
  const code = error?.code || '';
  if (code.includes('unauthorized-domain')) return 'Firebase 승인 도메인에 현재 사이트 주소를 추가해주세요.';
  if (code.includes('operation-not-allowed')) return 'Firebase에서 이메일/비밀번호 로그인을 활성화해주세요.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return '이메일 또는 비밀번호를 확인해주세요.';
  if (code.includes('too-many-requests')) return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (code.includes('network-request-failed')) return '네트워크 연결을 확인해주세요.';
  if (code.includes('api-key-not-valid')) return 'Firebase 웹 앱 설정의 API Key가 유효하지 않습니다.';
  return code ? `로그인 오류: ${code}` : '로그인 처리 중 오류가 발생했습니다.';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
