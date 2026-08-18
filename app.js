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
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const WORKER_API = 'https://cool-bar-7c8d.planus253.workers.dev';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const fileInput = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const resultGrid = document.querySelector('#resultGrid');
const emptyState = document.querySelector('#emptyState');
const fileCount = document.querySelector('#fileCount');
const clearButton = document.querySelector('#clearButton');
const serviceStatus = document.querySelector('#serviceStatus');
const serviceStatusDot = document.querySelector('#serviceStatusDot');
const resultCardTemplate = document.querySelector('#resultCardTemplate');

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
      updateAccountUI();
      updateResultSaveButtons();
      if (user) {
        await loadLibrary();
        await autoSavePendingResults();
      } else {
        resetLibrary();
      }
    });
  } catch (error) {
    console.error('Firebase account initialization failed:', error);
    authMessage.textContent = '계정 기능 초기화에 실패했습니다. Firebase 설정을 확인해주세요.';
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
  accountButton.addEventListener('click', handleAccountButton);
  accountPanelButton.addEventListener('click', handleAccountButton);
  libraryLoginButton.addEventListener('click', openAuthDialog);
  googleLoginButton.addEventListener('click', loginWithGoogle);
  emailLoginButton.addEventListener('click', loginWithEmail);
  emailSignupButton.addEventListener('click', signupWithEmail);
  refreshLibrary.addEventListener('click', loadLibrary);
  librarySearch.addEventListener('input', renderLibrary);
}

function handleAccountButton() {
  if (currentUser) {
    signOut(auth).catch((error) => console.error(error));
    return;
  }
  openAuthDialog();
}

function openAuthDialog() {
  authMessage.textContent = '';
  if (!authDialog.open) authDialog.showModal();
}

async function loginWithGoogle() {
  if (!auth) return;
  setAuthBusy(true);
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    authDialog.close();
  } catch (error) {
    console.error(error);
    authMessage.textContent = readableAuthError(error);
  } finally {
    setAuthBusy(false);
  }
}

async function loginWithEmail() {
  if (!auth) return;
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) {
    authMessage.textContent = '이메일과 비밀번호를 입력해주세요.';
    return;
  }
  setAuthBusy(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authDialog.close();
  } catch (error) {
    console.error(error);
    authMessage.textContent = readableAuthError(error);
  } finally {
    setAuthBusy(false);
  }
}

async function signupWithEmail() {
  if (!auth) return;
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || password.length < 6) {
    authMessage.textContent = '이메일과 6자 이상의 비밀번호를 입력해주세요.';
    return;
  }
  setAuthBusy(true);
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    authDialog.close();
  } catch (error) {
    console.error(error);
    authMessage.textContent = readableAuthError(error);
  } finally {
    setAuthBusy(false);
  }
}

function setAuthBusy(busy) {
  [googleLoginButton, emailLoginButton, emailSignupButton].forEach((button) => {
    button.disabled = busy;
  });
}

function updateAccountUI() {
  if (currentUser) {
    const name = currentUser.displayName || currentUser.email || 'MY CODE USER';
    accountButton.textContent = '로그아웃';
    accountPanelButton.textContent = '로그아웃';
    accountSummary.textContent = `${name} 계정으로 로그인되어 있습니다. 생성한 이미지와 코드는 My Cloud에 저장되어 다음 작업에서도 다시 사용할 수 있습니다.`;
    libraryLocked.hidden = true;
    libraryTools.hidden = false;
    libraryCount.textContent = '불러오는 중';
  } else {
    accountButton.textContent = '로그인';
    accountPanelButton.textContent = '로그인';
    accountSummary.textContent = '비회원도 이미지 URL 생성은 가능하며, 로그인하면 My Cloud 저장 기능이 활성화됩니다.';
    libraryLocked.hidden = false;
    libraryTools.hidden = true;
    libraryCount.textContent = '로그인 필요';
  }
}

async function handleFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith('image/'));
  if (!files.length) return;

  for (const file of files) {
    const item = createItem(file);
    items.set(item.id, item);
    const card = renderResultCard(item);
    updateCount();

    if (file.size > MAX_FILE_SIZE) {
      card.dataset.state = 'error';
      card.querySelector('.card-status').textContent = '파일은 최대 10MB까지 업로드할 수 있습니다.';
      continue;
    }

    uploadItem(item, card);
  }

  fileInput.value = '';
  document.querySelector('#result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  emptyState.hidden = true;
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
  } catch (error) {
    console.error('Image upload error:', error);
    progressBar.style.width = '0%';
    card.dataset.state = 'error';
    status.textContent = `업로드 실패 · ${error.message || '잠시 후 다시 시도해주세요.'}`;
  }
}

async function saveResultItem(item, card, auto = false) {
  if (!currentUser) {
    if (!auto) openAuthDialog();
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
  if (!currentUser) return;
  const pending = [...items.values()].filter((item) => item.downloadUrl && !item.saved && !item.saving);
  for (const item of pending) {
    const card = resultGrid.querySelector(`[data-id="${item.id}"]`);
    if (card) await saveResultItem(item, card, true);
  }
}

async function loadLibrary() {
  if (!currentUser || !db) return;

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
  libraryGrid.innerHTML = '';
  libraryGrid.hidden = true;
  libraryEmpty.hidden = true;
}

function renderLibrary() {
  if (!currentUser) return;
  const keyword = librarySearch.value.trim().toLowerCase();
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
      libraryCount.textContent = `${libraryAssets.length}개 저장됨`;
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

function bindCopy(button, value) {
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
  fileCount.textContent = `${count}개`;
  emptyState.hidden = count > 0;
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
