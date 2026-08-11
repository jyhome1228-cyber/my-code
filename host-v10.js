// Final guest-mode cleanup for the simple hosting UI.
(() => {
  const meta = document.querySelector('.host-upload-meta');
  if (meta) {
    meta.innerHTML = '<span>로그인 없이 주소 생성</span><span>WebP 자동 최적화</span><span>MY CODE 자동 보관</span>';
  }

  document.querySelector('.host-how')?.remove();

  const banner = document.querySelector('.host-mycode-banner');
  if (banner) banner.style.marginTop = '54px';

  const authDescription = document.querySelector('#authModal .auth-description');
  if (authDescription) {
    authDescription.textContent = '로그인 없이도 바로 사용할 수 있어요. Google 계정을 연결하면 MY CODE를 계정으로 이어서 관리할 수 있습니다.';
  }

  function keepGuestUI(user) {
    if (!user?.isAnonymous) return;
    const accountName = document.getElementById('accountName');
    const accountSub = document.getElementById('accountSub');
    const signupTopBtn = document.getElementById('signupTopBtn');
    if (accountName) accountName.textContent = '게스트';
    if (accountSub) accountSub.textContent = '로그인 없이 바로 사용';
    if (signupTopBtn) signupTopBtn.textContent = '계정 연결';
  }

  window.addEventListener('mycode:auth', event => keepGuestUI(event.detail?.user));
  firebaseReadyPromise.then(firebase => keepGuestUI(firebase?.getCurrentUser?.()));
})();
