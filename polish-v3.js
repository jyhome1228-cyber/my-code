// my:code polish v3
// 로그인 사용자는 Firebase Storage에 저장하고, 비로그인 사용자는 브라우저 저장으로 동작합니다.

function mycodeBlobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const featureCardsV3 = document.querySelectorAll('.value-grid article');
if (featureCardsV3[1]) {
  const title = featureCardsV3[1].querySelector('h3');
  const copy = featureCardsV3[1].querySelector('p');
  if (title) title.textContent = '바로 코드 복사';
  if (copy) copy.textContent = '로그인하면 Firebase에 이미지를 저장하고 URL·HTML·CSS 코드를 바로 복사할 수 있습니다.';
}

const heroDescriptionV3 = document.querySelector('.brand-hero-copy > p');
if (heroDescriptionV3) {
  heroDescriptionV3.innerHTML = '이미지를 올리면 웹에서 쓰기 좋게 가볍게 변환하고,<br>로그인 시 Firebase에 저장해 URL·HTML·CSS 코드로 바로 사용할 수 있습니다.';
}

function setStorageCopy(user) {
  const authCopy = document.querySelector('#authModal .auth-description');
  const authFoot = document.querySelector('#authModal .auth-footnote');
  const usageLabel = document.querySelector('.drawer-usage > div:first-child > span');
  const accountSubEl = document.getElementById('accountSub');

  if (user) {
    if (authCopy) authCopy.textContent = `${user.email || 'Google'} 계정으로 로그인되어 있어요. 새 이미지는 Firebase Storage에 저장됩니다.`;
    if (authFoot) authFoot.textContent = '로그인한 계정의 이미지와 코드가 Firebase에 보관됩니다.';
    if (usageLabel) usageLabel.textContent = 'FIREBASE STORAGE';
    if (accountSubEl) accountSubEl.textContent = 'FREE · Firebase 연결됨';
  } else {
    if (authCopy) authCopy.textContent = 'Google 로그인하면 이미지를 Firebase에 저장하고 다른 기기에서도 이어서 사용할 수 있어요.';
    if (authFoot) authFoot.textContent = '로그인 전 업로드는 현재 브라우저에만 저장됩니다.';
    if (usageLabel) usageLabel.textContent = 'LOCAL STORAGE';
  }
}

