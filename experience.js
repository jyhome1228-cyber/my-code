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
      showToast('Firebase 콘솔에서 Google 로그인을 먼저 활성화해주세요.');
    } else if (error?.code === 'auth/popup-closed-by-user') {
      showToast('로그인 창이 닫혔어요.');
    } else if (error?.code === 'auth/unauthorized-domain') {
      showToast('Firebase Authentication의 승인된 도메인에 현재 사이트를 추가해주세요.');
    } else {
      showToast('Google 로그인 설정을 확인해주세요.');
    }
  }
});

emailSignupForm?.addEventListener('submit', event => {
  event.preventDefault();
  showToast('이메일 로그인은 다음 단계에서 연결하고, 지금은 Google 로그인부터 사용할게요.');
});

function updateAccountUI(user = null) {
  const logoutButton = document.getElementById('firebaseLogoutBtn');
  if (user) {
    const email = user.email || '';
    const label = user.displayName || email.split('@')[0] || 'MY CODE';
    if (accountName) accountName.textContent = label;
    if (accountSub) accountSub.textContent = email || 'Firebase 계정';
    if (authDescription) authDescription.textContent = `${email || label} 계정으로 로그인되어 있어요.`;
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
  if (accountSub) accountSub.textContent = '가입하고 MY CODE 보관하기';
  if (authDescription) authDescription.textContent = '가입하면 MY CODE를 내 계정에 이어서 보관할 수 있어요.';
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

// app.js의 기존 업로드 함수를 Firebase Storage 우선 흐름으로 교체합니다.
uploadToApi = async function(blob, filename, id) {
  const firebase = await firebaseReadyPromise;
  if (!firebase) throw new Error('FIREBASE_NOT_READY');
  const user = firebase.getCurrentUser();
  if (!user) {
    showToast('로그인하면 Firebase에 영구 저장돼요. 지금은 브라우저에 임시 저장합니다.');
    throw new Error('AUTH_REQUIRED');
  }

  try {
    return await firebase.uploadImage({ blob, filename, id });
  } catch (error) {
    console.error(error);
    if (error?.code === 'storage/unauthorized') {
      showToast('Storage 보안 규칙 또는 로그인 상태를 확인해주세요.');
    } else if (String(error?.code || '').startsWith('storage/')) {
      showToast('Firebase Storage 설정을 확인해주세요.');
    } else if (String(error?.code || '').startsWith('firestore/')) {
      showToast('Firestore 설정 또는 보안 규칙을 확인해주세요.');
    }
    throw error;
  }
};

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
  const firebaseSaved = Boolean(item.storageKey?.startsWith('users/'));
  const exportReady = Boolean(item.publicUrl);
  const element = document.createElement('div');
  element.className = `result-card result-card-ready${exportReady ? '' : ' is-local-only'}`;
  const saved = savingsPercent(item);

  const statusLabel = exportReady ? '짧은 코드 준비 완료' : firebaseSaved ? 'Firebase 저장 완료' : '브라우저 임시 저장';
  const statusMeta = exportReady ? ' · 바로 복사 가능' : firebaseSaved ? ' · 짧은 주소 준비 중' : ' · 로그인하면 영구 저장';
  const mainAction = exportReady ? '코드로 내보내기' : firebaseSaved ? '저장 정보 보기' : '코드 미리보기';

  element.innerHTML = `
    <div class="result-preview-wrap"><img class="result-thumb" src="${previewUrl}" alt="" /><span class="ready-check">✓</span></div>
    <div class="result-info">
      <div class="saved-label">${statusLabel}</div>
      <strong>${escapeHTML(item.name)}</strong>
      <small>${formatBytes(item.size)}${saved > 0 ? ` · ${saved}% 가볍게 변환` : ''}${statusMeta}</small>
    </div>
    <div class="result-actions result-actions-main">
      <button class="export-button" type="button" data-export>${mainAction} <span>→</span></button>
      <button class="quick-copy-button" type="button" data-copy-html ${exportReady ? '' : 'disabled'}>${exportReady ? 'HTML 복사' : '짧은 주소 준비 중'}</button>
    </div>
  `;

  element.querySelector('[data-export]')?.addEventListener('click', event => {
    event.stopPropagation();
    openDetail(item.id);
  });
  element.querySelector('[data-copy-html]')?.addEventListener('click', event => {
    event.stopPropagation();
    if (!item.publicUrl) {
      showToast(firebaseSaved ? 'Firebase에는 저장됐어요. 짧은 주소 라우트를 연결하면 복사할 수 있어요.' : '로그인 후 Firebase에 저장하면 짧은 주소 발급 단계로 넘어갑니다.');
      return;
    }
    copyCode(item.id, 'html');
  });
  element.addEventListener('click', () => openDetail(item.id));
  return element;
};

buildCodes = async function(item) {
  const firebaseSaved = Boolean(item.storageKey?.startsWith('users/'));
  if (!item.publicUrl) {
    const message = firebaseSaved ? 'Firebase 저장 완료 · 짧은 URL 연결 준비 중' : '로그인 후 Firebase 저장이 필요합니다.';
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
    const firebaseSaved = Boolean(item.storageKey?.startsWith('users/'));
    showToast(firebaseSaved ? 'Firebase 저장은 완료됐어요. 짧은 주소 연결 후 복사 기능을 열게요.' : '로그인 후 Firebase에 영구 저장하면 짧은 코드 발급이 가능합니다.');
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