const config = window.MYCODE_FIREBASE_CONFIG;
if (!config?.apiKey || !config?.storageBucket) {
  throw new Error('Firebase 설정이 없습니다.');
}

const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const results = document.getElementById('results');
const bucket = config.storageBucket;
const apiKey = config.apiKey;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeName(name) {
  const base = String(name || 'image').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return base || 'image';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
    <div class="loader"><span class="spinner"></span><span class="percent">8%</span></div>
    <div class="loading-copy">
      <strong>${escapeHtml(file.name)}</strong>
      <span>이미지를 준비하는 중…</span>
      <div class="progress"><i></i></div>
      <div class="stage"><b class="on">준비</b><b>익명 연결</b><b>업로드</b><b>주소 생성</b></div>
    </div>
  `;

  const label = card.querySelector('.loading-copy span');
  const bar = card.querySelector('.progress i');
  const percent = card.querySelector('.percent');
  const stages = [...card.querySelectorAll('.stage b')];
  let timer = null;
  let progressValue = 8;

  function paint(value, text, stageIndex) {
    progressValue = Math.max(0, Math.min(99, Math.round(value)));
    bar.style.width = `${progressValue}%`;
    percent.textContent = `${progressValue}%`;
    label.textContent = text;
    stages.forEach((node, index) => node.classList.toggle('on', index === stageIndex));
  }

  function startUploadMotion() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (progressValue < 90) {
        progressValue += progressValue < 60 ? 4 : 2;
        paint(progressValue, 'Firebase Storage에 업로드하는 중…', 2);
      }
    }, 260);
  }

  return {
    card,
    paint,
    startUploadMotion,
    stop() { if (timer) clearInterval(timer); timer = null; },
    finish() { this.stop(); paint(100, '주소 생성 완료', 3); },
    fail(message) {
      this.stop();
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
      <div class="note">이 주소는 아임웹, 카페24, HTML 등 다른 곳의 이미지 <code>src</code>에 그대로 사용할 수 있습니다.</div>
    </div>
  `;
  const buttons = card.querySelectorAll('.copy');
  buttons[0].addEventListener('click', () => copyText(url, buttons[0]));
  buttons[1].addEventListener('click', () => copyText(html, buttons[1]));
  return card;
}

async function createAnonymousSession() {
  const cached = sessionStorage.getItem('mycode-anon-auth-v1');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.idToken && parsed.localId && Date.now() < parsed.expiresAt) return parsed;
    } catch (_) {}
  }

  const response = await fetchWithTimeout(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    },
    10000
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Auth HTTP ${response.status}`;
    const error = new Error(message);
    error.stage = 'auth';
    error.status = response.status;
    throw error;
  }

  const session = {
    idToken: payload.idToken,
    localId: payload.localId,
    expiresAt: Date.now() + (Number(payload.expiresIn || 3600) - 120) * 1000
  };
  sessionStorage.setItem('mycode-anon-auth-v1', JSON.stringify(session));
  return session;
}

async function uploadWithToken(file, uid, idToken, path) {
  const endpoint = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(path)}`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: file
  }, 15000);

  const raw = await response.text();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch (_) {}

  if (!response.ok) {
    const message = payload?.error?.message || raw || `Storage HTTP ${response.status}`;
    const error = new Error(message);
    error.stage = 'storage';
    error.status = response.status;
    error.uid = uid;
    throw error;
  }

  return payload || {};
}

function hostedUrl(path, payload) {
  const encodedPath = encodeURIComponent(path);
  const token = String(payload?.downloadTokens || payload?.downloadToken || '').split(',')[0].trim();
  const base = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodedPath}?alt=media`;
  return token ? `${base}&token=${encodeURIComponent(token)}` : base;
}

function readableError(error) {
  if (error?.name === 'AbortError') return 'Firebase 응답이 없어 15초 후 중단했어요. 네트워크 또는 Storage 설정을 확인해주세요.';
  if (error?.stage === 'auth') {
    if (/OPERATION_NOT_ALLOWED/i.test(error.message)) return 'Firebase 익명 로그인이 아직 비활성화되어 있어요.';
    return `익명 연결 실패: ${error.message}`;
  }
  if (error?.stage === 'storage') {
    if (error.status === 401) return 'Storage 인증 토큰이 거부됐어요.';
    if (error.status === 403) return 'Storage Rules가 업로드를 막고 있어요. /users/{uid}/images 경로 규칙을 확인해주세요.';
    if (error.status === 404) return 'Firebase Storage 버킷을 찾을 수 없어요.';
    return `Storage 업로드 실패: ${error.message}`;
  }
  if (error?.message?.toLowerCase().includes('failed to fetch')) return 'Firebase 요청이 브라우저에서 차단됐어요. 네트워크/CORS를 확인해주세요.';
  return error?.message || '알 수 없는 오류가 발생했습니다.';
}

async function uploadOne(file) {
  if (!file.type.startsWith('image/')) return;
  if (file.size > 10 * 1024 * 1024) {
    const loading = makeLoadingCard(file);
    results.prepend(loading.card);
    loading.fail('10MB 이하 이미지로 올려주세요.');
    return;
  }

  const loading = makeLoadingCard(file);
  results.prepend(loading.card);

  try {
    loading.paint(12, '이미지를 확인하는 중…', 0);
    await wait(100);

    loading.paint(28, '익명 세션을 연결하는 중…', 1);
    const auth = await createAnonymousSession();

    const id = crypto.randomUUID();
    const path = `users/${auth.localId}/images/${id}/${safeName(file.name)}`;

    loading.paint(42, 'Firebase Storage에 업로드하는 중…', 2);
    loading.startUploadMotion();
    const payload = await uploadWithToken(file, auth.localId, auth.idToken, path);

    loading.stop();
    loading.paint(94, '이미지 주소를 만드는 중…', 3);
    const url = hostedUrl(path, payload);
    await wait(140);
    loading.finish();

    const resultCard = createResultCard(file, url);
    setTimeout(() => loading.card.replaceWith(resultCard), 180);
  } catch (error) {
    console.error('[my:code REST upload]', error);
    sessionStorage.removeItem('mycode-anon-auth-v1');
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
