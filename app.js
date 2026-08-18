import { auth, db } from './firebase-core.js?v=20260818-32';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  collection,
  addDoc,
  getDoc,
  setDoc,
  doc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import './auth-signup.js?v=20260818-32';

const WORKER_API = 'https://cool-bar-7c8d.planus253.workers.dev';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const GUEST_DAILY_KEY = 'mycode_guest_daily_free_v2';
const USER_DAILY_CACHE_PREFIX = 'mycode_user_daily_free_v2_';
const PAID_PLANS = new Set(['STARTER', 'STANDARD', 'PRO', 'TEAM', 'ENTERPRISE']);

const fileInput = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const resultGrid = document.querySelector('#resultGrid');
const emptyState = document.querySelector('#emptyState');
const fileCount = document.querySelector('#fileCount');
const clearButton = document.querySelector('#clearButton');
const resultCardTemplate = document.querySelector('#resultCardTemplate');
const uploadNotice = document.querySelector('#uploadNotice');

const accountButton = document.querySelector('#accountButton');
const authDialog = document.querySelector('#authDialog');
const emailLoginButton = document.querySelector('#emailLoginButton');
const authEmail = document.querySelector('#authEmail');
const authPassword = document.querySelector('#authPassword');
const authMessage = document.querySelector('#authMessage');

const items = new Map();
let currentUser = null;
let currentPlan = 'FREE';
let userDailyUsed = false;
let authReady = false;
let uploadSessionBusy = false;

initUploadEvents();
initAuthEvents();
initAuthState();
updateUsageHint();

function initAuthState() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    authReady = true;
    currentPlan = 'FREE';
    userDailyUsed = false;

    if (user) {
      const state = await loadDailyAccountState(user);
      currentPlan = state.plan;
      userDailyUsed = state.usedToday;

      if (!isPaidPlan() && guestUsedToday() && !userDailyUsed) {
        userDailyUsed = true;
        await persistUserDailyState(true);
      }

      await autoSavePendingResults();
    }

    updateAccountUI();
    updateUsageHint();
    updateResultSaveButtons();
  }, (error) => {
    authReady = true;
    console.error('[MY CODE] Firebase auth state error:', error);
    showNotice('계정 기능을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'error', 6000);
  });
}

function initUploadEvents() {
  if (!dropzone || !fileInput || !resultGrid || !clearButton) return;

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (event) => handleFiles(event.target.files));

  ['dragenter', 'dragover'].forEach((name) => {
    dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((name) => {
    dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
  });

  dropzone.addEventListener('drop', (event) => handleFiles(event.dataTransfer.files));

  clearButton.addEventListener('click', () => {
    for (const item of items.values()) URL.revokeObjectURL(item.previewUrl);
    items.clear();
    resultGrid.innerHTML = '';
    updateCount();
  });
}

function initAuthEvents() {
  accountButton?.addEventListener('click', () => {
    if (currentUser) signOut(auth).catch(console.error);
    else openAuthDialog();
  });

  authDialog?.addEventListener('click', (event) => {
    if (event.target === authDialog) authDialog.close();
  });

  emailLoginButton?.addEventListener('click', loginWithEmail);
  authPassword?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') emailLoginButton?.click();
  });

  const description = authDialog?.querySelector('.auth-description');
  if (description) {
    description.textContent = '무료 플랜은 하루 1회 사용할 수 있습니다. 로그인하면 My Cloud 저장과 계정 관리 기능을 이용할 수 있습니다.';
  }
}

async function loginWithEmail() {
  const email = authEmail?.value.trim() || '';
  const password = authPassword?.value || '';
  if (!email || !password) {
    if (authMessage) authMessage.textContent = '이메일과 비밀번호를 입력해주세요.';
    return;
  }

  setAuthBusy(true);
  clearAuthMessage();
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authDialog?.close();
  } catch (error) {
    if (authMessage) authMessage.textContent = readableAuthError(error);
  } finally {
    setAuthBusy(false);
  }
}

function openAuthDialog(message = '') {
  if (authMessage) authMessage.textContent = message;
  if (authDialog && !authDialog.open) authDialog.showModal();
}

function setAuthBusy(busy) {
  if (emailLoginButton) emailLoginButton.disabled = busy;
}

