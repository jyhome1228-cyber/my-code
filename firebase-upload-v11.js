// my:code v11 — guarantee anonymous Firebase session before every upload
(() => {
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
        showToast('Firebase Storage 규칙이 업로드를 막고 있어요. Storage > Rules를 확인해주세요.');
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
})();
