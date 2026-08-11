// my:code v9 — upload -> image address -> copy
const hostV9Styles = document.createElement('link');
hostV9Styles.rel = 'stylesheet';
hostV9Styles.href = './host-v9.css?v=12';
document.head.appendChild(hostV9Styles);

(() => {
  const shortCodeById = new Map();

  // Users do not need to press a login button. Firebase anonymous auth runs invisibly
  // before the upload so Storage security can remain user-scoped.
  uploadToApi = async function(blob, filename, id) {
    const firebase = await firebaseReadyPromise;
    if (!firebase?.storageEnabled) throw new Error('FIREBASE_STORAGE_NOT_READY');

    try {
      await firebase.ensureGuestSession?.();
      const result = await firebase.uploadImage({ blob, filename, id });
      if (result?.shortCode) shortCodeById.set(id, result.shortCode);
      return result;
    } catch (error) {
      console.error('Guest image upload failed', error);
      if (error?.code === 'auth/operation-not-allowed') {
        showToast('Firebase에서 익명 로그인을 활성화해주세요.');
      } else if (String(error?.code || '').startsWith('storage/')) {
        showToast('Firebase Storage 설정을 확인해주세요.');
      }
      throw error;
    }
  };

  function shortBase() {
    return String(window.MYCODE_SHORT_BASE || '').replace(/\/$/, '');
  }

  function getShortCode(item) {
    return item?.shortCode || shortCodeById.get(item?.id) || null;
  }

  function getImageAddress(item) {
    const code = getShortCode(item);
    const base = shortBase();
    if (base && code) return `${base}/i/${code}`;
    return item?.publicUrl || null;
  }

  function compactAddress(value) {
    if (!value) return '이미지 주소를 생성하지 못했습니다.';
    if (value.length <= 82) return value;
    try {
      const url = new URL(value);
      const tail = decodeURIComponent(url.pathname).split('/').filter(Boolean).pop() || 'image';
      return `${url.host}/…/${tail}`;
    } catch (_) {
      return `${value.slice(0, 48)}…${value.slice(-22)}`;
    }
  }

  async function hostCopy(value, message) {
    if (!value) {
      showToast('이미지 주소 생성 설정을 확인해주세요.');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showToast(message);
    } catch (error) {
      console.error(error);
      showToast('복사하지 못했습니다.');
    }
  }

  createResultCard = async function(item) {
    const previewUrl = await getPreviewUrl(item.id);
    const rememberedShortCode = getShortCode(item);
    if (rememberedShortCode && !item.shortCode) {
      item.shortCode = rememberedShortCode;
      saveItems();
    }

    const address = getImageAddress(item);
    const html = address ? `<img src="${address}" alt="">` : null;
    const element = document.createElement('article');
    element.className = 'host-result-card';
    element.innerHTML = `
      <div class="host-result-preview"><img src="${previewUrl}" alt=""></div>
      <div class="host-result-main">
        <div class="host-result-meta">
          <strong>${escapeHTML(item.name)}</strong>
          <span>${formatBytes(item.size)}${savingsPercent(item) > 0 ? ` · ${savingsPercent(item)}% 최적화` : ''}</span>
        </div>
        <div class="host-field">
          <span class="host-field-label">이미지 주소</span>
          <span class="host-field-value" title="${escapeHTML(address || '')}">${escapeHTML(compactAddress(address))}</span>
          <button class="host-copy" type="button" data-host-address ${address ? '' : 'disabled'}>복사</button>
        </div>
        <div class="host-field">
          <span class="host-field-label">IMG 태그</span>
          <span class="host-field-value">${escapeHTML(html || '<img src="이미지주소" alt="">')}</span>
          <button class="host-copy secondary" type="button" data-host-html ${html ? '' : 'disabled'}>&lt;img&gt; 복사</button>
        </div>
      </div>
    `;
    element.querySelector('[data-host-address]')?.addEventListener('click', event => {
      event.stopPropagation();
      hostCopy(address, '이미지 주소가 복사됐어요.');
    });
    element.querySelector('[data-host-html]')?.addEventListener('click', event => {
      event.stopPropagation();
      hostCopy(html, '<img> 한 줄이 복사됐어요.');
    });
    element.addEventListener('click', () => openDetail(item.id));
    return element;
  };

  buildCodes = async function(item) {
    const address = getImageAddress(item);
    if (!address) return { url: '', html: '', css: '' };
    return {
      url: address,
      html: `<img src="${address}" alt="">`,
      css: `background-image: url("${address}");`
    };
  };

  copyCode = async function(id, type) {
    const item = state.items.find(entry => entry.id === id);
    if (!item) return;
    const codes = await buildCodes(item);
    if (!codes[type]) {
      showToast('이미지 주소 생성 설정을 확인해주세요.');
      return;
    }
    const label = type === 'url' ? '이미지 주소' : type === 'html' ? '<img> 한 줄' : '코드';
    hostCopy(codes[type], `${label}이 복사됐어요.`);
  };

  createCodeRow = async function(item, projectMap) {
    const previewUrl = await getPreviewUrl(item.id);
    const address = getImageAddress(item);
    const html = address ? `<img src="${address}" alt="">` : null;
    const projectName = item.projectId ? projectMap.get(item.projectId) : null;
    const row = document.createElement('article');
    row.className = 'code-row host-code-row';
    row.dataset.id = item.id;
    row.innerHTML = `
      <input class="code-check" type="checkbox" aria-label="${escapeHTML(item.name)} 선택" ${state.selected.has(item.id) ? 'checked' : ''}>
      <img class="code-thumb" src="${previewUrl}" alt="">
      <div class="code-main">
        <span class="code-name">${escapeHTML(item.name)}</span>
        <span class="code-sub">${formatBytes(item.size)} · ${formatTime(item.createdAt)}${projectName ? ` · ${escapeHTML(projectName)}` : ''}</span>
      </div>
      <div class="host-code-actions">
        <button class="primary" type="button" data-host-row-address ${address ? '' : 'disabled'}>주소 복사</button>
        <button type="button" data-host-row-html ${html ? '' : 'disabled'}>&lt;img&gt; 복사</button>
      </div>
    `;

    const checkbox = row.querySelector('.code-check');
    checkbox.addEventListener('click', event => event.stopPropagation());
    checkbox.addEventListener('change', () => {
      checkbox.checked ? state.selected.add(item.id) : state.selected.delete(item.id);
      updateSelectionActions();
    });
    row.querySelector('[data-host-row-address]')?.addEventListener('click', event => {
      event.stopPropagation();
      hostCopy(address, '이미지 주소가 복사됐어요.');
    });
    row.querySelector('[data-host-row-html]')?.addEventListener('click', event => {
      event.stopPropagation();
      hostCopy(html, '<img> 한 줄이 복사됐어요.');
    });
    row.addEventListener('click', () => openDetail(item.id));
    return row;
  };

  openDetail = async function(id) {
    const item = state.items.find(entry => entry.id === id);
    if (!item) return;
    state.currentDetailId = id;
    const project = state.projects.find(entry => entry.id === item.projectId);
    const previewUrl = await getPreviewUrl(id);
    const address = getImageAddress(item);
    const html = address ? `<img src="${address}" alt="">` : '';

    el.detailPreview.src = previewUrl;
    el.detailDate.textContent = 'IMAGE ADDRESS';
    el.detailName.textContent = item.name;
    el.detailMeta.innerHTML = [
      item.width && item.height ? `${item.width} × ${item.height}` : null,
      formatBytes(item.size),
      project ? project.name : '미분류'
    ].filter(Boolean).map(value => `<span>${escapeHTML(String(value))}</span>`).join('');

    el.detailCodes.innerHTML = `
      <div class="host-detail-block">
        <div class="host-detail-head"><span>이미지 주소</span><button type="button" data-detail-host-address ${address ? '' : 'disabled'}>복사</button></div>
        <p class="host-detail-value">${escapeHTML(address || '이미지 주소를 생성하지 못했습니다.')}</p>
      </div>
      <div class="host-detail-block">
        <div class="host-detail-head"><span>IMG 태그</span><button type="button" data-detail-host-html ${html ? '' : 'disabled'}>&lt;img&gt; 복사</button></div>
        <p class="host-detail-value">${escapeHTML(html || '<img src="이미지주소" alt="">')}</p>
      </div>
    `;
    el.detailCodes.querySelector('[data-detail-host-address]')?.addEventListener('click', () => hostCopy(address, '이미지 주소가 복사됐어요.'));
    el.detailCodes.querySelector('[data-detail-host-html]')?.addEventListener('click', () => hostCopy(html, '<img> 한 줄이 복사됐어요.'));
    el.codeModal.showModal();
  };

  requestAnimationFrame(() => {
    const title = document.querySelector('.host-results .result-heading h2');
    if (title) title.textContent = '이미지 주소가 준비됐어요.';
    const callout = document.querySelector('.host-results .saved-callout');
    if (callout) callout.hidden = true;
  });
})();
