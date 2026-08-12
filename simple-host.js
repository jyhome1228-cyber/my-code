import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';

const config = window.MYCODE_FIREBASE_CONFIG;
if (!config?.projectId || !config?.storageBucket) throw new Error('Firebase 설정이 없습니다.');

const app = initializeApp(config);
const auth = getAuth(app);
const storage = getStorage(app, `gs://${config.storageBucket}`);
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const results = document.getElementById('results');

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeName(name) {
  return String(name || 'image').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-') || 'image';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));
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

  function paint(value, text, stageIndex) {
    const p = Math.max(0, Math.min(100, Math.round(value)));
    bar.style.width = `${p}%`;
    percent.textContent = `${p}%`;
    label.textContent = text;
    stages.forEach((node, index) => node.classList.toggle('on', index === stageIndex));
  }

  return {
    card,
    paint,
    fail(message) {
      card.className = 'error-card';
      card.innerHTML = `<strong>업로드하지 못했어요.</strong><span>${escapeHtml(message)}</span><button type="button" class="retry-btn">다시 시도</button>`;
      card.querySelector('.retry-btn')?.addEventListener('click', () => {
        card.remove();
        uploadOne(file);
      });
    }
  };
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
      <div class="note">이 주소를 아임웹 코드 보기, 카페24, HTML의 <code>src</code>에 그대로 붙여 넣으면 됩니다.</div>
    </div>
  `;
  const buttons = card.querySelectorAll('.copy');
  buttons[0].addEventListener('click', () => copyText(url, buttons[0]));
  buttons[1].addEventListener('click', () => copyText(html, buttons[1]));
  return card;
}

function readableError(error) {
  const code = String(error?.code || '');
  if (code === 'auth/operation-not-allowed') return 'Firebase 익명 로그인이 비활성화되어 있어요.';
  if (code === 'storage/unauthorized') return 'Firebase Storage Rules에서 업로드가 거부됐어요.';
  if (code === 'storage/bucket-not-found') return 'Firebase Storage 버킷을 찾을 수 없어요.';
  if (code === 'storage/quota-exceeded') return 'Firebase Storage 사용량 한도를 확인해주세요.';
  if (code === 'storage/retry-limit-exceeded') return 'Storage 연결이 오래 걸려 중단했어요. 버킷 CORS 설정을 확인해주세요.';
  if (code === 'UPLOAD_TIMEOUT') return '업로드가 30초 안에 끝나지 않았어요. 버킷 CORS 설정을 확인해주세요.';
  if (code.startsWith('storage/')) return `Firebase Storage 오류: ${code}`;
  if (code.startsWith('auth/')) return `Firebase 인증 오류: ${code}`;
  return error?.message || '업로드하지 못했습니다.';
}

async function ensureGuest() {
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

function uploadFile(storageRef, file, loading) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: 'public,max-age=31536000'
    });

    const timeoutId = setTimeout(() => {
      try { task.cancel(); } catch (_) {}
      const error = new Error('UPLOAD_TIMEOUT');
      error.code = 'UPLOAD_TIMEOUT';
      reject(error);
    }, 30000);

    task.on('state_changed', snapshot => {
      const progress = snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
      loading.paint(30 + progress * 60, 'Firebase Storage에 업로드하는 중…', 2);
    }, error => {
      clearTimeout(timeoutId);
      reject(error);
    }, () => {
      clearTimeout(timeoutId);
      resolve(task.snapshot);
    });
  });
}

async function uploadOne(file) {
  if (!file.type.startsWith('image/')) return;
  const loading = makeLoadingCard(file);
  results.prepend(loading.card);

  if (file.size > 10 * 1024 * 1024) {
    loading.fail('10MB 이하 이미지로 올려주세요.');
    return;
  }

  try {
    loading.paint(10, '이미지를 확인하는 중…', 0);
    const user = await ensureGuest();
    loading.paint(26, 'Firebase에 연결됐어요.', 1);

    const id = crypto.randomUUID();
    const path = `users/${user.uid}/images/${id}/${safeName(file.name)}`;
    const storageRef = ref(storage, path);
    const snapshot = await uploadFile(storageRef, file, loading);

    loading.paint(94, '이미지 주소를 만드는 중…', 3);
    const url = await getDownloadURL(snapshot.ref);
    loading.paint(100, '완료', 3);

    const resultCard = createResultCard(file, url);
    setTimeout(() => loading.card.replaceWith(resultCard), 140);
  } catch (error) {
    console.error('[my:code direct upload]', error);
    loading.fail(readableError(error));
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