function clearAuthMessage() {
  if (authMessage) authMessage.textContent = '';
}

function updateAccountUI() {
  if (!accountButton) return;
  accountButton.textContent = currentUser ? '로그아웃' : '로그인';
}

async function handleFiles(fileList) {
  if (!fileList || uploadSessionBusy) return;
  await waitForAuthState();

  const imageFiles = [...fileList].filter((file) => file.type.startsWith('image/'));
  if (!imageFiles.length) {
    showNotice('이미지 파일만 올릴 수 있어요.', 'error');
    resetFileInput();
    return;
  }

  const tooLarge = imageFiles.filter((file) => file.size > MAX_FILE_SIZE);
  const files = imageFiles.filter((file) => file.size <= MAX_FILE_SIZE);

  if (tooLarge.length) {
    const label = tooLarge.length === 1 ? `“${tooLarge[0].name}”` : `${tooLarge.length}개 이미지`;
    showNotice(`${label}가 10MB를 넘어요. 10MB 이하로 용량을 줄인 뒤 다시 올려주세요.`, 'error', 6500);
  }

  if (!files.length) {
    resetFileInput();
    return;
  }

  if (!canUseToday()) {
    if (!currentUser) {
      const message = '오늘 무료 1회를 사용했습니다. 계속 사용하려면 로그인 후 요금제를 선택해주세요.';
      showNotice(message, 'auth', 7000);
      openAuthDialog(message);
    } else {
      showNotice('오늘 무료 1회를 모두 사용했습니다. 내일 다시 이용하거나 Pricing에서 요금제를 선택해주세요.', 'auth', 7000);
    }
    resetFileInput();
    return;
  }

  uploadSessionBusy = true;
  const uploadTasks = [];

  try {
    for (const file of files) {
      const item = createItem(file);
      items.set(item.id, item);
      const card = renderResultCard(item);
      updateCount();
      uploadTasks.push(uploadItem(item, card));
    }

    const results = await Promise.allSettled(uploadTasks);
    const succeeded = results.some((result) => result.status === 'fulfilled' && result.value === true);

    if (succeeded && !isPaidPlan()) {
      await markDailyUse();
      showNotice('오늘 무료 1회 이용을 완료했습니다. 내일 다시 무료로 사용할 수 있습니다.', 'info', 5200);
      updateUsageHint();
    }
  } finally {
    uploadSessionBusy = false;
    resetFileInput();
  }

  document.querySelector('#result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function canUseToday() {
  if (isPaidPlan()) return true;
  return currentUser ? !userDailyUsed : !guestUsedToday();
}

function isPaidPlan() {
  return PAID_PLANS.has(String(currentPlan || '').toUpperCase());
}

async function markDailyUse() {
  if (currentUser) {
    userDailyUsed = true;
    writeUserDailyCache(currentUser.uid, true);
    await persistUserDailyState(true);
  } else {
    try {
      localStorage.setItem(GUEST_DAILY_KEY, todayKey());
    } catch (_) {}
  }
}

function guestUsedToday() {
  try {
    return localStorage.getItem(GUEST_DAILY_KEY) === todayKey();
  } catch (_) {
    return false;
  }
}

async function loadDailyAccountState(user) {
  const cachedUsed = readUserDailyCache(user.uid);
  let plan = 'FREE';
  let usedToday = cachedUsed;

  try {
    const ref = doc(db, 'users', user.uid);
    const snapshot = await getDoc(ref);
    const data = snapshot.exists() ? (snapshot.data() || {}) : {};
    plan = String(data.plan || 'FREE').toUpperCase();

    if (data.dailyFreeDate === todayKey()) {
      usedToday = usedToday || Boolean(data.dailyFreeUsed);
    }

    writeUserDailyCache(user.uid, usedToday);

    if (!snapshot.exists()) {
      await setDoc(ref, {
        name: user.displayName || '',
        email: user.email || '',
        phone: '',
        plan: 'FREE',
        signupMethod: 'email',
        dailyFreeDate: todayKey(),
        dailyFreeUsed: Boolean(cachedUsed),
        dailyFreeUpdatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      usedToday = cachedUsed;
    } else if (data.dailyFreeDate !== todayKey()) {
      await setDoc(ref, {
        dailyFreeDate: todayKey(),
        dailyFreeUsed: false,
        dailyFreeUpdatedAt: serverTimestamp()
      }, { merge: true });
      usedToday = cachedUsed;
    }
  } catch (error) {
    console.warn('Daily usage load fallback:', error);
  }

  return { plan, usedToday };
}

async function persistUserDailyState(used) {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      dailyFreeDate: todayKey(),
      dailyFreeUsed: Boolean(used),
      dailyFreeUpdatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('Daily usage save fallback:', error);
  }
}

function readUserDailyCache(uid) {
  try {
    const raw = localStorage.getItem(`${USER_DAILY_CACHE_PREFIX}${uid}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.date === todayKey() && parsed?.used === true;
  } catch (_) {
    return false;
  }
}

function writeUserDailyCache(uid, used) {
  try {
    localStorage.setItem(`${USER_DAILY_CACHE_PREFIX}${uid}`, JSON.stringify({ date: todayKey(), used: Boolean(used) }));
  } catch (_) {}
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updateUsageHint() {
  const note = document.querySelector('.simple-trial-note');
  if (!note) return;

  if (isPaidPlan()) {
    note.textContent = `${currentPlan} 플랜 · 업로드 제한 없이 사용할 수 있습니다.`;
    return;
  }

  const used = currentUser ? userDailyUsed : guestUsedToday();
  note.textContent = used
    ? '오늘 무료 1회 사용 완료 · 내일 다시 무료로 이용할 수 있습니다.'
    : '무료 플랜은 하루 1회 이용할 수 있습니다.';
}

function createItem(file) {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    downloadUrl: '',
    r2Key: '',
    htmlCode: '',
    cssCode: '',
    saved: false,
    saving: false
  };
}

function renderResultCard(item) {
  if (emptyState) emptyState.hidden = true;
  const card = resultCardTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.id = item.id;
  card.dataset.state = 'uploading';

  const image = card.querySelector('.result-preview');
  image.src = item.previewUrl;
  image.alt = `${item.file.name} 미리보기`;
  card.querySelector('.card-title').textContent = item.file.name;
  card.querySelector('.card-meta').textContent = `${formatBytes(item.file.size)} · ${item.file.type || 'image'}`;

  card.querySelector('.remove-button')?.addEventListener('click', () => removeItem(item, card));
  card.querySelector('.save-button')?.addEventListener('click', () => saveResultItem(item, card));
  resultGrid.prepend(card);
  return card;
}

async function uploadItem(item, card) {
  const progressBar = card.querySelector('.progress > i');
  const status = card.querySelector('.card-status');
  const codeGrid = card.querySelector('.code-grid');
  const saveButton = card.querySelector('.save-button');

  try {
    progressBar.style.width = '35%';
    status.textContent = '이미지 업로드 중...';

    const response = await fetch(`${WORKER_API}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': item.file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(item.file.name)
      },
      body: item.file
    });

    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok || !payload.url) throw new Error(payload.error || `업로드 실패 (HTTP ${response.status})`);

    item.downloadUrl = payload.url;
    item.r2Key = payload.key || '';
    item.htmlCode = `<img src="${item.downloadUrl}" alt="">`;
    item.cssCode = `background-image: url("${item.downloadUrl}");`;

    progressBar.style.width = '100%';
    card.dataset.state = 'done';
    status.textContent = currentUser ? '완료 · My Cloud에 저장합니다.' : '완료 · 아래 코드를 바로 사용할 수 있습니다.';

    card.querySelector('.url-input').value = item.downloadUrl;
    card.querySelector('.html-input').value = item.htmlCode;
    card.querySelector('.css-input').value = item.cssCode;
    codeGrid.hidden = false;
    saveButton.disabled = false;
    saveButton.textContent = currentUser ? 'My Cloud 저장' : '로그인 후 저장';

    bindCopy(card.querySelector('.copy-url'), item.downloadUrl);
    bindCopy(card.querySelector('.copy-html'), item.htmlCode);
    bindCopy(card.querySelector('.copy-css'), item.cssCode);

    if (currentUser) await saveResultItem(item, card, true);
    return true;
  } catch (error) {
    console.error('Image upload error:', error);
    progressBar.style.width = '0%';
    card.dataset.state = 'error';
    status.textContent = `업로드 실패 · ${error.message || '잠시 후 다시 시도해주세요.'}`;
    return false;
  }
}

