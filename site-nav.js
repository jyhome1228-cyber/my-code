(() => {
  if (!document.querySelector('link[data-mycode-header]')) {
    const headerStyle = document.createElement('link');
    headerStyle.rel = 'stylesheet';
    headerStyle.href = './header-consistency.css?v=20260818-16';
    headerStyle.dataset.mycodeHeader = 'true';
    document.head.appendChild(headerStyle);
  }

  const nav = document.querySelector('.platform-nav');
  if (nav) {
    nav.innerHTML = `
      <a href="./product.html">Product</a>
      <a href="./workspace.html">Workspace</a>
      <a href="./pricing.html">Pricing</a>
      <a href="./magazine.html">Magazine</a>
      <a href="./faq.html">FAQ</a>
      <a href="./mycloud.html">My Cloud</a>`;
  }

  document.querySelectorAll('.company-footer-bottom > div').forEach((links) => {
    links.innerHTML = `
      <a href="./product.html">Product</a>
      <a href="./pricing.html">Pricing</a>
      <a href="./magazine.html">Magazine</a>
      <a href="./faq.html">FAQ</a>
      <a href="./refund-policy.html">환불규정</a>
      <a href="./mycloud.html">My Cloud</a>`;
  });
})();
