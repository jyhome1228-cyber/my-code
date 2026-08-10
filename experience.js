const experienceStyles = document.createElement('link');
experienceStyles.rel = 'stylesheet';
experienceStyles.href = './experience.css';
document.head.appendChild(experienceStyles);

const AUTH_KEY = 'my-code-demo-user-v1';

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

function openAuth() {
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

googleSignupBtn?.addEventListener('click', () => {
  showToast('Google 간편가입은 Firebase 연결 후 바로 활성화돼요.');
});

emailSignupForm?.addEventListener('submit', event => {
  event.preventDefault();
  const email = signupEmail.value.trim();
  if (!email) return;
  localStorage.setItem(AUTH_KEY, JSON.stringify({ email, createdAt: new Date().toISOString() }));
  updateAccountUI();
  closeAuth();
  showToast('가입 UI가 저장됐어요. 다음 단계에서 계정 서버와 연결합니다.');
});

function updateAccountUI() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (_) {}
  if (!user?.email) return;
  const label = user.email.split('@')[0] || 'MY CODE';
  if (accountName) accountName.textContent = label;
  if (accountSub) accountSub.textContent = user.email;
  [signupTopBtn, signupMobileBtn].forEach(button => {
    if (!button) return;
    button.textContent = '내 계정';
    button.classList.add('is-signed');
  });
}

updateAccountUI();

// app.js의 기본 결과 UI를 더 단순한 my:code 흐름으로 교체합니다.
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
  const element = document.createElement('div');
  element.className = 'result-card result-card-ready';
  const saved = savingsPercent(item);
  element.innerHTML = `
    <div class="result-preview-wrap"><img class="result-thumb" src="${previewUrl}" alt="" /><span class="ready-check">✓</span></div>
    <div class="result-info">
      <div class="saved-label">MY CODE에 저장됨</div>
      <strong>${escapeHTML(item.name)}</strong>
      <small>${formatBytes(item.size)}${saved > 0 ? ` · ${saved}% 가볍게 변환` : ''}</small>
    </div>
    <div class="result-actions result-actions-main">
      <button class="export-button" type="button" data-export>코드로 내보내기 <span>→</span></button>
      <button class="quick-copy-button" type="button" data-copy-html>HTML 복사</button>
    </div>
  `;

  element.querySelector('[data-export]')?.addEventListener('click', event => {
    event.stopPropagation();
    openDetail(item.id);
  });
  element.querySelector('[data-copy-html]')?.addEventListener('click', event => {
    event.stopPropagation();
    copyCode(item.id, 'html');
  });
  element.addEventListener('click', () => openDetail(item.id));
  return element;
};
