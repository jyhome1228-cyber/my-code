const STORAGE_KEYS = {
  items: 'code-imaging-items-v1',
  projects: 'code-imaging-projects-v1'
};

const state = {
  items: loadJSON(STORAGE_KEYS.items, []),
  projects: loadJSON(STORAGE_KEYS.projects, []),
  selected: new Set(),
  currentDetailId: null,
  pendingAssignIds: [],
  lastUploaded: []
};

const el = {
  views: [...document.querySelectorAll('[data-view-panel]')],
  navItems: [...document.querySelectorAll('[data-view]')],
  fileInput: document.getElementById('fileInput'),
  dropzone: document.getElementById('dropzone'),
  sidebarUploadBtn: document.getElementById('sidebarUploadBtn'),
  mobileUploadBtn: document.getElementById('mobileUploadBtn'),
  myCodeUploadBtn: document.getElementById('myCodeUploadBtn'),
  emptyUploadBtn: document.getElementById('emptyUploadBtn'),
  goMyCodeBtn: document.getElementById('goMyCodeBtn'),
  uploadResults: document.getElementById('uploadResults'),
  resultList: document.getElementById('resultList'),
  codeTimeline: document.getElementById('codeTimeline'),
  myCodeEmpty: document.getElementById('myCodeEmpty'),
  searchInput: document.getElementById('searchInput'),
  moveSelectedBtn: document.getElementById('moveSelectedBtn'),
  deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
  myCodeCount: document.getElementById('myCodeCount'),
  usageText: document.getElementById('usageText'),
  usageBar: document.getElementById('usageBar'),
  projectGrid: document.getElementById('projectGrid'),
  projectEmpty: document.getElementById('projectEmpty'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  emptyNewProjectBtn: document.getElementById('emptyNewProjectBtn'),
  codeModal: document.getElementById('codeModal'),
  detailPreview: document.getElementById('detailPreview'),
  detailDate: document.getElementById('detailDate'),
  detailName: document.getElementById('detailName'),
  detailMeta: document.getElementById('detailMeta'),
  detailCodes: document.getElementById('detailCodes'),
  detailProjectBtn: document.getElementById('detailProjectBtn'),
  detailDeleteBtn: document.getElementById('detailDeleteBtn'),
  projectModal: document.getElementById('projectModal'),
  projectForm: document.getElementById('projectForm'),
  projectName: document.getElementById('projectName'),
  assignModal: document.getElementById('assignModal'),
  assignList: document.getElementById('assignList'),
  createFromAssignBtn: document.getElementById('createFromAssignBtn'),
  toast: document.getElementById('toast')
};

let toastTimer = null;
let dbPromise = null;

init();

function init() {
  bindEvents();
  renderAll();
  const requested = location.hash.replace('#', '');
  switchView(['upload', 'my-code', 'projects'].includes(requested) ? requested : 'upload', false);
}

function bindEvents() {
  el.navItems.forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  [el.sidebarUploadBtn, el.mobileUploadBtn, el.myCodeUploadBtn, el.emptyUploadBtn].forEach(button => {
    button?.addEventListener('click', () => {
      switchView('upload');
      requestAnimationFrame(() => el.fileInput.click());
    });
  });

  el.goMyCodeBtn.addEventListener('click', () => switchView('my-code'));

  el.dropzone.addEventListener('click', () => el.fileInput.click());
  el.dropzone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      el.fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(type => {
    el.dropzone.addEventListener(type, event => {
      event.preventDefault();
      el.dropzone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach(type => {
    el.dropzone.addEventListener(type, event => {
      event.preventDefault();
      el.dropzone.classList.remove('is-dragging');
    });
  });

  el.dropzone.addEventListener('drop', event => handleFiles([...event.dataTransfer.files]));
  el.fileInput.addEventListener('change', event => {
    handleFiles([...event.target.files]);
    event.target.value = '';
  });

  el.searchInput.addEventListener('input', renderMyCode);
  el.moveSelectedBtn.addEventListener('click', () => openAssignModal([...state.selected]));
  el.deleteSelectedBtn.addEventListener('click', deleteSelected);

  el.newProjectBtn.addEventListener('click', openProjectModal);
  el.emptyNewProjectBtn.addEventListener('click', openProjectModal);
  el.projectForm.addEventListener('submit', event => {
    event.preventDefault();
    createProject(el.projectName.value.trim());
  });

  el.createFromAssignBtn.addEventListener('click', () => {
    el.assignModal.close();
    openProjectModal();
  });

  el.detailProjectBtn.addEventListener('click', () => {
    if (!state.currentDetailId) return;
    el.codeModal.close();
    openAssignModal([state.currentDetailId]);
  });

  el.detailDeleteBtn.addEventListener('click', async () => {
    if (!state.currentDetailId) return;
    const id = state.currentDetailId;
    el.codeModal.close();
    await deleteItems([id]);
  });

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => document.getElementById(button.dataset.closeModal).close());
  });

  [el.codeModal, el.projectModal, el.assignModal].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  });
}

