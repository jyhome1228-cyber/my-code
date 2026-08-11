const hostFinalStyles = document.createElement('link');
hostFinalStyles.rel = 'stylesheet';
hostFinalStyles.href = './host-v9.css?v=12';
document.head.appendChild(hostFinalStyles);

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
    showToast('Google 계정으로 연결했어요.');
  } catch (error) {
    console.error(error);
    if (error?.code === 'auth/operation-not-allowed') {
      showToast('Firebase 콘솔에서 Google 로그인을 활성화해주세요.');
    } else if (error?.code === 'auth/popup-closed-by-user') {
      showToast('로그인 창이 닫혔어요.');
    } else if (error?.code === 'auth/unauthorized-domain') {
      showToast('Firebase 승인 도메인에 현재 사이트를 추가해주세요.');
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
  const isAnonymous = Boolean(user?.isAnonymous);

  if (user && !isAnonymous) {
    const email = user.email || '';
    const label = user.displayName || email.split('@')[0] || 'MY CODE';
    if (accountName) accountName.textContent = label;
    if (accountSub) accountSub.textContent = 'FREE · 계정 연결됨';
    if (authDescription) authDescription.textContent = `${email || label} 계정으로 연결되어 있어요. 기존 이미지도 계속 사용할 수 있습니다.`;
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
  if (accountSub) accountSub.textContent = '로그인 없이 바로 사용';
  if (authDescription) authDescription.textContent = '로그인 없이도 이미지 주소를 만들 수 있어요. Google 계정을 연결하면 MY CODE를 계정으로 이어서 관리할 수 있습니다.';
  if (googleSignupBtn) googleSignupBtn.innerHTML = '<span class="google-g">G</span> Google 계정 연결하기';
  if (emailSignupForm) emailSignupForm.hidden = false;
  if (logoutButton) logoutButton.hidden = true;
  [signupTopBtn, signupMobileBtn].forEach(button => {
    if (!button) return;
    button.textContent = '계정 연결';
    button.classList.remove('is-signed');
  });
}

window.addEventListener('mycode:auth', event => updateAccountUI(event.detail?.user || null));
firebaseReadyPromise.then(firebase => updateAccountUI(firebase?.getCurrentUser?.() || null));
