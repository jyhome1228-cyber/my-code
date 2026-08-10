// my:code polish v3
// Storage가 없는 현재 단계에서도 실제로 사용할 수 있는 이미지 포함형(Data URL) 코드를 제공합니다.

function mycodeBlobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 현재 단계의 카피를 실제 동작과 맞춥니다.
const featureCardsV3 = document.querySelectorAll('.value-grid article');
if (featureCardsV3[1]) {
  const title = featureCardsV3[1].querySelector('h3');
  const copy = featureCardsV3[1].querySelector('p');
  if (title) title.textContent = '바로 코드 복사';
  if (copy) copy.textContent = '지금은 이미지가 포함된 HTML·CSS 코드를 바로 복사할 수 있고, 정식 오픈 시 짧은 URL 방식으로 전환됩니다.';
}

const heroDescriptionV3 = document.querySelector('.brand-hero-copy > p');
if (heroDescriptionV3) {
  heroDescriptionV3.innerHTML = '이미지를 올리면 웹에서 쓰기 좋게 가볍게 변환하고,<br>HTML·CSS 코드로 바로 복사하거나 MY CODE에 보관할 수 있습니다.';
}

// Storage가 없으면 이미지 자체를 Data URL로 포함합니다.
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
    if (item.publicUrl) {
      showToast(`${type.toUpperCase()} 코드가 복사됐어요.`);
    } else {
      showToast(`${type.toUpperCase()} 이미지 포함형 코드가 복사됐어요. 짧은 URL은 정식 오픈 시 제공됩니다.`);
    }
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
  const shortReady = Boolean(item.publicUrl);

  element.innerHTML = `
    <div class="result-preview-wrap">
      <img class="result-thumb" src="${previewUrl}" alt="" />
      <span class="ready-check">✓</span>
    </div>
    <div class="result-info">
      <div class="saved-label">MY CODE 저장됨</div>
      <strong>${escapeHTML(item.name)}</strong>
      <small>${formatBytes(item.size)}${saved > 0 ? ` · ${saved}% 가볍게 변환` : ''}${shortReady ? ' · 짧은 URL' : ' · 이미지 포함형 코드'}</small>
    </div>
    <div class="result-actions result-actions-main">
      <button class="export-button" type="button" data-copy-html>HTML 복사</button>
      <button class="quick-copy-button" type="button" data-detail>상세 보기</button>
    </div>
  `;

  element.querySelector('[data-copy-html]')?.addEventListener('click', event => {
    event.stopPropagation();
    copyCode(item.id, 'html');
  });
  element.querySelector('[data-detail]')?.addEventListener('click', event => {
    event.stopPropagation();
    openDetail(item.id);
  });
  element.addEventListener('click', () => openDetail(item.id));
  return element;
};

// 상세창에서는 긴 Data URL 전체를 화면에 펼치지 않고 안내 문구만 보여줍니다.
const originalOpenDetailV3 = openDetail;
openDetail = async function(id) {
  await originalOpenDetailV3(id);
  const item = state.items.find(entry => entry.id === id);
  if (!item || item.publicUrl) return;

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