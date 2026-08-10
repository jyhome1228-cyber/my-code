const experienceStyles = document.createElement('link');
experienceStyles.rel = 'stylesheet';
experienceStyles.href = './experience.css';
document.head.appendChild(experienceStyles);

const finalBrandStyles = document.createElement('link');
finalBrandStyles.rel = 'stylesheet';
finalBrandStyles.href = './brand-v2.css';
document.head.appendChild(finalBrandStyles);

const pricingStyles = document.createElement('link');
pricingStyles.rel = 'stylesheet';
pricingStyles.href = './pricing.css';
document.head.appendChild(pricingStyles);

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

let firebaseLoadError = null;
const firebaseReadyPromise = new Promise(resolve => {
  const script = document.createElement('script');
  script.src = './firebase/firebase-config.js';
  script.onload = async () => {
    try {
      await import('./firebase/firebase-runtime.js');
      resolve(window.MyCodeFirebase || null);
    } catch (error) {
      firebaseLoadError = error;
      console.error(error);
      resolve(null);
    }
  };
  script.onerror = error => {
    firebaseLoadError = error;
    resolve(null);
  };
  document.head.appendChild(script);
});

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
const authDescription = authModal?.querySelector('.auth-description');
const menuButton = document.getElementById('menuButton');
const menuCloseButton = document.getElementById('menuCloseButton');
const menuOverlay = document.getElementById('menuOverlay');
const landingUploadButton = document.getElementById('landingUploadButton');
const pricingMenuButton = document.getElementById('pricingMenuButton');

function syncPrelaunchCopy() {
  const heroDescription = document.querySelector('.brand-hero-copy > p');
  if (heroDescription) {
    heroDescription.innerHTML = '이미지를 올리면 웹에서 쓰기 좋게 가볍게 변환하고,<br>만든 결과는 MY CODE에 자동으로 보관합니다.';
  }

  const valueCards = document.querySelectorAll('.value-grid article');
  const codeCard = valueCards[1];
  if (codeCard) {
    const title = codeCard.querySelector('h3');
    const copy = codeCard.querySelector('p');
    if (title) title.textContent = '코드 내보내기';
    if (copy) copy.textContent = '외부용 짧은 URL·HTML·CSS 코드는 정식 오픈 시 제공할 예정입니다.';
  }

  if (authDescription) {
    authDescription.textContent = '계정과 FREE 플랜 정보는 Firebase에 연결됩니다. 이미지는 현재 이 브라우저에 저장됩니다.';
  }
}
syncPrelaunchCopy();

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

