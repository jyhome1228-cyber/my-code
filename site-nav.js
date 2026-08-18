(() => {
  const FAVICON = './mycode-favicon-orange-20260818.svg?v=20260818-24';

  if (!document.querySelector('link[data-mycode-header]')) {
    const headerStyle = document.createElement('link');
    headerStyle.rel = 'stylesheet';
    headerStyle.href = './header-consistency.css?v=20260818-24';
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
  shortcut.href = './favicon.ico?v=20260818-24';
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

  syncDailyFreeCopy();

  function syncDailyFreeCopy() {
    const path = location.pathname.toLowerCase();

    if (path.endsWith('/pricing.html') || path.endsWith('pricing.html')) {
      const heroCopy = document.querySelector('.pricing-hero-copy > p:not(.page-kicker)');
      if (heroCopy) heroCopy.textContent = '무료 플랜은 매일 1회 사용할 수 있습니다. 더 자주 사용하거나 My Cloud 용량이 필요하면 유료 플랜으로 확장하세요.';

      const freeCard = document.querySelector('[data-plan="free"]');
      if (freeCard) {
        const detail = freeCard.querySelector('.billing-detail');
        if (detail) detail.textContent = '매일 1회 무료';
        const paragraphs = freeCard.querySelectorAll(':scope > p');
        if (paragraphs[1]) paragraphs[1].textContent = '회원가입 여부와 관계없이 매일 이미지 코드 생성 기능을 1회 사용할 수 있는 무료 플랜입니다.';
        const list = freeCard.querySelector('ul');
        if (list) list.innerHTML = '<li>매일 1회 무료 생성</li><li>IMAGE URL · HTML · CSS</li><li>파일당 최대 10MB</li><li>로그인 시 My Cloud 사용</li>';
      }
    }

    if (path.endsWith('/how-to-use.html') || path.endsWith('how-to-use.html')) {
      const lead = document.querySelector('#free-use .lead');
      if (lead) lead.textContent = '무료 플랜은 하루 1회 사용할 수 있습니다. 날짜가 바뀌면 다시 1회가 열리고, 로그인하면 My Cloud에 생성한 자산을 저장할 수 있습니다.';
      const cards = document.querySelectorAll('#free-use .howto-mini-card');
      if (cards[0]) cards[0].innerHTML = '<span>DAILY FREE</span><h4>매일 1회</h4><p>회원가입 없이도 하루 한 번 실제 코드 생성 흐름을 사용할 수 있습니다.</p>';
      if (cards[1]) cards[1].innerHTML = '<span>SIGNED IN</span><h4>로그인 + My Cloud</h4><p>계정을 만들면 사용 기록과 이미지 자산을 저장하고 다시 관리할 수 있습니다.</p>';
    }

    if (path.endsWith('/faq.html') || path.endsWith('faq.html')) {
      const items = document.querySelectorAll('.faq-item');
      const answer = items[1]?.querySelector('.faq-answer');
      if (answer) answer.textContent = '네. 무료 플랜은 회원가입 여부와 관계없이 하루 1회 사용할 수 있습니다. 날짜가 바뀌면 다시 1회가 제공되며, 로그인하면 My Cloud 저장과 계정 관리 기능을 이용할 수 있습니다.';
    }
  }
})();