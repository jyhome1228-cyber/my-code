const config = window.MYCODE_FIREBASE_CONFIG;
if (!config?.projectId) throw new Error('Firebase 설정이 없습니다.');

const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const results = document.getElementById('results');
const uploadEndpoint = `https://us-central1-${config.projectId}.cloudfunctions.net/uploadImage`;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      <div class="stage"><b class="on">준비</b><b>업로드</b><b>주소 생성</b></div>
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

function uploadViaFunction(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const query = `?name=${encodeURIComponent(file.name || 'image')}`;
    xhr.open('POST', `${uploadEndpoint}${query}`, true);
    xhr.timeout = 45000;
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = event => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let payload = null;
      try { payload = JSON.parse(xhr.responseText || '{}'); } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300 && payload?.url) {
        resolve(payload);
        return;
      }
      const error = new Error(payload?.message || payload?.error || `HTTP ${xhr.status}`);
      error.status = xhr.status;
      reject(error);
    };

    xhr.onerror = () => reject(Object.assign(new Error('NETWORK_OR_CORS'), { code: 'NETWORK_OR_CORS' }));
    xhr.ontimeout = () => reject(Object.assign(new Error('UPLOAD_TIMEOUT'), { code: 'UPLOAD_TIMEOUT' }));
    xhr.send(file);
  });
}

function readableError(error) {
  if (error?.code === 'NETWORK_OR_CORS') {
    return '업로드 Function에 연결하지 못했어요. Firebase Function 배포 상태를 확인해주세요.';
  }
  if (error?.code === 'UPLOAD_TIMEOUT') {
    return '업로드 응답이 45초 동안 없어 중단했어요.';
  }
  if (error?.status === 404) {
    return 'uploadImage Function이 아직 배포되지 않았어요.';
  }
  if (error?.status === 413) return '10MB 이하 이미지로 올려주세요.';
  if (error?.status === 415) return '이미지 파일만 올릴 수 있어요.';
  if (error?.status >= 500) return `Firebase 서버 업로드 실패: ${error.message}`;
  return error?.message || '업로드하지 못했습니다.';
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
    loading.paint(8, '이미지를 확인하는 중…', 0);
    await wait(80);
    loading.paint(15, 'Firebase에 업로드를 시작하는 중…', 1);

    const payload = await uploadViaFunction(file, progress => {
      const visual = 15 + Math.round(progress * 0.75);
      loading.paint(Math.min(90, visual), '이미지를 업로드하는 중…', 1);
    });

    loading.paint(96, '이미지 주소를 만드는 중…', 2);
    await wait(120);
    loading.paint(100, '완료', 2);

    const resultCard = createResultCard(file, payload.url);
    setTimeout(() => loading.card.replaceWith(resultCard), 160);
  } catch (error) {
    console.error('[my:code function upload]', error);
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