function switchView(view, updateHash = true) {
  el.views.forEach(panel => panel.classList.toggle('is-visible', panel.dataset.viewPanel === view));
  el.navItems.forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
  if (updateHash) history.replaceState(null, '', `#${view}`);
  if (view === 'my-code') renderMyCode();
  if (view === 'projects') renderProjects();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleFiles(files) {
  const images = files.filter(file => file.type.startsWith('image/'));
  if (!images.length) {
    showToast('이미지 파일만 올릴 수 있어요.');
    return;
  }

  el.uploadResults.hidden = false;
  el.resultList.innerHTML = '';
  state.lastUploaded = [];

  for (const file of images) {
    const pending = createPendingCard(file.name);
    el.resultList.appendChild(pending.element);

    try {
      const processed = await processImage(file);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const extension = processed.mime === 'image/webp' ? 'webp' : getExtension(file.name) || 'img';
      const filename = `${stripExtension(file.name)}.${extension}`;

      let remote = null;
      try {
        remote = await uploadToApi(processed.blob, filename, id);
      } catch (_) {
        remote = null;
      }

      await putBlob(id, processed.blob);

      const item = {
        id,
        originalName: file.name,
        name: filename,
        mime: processed.mime,
        originalSize: file.size,
        size: processed.blob.size,
        width: processed.width,
        height: processed.height,
        createdAt: now,
        projectId: null,
        publicUrl: remote?.url || null,
        storageKey: remote?.key || null,
        storageMode: remote?.url ? 'cdn' : 'local'
      };

      state.items.unshift(item);
      state.lastUploaded.push(id);
      saveItems();
      pending.replace(await createResultCard(item));
    } catch (error) {
      console.error(error);
      pending.fail();
    }
  }

  renderCounts();
  renderUsage();
  showToast(`${images.length}개 이미지 처리가 끝났어요.`);
}

async function processImage(file) {
  const type = file.type.toLowerCase();
  const passthrough = type === 'image/gif' || type === 'image/svg+xml';
  if (passthrough) {
    const dimensions = await readDimensions(file).catch(() => ({ width: null, height: null }));
    return { blob: file, mime: file.type, ...dimensions };
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const webpBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('이미지 변환에 실패했습니다.')), 'image/webp', 0.86);
  });

  return {
    blob: webpBlob,
    mime: 'image/webp',
    width: canvas.width,
    height: canvas.height
  };
}

function readDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('dimension error'));
    };
    img.src = url;
  });
}

async function uploadToApi(blob, filename, id) {
  const response = await fetch('./api/upload', {
    method: 'POST',
    headers: {
      'content-type': blob.type || 'application/octet-stream',
      'x-file-name': encodeURIComponent(filename),
      'x-image-id': id
    },
    body: blob
  });
  if (!response.ok) throw new Error('CDN backend is not connected');
  return response.json();
}