async function saveResultItem(item, card, auto = false) {
  if (!currentUser) {
    if (!auto) openAuthDialog('My Cloud에 저장하려면 로그인 또는 회원가입해주세요.');
    return;
  }
  if (!item.downloadUrl || item.saved || item.saving) return;

  const button = card.querySelector('.save-button');
  item.saving = true;
  button.disabled = true;
  button.textContent = 'My Cloud 저장 중';

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'assets'), {
      filename: item.file.name,
      fileSize: item.file.size,
      mimeType: item.file.type || 'image',
      imageUrl: item.downloadUrl,
      htmlCode: item.htmlCode,
      cssCode: item.cssCode,
      r2Key: item.r2Key,
      createdAt: serverTimestamp()
    });
    item.saved = true;
    button.textContent = 'My Cloud 저장됨';
    card.querySelector('.card-status').textContent = '완료 · My Cloud에 저장되었습니다.';
  } catch (error) {
    console.error('My Cloud save error:', error);
    button.disabled = false;
    button.textContent = '다시 저장';
    card.querySelector('.card-status').textContent = '이미지는 업로드됐지만 My Cloud 저장에 실패했습니다.';
  } finally {
    item.saving = false;
  }
}

async function autoSavePendingResults() {
  if (!currentUser || !resultGrid) return;
  const pending = [...items.values()].filter((item) => item.downloadUrl && !item.saved && !item.saving);
  for (const item of pending) {
    const card = resultGrid.querySelector(`[data-id="${item.id}"]`);
    if (card) await saveResultItem(item, card, true);
  }
}

