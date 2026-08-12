import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';

const config = window.MYCODE_FIREBASE_CONFIG;
if (!config?.apiKey || !config?.projectId || !config?.storageBucket) {
  throw new Error('Firebase 설정이 없습니다.');
}

const app = initializeApp(config);
const auth = getAuth(app);
const storage = getStorage(app);

const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const results = document.getElementById('results');

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeFilename(name = 'image') {
  const clean = String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return clean || 'image';
}

function withTimeout(promise, ms, code) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => {
      const error = new Error(code);
      error.code = code;
      reject(error);
    }, ms))
  ]);
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = '복사됨';
    setTimeout(() => { button.textContent = original; }, 1100);
  } catch {
    window.prompt('아래 내용을 복사하세요.', text);
  }
}

function makeLoadingCard(file) {
  const card = document.createElement('article');
  card.className = 'loading-card';
  card.innerHTML = `
    <div class="loader">
      <span class="spinner"></span>
      <span class="percent">...</span>
    </div>
    <div class="loading-copy">
      <strong>${escapeHTML(file.name)}</strong>
      <span class="loading-message">Firebase에 연결하는 중…</span>
      <div class="progress is-indeterminate"><i></i></div>
      <div class="stage"><b class="on">연결</b><b>업로드</b><b>주소 생성</b></div>
    </div>
  `;

  const message = card.querySelector('.loading-message');
  const stages = [...card.querySelectorAll('.stage b')];

  return {
    card,
    stage(text, index) {
      message.textContent = text;
      stages.forEach((node, i) => node.classList.toggle('on', i === index));
    },
    fail(text, code = '') {
      card.className = 'error-card';
      card.innerHTML = `
        <strong>업로드하지 못했어요.</strong>
        <span>${escapeHTML(text)}</span>
        ${code ? `<small>${escapeHTML(code)}</small>` : ''}
        <button type="button" class="retry-btn">다시 시도</button>
      `;
      card.querySelector('.retry-btn')?.addEventListener('click', () => {
        card.remove();
        uploadOne(file);
      });
    }
  };
}

function makeResultCard(file, url) {
  const html = `<img src="${url}" alt="">`;
  const previewUrl = URL.createObjectURL(file);
  const card = document.createElement('article');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="preview"><img src="${previewUrl}" alt=""></div>
    <div class="result-main">
      <div class="file-line"><strong>${escapeHTML(file.name)}</strong><span>${formatBytes(file.size)}</span></div>
      <div class="field">
        <label>이미지 주소</label>
        <code title="${escapeHTML(url)}">${escapeHTML(url)}</code>
        <button class="copy" type="button">주소 복사</button>
      </div>
      <div class="field">
        <label>IMG 코드</label>
        <code>${escapeHTML(html)}</code>
        <button class="copy secondary" type="button">&lt;img&gt; 복사</button>
      </div>
      <div class="note">아임웹에서 &lt;&gt; 코드 보기로 전환한 뒤 이 IMG 코드를 그대로 붙이면 됩니다.</div>
    </div>
  `;

  const buttons = card.querySelectorAll('.copy');
  buttons[0].addEventListener('click', () => copyText(url, buttons[0]));
  buttons[1].addEventListener('click', () => copyText(html, buttons[1]));
  return card;
}

function readableError(error) {
  const code = String(error?.code || '');

  if (code === 'AUTH_TIMEOUT') return ['Firebase 익명 로그인 응답이 없습니다.', code];
  if (code === 'UPLOAD_TIMEOUT') return ['Firebase Storage 업로드 응답이 없습니다.', code];
  if (code === 'URL_TIMEOUT') return ['이미지 주소 생성 응답이 없습니다.', code];
  if (code === 'auth/operation-not-allowed') return ['Firebase 콘솔에서 익명 로그인을 활성화해주세요.', code];
  if (code === 'auth/network-request-failed') return ['Firebase Authentication 네트워크 요청이 실패했습니다.', code];
  if (code === 'storage/unauthorized') return ['Storage Rules가 이 업로드를 허용하지 않습니다.', code];
  if (code === 'storage/bucket-not-found') return ['Firebase Storage 버킷을 찾을 수 없습니다.', code];
  if (code === 'storage/quota-exceeded') return ['Firebase Storage 사용량 한도를 확인해주세요.', code];
  if (code === 'storage/retry-limit-exceeded') return ['Firebase Storage 연결 재시도 한도를 초과했습니다.', code];
  if (code.startsWith('storage/')) return [`Firebase Storage 오류가 발생했습니다: ${code}`, code];
  if (code.startsWith('auth/')) return [`Firebase 인증 오류가 발생했습니다: ${code}`, code];
  return [error?.message || '알 수 없는 오류가 발생했습니다.', code];
}

async function getGuestUser() {
  if (auth.currentUser) return auth.currentUser;
  const result = await withTimeout(signInAnonymously(auth), 10000, 'AUTH_TIMEOUT');
  return result.user;
}

async function uploadOne(file) {
  if (!file?.type?.startsWith('image/')) return;

  const loading = makeLoadingCard(file);
  results.prepend(loading.card);

  if (file.size > 10 * 1024 * 1024) {
    loading.fail('10MB 이하 이미지로 올려주세요.', 'FILE_TOO_LARGE');
    return;
  }

  try {
    loading.stage('Firebase 익명 세션을 만드는 중…', 0);
    const user = await getGuestUser();

    loading.stage('이미지를 Firebase Storage에 올리는 중…', 1);
    const objectPath = `users/${user.uid}/images/${crypto.randomUUID()}/${safeFilename(file.name)}`;
    const storageRef = ref(storage, objectPath);

    const snapshot = await withTimeout(
      uploadBytes(storageRef, file, {
        contentType: file.type,
        cacheControl: 'public,max-age=31536000'
      }),
      20000,
      'UPLOAD_TIMEOUT'
    );

    loading.stage('이미지 주소를 만드는 중…', 2);
    const url = await withTimeout(getDownloadURL(snapshot.ref), 10000, 'URL_TIMEOUT');

    loading.card.replaceWith(makeResultCard(file, url));
  } catch (error) {
    console.error('[my:code]', error);
    const [message, code] = readableError(error);
    loading.fail(message, code);
  }
}

async function handleFiles(fileList) {
  const files = [...fileList].filter(file => file.type.startsWith('image/'));
  for (const file of files) await uploadOne(file);
}

fileInput.addEventListener('change', event => {
  handleFiles(event.target.files);
  event.target.value = '';
});

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

['dragenter', 'dragover'].forEach(type => {
  dropzone.addEventListener(type, event => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });
});

['dragleave', 'drop'].forEach(type => {
  dropzone.addEventListener(type, event => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
  });
});

dropzone.addEventListener('drop', event => handleFiles(event.dataTransfer.files));
