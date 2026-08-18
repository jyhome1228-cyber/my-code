import { firebaseConfig } from './firebase-client.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const WORKER_API = 'https://cool-bar-7c8d.planus253.workers.dev';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const GUEST_USE_KEY = 'mycode_guest_trial_used_v1';
const USER_FREE_LIMIT = 3;
const USER_USAGE_CACHE_PREFIX = 'mycode_user_free_uses_v1_';

const fileInput = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const resultGrid = document.querySelector('#resultGrid');
const emptyState = document.querySelector('#emptyState');
const fileCount = document.querySelector('#fileCount');
const clearButton = document.querySelector('#clearButton');
const serviceStatus = document.querySelector('#serviceStatus');
const serviceStatusDot = document.querySelector('#serviceStatusDot');
const resultCardTemplate = document.querySelector('#resultCardTemplate');
const uploadNotice = document.querySelector('#uploadNotice');

const accountButton = document.querySelector('#accountButton');
const accountPanelButton = document.querySelector('#accountPanelButton');
const accountSummary = document.querySelector('#accountSummary');
const authDialog = document.querySelector('#authDialog');
const libraryLoginButton = document.querySelector('#libraryLoginButton');
const googleLoginButton = document.querySelector('#googleLoginButton');
const emailLoginButton = document.querySelector('#emailLoginButton');
const emailSignupButton = document.querySelector('#emailSignupButton');
const authEmail = document.querySelector('#authEmail');
const authPassword = document.querySelector('#authPassword');
const authMessage = document.querySelector('#authMessage');

const libraryLocked = document.querySelector('#libraryLocked');
const libraryTools = document.querySelector('#libraryTools');
const librarySearch = document.querySelector('#librarySearch');
const refreshLibrary = document.querySelector('#refreshLibrary');
const libraryEmpty = document.querySelector('#libraryEmpty');
const libraryGrid = document.querySelector('#libraryGrid');
const libraryCount = document.querySelector('#libraryCount');

const items = new Map();
let currentUser = null;
let libraryAssets = [];
let auth = null;
let db = null;
let authReady = false;
let userFreeUses = 0;
let uploadSessionBusy = false;

initFirebase();
checkWorker();
initUploadEvents();
initAccountEvents();

function initFirebase() {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    setPersistence(auth, browserLocalPersistence).catch(() => {});

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      authReady = true;
      if (user) {
        userFreeUses = await loadUserFreeUses(user);
      } else {
        userFreeUses = 0;
      }
      updateAccountUI();
      updateUsageHint();
      updateResultSaveButtons();
      if (user) {
        await loadLibrary();
        await autoSavePendingResults();
      } else {
        resetLibrary();
      }
    });
  } catch (error) {
    authReady = true;
    console.error('Firebase account initialization failed:', error);
    if (authMessage) authMessage.textContent = '계정 기능 초기화에 실패했습니다. Firebase 설정을 확인해주세요.';
    updateUsageHint();
  }
}

async function checkWorker() {
  try {
    const response = await fetch(WORKER_API, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (serviceStatus) serviceStatus.textContent = 'READY';
    if (serviceStatusDot) {
      serviceStatusDot.classList.remove('error');
      serviceStatusDot.classList.add('ready');
    }
  } catch (error) {
    console.error('Worker connection check failed:', error);
    if (serviceStatus) serviceStatus.textContent = 'CHECK';
    if (serviceStatusDot) {
      serviceStatusDot.classList.remove('ready');
      serviceStatusDot.classList.add('error');
    }
  }
}

function initUploadEvents() {
  if (!dropzone || !fileInput || !resultGrid || !clearButton) return;

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (event) => handleFiles(event.target.files));

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
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

function initAccountEvents() {
  accountButton?.addEventListener('click', handleAccountButton);
  accountPanelButton?.addEventListener('click', handleAccountButton);
  libraryLoginButton?.addEventListener('click', () => openAuthDialog());
  googleLoginButton?.addEventListener('click', loginWithGoogle);
  emailLoginButton?.addEventListener('click', loginWithEmail);
  emailSignupButton?.addEventListener('click', signupWithEmail);
  refreshLibrary?.addEventListener('click', loadLibrary);
  librarySearch?.addEventListener('input', renderLibrary);
}

function handleAccountButton() {
  if (currentUser) {
    signOut(auth).catch((error) => console.error(error));
    return;
  }
  openAuthDialog();
}

function openAuthDialog(message = '') {
  if (authMessage) authMessage.textContent = message;
  if (authDialog && !authDialog.open) authDialog.showModal();
}

async function loginWithGoogle() {
  if (!auth) return;
  setAuthBusy(true);
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    authDialog?.close();
  } catch (error) {
    console.error(error);
    if (authMessage) authMessage.textContent = readableAuthError(error);
  } finally {
    setAuthBusy(false);
  }
}