function updateResultSaveButtons() {
  document.querySelectorAll('.result-card').forEach((card) => {
    const item = items.get(card.dataset.id);
    const button = card.querySelector('.save-button');
    if (!button || !item || !item.downloadUrl) return;
    button.disabled = Boolean(item.saved);
    button.textContent = item.saved ? 'My Cloud 저장됨' : (currentUser ? 'My Cloud 저장' : '로그인 후 저장');
  });
}

function bindCopy(button, value) {
  button?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(value);
      const original = button.textContent;
      button.textContent = '복사 완료';
      setTimeout(() => { button.textContent = original; }, 1000);
    } catch (error) {
      console.error(error);
    }
  });
}

function removeItem(item, card) {
  URL.revokeObjectURL(item.previewUrl);
  items.delete(item.id);
  card.remove();
  updateCount();
}

function updateCount() {
  const count = items.size;
  if (fileCount) fileCount.textContent = `${count}개`;
  if (emptyState) emptyState.hidden = count > 0;
}

function resetFileInput() {
  if (fileInput) fileInput.value = '';
}

function showNotice(message, type = 'info', duration = 4800) {
  let notice = uploadNotice;
  let isGlobal = false;

  if (!notice) {
    notice = document.querySelector('.global-upload-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'global-upload-notice';
      notice.setAttribute('role', 'status');
      document.body.appendChild(notice);
    }
    isGlobal = true;
  }

  notice.textContent = message;
  notice.dataset.type = type;
  notice.hidden = false;
  clearTimeout(notice._hideTimer);
  notice._hideTimer = setTimeout(() => {
    notice.hidden = true;
    if (isGlobal && notice.parentNode) notice.remove();
  }, duration);
}

async function waitForAuthState() {
  if (authReady) return;
  const started = Date.now();
  while (!authReady && Date.now() - started < 1200) {
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function readableAuthError(error) {
  const code = error?.code || '';
  if (code.includes('unauthorized-domain')) return 'Firebase 승인 도메인에 현재 사이트 주소를 추가해주세요.';
  if (code.includes('operation-not-allowed')) return 'Firebase에서 이메일/비밀번호 로그인을 활성화해주세요.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return '이메일 또는 비밀번호를 확인해주세요.';
  if (code.includes('too-many-requests')) return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (code.includes('network-request-failed')) return '네트워크 연결을 확인해주세요.';
  if (code.includes('api-key-not-valid')) return 'Firebase 웹 앱 설정의 API Key가 유효하지 않습니다.';
  return code ? `로그인 오류: ${code}` : '로그인 처리 중 오류가 발생했습니다.';
}