pricingMenuButton?.addEventListener('click', () => {
  closeMenu();
  switchView('upload');
  setTimeout(() => document.getElementById('pricingSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
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

function ensureLogoutButton() {
  if (!authModal || document.getElementById('firebaseLogoutBtn')) return;
  const button = document.createElement('button');
  button.id = 'firebaseLogoutBtn';
  button.type = 'button';
  button.className = 'outline-button full-button';
  button.textContent = '로그아웃';
  button.hidden = true;
  button.style.marginTop = '10px';
  emailSignupForm?.insertAdjacentElement('afterend', button);
  button.addEventListener('click', async () => {
    const firebase = await firebaseReadyPromise;
    if (!firebase) return;
    try {
      await firebase.logout();
      closeAuth();
      showToast('로그아웃했어요.');
    } catch (error) {
      console.error(error);
      showToast('로그아웃하지 못했습니다.');
    }
  });
}
ensureLogoutButton();

googleSignupBtn?.addEventListener('click', async () => {
  const firebase = await firebaseReadyPromise;
  if (!firebase) {
    console.error(firebaseLoadError);
    showToast('Firebase 초기화를 확인하고 있어요. 잠시 후 다시 시도해주세요.');
    return;
  }
  try {
    const user = await firebase.signInWithGoogle();
    updateAccountUI(user);
    closeAuth();
    showToast('Google 계정으로 로그인했어요.');
  } catch (error) {
    console.error(error);
    if (error?.code === 'auth/operation-not-allowed') {
      showToast('Firebase 콘솔에서 Google 로그인을 활성화해주세요.');
    } else if (error?.code === 'auth/popup-closed-by-user') {
      showToast('로그인 창이 닫혔어요.');
    } else if (error?.code === 'auth/unauthorized-domain') {
      showToast('Firebase Authentication 승인 도메인에 현재 사이트를 추가해주세요.');
    } else {
      showToast('Google 로그인 설정을 확인해주세요.');
    }
  }
});

emailSignupForm?.addEventListener('submit', event => {
  event.preventDefault();
  showToast('이메일 로그인은 오픈 준비 중입니다. 지금은 Google 로그인을 이용해주세요.');
});

function updateAccountUI(user = null) {
  const logoutButton = document.getElementById('firebaseLogoutBtn');
  if (user) {
    const email = user.email || '';
    const label = user.displayName || email.split('@')[0] || 'MY CODE';
    if (accountName) accountName.textContent = label;
    if (accountSub) accountSub.textContent = 'FREE · 계정 연결됨';
    if (authDescription) authDescription.textContent = `${email || label} 계정이 연결되어 있어요. 이미지는 현재 이 브라우저에 저장됩니다.`;
    if (googleSignupBtn) googleSignupBtn.innerHTML = '<span class="google-g">G</span> 다른 Google 계정으로 로그인';
    if (emailSignupForm) emailSignupForm.hidden = true;
    if (logoutButton) logoutButton.hidden = false;
    [signupTopBtn, signupMobileBtn].forEach(button => {
      if (!button) return;
      button.textContent = '내 계정';
      button.classList.add('is-signed');
    });
    return;
  }

  if (accountName) accountName.textContent = '게스트';
  if (accountSub) accountSub.textContent = 'Google 로그인 / FREE';
  if (authDescription) authDescription.textContent = '계정과 FREE 플랜 정보는 Firebase에 연결됩니다. 이미지는 현재 이 브라우저에 저장됩니다.';
  if (googleSignupBtn) googleSignupBtn.innerHTML = '<span class="google-g">G</span> Google로 계속하기';
  if (emailSignupForm) emailSignupForm.hidden = false;
  if (logoutButton) logoutButton.hidden = true;
  [signupTopBtn, signupMobileBtn].forEach(button => {
    if (!button) return;
    button.textContent = '간편가입 / 로그인';
    button.classList.remove('is-signed');
  });
}

window.addEventListener('mycode:auth', event => updateAccountUI(event.detail?.user || null));
firebaseReadyPromise.then(firebase => updateAccountUI(firebase?.getCurrentUser?.() || null));

// 1차 오픈 전에는 이미지 파일을 외부 서버로 업로드하지 않습니다.
// app.js가 이 실패를 감지해 IndexedDB 로컬 보관으로 자연스럽게 전환합니다.
uploadToApi = async function() {
  const error = new Error('BROWSER_STORAGE_MODE');
  error.code = 'BROWSER_STORAGE_MODE';
  throw error;
};

createPendingCard = function(name) {
  const element = document.createElement('div');
  element.className = 'result-card result-card-loading';
  element.innerHTML = `
    <div class="loading-preview"><span class="loading-spinner"></span></div>
    <div class="result-info">
      <strong>${escapeHTML(name)}</strong>
      <small class="loading-copy">이미지를 가볍게 변환하고 있어요…</small>
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
  const exportReady = Boolean(item.publicUrl);
  const element = document.createElement('div');
  element.className = `result-card result-card-ready${exportReady ? '' : ' is-local-only'}`;
  const saved = savingsPercent(item);
  const statusLabel = exportReady ? '외부 코드 준비 완료' : '이 브라우저에 저장됨';
  const statusMeta = exportReady ? ' · 바로 복사 가능' : ' · MY CODE 자동 보관';
  const mainAction = exportReady ? '코드로 내보내기' : '저장 정보 보기';

  element.innerHTML = `
    <div class="result-preview-wrap"><img class="result-thumb" src="${previewUrl}" alt="" /><span class="ready-check">✓</span></div>
    <div class="result-info">
      <div class="saved-label">${statusLabel}</div>
      <strong>${escapeHTML(item.name)}</strong>
      <small>${formatBytes(item.size)}${saved > 0 ? ` · ${saved}% 가볍게 변환` : ''}${statusMeta}</small>
    </div>
    <div class="result-actions result-actions-main">
      <button class="export-button" type="button" data-export>${mainAction} <span>→</span></button>
      <button class="quick-copy-button" type="button" data-copy-html ${exportReady ? '' : 'disabled'}>${exportReady ? 'HTML 복사' : '외부 코드 준비 중'}</button>
    </div>
  `;

  element.querySelector('[data-export]')?.addEventListener('click', event => {
    event.stopPropagation();
    openDetail(item.id);
  });
  element.querySelector('[data-copy-html]')?.addEventListener('click', event => {
    event.stopPropagation();
    if (!item.publicUrl) {
      showToast('현재는 브라우저 보관 모드입니다. 외부용 짧은 코드는 정식 오픈 시 제공할 예정입니다.');
      return;
    }
    copyCode(item.id, 'html');
  });
  element.addEventListener('click', () => openDetail(item.id));
  return element;
};

buildCodes = async function(item) {
  if (!item.publicUrl) {
    const message = '현재 브라우저 보관 모드 · 외부용 URL은 정식 오픈 예정';
    return {
      url: message,
      html: `<img src="${message}" alt="">`,
      css: `background-image: url("${message}");`
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
    showToast('외부용 짧은 코드는 정식 오픈 시 제공할 예정입니다. 현재 이미지는 이 브라우저의 MY CODE에 저장됩니다.');
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
