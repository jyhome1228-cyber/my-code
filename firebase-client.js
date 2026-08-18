// MY CODE user account / library configuration
// Firebase Web config values are public identifiers. Access control belongs in Firebase Auth + Firestore Security Rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCkpU0EavwWyTy3BwoKeQlqDXKTK8287qo",
  authDomain: "mycode-web.firebaseapp.com",
  projectId: "mycode-web",
  storageBucket: "mycode-web.firebasestorage.app",
  messagingSenderId: "268885401102",
  appId: "1:268885401102:web:9c7608b60f41002262265f"
};

const VERSION = '20260818-27';

const loadSharedHeaderStyle = () => {
  const existing = document.querySelector('link[href*="header-consistency.css"]');
  if (existing) { existing.href = `./header-consistency.css?v=${VERSION}`; return; }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `./header-consistency.css?v=${VERSION}`;
  link.dataset.mycodeHeader = 'true';
  document.head.appendChild(link);
};

const loadAuthModalFixStyle = () => {
  const existing = document.querySelector('link[href*="auth-modal-fix.css"]');
  if (existing) { existing.href = `./auth-modal-fix.css?v=${VERSION}`; return; }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `./auth-modal-fix.css?v=${VERSION}`;
  link.dataset.mycodeAuthFix = 'true';
  document.head.appendChild(link);
};

const appendModule = (src, dataName) => {
  if (!document.querySelector('#authDialog')) return;
  if (document.querySelector(`script[data-${dataName}]`)) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = `${src}?v=${VERSION}`;
  script.dataset[dataName.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = 'true';
  document.body.appendChild(script);
};

const scheduleAuthModules = () => {
  window.setTimeout(() => {
    appendModule('./auth-signup.js', 'mycode-signup');
    appendModule('./auth-runtime-fix.js', 'mycode-auth-runtime');
  }, 350);
};

const loadHomeCenterStyle = () => {
  if (!document.body?.classList.contains('home-simple-page')) return;
  const existing = document.querySelector('link[href*="home-center-v22.css"]');
  if (existing) { existing.href = `./home-center-v22.css?v=${VERSION}`; return; }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `./home-center-v22.css?v=${VERSION}`;
  link.dataset.mycodeHomeCenter = 'true';
  document.head.appendChild(link);
};

const loadUiFixStyle = () => {
  if (!document.body?.classList.contains('home-simple-page')) return;
  const existing = document.querySelector('link[href*="ui-fixes-v23.css"]');
  if (existing) { existing.href = `./ui-fixes-v23.css?v=${VERSION}`; return; }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `./ui-fixes-v23.css?v=${VERSION}`;
  document.head.appendChild(link);
};

const forceOrangeFavicon = () => {
  const href = `./mycode-favicon-orange-20260818.svg?v=${VERSION}`;
  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((node) => node.remove());

  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = href;
  document.head.appendChild(icon);

  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.href = `./favicon.ico?v=${VERSION}`;
  document.head.appendChild(shortcut);

  let theme = document.querySelector('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement('meta');
    theme.name = 'theme-color';
    document.head.appendChild(theme);
  }
  theme.content = '#fb5d00';
};

const syncDailyFreeCopy = () => {
  const authDescription = document.querySelector('.auth-dialog .auth-description');
  if (authDescription) authDescription.textContent = '무료 플랜은 하루 1회 사용할 수 있습니다. 로그인하면 My Cloud 저장과 계정 관리 기능을 이용할 수 있습니다.';

  const lockedCopy = document.querySelector('#cloudLocked p');
  if (lockedCopy) lockedCopy.textContent = '무료 플랜은 하루 1회 사용할 수 있으며, 로그인하면 생성한 이미지와 코드를 My Cloud에 저장하고 다시 관리할 수 있습니다.';

  const freeUsage = document.querySelector('#cloudFreeUsage');
  const freeRemaining = document.querySelector('#cloudFreeRemaining');
  if (freeUsage && freeUsage.textContent.trim() === '0 / 3') freeUsage.textContent = '0 / 1';
  if (freeRemaining && freeRemaining.textContent.includes('3회')) freeRemaining.textContent = '오늘 1회 남음';
};

const syncSiteNav = () => {
  loadSharedHeaderStyle();
  loadAuthModalFixStyle();
  loadHomeCenterStyle();
  loadUiFixStyle();
  forceOrangeFavicon();
  syncDailyFreeCopy();
  scheduleAuthModules();

  const nav = document.querySelector('.platform-nav');
  if (nav) {
    nav.innerHTML = `<a href="./about.html">About</a><a href="./how-to-use.html">How to Use</a><a href="./pricing.html">Pricing</a><a href="./magazine.html">Magazine</a><a href="./faq.html">FAQ</a><a href="./mycloud.html">My Cloud</a>`;
  }
  document.querySelectorAll('.company-footer-bottom > div').forEach((links) => {
    links.innerHTML = `<a href="./about.html">About</a><a href="./how-to-use.html">How to Use</a><a href="./pricing.html">Pricing</a><a href="./magazine.html">Magazine</a><a href="./faq.html">FAQ</a><a href="./terms.html">이용약관</a><a href="./privacy.html">개인정보처리방침</a><a href="./refund-policy.html">환불규정</a><a href="./mycloud.html">My Cloud</a>`;
  });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncSiteNav, { once: true });
else syncSiteNav();