function createPendingCard(name) {
  const element = document.createElement('div');
  element.className = 'result-card';
  element.innerHTML = `
    <div class="result-thumb" style="display:grid;place-items:center;color:#9ba0a9;font-size:18px">↻</div>
    <div class="result-info"><strong>${escapeHTML(name)}</strong><small>변환하고 있어요...</small></div>
    <div class="result-actions"><button class="copy-chip" disabled>처리 중</button></div>
  `;
  return {
    element,
    replace(newElement) { element.replaceWith(newElement); },
    fail() {
      element.querySelector('small').textContent = '변환에 실패했습니다.';
      element.querySelector('.copy-chip').textContent = '다시 시도';
    }
  };
}

async function createResultCard(item) {
  const previewUrl = await getPreviewUrl(item.id);
  const element = document.createElement('div');
  element.className = 'result-card';
  const saved = savingsPercent(item);
  element.innerHTML = `
    <img class="result-thumb" src="${previewUrl}" alt="" />
    <div class="result-info">
      <strong>${escapeHTML(item.name)}</strong>
      <small>${formatBytes(item.size)}${saved > 0 ? ` · ${saved}% 절약` : ''}${item.storageMode === 'local' ? ' · 로컬 보관' : ' · CDN 저장'}</small>
    </div>
    <div class="result-actions">
      <button class="copy-chip" data-copy="url">URL</button>
      <button class="copy-chip" data-copy="html">HTML</button>
      <button class="copy-chip" data-copy="css">CSS</button>
    </div>
  `;
  element.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      copyCode(item.id, button.dataset.copy);
    });
  });
  element.addEventListener('click', () => openDetail(item.id));
  return element;
}

function renderAll() {
  renderCounts();
  renderUsage();
  renderMyCode();
  renderProjects();
}

function renderCounts() {
  el.myCodeCount.textContent = state.items.length;
}

function renderUsage() {
  const bytes = state.items.reduce((sum, item) => sum + (item.size || 0), 0);
  el.usageText.textContent = formatBytes(bytes);
  const demoLimit = 100 * 1024 * 1024;
  el.usageBar.style.width = `${Math.min(100, (bytes / demoLimit) * 100)}%`;
}

async function renderMyCode() {
  const query = el.searchInput.value.trim().toLowerCase();
  const projectMap = new Map(state.projects.map(project => [project.id, project.name]));
  const filtered = state.items.filter(item => {
    const projectName = item.projectId ? projectMap.get(item.projectId) || '' : '';
    return !query || item.name.toLowerCase().includes(query) || projectName.toLowerCase().includes(query);
  });

  el.myCodeEmpty.hidden = state.items.length !== 0;
  el.codeTimeline.hidden = filtered.length === 0;
  el.codeTimeline.innerHTML = '';

  const grouped = groupByDate(filtered);
  for (const [label, items] of grouped) {
    const section = document.createElement('section');
    section.className = 'date-group';
    section.innerHTML = `<div class="date-heading">${label}</div><div class="code-list"></div>`;
    const list = section.querySelector('.code-list');
    for (const item of items) list.appendChild(await createCodeRow(item, projectMap));
    el.codeTimeline.appendChild(section);
  }

  updateSelectionActions();
}

async function createCodeRow(item, projectMap) {
  const previewUrl = await getPreviewUrl(item.id);
  const row = document.createElement('article');
  row.className = 'code-row';
  row.dataset.id = item.id;
  const projectName = item.projectId ? projectMap.get(item.projectId) : null;
  row.innerHTML = `
    <input class="code-check" type="checkbox" aria-label="${escapeHTML(item.name)} 선택" ${state.selected.has(item.id) ? 'checked' : ''} />
    <img class="code-thumb" src="${previewUrl}" alt="" />
    <div class="code-main"><span class="code-name">${escapeHTML(item.name)}</span><span class="code-sub">${formatBytes(item.size)} · ${formatTime(item.createdAt)}${item.storageMode === 'local' ? ' · LOCAL' : ''}</span></div>
    <div class="project-cell"><span class="project-pill ${projectName ? '' : 'is-empty'}">${projectName ? escapeHTML(projectName) : '미분류'}</span></div>
    <div class="row-copy-actions">
      <button class="copy-chip" data-copy="url">URL</button>
      <button class="copy-chip" data-copy="html">HTML</button>
      <button class="copy-chip" data-copy="css">CSS</button>
    </div>
  `;

  const checkbox = row.querySelector('.code-check');
  checkbox.addEventListener('click', event => event.stopPropagation());
  checkbox.addEventListener('change', () => {
    checkbox.checked ? state.selected.add(item.id) : state.selected.delete(item.id);
    updateSelectionActions();
  });

  row.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      copyCode(item.id, button.dataset.copy);
    });
  });

  row.addEventListener('click', () => openDetail(item.id));
  return row;
}