async function loginWithEmail() {
  if (!auth) return;
  const email = authEmail?.value.trim() || '';
  const password = authPassword?.value || '';
  if (!email || !password) {
    if (authMessage) authMessage.textContent = '이메일과 비밀번호를 입력해주세요.';
    return;
  }
  setAuthBusy(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authDialog?.close();
  } catch (error) {
    console.error(error);
    if (authMessage) authMessage.textContent = readableAuthError(error);
  } finally {
    setAuthBusy(false);
  }
}

async function signupWithEmail() {
  if (!auth) return;
  const email = authEmail?.value.trim() || '';
  const password = authPassword?.value || '';
  if (!email || password.length < 6) {
    if (authMessage) authMessage.textContent = '이메일과 6자 이상의 비밀번호를 입력해주세요.';
    return;
  }
  setAuthBusy(true);
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    authDialog?.close();
  } catch (error) {
    console.error(error);
    if (authMessage) authMessage.textContent = readableAuthError(error);
  } finally {
    setAuthBusy(false);
  }
}

function setAuthBusy(busy) {
  [googleLoginButton, emailLoginButton, emailSignupButton].filter(Boolean).forEach((button) => {
    button.disabled = busy;
  });
}

function updateAccountUI() {
  if (currentUser) {
    const name = currentUser.displayName || currentUser.email || 'MY CODE USER';
    if (accountButton) accountButton.textContent = '로그아웃';
    if (accountPanelButton) accountPanelButton.textContent = '로그아웃';
    const remaining = Math.max(0, USER_FREE_LIMIT - userFreeUses);
    if (accountSummary) accountSummary.textContent = `${name} 계정 · 무료 사용 ${userFreeUses}/${USER_FREE_LIMIT}회 · ${remaining}회 남음`;
    if (libraryLocked) libraryLocked.hidden = true;
    if (libraryTools) libraryTools.hidden = false;
    if (libraryCount) libraryCount.textContent = '불러오는 중';
  } else {
    if (accountButton) accountButton.textContent = '로그인';
    if (accountPanelButton) accountPanelButton.textContent = '로그인';
    if (accountSummary) accountSummary.textContent = '첫 1회는 회원가입 없이 사용할 수 있으며, 두 번째 업로드부터 로그인이 필요합니다.';
    if (libraryLocked) libraryLocked.hidden = false;
    if (libraryTools) libraryTools.hidden = true;
    if (libraryCount) libraryCount.textContent = '로그인 필요';
  }
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

  if (!currentUser && hasUsedGuestTrial()) {
    const message = '첫 무료 사용이 끝났어요. 두 번째 업로드부터 로그인 또는 회원가입이 필요합니다.';
    showNotice(message, 'auth', 7000);
    openAuthDialog('첫 1회 무료 이용을 사용했습니다. 계속 사용하려면 로그인 또는 회원가입해주세요.');
    resetFileInput();
    return;
  }

  if (currentUser && userFreeUses >= USER_FREE_LIMIT) {
    showNotice('로그인 무료 3회를 모두 사용했습니다. 계속 사용하려면 Pricing에서 요금제를 선택해주세요.', 'auth', 8000);
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

    if (succeeded) {
      if (currentUser) {
        await incrementUserFreeUse();
        const remaining = Math.max(0, USER_FREE_LIMIT - userFreeUses);
        if (remaining > 0) {
          showNotice(`무료 사용 ${userFreeUses}/${USER_FREE_LIMIT}회 · ${remaining}회 남았습니다.`, 'info', 5200);
        } else {
          showNotice('무료 3회를 모두 사용했습니다. 다음 업로드부터 요금제 선택이 필요합니다.', 'auth', 6500);
        }
      } else {
        markGuestTrialUsed();
        showNotice('첫 1회 무료 이용을 완료했습니다. 다음 업로드부터 로그인 또는 회원가입이 필요합니다.', 'info', 5200);
      }
      updateAccountUI();
      updateUsageHint();
    }
  } finally {
    uploadSessionBusy = false;
    resetFileInput();
  }

  document.querySelector('#result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  card.querySelector('.remove-button').addEventListener('click', () => removeItem(item, card));
  card.querySelector('.save-button').addEventListener('click', () => saveResultItem(item, card));

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
  if (!db || !item.downloadUrl || item.saved || item.saving) return;

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
    await loadLibrary();
  } catch (error) {
    console.error('Firestore save error:', error);
    button.disabled = false;
    button.textContent = '다시 저장';
    card.querySelector('.card-status').textContent = '이미지는 업로드됐지만 My Cloud 저장에 실패했습니다. 잠시 후 다시 시도해주세요.';
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

async function loadLibrary() {
  if (!currentUser || !db || !libraryGrid || !libraryCount || !libraryEmpty) return;

  libraryGrid.hidden = true;
  libraryEmpty.hidden = true;
  libraryCount.textContent = '불러오는 중';

  try {
    const assetsRef = collection(db, 'users', currentUser.uid, 'assets');
    const snapshot = await getDocs(query(assetsRef, orderBy('createdAt', 'desc')));
    libraryAssets = snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() }));
    libraryCount.textContent = `${libraryAssets.length}개 저장됨`;
    renderLibrary();
  } catch (error) {
    console.error('My Cloud load error:', error);
    libraryCount.textContent = '불러오기 실패';
    libraryEmpty.hidden = false;
    libraryEmpty.textContent = 'My Cloud를 불러오지 못했습니다. 로그인 설정과 데이터 권한을 확인해주세요.';
  }
}

