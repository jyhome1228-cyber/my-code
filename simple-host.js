import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';

const config = window.MYCODE_FIREBASE_CONFIG;
const app = initializeApp(config);
const auth = getAuth(app);
const storage = getStorage(app);

const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const results = document.getElementById('results');

function timeout(promise, ms, code) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => {
      const error = new Error(code);
      error.code = code;
      reject(error);
    }, ms))
  ]);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeName(name) {
  return String(name || 'image').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

async function ensureAnonymousUser() {
  if (auth.currentUser) return auth.currentUser;
  const result = await timeout(signInAnonymously(auth), 12000, 'AUTH_TIMEOUT');
  return result.user;
}

function makeLoadingCard(file) {
  const card = document.createElement('article');
  card.className = 'loading-card';
  card.innerHTML = `
    <div class="loader"><span class="spinner"></span><span class="percent">5%</span></div>
    <div class="loading-copy">
      <strong>${escapeHtml(file.name)}</strong>
      <span>이미지를 준비하는 중…</span>
      <div class="progress"><i></i></div>
      <div class="stage"><b class="on">준비</b><b>Firebase 연결</b><b>업로드</b><b>주소 생성</b></div>
    </div>
  `;
  const label = card.querySelector('.loading-copy span');
  const bar = card.querySelector('.progress i');
  const percent = card.querySelector('.percent');
  const stages = [...card.querySelectorAll('.stage b')];
  let timer = null;

  function set(value, text, stageIndex) {
    const p = Math.max(0, Math.min(99, Math.round(value)));
    bar.style.width = `${p}%`;
    percent.textContent = `${p}%`;
    label.textContent = text;
    stages.forEach((node, index) => node.classList.toggle('on', index === stageIndex));
  }

  function startUploadAnimation() {
    let p = 42;
    clearInterval(timer);
    timer = setInterval(() => {
      p = Math.min(88, p + Math.max(1, Math.round((90 - p) * .08)));
      set(p, 'Firebase Storage에 업로드하는 중…', 2);
    }, 350);
  }

  return {
    card,
    set,
    startUploadAnimation,
    stop() { if (timer) clearInterval(timer); },
    complete() { this.stop(); bar.style.width = '100%'; percent.textContent = '100%'; label.textContent = '주소 생성 완료'; stages.forEach((n, i) => n.classList.toggle('on', i === 3)); },
    fail(message) {
      this.stop();
      card.className = 'error-card';
      card.innerHTML = `<strong>업로드하지 못했어요.</strong><span>${escapeHtml(message)}</span>`;
    }
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function errorMessage(error) {
  const code = String(error?.code || '');
  if (code === 'AUTH_TIMEOUT') return '익명 인증 응답이 늦습니다. Firebase Authentication 설정을 확인해주세요.';
  if (code === 'UPLOAD_TIMEOUT') return 'Storage 업로드 응답이 없습니다. Storage 버킷과 Rules를 확인해주세요.';
  if (code === 'storage/unauthorized') return 'Firebase Storage Rules에서 업로드가 거부됐습니다.';
  if (code === 'storage/bucket-not-found') return 'Firebase Storage 버킷을 찾을 수 없습니다.';
  if (code === 'storage/quota-exceeded') return 'Firebase Storage 사용량 한도를 확인해주세요.';
  if (code.startsWith('storage/')) return `Firebase Storage 오류: ${code}`;
  if (code.startsWith('auth/')) return `Firebase 인증 오류: ${code}`;
  return error?.message || '알 수 없는 오류가 발생했습니다.';
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const old = button.textContent;
    button.textContent = '복사됨';
    setTimeout(() => { button.textContent = old; }, 1200);
  } catch {
    window.prompt('아래 내용을 복사하세요.', text);
  }
}

function createResultCard(file, url) {
  const html = `<img src="${url}" alt="">`;
  const card = document.createElement('article');
  card.className = 'result-card';
  const objectUrl = URL.createObjectURL(file);
  card.innerHTML = `
    <div class="preview"><img src="${objectUrl}" alt=""></div>
    <div class="result-main">
      <div class="file-line"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)}</span></div>
      <div class="field"><label>이미지 주소</label><code title="${escapeHtml(url)}">${escapeHtml(url)}</code><button class="copy">주소 복사</button></div>
      <div class="field"><label>IMG 태그</label><code>${escapeHtml(html)}</code><button class="copy secondary">&lt;img&gt; 복사</button></div>
      <div class="note">이 주소는 아임웹, 카페24, HTML 등 다른 곳의 <code>src</code>에 그대로 사용할 수 있습니다.</div>
    </div>
  `;
  const buttons = card.querySelectorAll('.copy');
  buttons[0].addEventListener('click', () => copyText(url, buttons[0]));
  buttons[1].addEventListener('click', () => copyText(html, buttons[1]));
  return card;
}

async function uploadOne(file) {
  if (!file.type.startsWith('image/')) return;
  const loading = makeLoadingCard(file);
  results.prepend(loading.card);

  try {
    loading.set(12, '이미지를 확인하는 중…', 0);
    await new Promise(resolve => setTimeout(resolve, 120));

    loading.set(28, 'Firebase 익명 세션을 만드는 중…', 1);
    const user = await ensureAnonymousUser();

    loading.set(42, 'Firebase Storage에 업로드하는 중…', 2);
    loading.startUploadAnimation();

    const id = crypto.randomUUID();
    const path = `users/${user.uid}/images/${id}/${safeName(file.name)}`;
    const storageRef = ref(storage, path);
    const uploadResult = await timeout(uploadBytes(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: 'public,max-age=31536000'
    }), 30000, 'UPLOAD_TIMEOUT');

    loading.stop();
    loading.set(94, '이미지 주소를 만드는 중…', 3);
    const url = await timeout(getDownloadURL(uploadResult.ref), 10000, 'URL_TIMEOUT');
    loading.complete();

    const resultCard = createResultCard(file, url);
    setTimeout(() => loading.card.replaceWith(resultCard), 220);
  } catch (error) {
    console.error('[my:code upload]', error);
    loading.fail(errorMessage(error));
  }
}

async function handleFiles(files) {
  const images = [...files].filter(file => file.type.startsWith('image/'));
  if (!images.length) return;
  for (const file of images) await uploadOne(file);
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
['dragenter','dragover'].forEach(type => dropzone.addEventListener(type, event => {
  event.preventDefault();
  dropzone.classList.add('is-dragging');
}));
['dragleave','drop'].forEach(type => dropzone.addEventListener(type, event => {
  event.preventDefault();
  dropzone.classList.remove('is-dragging');
}));
dropzone.addEventListener('drop', event => handleFiles(event.dataTransfer.files));
