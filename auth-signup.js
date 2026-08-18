import { firebaseConfig } from './firebase-client.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const dialog = document.querySelector('#authDialog');
if (dialog) initSignupModule();

function initSignupModule() {
  ensureSignupMarkup();

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const loginView = document.querySelector('#authLoginView');
  const signupView = document.querySelector('#authSignupView');
  const openSignupButton = document.querySelector('#openSignupButton');
  const signupBackButton = document.querySelector('#signupBackButton');
  const signupSubmitButton = document.querySelector('#signupSubmitButton');
  const signupMessage = document.querySelector('#signupMessage');

  const signupName = document.querySelector('#signupName');
  const signupPhone = document.querySelector('#signupPhone');
  const signupEmail = document.querySelector('#signupEmail');
  const signupPassword = document.querySelector('#signupPassword');
  const signupPasswordConfirm = document.querySelector('#signupPasswordConfirm');
  const signupAll = document.querySelector('#signupAll');
  const signupTerms = document.querySelector('#signupTerms');
  const signupPrivacy = document.querySelector('#signupPrivacy');
  const signupMarketingEmail = document.querySelector('#signupMarketingEmail');

  openSignupButton?.addEventListener('click', showSignup);
  signupBackButton?.addEventListener('click', showLogin);
  signupSubmitButton?.addEventListener('click', submitSignup);

  signupPhone?.addEventListener('input', () => {
    const digits = signupPhone.value.replace(/\D/g, '').slice(0, 11);
    signupPhone.value = formatPhone(digits);
  });

  signupAll?.addEventListener('change', () => {
    const checked = signupAll.checked;
    if (signupTerms) signupTerms.checked = checked;
    if (signupPrivacy) signupPrivacy.checked = checked;
    if (signupMarketingEmail) signupMarketingEmail.checked = checked;
  });

  [signupTerms, signupPrivacy, signupMarketingEmail].filter(Boolean).forEach((box) => {
    box.addEventListener('change', () => {
      if (!signupAll) return;
      signupAll.checked = Boolean(signupTerms?.checked && signupPrivacy?.checked && signupMarketingEmail?.checked);
    });
  });

  signupPasswordConfirm?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') signupSubmitButton?.click();
  });

  dialog.addEventListener('close', () => window.setTimeout(showLogin, 0));

  function showSignup() {
    if (signupMessage) signupMessage.textContent = '';
    if (loginView) loginView.hidden = true;
    if (signupView) signupView.hidden = false;
    signupName?.focus();
  }

  function showLogin() {
    if (signupMessage) signupMessage.textContent = '';
    if (signupView) signupView.hidden = true;
    if (loginView) loginView.hidden = false;
  }

  async function submitSignup() {
    const name = signupName?.value.trim() || '';
    const phone = signupPhone?.value.trim() || '';
    const email = signupEmail?.value.trim() || '';
    const password = signupPassword?.value || '';
    const passwordConfirm = signupPasswordConfirm?.value || '';
    const phoneDigits = phone.replace(/\D/g, '');

    if (name.length < 2) return setMessage('이름을 2자 이상 입력해주세요.');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) return setMessage('휴대폰 번호를 정확히 입력해주세요.');
    if (!email || !email.includes('@')) return setMessage('이메일 주소를 확인해주세요.');
    if (password.length < 6) return setMessage('비밀번호는 6자 이상으로 설정해주세요.');
    if (password !== passwordConfirm) return setMessage('비밀번호 확인이 일치하지 않습니다.');
    if (!signupTerms?.checked || !signupPrivacy?.checked) return setMessage('필수 약관에 동의해주세요.');

    setBusy(true);
    setMessage('');

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });

      await setDoc(doc(db, 'users', credential.user.uid), {
        name,
        phone,
        email,
        plan: 'FREE',
        signupMethod: 'email',
        consents: {
          terms: true,
          privacy: true,
          marketingEmail: Boolean(signupMarketingEmail?.checked)
        },
        termsAgreedAt: serverTimestamp(),
        privacyAgreedAt: serverTimestamp(),
        marketingEmailAgreedAt: signupMarketingEmail?.checked ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      clearSignupFields();
      dialog.close();
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  function setBusy(busy) {
    if (!signupSubmitButton) return;
    signupSubmitButton.disabled = busy;
    signupSubmitButton.textContent = busy ? '가입 중...' : '회원가입 완료';
  }

  function setMessage(message) {
    if (signupMessage) signupMessage.textContent = message;
  }

  function clearSignupFields() {
    [signupName, signupPhone, signupEmail, signupPassword, signupPasswordConfirm].filter(Boolean).forEach((input) => { input.value = ''; });
    [signupAll, signupTerms, signupPrivacy, signupMarketingEmail].filter(Boolean).forEach((box) => { box.checked = false; });
  }
}

function ensureSignupMarkup() {
  const content = dialog.querySelector('.auth-dialog-content');
  if (!content || content.querySelector('#authSignupView')) return;

  const loginView = document.createElement('div');
  loginView.id = 'authLoginView';
  loginView.className = 'auth-view';

  while (content.firstChild) loginView.appendChild(content.firstChild);
  content.appendChild(loginView);

  const oldSignupButton = loginView.querySelector('#emailSignupButton');
  if (oldSignupButton) {
    const replacement = oldSignupButton.cloneNode(true);
    replacement.id = 'openSignupButton';
    replacement.type = 'button';
    replacement.textContent = '회원가입';
    oldSignupButton.replaceWith(replacement);
  }

  const signupView = document.createElement('div');
  signupView.id = 'authSignupView';
  signupView.className = 'auth-view';
  signupView.hidden = true;
  signupView.innerHTML = `
    <div class="signup-title-row">
      <button class="signup-back-button" id="signupBackButton" type="button" aria-label="로그인으로 돌아가기">←</button>
      <p class="eyebrow">CREATE MY CODE ACCOUNT</p>
    </div>
    <h2>회원가입</h2>
    <p class="auth-description">기본 정보를 입력하면 My Cloud와 계정 관리 기능을 사용할 수 있습니다.</p>

    <div class="signup-grid">
      <label class="auth-field"><span>이름 *</span><input id="signupName" type="text" autocomplete="name" placeholder="홍길동" /></label>
      <label class="auth-field"><span>휴대폰 번호 *</span><input id="signupPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" /></label>
      <label class="auth-field is-full"><span>이메일 *</span><input id="signupEmail" type="email" autocomplete="email" placeholder="name@example.com" /></label>
      <label class="auth-field"><span>비밀번호 *</span><input id="signupPassword" type="password" autocomplete="new-password" placeholder="6자 이상" /></label>
      <label class="auth-field"><span>비밀번호 확인 *</span><input id="signupPasswordConfirm" type="password" autocomplete="new-password" placeholder="한 번 더 입력" /></label>
    </div>

    <div class="consent-box">
      <label class="consent-row is-all"><input id="signupAll" type="checkbox" /><span><strong>전체 동의</strong></span></label>
      <label class="consent-row"><input id="signupTerms" type="checkbox" /><span>[필수] <a href="./terms.html" target="_blank" rel="noopener">이용약관</a>에 동의합니다.</span></label>
      <label class="consent-row"><input id="signupPrivacy" type="checkbox" /><span>[필수] <a href="./privacy.html" target="_blank" rel="noopener">개인정보처리방침</a>에 동의합니다.</span></label>
      <label class="consent-row"><input id="signupMarketingEmail" type="checkbox" /><span>[선택] 이메일로 서비스 소식과 혜택을 받습니다.</span></label>
    </div>

    <button class="signup-submit" id="signupSubmitButton" type="button">회원가입 완료</button>
    <button class="signup-login-link" id="signupBackButtonBottom" type="button">이미 계정이 있나요? 로그인</button>
    <p class="auth-message" id="signupMessage" aria-live="polite"></p>`;

  content.appendChild(signupView);
  signupView.querySelector('#signupBackButtonBottom')?.addEventListener('click', () => signupView.querySelector('#signupBackButton')?.click());
}

function formatPhone(value) {
  if (value.length <= 3) return value;
  if (value.length <= 7) return `${value.slice(0, 3)}-${value.slice(3)}`;
  if (value.length <= 10) return `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
  return `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
}

function readableError(error) {
  const code = error?.code || '';
  if (code.includes('email-already-in-use')) return '이미 가입된 이메일입니다. 로그인해주세요.';
  if (code.includes('invalid-email')) return '이메일 주소를 확인해주세요.';
  if (code.includes('weak-password')) return '비밀번호는 6자 이상으로 설정해주세요.';
  if (code.includes('operation-not-allowed')) return 'Firebase에서 이메일/비밀번호 로그인을 활성화해주세요.';
  return '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}
