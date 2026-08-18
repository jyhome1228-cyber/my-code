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
  if (document.querySelector('link[data-mycode-header]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './header-consistency.css?v=20260818-18';
  link.dataset.mycodeHeader = 'true';
  document.head.appendChild(link);
};

const syncSiteNav = () => {
  loadSharedHeaderStyle();

  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((icon) => {
    icon.href = './favicon.svg?v=20260818-18';
  });

  const nav = document.querySelector('.platform-nav');
  if (nav) {
    nav.innerHTML = `<a href="./product.html">Product</a><a href="./workspace.html">Workspace</a><a href="./pricing.html">Pricing</a><a href="./magazine.html">Magazine</a><a href="./faq.html">FAQ</a><a href="./mycloud.html">My Cloud</a>`;
  }
  document.querySelectorAll('.company-footer-bottom > div').forEach((links) => {
    links.innerHTML = `<a href="./product.html">Product</a><a href="./pricing.html">Pricing</a><a href="./magazine.html">Magazine</a><a href="./faq.html">FAQ</a><a href="./refund-policy.html">환불규정</a><a href="./mycloud.html">My Cloud</a>`;
  });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncSiteNav, { once: true });
else syncSiteNav();
