(() => {
  const sectionLinks = [...document.querySelectorAll('[data-howto-link]')];
  const sections = [...document.querySelectorAll('[data-howto-section]')];
  const copyButtons = [...document.querySelectorAll('[data-copy-example]')];

  const setActive = (id) => {
    sectionLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  sectionLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href')?.slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
      setActive(id);
    });
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible?.target?.id) setActive(visible.target.id);
    }, { rootMargin: '-20% 0px -62% 0px', threshold: [0, .1, .35] });
    sections.forEach((section) => observer.observe(section));
  }

  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyExample || '');
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent.trim());
        const original = button.textContent;
        button.textContent = '복사 완료';
        setTimeout(() => { button.textContent = original; }, 1000);
      } catch (_) {
        button.textContent = '복사 실패';
      }
    });
  });

  const initial = location.hash.slice(1) || 'overview';
  setActive(document.getElementById(initial) ? initial : 'overview');
})();
