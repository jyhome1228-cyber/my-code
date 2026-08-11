// my:code v10 — guest-first hosting flow
(() => {
  // Final upload override: always create an anonymous Firebase session first.
  // This lets users upload without pressing any login button.
  uploadToApi = async function(blob, filename, id) {
    const firebase = await firebaseReadyPromise;
    if (!firebase?.storageEnabled) {
      const error = new Error('FIREBASE_STORAGE_NOT_READY');
      error.code = 'FIREBASE_STORAGE_NOT_READY';
      showToast('Firebase Storage 연결을 확인해주세요.');
      throw error;
    }

    try {
      await firebase.ensureGuestSession();
      return await firebase.uploadImage({ blob, filename, id });
    } catch (error) {
      console.error('Firebase guest upload failed', error);

      if (error?.code === 'auth/operation-not-allowed') {
        showToast('Firebase 익명 로그인을 활성화해주세요.');
      } else if (error?.code === 'storage/unauthorized') {
        showToast('Storage 규칙이 업로드를 막고 있어요. Firebase Storage > Rules를 확인해주세요.');
      } else if (error?.code === 'storage/bucket-not-found') {
        showToast('Firebase Storage 버킷을 찾을 수 없어요. Storage 생성 상태를 확인해주세요.');
      } else if (error?.code === 'storage/quota-exceeded') {
        showToast('Firebase Storage 사용량 한도를 확인해주세요.');
      } else if (String(error?.code || '').startsWith('storage/')) {
        showToast(`Firebase Storage 오류: ${error.code}`);
      } else {
        showToast(`업로드 오류: ${error?.code || error?.message || 'unknown'}`);
      }
      throw error;
    }
  };

  // Keep the home screen minimal.
  const meta = document.querySelector('.host-upload-meta');
  if (meta) {
    meta.innerHTML = '<span>로그인 없이 주소 생성</span><span>WebP 자동 최적화</span><span>MY CODE 자동 보관</span>';
  }

  document.querySelector('.host-how')?.remove();
  document.querySelector('.host-mycode-banner')?.remove();

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
