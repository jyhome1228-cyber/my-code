// MY CODE user account / library configuration
// Firebase Web config values are public identifiers. Access control belongs in Firebase Auth + Firestore Security Rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCkpU0EavwWyTy3BwokEqLqDXKTK8287qo",
  authDomain: "mycode-web.firebaseapp.com",
  projectId: "mycode-web",
  storageBucket: "mycode-web.firebasestorage.app",
  messagingSenderId: "268885401102",
  appId: "1:268885401102:web:9c7608b60f41002262265f"
};

const loadSharedHeaderStyle = () => {
  if (document.querySelector('link[href*="header-consistency.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './header-consistency.css?v=20260818-23';
  link.dataset.mycodeHeader = 'true';
  document.head.appendChild(link);
};

const loadAuthModalFixStyle = () => {
  if (document.querySelector('link[href*="auth-modal-fix.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './auth-modal-fix.css?v=20260818-23';
  link.dataset.mycodeAuthFix = 'true';
  document.head.appendChild(link);
};

const loadHomeCenterStyle = () => {
  if (!document.body?.classList.contains('home-simple-page')) return;
  if (document.querySelector('link[href*="home-center-v22.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './home-center-v22.css?v=20260818-23';
  link.dataset.mycodeHomeCenter = 'true';
  document.head.appendChild(link);
};

const loadUiFixStyle = () => {
  if (!document.body?.classList.contains('home-simple-page')) return;
  if (document.querySelector('link[href*="ui-fixes-v23.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './ui-fixes-v23.css?v=20260818-23';
  document.head.appendChild(link);
};

const forceOrangeFavicon = () => {
  const href = './mycode-favicon-orange-20260818.svg?v=20260818-23';
  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((node) => node.remove());

  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = href;
  document.head.appendChild(icon);

  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.href = './favicon.ico?v=20260818-23';
  document.head.appendChild(shortcut);

  let theme = document.querySelector('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement('meta');
    theme.name = 'theme-color';
    document.head.appendChild(theme);
  }
  theme.content = '#fb5d00';
};

const syncSiteNav = () => {
  loadSharedHeaderStyle();
  loadAuthModalFixStyle();
  loadHomeCenterStyle();
  loadUiFixStyle();
  forceOrangeFavicon();

  const nav = document.querySelector('.platform-nav');
  if (nav) {
    nav.innerHTML = `<a href="./about.html">About</a><a href="./how-to-use.html">How to Use</a><a href="./pricing.html">Pricing</a><a href="./magazine.html">Magazine</a><a href="./faq.html">FAQ</a><a href="./mycloud.html">My Cloud</a>`;
  }
  document.querySelectorAll('.company-footer-bottom > div').forEach((links) => {
    links.innerHTML = `<a href="./about.html">About</a><a href="./how-to-use.html">How to Use</a><a href="./pricing.html">Pricing</a><a href="./magazine.html">Magazine</a><a href="./faq.html">FAQ</a><a href="./refund-policy.html">환불규정</a><a href="./mycloud.html">My Cloud</a>`;
  });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncSiteNav, { once: true });
else syncSiteNav();