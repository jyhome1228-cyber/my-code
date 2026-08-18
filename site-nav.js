(() => {
  const FAVICON = './mycode-favicon-orange-20260818.svg?v=20260818-22';

  if (!document.querySelector('link[data-mycode-header]')) {
    const headerStyle = document.createElement('link');
    headerStyle.rel = 'stylesheet';
    headerStyle.href = './header-consistency.css?v=20260818-22';
    headerStyle.dataset.mycodeHeader = 'true';
    document.head.appendChild(headerStyle);
  }

  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((node) => node.remove());
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = FAVICON;
  document.head.appendChild(icon);
  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.href = './favicon.ico?v=20260818-22';
  document.head.appendChild(shortcut);

  let theme = document.querySelector('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement('meta');
    theme.name = 'theme-color';
    document.head.appendChild(theme);
  }
  theme.content = '#fb5d00';

  const nav = document.querySelector('.platform-nav');
  if (nav) {
    nav.innerHTML = `
      <a href="./about.html">About</a>
      <a href="./how-to-use.html">How to Use</a>
      <a href="./pricing.html">Pricing</a>
      <a href="./magazine.html">Magazine</a>
      <a href="./faq.html">FAQ</a>
      <a href="./mycloud.html">My Cloud</a>`;
  }

  document.querySelectorAll('.company-footer-bottom > div').forEach((links) => {
    links.innerHTML = `
      <a href="./about.html">About</a>
      <a href="./how-to-use.html">How to Use</a>
      <a href="./pricing.html">Pricing</a>
      <a href="./magazine.html">Magazine</a>
      <a href="./faq.html">FAQ</a>
      <a href="./refund-policy.html">환불규정</a>
      <a href="./mycloud.html">My Cloud</a>`;
  });
})();