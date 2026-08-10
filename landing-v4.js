// my:code landing — upload-first blue-only refinement
const headlineScaleStyles = document.createElement('link');
headlineScaleStyles.rel = 'stylesheet';
headlineScaleStyles.href = './headline-v6.css';
document.head.appendChild(headlineScaleStyles);

(() => {
  const fileInput = document.getElementById('fileInput');
  const home = document.getElementById('view-upload');
  const uploadButton = document.getElementById('v4UploadButton');

  uploadButton?.addEventListener('click', () => fileInput?.click());

  // HERO: the upload experience is the main product, copy stays concise.
  const heroEyebrow = document.querySelector('.v4-eyebrow');
  const heroTitle = document.querySelector('.v4-hero-copy h1');
  const heroCopy = document.querySelector('.v4-hero-copy p');
  const dropTitle = document.querySelector('.v4-dropzone strong');
  const dropCopy = document.querySelector('.v4-dropzone p');
  const toolFooter = document.querySelector('.v4-tool-footer');

  if (heroEyebrow) heroEyebrow.innerHTML = '<span class="v4-dot"></span> IMAGE TO CODE · MY CODE';
  if (heroTitle) heroTitle.innerHTML = '이미지를 올리고,<br><em>바로 코드로.</em>';
  if (heroCopy) heroCopy.innerHTML = '드래그 한 번으로 이미지 최적화부터 URL·HTML·CSS 코드 생성,<br>MY CODE 저장까지 한 번에 처리하세요.';
  if (dropTitle) dropTitle.textContent = '이미지를 여기에 올려주세요';
  if (dropCopy) dropCopy.textContent = '드래그하거나 클릭해서 파일 선택';
  if (toolFooter) toolFooter.innerHTML = '<span>WebP 자동 최적화</span><span>로그인 시 Firebase 저장</span><span>MY CODE 자동 기록</span>';

  // Summary cards: concise functional hierarchy.
  const stats = [...document.querySelectorAll('.v4-stat')];
  const statContent = [
    ['3 TYPES', 'URL · HTML · CSS', '필요한 코드 형식을 바로 선택'],
    ['AUTO', 'MY CODE', '업로드한 이미지를 자동으로 기록'],
    ['WEBP', '가볍게', '웹 사용에 맞게 이미지 최적화'],
    ['SEARCH', '다시 찾기', '파일명과 프로젝트로 빠르게 검색']
  ];
  stats.forEach((card, index) => {
    const data = statContent[index];
    if (!data) return;
    const label = card.querySelector('span');
    const title = card.querySelector('strong');
    const copy = card.querySelector('p');
    if (label) label.textContent = data[0];
    if (title) title.textContent = data[1];
    if (copy) copy.textContent = data[2];
  });

  // Why section.
  const whyHead = document.querySelector('.v4-why .v4-section-head');
  if (whyHead) {
    const kicker = whyHead.querySelector('span');
    const title = whyHead.querySelector('h2');
    const copy = whyHead.querySelector('p');
    if (kicker) kicker.textContent = 'WHY MY:CODE';
    if (title) title.innerHTML = '이미지 작업의 반복을<br>한 번으로 줄이세요.';
    if (copy) copy.innerHTML = '업로드한 위치를 다시 찾고, 링크를 만들고, 코드를 복사하는 일을 반복하지 않도록<br>이미지와 코드를 하나의 작업 흐름으로 묶었습니다.';
  }

  const problemTitle = document.querySelector('.v4-card-problem h3');
  const problemList = document.querySelector('.v4-card-problem ul');
  if (problemTitle) problemTitle.innerHTML = '이미지 하나 쓰는데<br>과정이 너무 많았다면.';
  if (problemList) problemList.innerHTML = '<li>이미지 호스팅 위치를 다시 찾고</li><li>주소를 복사해 코드를 만들고</li><li>파일과 링크를 따로 관리하고</li><li>나중에 다시 찾느라 시간을 쓰고</li>';

  const solutionTitle = document.querySelector('.v4-card-solution h3');
  if (solutionTitle) solutionTitle.innerHTML = 'my:code에서는<br><em>올리는 순간 정리가 시작됩니다.</em>';

  const useTitle = document.querySelector('.v4-card-use h3');
  if (useTitle) useTitle.textContent = '웹 작업 어디서든.';

  // Flow section.
  const flowHead = document.querySelector('.v4-flow > .v4-section-head');
  if (flowHead) {
    const title = flowHead.querySelector('h2');
    const copy = flowHead.querySelector('p');
    if (title) title.innerHTML = '업로드부터 재사용까지,<br>네 단계면 충분합니다.';
    if (copy) copy.innerHTML = '복잡한 설정 없이 이미지부터 올리세요.<br>정리는 작업이 끝난 뒤 해도 됩니다.';
  }

  const flowCards = [...document.querySelectorAll('.v4-flow-grid article')];
  const flows = [
    ['업로드', '이미지를 드래그하거나 클릭해 한 장 또는 여러 장을 올립니다.'],
    ['자동 최적화', '웹 사용에 맞는 WebP 형식으로 가볍게 변환합니다.'],
    ['코드 생성', 'URL·HTML·CSS 중 필요한 형태를 바로 복사합니다.'],
    ['MY CODE', '이미지와 코드를 기록하고 프로젝트별로 다시 정리합니다.']
  ];
  flowCards.forEach((card, index) => {
    const data = flows[index];
    if (!data) return;
    const title = card.querySelector('h3');
    const copy = card.querySelector('p');
    if (title) title.textContent = data[0];
    if (copy) copy.textContent = data[1];
  });

  // Organize section.
  const organizeTitle = document.querySelector('.v4-organize-copy h2');
  const organizeCopy = document.querySelector('.v4-organize-copy p');
  if (organizeTitle) organizeTitle.innerHTML = '먼저 만들고,<br><em>정리는 나중에.</em>';
  if (organizeCopy) organizeCopy.innerHTML = '폴더를 만들고 시작할 필요가 없습니다. MY CODE가 먼저 자동으로 쌓이고,<br>필요한 이미지만 선택해 프로젝트로 묶으면 됩니다.';

  // Benefits section.
  const benefitHead = document.querySelector('.v4-benefits .v4-section-head');
  if (benefitHead) {
    const title = benefitHead.querySelector('h2');
    const copy = benefitHead.querySelector('p');
    if (title) title.innerHTML = '이미지 코드를 자주 쓰는<br>실무자를 위해.';
    if (copy) copy.innerHTML = '아임웹, 카페24, GitHub Pages, HTML 퍼블리싱처럼<br>이미지 주소와 코드를 반복해서 다루는 작업에 집중했습니다.';
  }

  const benefitCards = [...document.querySelectorAll('.v4-benefit-grid article')];
  const benefits = [
    ['이미지와 코드를 함께', '파일과 URL을 따로 보관하지 않고 하나의 MY CODE 항목으로 관리합니다.'],
    ['다시 만들 필요 없이', '이전에 만든 URL·HTML·CSS 코드를 찾아 바로 재사용할 수 있습니다.'],
    ['작업 흐름을 끊지 않고', '프로젝트 생성보다 업로드를 먼저. 정리는 필요해질 때 시작합니다.'],
    ['필요한 만큼만', 'FREE로 시작하고 BASIC·PRO는 실제 사용량에 맞춰 선택할 수 있게 준비합니다.']
  ];
  benefitCards.forEach((card, index) => {
    const data = benefits[index];
    if (!data) return;
    const title = card.querySelector('h3');
    const copy = card.querySelector('p');
    if (title) title.textContent = data[0];
    if (copy) copy.textContent = data[1];
  });

  // Pricing copy remains upcoming, but make the proposition clearer.
  const pricingHead = document.querySelector('.v4-pricing .v4-section-head');
  if (pricingHead) {
    const title = pricingHead.querySelector('h2');
    const copy = pricingHead.querySelector('p');
    if (title) title.innerHTML = '무료로 시작하고,<br>필요할 때 확장하세요.';
    if (copy) copy.innerHTML = 'FREE · BASIC 990원 · PRO 3,990원<br>현재 모든 유료 요금제는 오픈 예정입니다.';
  }

  const finalTitle = document.querySelector('.v4-final-cta h2');
  const finalCopy = document.querySelector('.v4-final-cta p');
  if (finalTitle) finalTitle.innerHTML = '이미지 한 장부터<br>바로 시작하세요.';
  if (finalCopy) finalCopy.textContent = '올리고, 코드로 바꾸고, MY CODE에서 다시 찾으세요.';

  // No decorative reveal animation: keep interaction immediate and calm.
  document.querySelectorAll('.v4-reveal').forEach(target => target.classList.remove('v4-reveal','is-visible'));

  // Return to the uploader when the upload view is selected.
  document.querySelectorAll('[data-view="upload"]').forEach(button => {
    button.addEventListener('click', () => {
      if (!home) return;
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    });
  });
})();