function resetLibrary() {
  libraryAssets = [];
  if (libraryGrid) {
    libraryGrid.innerHTML = '';
    libraryGrid.hidden = true;
  }
  if (libraryEmpty) libraryEmpty.hidden = true;
}

function renderLibrary() {
  if (!currentUser || !libraryGrid || !libraryEmpty) return;
  const keyword = librarySearch?.value.trim().toLowerCase() || '';
  const filtered = libraryAssets.filter((asset) => (asset.filename || '').toLowerCase().includes(keyword));

  libraryGrid.innerHTML = '';
  libraryEmpty.hidden = filtered.length > 0;
  libraryGrid.hidden = filtered.length === 0;

  if (!filtered.length) {
    libraryEmpty.textContent = keyword ? '검색 결과가 없습니다.' : '아직 My Cloud에 저장한 이미지가 없습니다.';
    return;
  }

  filtered.forEach((asset) => libraryGrid.appendChild(createLibraryCard(asset)));
}

function createLibraryCard(asset) {
  const card = document.createElement('article');
  card.className = 'library-card';
  const date = asset.createdAt?.toDate ? asset.createdAt.toDate() : null;
  const dateText = date ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date) : '방금 저장';

  card.innerHTML = `
    <div class="library-thumb"><img src="${escapeHtml(asset.imageUrl || '')}" alt="${escapeHtml(asset.filename || '저장 이미지')}" loading="lazy" /></div>
    <div class="library-body">
      <p class="library-meta">MY CLOUD / ${escapeHtml(dateText)}</p>
      <h3 class="library-title">${escapeHtml(asset.filename || 'Untitled image')}</h3>
      <div class="library-code-row">
        <button class="copy-button library-url" type="button">URL 복사</button>
        <button class="copy-button library-html" type="button">HTML 복사</button>
        <button class="copy-button library-css" type="button">CSS 복사</button>
      </div>
      <div class="library-card-footer">
        <span class="library-meta">${formatBytes(asset.fileSize || 0)}</span>
        <button class="delete-library-button" type="button">My Cloud에서 삭제</button>
      </div>
    </div>`;

  bindCopy(card.querySelector('.library-url'), asset.imageUrl || '');
  bindCopy(card.querySelector('.library-html'), asset.htmlCode || `<img src="${asset.imageUrl || ''}" alt="">`);
  bindCopy(card.querySelector('.library-css'), asset.cssCode || `background-image: url("${asset.imageUrl || ''}");`);

  card.querySelector('.delete-library-button').addEventListener('click', async () => {
    if (!currentUser || !db) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'assets', asset.id));
      libraryAssets = libraryAssets.filter((item) => item.id !== asset.id);
      if (libraryCount) libraryCount.textContent = `${libraryAssets.length}개 저장됨`;
      renderLibrary();
    } catch (error) {
      console.error(error);
    }
  });

  return card;
}

