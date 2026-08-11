// my:code v10 — guest-first hosting flow with staged progress
(() => {
  const UPLOAD_TIMEOUT_MS = 30000;

  function withTimeout(promise, ms, code = 'UPLOAD_TIMEOUT') {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => {
        const error = new Error(code);
        error.code = code;
        reject(error);
      }, ms))
    ]);
  }

  function readableError(error) {
    const code = String(error?.code || '');
    if (code === 'auth/operation-not-allowed') return 'Firebase 익명 로그인을 확인해주세요.';
    if (code === 'storage/unauthorized') return 'Storage 규칙이 업로드를 막고 있어요.';
    if (code === 'storage/bucket-not-found') return 'Firebase Storage 버킷을 찾을 수 없어요.';
    if (code === 'storage/quota-exceeded') return 'Firebase Storage 사용량 한도를 확인해주세요.';
    if (code === 'UPLOAD_TIMEOUT') return 'Firebase 응답이 늦어지고 있어요. 다시 시도해주세요.';
    if (code.startsWith('storage/')) return `Firebase Storage 오류: ${code}`;
    return `업로드하지 못했어요${code ? ` · ${code}` : ''}`;
  }

  // Final upload override: always create an anonymous Firebase session first.
  uploadToApi = async function(blob, filename, id, onProgress) {
    const firebase = await withTimeout(firebaseReadyPromise, 12000, 'FIREBASE_INIT_TIMEOUT');
    if (!firebase?.storageEnabled) {
      const error = new Error('FIREBASE_STORAGE_NOT_READY');
      error.code = 'FIREBASE_STORAGE_NOT_READY';
      throw error;
    }

    await withTimeout(firebase.ensureGuestSession(), 12000, 'AUTH_TIMEOUT');
    return withTimeout(firebase.uploadImage({ blob, filename, id, onProgress }), UPLOAD_TIMEOUT_MS);
  };

  createPendingCard = function(name) {
    const element = document.createElement('article');
    element.className = 'host-processing-card';
    element.innerHTML = `
      <div class="host-processing-visual">
        <span class="host-spinner"></span>
        <span class="host-progress-number">0%</span>
      </div>
      <div class="host-processing-copy">
        <strong>${escapeHTML(name)}</strong>
        <span class="host-processing-stage">이미지를 확인하는 중…</span>
        <div class="host-processing-track"><i></i></div>
        <div class="host-processing-steps">
          <span class="is-active">변환</span><span>연결</span><span>업로드</span><span>주소 생성</span>
        </div>
      </div>
    `;

    const stageEl = element.querySelector('.host-processing-stage');
    const bar = element.querySelector('.host-processing-track i');
    const percent = element.querySelector('.host-progress-number');
    const steps = [...element.querySelectorAll('.host-processing-steps span')];

    function setStep(index) {
      steps.forEach((step, i) => {
        step.classList.toggle('is-active', i === index);
        step.classList.toggle('is-done', i < index);
      });
    }

    return {
      element,
      setStage(text, stepIndex = 0) {
        if (stageEl) stageEl.textContent = text;
        setStep(stepIndex);
      },
      setProgress(value) {
        const safe = Math.max(0, Math.min(100, Math.round(value || 0)));
        if (bar) bar.style.width = `${safe}%`;
        if (percent) percent.textContent = `${safe}%`;
      },
      replace(newElement) { element.replaceWith(newElement); },
      fail(message) {
        element.classList.add('has-error');
        if (stageEl) stageEl.textContent = message || '처리하지 못했어요.';
        if (percent) percent.textContent = '!';
        if (bar) bar.style.width = '100%';
        steps.forEach(step => step.classList.remove('is-active'));
      }
    };
  };

  // Override the original app flow so progress is visible and upload cannot hang forever.
  handleFiles = async function(files) {
    const images = files.filter(file => file.type.startsWith('image/'));
    if (!images.length) {
      showToast('이미지 파일만 올릴 수 있어요.');
      return;
    }

    el.uploadResults.hidden = false;
    el.resultList.innerHTML = '';
    state.lastUploaded = [];

    for (const file of images) {
      const pending = createPendingCard(file.name);
      el.resultList.appendChild(pending.element);

      try {
        pending.setStage('이미지를 WebP로 최적화하는 중…', 0);
        pending.setProgress(8);
        const processed = await processImage(file);
        pending.setProgress(22);

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const extension = processed.mime === 'image/webp' ? 'webp' : getExtension(file.name) || 'img';
        const filename = `${stripExtension(file.name)}.${extension}`;

        pending.setStage('Firebase에 연결하는 중…', 1);
        pending.setProgress(28);

        const remote = await uploadToApi(processed.blob, filename, id, progress => {
          pending.setStage('이미지를 업로드하는 중…', 2);
          pending.setProgress(30 + (progress * 0.62));
        });

        pending.setStage('이미지 주소를 만드는 중…', 3);
        pending.setProgress(96);

        await putBlob(id, processed.blob);

        const item = {
          id,
          originalName: file.name,
          name: filename,
          mime: processed.mime,
          originalSize: file.size,
          size: processed.blob.size,
          width: processed.width,
          height: processed.height,
          createdAt: now,
          projectId: null,
          publicUrl: remote?.url || null,
          shortCode: remote?.shortCode || null,
          storageKey: remote?.key || null,
          storageMode: remote?.url ? 'firebase' : 'local'
        };

        if (!item.publicUrl) throw Object.assign(new Error('NO_PUBLIC_URL'), { code: 'NO_PUBLIC_URL' });

        state.items.unshift(item);
        state.lastUploaded.push(id);
        saveItems();
        pending.setProgress(100);
        pending.replace(await createResultCard(item));
      } catch (error) {
        console.error('Image hosting failed', error);
        const message = readableError(error);
        pending.fail(message);
        showToast(message);
      }
    }

    renderCounts();
    renderUsage();
  };

  // Keep the home screen minimal.
  const meta = document.querySelector('.host-upload-meta');
  if (meta) meta.innerHTML = '<span>로그인 없이 주소 생성</span><span>WebP 자동 최적화</span><span>MY CODE 자동 보관</span>';
  document.querySelector('.host-how')?.remove();
  document.querySelector('.host-mycode-banner')?.remove();

  const authDescription = document.querySelector('#authModal .auth-description');
  if (authDescription) authDescription.textContent = '로그인 없이도 바로 사용할 수 있어요. Google 계정을 연결하면 MY CODE를 계정으로 이어서 관리할 수 있습니다.';

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
