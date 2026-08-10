const experienceStyles = document.createElement('link');
experienceStyles.rel = 'stylesheet';
experienceStyles.href = './experience.css';
document.head.appendChild(experienceStyles);

const noirRuntimeStyles = document.createElement('style');
noirRuntimeStyles.textContent = `
  .site-header{
    background:rgba(255,255,255,.92);
    border-bottom:1px solid rgba(5,5,5,.08);
    -webkit-backdrop-filter:blur(14px);
    backdrop-filter:blur(14px);
  }
`;
document.head.appendChild(noirRuntimeStyles);

const AUTH_KEY = 'my-code-demo-user-v1';

const authModal = document.getElementById('authModal');
const accountButton = document.getElementById('accountButton');
const signupTopBtn = document.getElementById('signupTopBtn');
const signupMobileBtn = document.getElementById('signupMobileBtn');
const authCloseBtn = document.getElementById('authCloseBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');
const emailSignupForm = document.getElementById('emailSignupForm');
const signupEmail = document.getElementById('signupEmail');
const accountName = document.getElementById('accountName');
const accountSub = document.getElementById('accountSub');
const menuButton = document.getElementById('menuButton');
const menuCloseButton = document.getElementById('menuCloseButton');
const menuOverlay = document.getElementById('menuOverlay');
const landingUploadButton = document.getElementById('landingUploadButton');

function openMenu() {
  document.body.classList.add('menu-open');
  menuButton?.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  menuButton?.setAttribute('aria-expanded', 'false');
}

menuButton?.addEventListener('click', () => {
  document.body.classList.contains('menu-open') ? closeMenu() : openMenu();
});
menuCloseButton?.addEventListener('click', closeMenu);
menuOverlay?.addEventListener('click', closeMenu);
document.querySelectorAll('.drawer-link').forEach(button => button.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
});

landingUploadButton?.addEventListener('click', () => {
  switchView('upload');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => document.getElementById('fileInput')?.click(), 350);
});

function openAuth() {
  closeMenu();
  authModal?.showModal();
  setTimeout(() => signupEmail?.focus(), 80);
}

function closeAuth() {
  authModal?.close();
}

[accountButton, signupTopBtn, signupMobileBtn].forEach(button => button?.addEventListener('click', openAuth));
authCloseBtn?.addEventListener('click', closeAuth);
authModal?.addEventListener('click', event => {
  if (event.target === authModal) closeAuth();
});

googleSignupBtn?.addEventListener('click', () => {
  showToast('Google 간편가입은 Firebase 연결 후 바로 활성화돼요.');
});

emailSignupForm?.addEventListener('submit', event => {
  event.preventDefault();
  const email = signupEmail.value.trim();
  if (!email) return;
  localStorage.setItem(AUTH_KEY, JSON.stringify({ email, createdAt: new Date().toISOString() }));
  updateAccountUI();
  closeAuth();
  showToast('가입 UI가 저장됐어요. 다음 단계에서 계정 서버와 연결합니다.');
});

function updateAccountUI() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (_) {}
  if (!user?.email) return;
  const label = user.email.split('@')[0] || 'MY CODE';
  if (accountName) accountName.textContent = label;
  if (accountSub) accountSub.textContent = user.email;
  [signupTopBtn, signupMobileBtn].forEach(button => {
    if (!button) return;
    button.textContent = '내 계정';
    button.classList.add('is-signed');
  });
}

updateAccountUI();

createPendingCard = function(name) {
  const element = document.createElement('div');
  element.className = 'result-card result-card-loading';
  element.innerHTML = `
    <div class="loading-preview"><span class="loading-spinner"></span></div>
    <div class="result-info">
      <strong>${escapeHTML(name)}</strong>
      <small class="loading-copy">이미지를 코드로 바꾸고 있어요…</small>
      <div class="loading-track"><span></span></div>
    </div>
    <div class="result-actions"><span class="processing-pill">변환 중</span></div>
  `;
  return {
    element,
    replace(newElement) { element.replaceWith(newElement); },
    fail() {
      element.classList.add('has-error');
      element.querySelector('.loading-copy').textContent = '변환하지 못했어요. 다시 올려주세요.';
      element.querySelector('.processing-pill').textContent = '오류';
    }
  };
};

createResultCard = async function(item) {
  const previewUrl = await getPreviewUrl(item.id);
  const element = document.createElement('div');
  element.className = `result-card result-card-ready${item.publicUrl ? '' : ' is-local-only'}`;
  const saved = savingsPercent(item);
  const exportReady = Boolean(item.publicUrl);
  element.innerHTML = `
    <div class="result-preview-wrap"><img class="result-thumb" src="${previewUrl}" alt="" /><span class="ready-check">✓</span></div>
    <div class="result-info">
      <div class="saved-label">${exportReady ? 'MY CODE에 저장됨' : 'MY CODE에 임시 저장됨'}</div>
      <strong>${escapeHTML(item.name)}</strong>
      <small>${formatBytes(item.size)}${saved > 0 ? ` · ${saved}% 가볍게 변환` : ''}${exportReady ? ' · CDN 준비 완료' : ' · CDN 연결 대기'}</small>
    </div>
    <div class="result-actions result-actions-main">
      <button class="export-button" type="button" data-export>${exportReady ? '코드로 내보내기' : '코드 미리보기'} <span>→</span></button>
      <button class="quick-copy-button" type="button" data-copy-html ${exportReady ? '' : 'disabled'}>${exportReady ? 'HTML 복사' : 'CDN 연결 전'}</button>
    </div>
  `;

  element.querySelector('[data-export]')?.addEventListener('click', event => {
    event.stopPropagation();
    openDetail(item.id);
  });
  element.querySelector('[data-copy-html]')?.addEventListener('click', event => {
    event.stopPropagation();
    if (!item.publicUrl) {
      showToast('CDN 연결 후 짧은 HTML 코드로 복사할 수 있어요.');
      return;
    }
    copyCode(item.id, 'html');
  });
  element.addEventListener('click', () => openDetail(item.id));
  return element;
};

// Base64/Data URL은 외부용 코드로 내보내지 않습니다.
buildCodes = async function(item) {
  if (!item.publicUrl) {
    return {
      url: 'CDN 연결 후 짧은 URL이 생성됩니다.',
      html: '<img src="CDN 연결 후 생성되는 URL" alt="">',
      css: 'background-image: url("CDN 연결 후 생성되는 URL");'
    };
  }
  const source = item.publicUrl;
  return {
    url: source,
    html: `<img src="${source}" alt="">`,
    css: `background-image: url("${source}");`
  };
};

copyCode = async function(id, type) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;
  if (!item.publicUrl) {
    showToast('CDN 연결 후 짧은 코드로 복사할 수 있어요. Base64 복사는 사용하지 않습니다.');
    return;
  }
  try {
    const codes = await buildCodes(item);
    await navigator.clipboard.writeText(codes[type]);
    showToast(`${type.toUpperCase()} 코드가 복사됐어요.`);
  } catch (error) {
    console.error(error);
    showToast('코드를 복사하지 못했습니다.');
  }
};