async function syncFirebaseLibrary(firebase) {
  if (!firebase?.getCurrentUser?.()) return;
  try {
    const [remoteItems, remoteProjects] = await Promise.all([
      firebase.listImages?.() || [],
      firebase.listProjects?.() || []
    ]);

    if (Array.isArray(remoteItems) && remoteItems.length) {
      const itemMap = new Map(state.items.map(item => [item.id, item]));
      remoteItems.forEach(item => itemMap.set(item.id, { ...(itemMap.get(item.id) || {}), ...item }));
      state.items = [...itemMap.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      saveItems();
    }

    if (Array.isArray(remoteProjects) && remoteProjects.length) {
      const projectMap = new Map(state.projects.map(project => [project.id, project]));
      remoteProjects.forEach(project => projectMap.set(project.id, { ...(projectMap.get(project.id) || {}), ...project }));
      state.projects = [...projectMap.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      saveProjects();
    }

    renderAll();
  } catch (error) {
    console.error('Firebase library sync failed', error);
  }
}

window.addEventListener('mycode:auth', event => {
  const user = event.detail?.user || null;
  setStorageCopy(user);
  if (user) firebaseReadyPromise.then(syncFirebaseLibrary);
});

firebaseReadyPromise.then(firebase => {
  const user = firebase?.getCurrentUser?.() || null;
  setStorageCopy(user);
  if (user) syncFirebaseLibrary(firebase);
});

// 로그인 상태면 Firebase Storage에 저장하고, 아니면 app.js의 로컬 fallback을 사용합니다.
uploadToApi = async function(blob, filename, id) {
  const firebase = await firebaseReadyPromise;
  const user = firebase?.getCurrentUser?.();
  if (!firebase?.storageEnabled || !user) {
    const error = new Error('LOCAL_FALLBACK');
    error.code = 'LOCAL_FALLBACK';
    throw error;
  }

  try {
    return await firebase.uploadImage({ blob, filename, id });
  } catch (error) {
    console.error('Firebase upload failed', error);
    if (error?.code === 'storage/unauthorized') {
      showToast('Firebase Storage 규칙을 확인해주세요.');
    } else if (error?.code === 'storage/quota-exceeded') {
      showToast('Firebase Storage 사용량을 확인해주세요.');
    } else if (String(error?.code || '').startsWith('storage/')) {
      showToast('Firebase Storage 설정을 확인해주세요.');
    }
    throw error;
  }
};

// 원격에서 불러온 이미지는 IndexedDB blob이 없어도 Firebase URL로 미리보기합니다.
getPreviewUrl = async function(id) {
  const blob = await getBlob(id).catch(() => null);
  if (blob) return URL.createObjectURL(blob);
  const item = state.items.find(entry => entry.id === id);
  return item?.publicUrl || makeFallbackPreview();
};

buildCodes = async function(item) {
  if (item.publicUrl) {
    const source = item.publicUrl;
    return {
      url: source,
      html: `<img src="${source}" alt="">`,
      css: `background-image: url("${source}");`
    };
  }

  const blob = await getBlob(item.id);
  if (!blob) throw new Error('이미지 데이터를 찾을 수 없습니다.');
  const source = await mycodeBlobToDataURL(blob);
  return {
    url: source,
    html: `<img src="${source}" alt="">`,
    css: `background-image: url("${source}");`
  };
};

copyCode = async function(id, type) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;
  try {
    const codes = await buildCodes(item);
    await navigator.clipboard.writeText(codes[type]);
    showToast(item.publicUrl
      ? `${type.toUpperCase()} Firebase 코드가 복사됐어요.`
      : `${type.toUpperCase()} 이미지 포함형 코드가 복사됐어요.`);
  } catch (error) {
    console.error(error);
    showToast('코드를 복사하지 못했습니다.');
  }
};

createResultCard = async function(item) {
  const previewUrl = await getPreviewUrl(item.id);
  const element = document.createElement('div');
  element.className = `result-card result-card-ready${item.publicUrl ? '' : ' is-local-only'}`;
  const saved = savingsPercent(item);
  const firebaseSaved = Boolean(item.publicUrl);

  element.innerHTML = `
    <div class="result-preview-wrap">
      <img class="result-thumb" src="${previewUrl}" alt="" />
      <span class="ready-check">✓</span>
    </div>
    <div class="result-info">
      <div class="saved-label">${firebaseSaved ? 'Firebase 저장됨' : '브라우저 저장됨'}</div>
      <strong>${escapeHTML(item.name)}</strong>
      <small>${formatBytes(item.size)}${saved > 0 ? ` · ${saved}% 가볍게 변환` : ''}${firebaseSaved ? ' · 외부 URL 사용 가능' : ' · 이미지 포함형 코드'}</small>
    </div>
    <div class="result-actions result-actions-main">
      <button class="export-button" type="button" data-copy-html>HTML 복사</button>
      <button class="quick-copy-button" type="button" data-secondary>${firebaseSaved ? 'URL 복사' : '상세 보기'}</button>
    </div>
  `;

  element.querySelector('[data-copy-html]')?.addEventListener('click', event => {
    event.stopPropagation();
    copyCode(item.id, 'html');
  });
  element.querySelector('[data-secondary]')?.addEventListener('click', event => {
    event.stopPropagation();
    firebaseSaved ? copyCode(item.id, 'url') : openDetail(item.id);
  });
  element.addEventListener('click', () => openDetail(item.id));
  return element;
};

const originalOpenDetailV3 = openDetail;
openDetail = async function(id) {
  await originalOpenDetailV3(id);
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;

  if (item.publicUrl) {
    [...document.querySelectorAll('#detailMeta span')].forEach(span => {
      if (span.textContent === 'CDN 저장') span.textContent = 'Firebase Storage';
    });
    document.querySelectorAll('#detailCodes .code-copy-button').forEach(button => button.textContent = '복사');
    return;
  }

  const blocks = [...document.querySelectorAll('#detailCodes .code-block')];
  blocks.forEach(block => {
    const label = block.querySelector('.code-block-head span')?.textContent || '';
    const value = block.querySelector('.code-value');
    const copyButton = block.querySelector('.code-copy-button');
    if (value) {
      value.textContent = label === 'URL'
        ? '이미지 데이터가 포함된 URL · 복사해서 바로 사용할 수 있습니다.'
        : `${label} 이미지 포함형 코드 · 화면에는 길이를 줄여 표시합니다.`;
    }
    if (copyButton) copyButton.textContent = '복사';
  });
};

// 프로젝트도 로그인 상태에서는 Firestore에 함께 저장합니다.
const originalCreateProjectV3 = createProject;
createProject = function(name) {
  originalCreateProjectV3(name);
  const project = state.projects[0];
  firebaseReadyPromise.then(firebase => {
    if (firebase?.getCurrentUser?.() && project) firebase.saveProject?.(project).catch(console.error);
  });
};

const originalAssignItemsV3 = assignItemsToProject;
assignItemsToProject = function(ids, projectId) {
  originalAssignItemsV3(ids, projectId);
  firebaseReadyPromise.then(firebase => {
    if (!firebase?.getCurrentUser?.()) return;
    ids.forEach(id => firebase.updateImageProject?.(id, projectId).catch(console.error));
  });
};

const originalDeleteItemsV3 = deleteItems;
deleteItems = async function(ids) {
  const targets = state.items.filter(item => ids.includes(item.id));
  const firebase = await firebaseReadyPromise;
  if (firebase?.getCurrentUser?.()) {
    await Promise.allSettled(targets
      .filter(item => item.storageMode === 'firebase' || item.storageKey?.startsWith('users/'))
      .map(item => firebase.deleteImage?.(item.id, item.storageKey)));
  }
  return originalDeleteItemsV3(ids);
};
