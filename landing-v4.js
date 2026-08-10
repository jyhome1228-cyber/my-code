// my:code v8 — simple image hosting UX
const headlineScaleStyles = document.createElement('link');
headlineScaleStyles.rel = 'stylesheet';
headlineScaleStyles.href = './headline-v6.css';
document.head.appendChild(headlineScaleStyles);

(() => {
  const shortCodeById = new Map();

  const originalUploadToApiV8 = uploadToApi;
  uploadToApi = async function(blob, filename, id) {
    const result = await originalUploadToApiV8(blob, filename, id);
    if (result?.shortCode) shortCodeById.set(id, result.shortCode);
    return result;
  };

  function shortBase() {
    const base = window.MYCODE_SHORT_BASE || window.MyCodeFirebase?.shortBase || '';
    return String(base).replace(/\/$/, '');
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

  function compactAddress(address) {
    if (!address) return '로그인 후 업로드하면 이미지 주소가 생성됩니다.';
    if (address.length <= 74) return address;
    try {
      const url = new URL(address);
      const tail = decodeURIComponent(url.pathname).split('/').filter(Boolean).pop() || 'image';
      return `${url.host}/…/${tail}`;
    } catch (_) {
      return `${address.slice(0, 42)}…${address.slice(-20)}`;
    }
  }

  async function writeClipboard(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
    } catch (error) {
      console.error(error);
      showToast('복사하지 못했습니다.');
    }
  }

  const eyebrow = document.querySelector('.v4-eyebrow');
  const heroTitle = document.querySelector('.v4-hero-copy h1');
  const heroCopy = document.querySelector('.v4-hero-copy p');
  const trust = document.querySelector('.v4-trust-row');
  const dropTitle = document.querySelector('.v4-dropzone strong');
  const dropCopy = document.querySelector('.v4-dropzone p');
  const toolFooter = document.querySelector('.v4-tool-footer');

  if (eyebrow) eyebrow.innerHTML = '<span class="v4-dot"></span> SIMPLE IMAGE HOSTING';
  if (heroTitle) heroTitle.innerHTML = '이미지를 올리면,<br><em>주소가 바로.</em>';
  if (heroCopy) heroCopy.innerHTML = '이미지를 업로드하면 웹에서 바로 사용할 수 있는 이미지 주소를 만들고,<br>필요하면 &lt;img src="..."&gt; 한 줄도 바로 복사할 수 있어요.';
  if (trust) trust.innerHTML = '<span>로그인 시 Firebase 저장</span><i></i><span>MY CODE 자동 보관</span><i></i><span>WebP 자동 최적화</span>';
  if (dropTitle) dropTitle.textContent = '이미지를 여기에 올려주세요';
  if (dropCopy) dropCopy.textContent = '드래그하거나 클릭해서 파일 선택';
  if (toolFooter) toolFooter.innerHTML = '<span>이미지 주소 생성</span><span>한 줄 HTML 복사</span><span>MY CODE 자동 저장</span>';

  const resultHeading = document.querySelector('.result-heading h2');
  if (resultHeading) resultHeading.textContent = '이미지 주소가 준비됐어요.';
  const resultEyebrow = document.querySelector('.result-heading .eyebrow');
  if (resultEyebrow) resultEyebrow.textContent = 'READY TO COPY';

  const pricing = document.getElementById('pricingSection');
  if (pricing && !document.querySelector('.host-simple-info')) {
    const section = document.createElement('section');
    section.className = 'host-simple-info';
    section.innerHTML = `
      <div class="host-info-head">
        <span>HOW IT WORKS</span>
        <h2>올리고, 주소 복사. 그게 전부예요.</h2>
        <p>복잡한 코드 생성 도구가 아니라 이미지 호스팅을 더 편하게 쓰기 위한 서비스입니다. 업로드한 이미지는 MY CODE에 자동으로 남아 나중에도 다시 주소를 복사할 수 있어요.</p>
      </div>
      <div class="host-steps">
        <article class="host-step"><b>01 · UPLOAD</b><h3>이미지를 올리세요</h3><p>JPG, PNG, WEBP 등 이미지를 드래그하거나 클릭해 업로드합니다. 필요한 이미지는 WebP로 자동 최적화합니다.</p></article>
        <article class="host-step"><b>02 · ADDRESS</b><h3>주소가 생성됩니다</h3><p>로그인 상태에서는 Firebase Storage에 저장하고 외부 웹페이지에서 사용할 수 있는 이미지 주소를 생성합니다.</p></article>
        <article class="host-step"><b>03 · COPY</b><h3>복사해서 붙여넣으세요</h3><p>이미지 주소를 그대로 복사하거나 &lt;img src="이미지주소" alt=""&gt; 한 줄을 복사해 바로 사용합니다.</p></article>
      </div>
      <div class="host-mycode-callout">
        <div><h3>한 번 올린 이미지는 MY CODE에.</h3><p>파일명으로 다시 찾고, 이미지 주소나 HTML 한 줄을 언제든 다시 복사하세요.</p></div>
        <button type="button" data-host-mycode>MY CODE 보기 →</button>
      </div>
    `;
    pricing.parentNode.insertBefore(section, pricing);
    section.querySelector('[data-host-mycode]')?.addEventListener('click', () => switchView('my-code'));
  }

  const pricingTitle = document.querySelector('.v4-pricing .v4-section-head h2');
  const pricingCopy = document.querySelector('.v4-pricing .v4-section-head p');
  if (pricingTitle) pricingTitle.innerHTML = '이미지 호스팅,<br>가볍게 시작하세요.';
  if (pricingCopy) pricingCopy.innerHTML = 'FREE로 먼저 사용하고 필요할 때 확장하는 구조입니다.<br>BASIC 990원 · PRO 3,990원은 오픈 예정입니다.';

  const finalTitle = document.querySelector('.v4-final-cta h2');
  const finalCopy = document.querySelector('.v4-final-cta p');
  if (finalTitle) finalTitle.innerHTML = '이미지 올리고,<br>주소만 복사하세요.';
  if (finalCopy) finalCopy.textContent = '나머지는 my:code가 정리해둘게요.';

  buildCodes = async function(item) {
    const address = getImageAddress(item);
    if (address) {
      return {
        url: address,
        html: `<img src="${address}" alt="">`,
        css: `background-image: url("${address}");`
      };
    }

    const blob = await getBlob(item.id);
    if (!blob) throw new Error('이미지 데이터를 찾을 수 없습니다.');
    const dataUrl = await mycodeBlobToDataURL(blob);
    return {
      url: dataUrl,
      html: `<img src="${dataUrl}" alt="">`,
      css: `background-image: url("${dataUrl}");`
    };
  };

  copyCode = async function(id, type) {
    const item = state.items.find(entry => entry.id === id);
    if (!item) return;
    const codes = await buildCodes(item);
    const actualType = type === 'html' ? 'html' : 'url';
    await writeClipboard(codes[actualType], actualType === 'html' ? 'HTML 한 줄을 복사했어요.' : '이미지 주소를 복사했어요.');
  };

  createResultCard = async function(item) {
    if (!item.shortCode && shortCodeById.has(item.id)) {
      item.shortCode = shortCodeById.get(item.id);
      saveItems();
    }

    const previewUrl = await getPreviewUrl(item.id);
    const address = getImageAddress(item);
    const html = address ? `<img src="${address}" alt="">` : null;
    const saved = savingsPercent(item);
    const element = document.createElement('article');
    element.className = 'host-result-card';
    element.innerHTML = `
      <div class="host-result-preview"><img src="${previewUrl}" alt=""></div>
      <div class="host-result-main">
        <div class="host-result-meta"><strong>${escapeHTML(item.name)}</strong><span>${formatBytes(item.size)}${saved > 0 ? ` · ${saved}% 절약` : ''}</span></div>
        <div class="host-field">
          <span class="host-field-label">이미지 주소</span>
          <span class="host-field-value" title="${escapeHTML(address || '')}">${escapeHTML(compactAddress(address))}</span>
          <button class="host-copy" type="button" data-copy-address ${address ? '' : 'disabled'}>주소 복사</button>
        </div>
        <div class="host-field">
          <span class="host-field-label">HTML 한 줄</span>
          <span class="host-field-value">${html ? escapeHTML(`<img src="${compactAddress(address)}" alt="">`) : '로그인 후 주소가 생성되면 사용할 수 있어요.'}</span>
          <button class="host-copy secondary" type="button" data-copy-html ${html ? '' : 'disabled'}>&lt;img&gt; 복사</button>
        </div>
        <div class="host-note">${address ? '외부 웹페이지에서 바로 사용할 수 있는 주소예요. MY CODE에도 자동 저장됩니다.' : '현재 브라우저에는 저장됐어요. 외부 이미지 주소를 만들려면 Google 로그인 후 다시 업로드해주세요.'}</div>
      </div>
    `;

    element.querySelector('[data-copy-address]')?.addEventListener('click', event => {
      event.stopPropagation();
      if (address) writeClipboard(address, '이미지 주소를 복사했어요.');
    });
    element.querySelector('[data-copy-html]')?.addEventListener('click', event => {
      event.stopPropagation();
      if (html) writeClipboard(html, 'HTML 한 줄을 복사했어요.');
    });
    element.addEventListener('click', () => openDetail(item.id));
    return element;
  };

  createCodeRow = async function(item) {
    const previewUrl = await getPreviewUrl(item.id);
    const address = getImageAddress(item);
    const row = document.createElement('article');
    row.className = 'host-code-row';
    row.dataset.id = item.id;
    row.innerHTML = `
      <input class="code-check" type="checkbox" aria-label="${escapeHTML(item.name)} 선택" ${state.selected.has(item.id) ? 'checked' : ''}>
      <img class="code-thumb" src="${previewUrl}" alt="">
      <div class="host-code-main"><span class="host-code-name">${escapeHTML(item.name)}</span><span class="host-code-url">${escapeHTML(compactAddress(address))}</span></div>
      <div class="host-code-actions"><button type="button" data-address ${address ? '' : 'disabled'}>주소 복사</button><button type="button" data-html ${address ? '' : 'disabled'}>&lt;img&gt; 복사</button></div>
    `;
    const checkbox = row.querySelector('.code-check');
    checkbox.addEventListener('click', event => event.stopPropagation());
    checkbox.addEventListener('change', () => {
      checkbox.checked ? state.selected.add(item.id) : state.selected.delete(item.id);
      updateSelectionActions();
    });
    row.querySelector('[data-address]')?.addEventListener('click', event => { event.stopPropagation(); if (address) writeClipboard(address, '이미지 주소를 복사했어요.'); });
    row.querySelector('[data-html]')?.addEventListener('click', event => { event.stopPropagation(); if (address) writeClipboard(`<img src="${address}" alt="">`, 'HTML 한 줄을 복사했어요.'); });
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
    el.detailDate.textContent = 'MY CODE';
    el.detailName.textContent = item.name;
    el.detailMeta.innerHTML = [
      item.width && item.height ? `${item.width} × ${item.height}` : null,
      formatBytes(item.size),
      project ? project.name : '미분류',
      address ? '이미지 주소 사용 가능' : '브라우저 보관'
    ].filter(Boolean).map(value => `<span>${escapeHTML(String(value))}</span>`).join('');

    el.detailCodes.innerHTML = `
      <div class="host-detail-fields">
        <div class="host-field"><span class="host-field-label">이미지 주소</span><span class="host-field-value" title="${escapeHTML(address || '')}">${escapeHTML(compactAddress(address))}</span><button class="host-copy" type="button" data-detail-address ${address ? '' : 'disabled'}>주소 복사</button></div>
        <div class="host-field"><span class="host-field-label">HTML 한 줄</span><span class="host-field-value">${html ? escapeHTML(`<img src="${compactAddress(address)}" alt="">`) : '로그인 후 이미지 주소를 만들 수 있어요.'}</span><button class="host-copy secondary" type="button" data-detail-html ${address ? '' : 'disabled'}>&lt;img&gt; 복사</button></div>
        <p class="host-detail-help">이미지 주소를 그대로 사용하거나 HTML에서 필요한 경우 한 줄 태그를 복사하면 됩니다.</p>
      </div>
    `;
    el.detailCodes.querySelector('[data-detail-address]')?.addEventListener('click', () => address && writeClipboard(address, '이미지 주소를 복사했어요.'));
    el.detailCodes.querySelector('[data-detail-html]')?.addEventListener('click', () => address && writeClipboard(html, 'HTML 한 줄을 복사했어요.'));
    el.codeModal.showModal();
  };

  document.querySelectorAll('[data-view="upload"]').forEach(button => {
    button.addEventListener('click', () => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })));
  });
})();