function updateResultSaveButtons() {
  document.querySelectorAll('.result-card').forEach((card) => {
    const item = items.get(card.dataset.id);
    const button = card.querySelector('.save-button');
    if (!button || !item || !item.downloadUrl) return;
    if (item.saved) {
      button.disabled = true;
      button.textContent = 'My Cloud 저장됨';
      return;
    }
    button.disabled = false;
    button.textContent = currentUser ? 'My Cloud 저장' : '로그인 후 저장';
  });
}

async function loadUserFreeUses(user) {
  const cached = readUserUsageCache(user.uid);
  if (!db) return cached;
  try {
    const ref = doc(db, 'users', user.uid);
    const snapshot = await getDoc(ref);
    const remote = snapshot.exists() ? Number(snapshot.data()?.freeUploadsUsed || 0) : 0;
    const used = Math.max(cached, Math.max(0, Math.min(USER_FREE_LIMIT, remote)));
    writeUserUsageCache(user.uid, used);
    if (!snapshot.exists() || remote !== used) {
      await setDoc(ref, { freeUploadsUsed: used, freeUploadsUpdatedAt: serverTimestamp() }, { merge: true });
    }
    return used;
  } catch (error) {
    console.warn('Free usage load fallback:', error);
    return cached;
  }
}

async function incrementUserFreeUse() {
  if (!currentUser) return;
  userFreeUses = Math.min(USER_FREE_LIMIT, userFreeUses + 1);
  writeUserUsageCache(currentUser.uid, userFreeUses);
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      freeUploadsUsed: userFreeUses,
      freeUploadsUpdatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('Free usage save fallback:', error);
  }
}

function readUserUsageCache(uid) {
  try {
    return Math.max(0, Math.min(USER_FREE_LIMIT, Number(localStorage.getItem(`${USER_USAGE_CACHE_PREFIX}${uid}`) || 0)));
  } catch (_) {
    return 0;
  }
}

function writeUserUsageCache(uid, value) {
  try {
    localStorage.setItem(`${USER_USAGE_CACHE_PREFIX}${uid}`, String(value));
  } catch (_) {}
}

function updateUsageHint() {
  const note = document.querySelector('.simple-trial-note');
  if (!note) return;
  if (currentUser) {
    const remaining = Math.max(0, USER_FREE_LIMIT - userFreeUses);
    note.textContent = remaining > 0
      ? `로그인 무료 사용 ${userFreeUses}/${USER_FREE_LIMIT}회 · ${remaining}회 남음`
      : '무료 3회를 모두 사용했습니다 · 이후 요금제 선택이 필요합니다.';
    return;
  }
  note.textContent = hasUsedGuestTrial()
    ? '첫 무료 이용을 사용했습니다 · 다음 업로드부터 로그인 또는 회원가입이 필요합니다.'
    : '첫 1회 무료 이용 가능 · 이후 로그인 또는 회원가입이 필요합니다.';
}

function bindCopy(button, value) {
  if (!button) return;
  button.addEventListener('click', async () => {
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

function hasUsedGuestTrial() {
  try {
    return localStorage.getItem(GUEST_USE_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function markGuestTrialUsed() {
  try {
    localStorage.setItem(GUEST_USE_KEY, '1');
  } catch (_) {}
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
  if (code.includes('popup-closed')) return '로그인 창이 닫혔습니다.';
  if (code.includes('unauthorized-domain')) return 'Firebase Authentication의 승인된 도메인에 GitHub Pages 주소를 추가해주세요.';
  if (code.includes('operation-not-allowed')) return 'Firebase Authentication에서 해당 로그인 방식을 활성화해주세요.';
  if (code.includes('invalid-credential')) return '이메일 또는 비밀번호를 확인해주세요.';
  if (code.includes('email-already-in-use')) return '이미 가입된 이메일입니다.';
  if (code.includes('weak-password')) return '비밀번호는 6자 이상으로 설정해주세요.';
  return '로그인 처리 중 오류가 발생했습니다.';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