function updateSelectionActions() {
  const count = state.selected.size;
  el.moveSelectedBtn.hidden = count === 0;
  el.deleteSelectedBtn.hidden = count === 0;
  if (count) el.moveSelectedBtn.textContent = `${count}개 프로젝트로 이동`;
}

function renderProjects() {
  el.projectGrid.innerHTML = '';
  el.projectEmpty.hidden = state.projects.length !== 0;
  el.projectGrid.hidden = state.projects.length === 0;

  state.projects.forEach(project => {
    const items = state.items.filter(item => item.projectId === project.id);
    const latest = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="project-card-top"><span class="project-folder">□</span><span class="project-count">${items.length} CODES</span></div>
      <h3>${escapeHTML(project.name)}</h3>
      <p>${latest ? `최근 업데이트 ${formatShortDate(latest.createdAt)}` : '아직 코드가 없습니다.'}</p>
    `;
    card.addEventListener('click', () => {
      switchView('my-code');
      el.searchInput.value = project.name;
      renderMyCode();
    });
    el.projectGrid.appendChild(card);
  });
}

async function openDetail(id) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;
  state.currentDetailId = id;
  const project = state.projects.find(entry => entry.id === item.projectId);
  const previewUrl = await getPreviewUrl(id);
  el.detailPreview.src = previewUrl;
  el.detailDate.textContent = formatLongDate(item.createdAt).toUpperCase();
  el.detailName.textContent = item.name;
  el.detailMeta.innerHTML = [
    item.width && item.height ? `${item.width} × ${item.height}` : null,
    formatBytes(item.size),
    savingsPercent(item) > 0 ? `${savingsPercent(item)}% 절약` : null,
    project ? project.name : '미분류',
    item.storageMode === 'local' ? '로컬 보관' : 'CDN 저장'
  ].filter(Boolean).map(value => `<span>${escapeHTML(String(value))}</span>`).join('');

  const codes = await buildCodes(item);
  el.detailCodes.innerHTML = ['url', 'html', 'css'].map(type => `
    <div class="code-block">
      <div class="code-block-head"><span>${type.toUpperCase()}</span><button class="code-copy-button" type="button" data-detail-copy="${type}">COPY</button></div>
      <p class="code-value">${escapeHTML(shortCodePreview(codes[type]))}</p>
    </div>
  `).join('');
  el.detailCodes.querySelectorAll('[data-detail-copy]').forEach(button => {
    button.addEventListener('click', () => copyCode(id, button.dataset.detailCopy));
  });
  el.codeModal.showModal();
}

async function buildCodes(item) {
  let source = item.publicUrl;
  if (!source) {
    const blob = await getBlob(item.id);
    if (!blob) throw new Error('이미지 데이터를 찾을 수 없습니다.');
    source = await blobToDataURL(blob);
  }
  return {
    url: source,
    html: `<img src="${source}" alt="">`,
    css: `background-image: url("${source}");`
  };
}

async function copyCode(id, type) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;
  try {
    const codes = await buildCodes(item);
    await navigator.clipboard.writeText(codes[type]);
    showToast(`${type.toUpperCase()} 코드가 복사됐어요.`);
  } catch (error) {
    console.error(error);
    showToast('코드를 복사하지 못했습니다.');
  }
}

function openProjectModal() {
  el.projectName.value = '';
  el.projectModal.showModal();
  setTimeout(() => el.projectName.focus(), 60);
}

function createProject(name) {
  if (!name) return;
  const project = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
  state.projects.unshift(project);
  saveProjects();
  el.projectModal.close();
  renderProjects();

  if (state.pendingAssignIds.length) {
    assignItemsToProject(state.pendingAssignIds, project.id);
    state.pendingAssignIds = [];
  }
  showToast(`${name} 프로젝트를 만들었어요.`);
}

function openAssignModal(ids) {
  const validIds = ids.filter(id => state.items.some(item => item.id === id));
  if (!validIds.length) return;
  state.pendingAssignIds = validIds;
  el.assignList.innerHTML = '';

  if (!state.projects.length) {
    el.assignList.innerHTML = '<div style="padding:14px 2px 18px;color:#8d929b;font-size:12px;line-height:1.6">아직 프로젝트가 없어요.<br>새 프로젝트를 만들면 선택한 코드가 바로 들어갑니다.</div>';
  } else {
    state.projects.forEach(project => {
      const count = state.items.filter(item => item.projectId === project.id).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'assign-option';
      button.innerHTML = `<strong>${escapeHTML(project.name)}</strong><span>${count} codes</span>`;
      button.addEventListener('click', () => {
        assignItemsToProject(validIds, project.id);
        state.pendingAssignIds = [];
        el.assignModal.close();
      });
      el.assignList.appendChild(button);
    });
  }
  el.assignModal.showModal();
}

function assignItemsToProject(ids, projectId) {
  state.items = state.items.map(item => ids.includes(item.id) ? { ...item, projectId } : item);
  state.selected.clear();
  saveItems();
  renderMyCode();
  renderProjects();
  showToast(`${ids.length}개 코드를 프로젝트에 넣었어요.`);
}

async function deleteSelected() {
  const ids = [...state.selected];
  if (!ids.length) return;
  await deleteItems(ids);
}

async function deleteItems(ids) {
  for (const id of ids) await deleteBlob(id).catch(() => {});
  state.items = state.items.filter(item => !ids.includes(item.id));
  ids.forEach(id => state.selected.delete(id));
  saveItems();
  renderAll();
  showToast(`${ids.length}개 코드를 삭제했어요.`);
}

function groupByDate(items) {
  const groups = new Map();
  items.forEach(item => {
    const label = formatDateLabel(item.createdAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  });
  return groups;
}

function formatDateLabel(iso) {
  const date = new Date(iso);
  const now = new Date();
  const today = startOfDay(now);
  const target = startOfDay(date);
  const diff = Math.round((today - target) / 86400000);
  if (diff === 0) return `오늘 · ${formatShortDate(iso)}`;
  if (diff === 1) return `어제 · ${formatShortDate(iso)}`;
  return formatLongDate(iso);
}

function formatLongDate(iso) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

function formatShortDate(iso) {
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

function formatTime(iso) {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function savingsPercent(item) {
  if (!item.originalSize || item.size >= item.originalSize) return 0;
  return Math.round((1 - item.size / item.originalSize) * 100);
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function stripExtension(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9가-힣_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'image';
}

function getExtension(name) {
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function shortCodePreview(value) {
  if (value.length <= 150) return value;
  return `${value.slice(0, 110)}…${value.slice(-24)}`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(state.projects));
}

function showToast(message) {
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 1800);
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('code-imaging-db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function putBlob(id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').put({ id, blob });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly');
    const request = tx.objectStore('images').get(id);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getPreviewUrl(id) {
  const blob = await getBlob(id);
  return blob ? URL.createObjectURL(blob) : makeFallbackPreview();
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function makeFallbackPreview() {
  return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f0f2f5"/><text x="100" y="106" text-anchor="middle" fill="#9ba0a9" font-family="Arial" font-size="22">CI</text></svg>')}`;
}
