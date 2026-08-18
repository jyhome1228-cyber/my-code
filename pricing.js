const billingButtons = [...document.querySelectorAll('[data-billing]')];
const planCards = [...document.querySelectorAll('.pricing-card[data-plan]')];
const annualPaymentNote = document.querySelector('#annualPaymentNote');

const formatWon = (value) => `${Number(value).toLocaleString('ko-KR')}원`;

function updatePricing(mode) {
  billingButtons.forEach((button) => {
    const active = button.dataset.billing === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  planCards.forEach((card) => {
    const plan = card.dataset.plan;
    const priceEl = card.querySelector('[data-price]');
    const cycleEl = card.querySelector('[data-cycle]');
    const detailEl = card.querySelector('[data-billing-detail]');

    if (!priceEl || !cycleEl || !detailEl) return;

    if (plan === 'enterprise') {
      priceEl.textContent = '별도 문의';
      cycleEl.textContent = '';
      detailEl.textContent = mode === 'yearly'
        ? '연간 계약 조건 별도 협의'
        : '기업별 계약 및 결제 조건 협의';
      return;
    }

    const monthly = Number(card.dataset.monthly || 0);
    const yearly = Number(card.dataset.yearly || 0);

    if (mode === 'yearly') {
      if (yearly === 0) {
        priceEl.textContent = '0원';
        cycleEl.textContent = '/ 년';
        detailEl.textContent = '연간 결제도 0원';
        return;
      }

      const effectiveMonthly = Math.round(yearly / 12);
      priceEl.textContent = formatWon(yearly);
      cycleEl.textContent = '/ 년';
      detailEl.innerHTML = `<strong>연 ${formatWon(yearly)} 일시 결제</strong><span>월 ${formatWon(effectiveMonthly)}꼴 · 2개월 무료</span>`;
      return;
    }

    priceEl.textContent = formatWon(monthly);
    cycleEl.textContent = '/ 월';
    detailEl.textContent = monthly === 0 ? '계속 무료로 사용할 수 있습니다.' : `매월 ${formatWon(monthly)} 결제`;
  });

  if (annualPaymentNote) annualPaymentNote.hidden = mode !== 'yearly';
}

billingButtons.forEach((button) => {
  button.addEventListener('click', () => updatePricing(button.dataset.billing));
});

updatePricing('monthly');
