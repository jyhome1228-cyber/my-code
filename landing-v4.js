// my:code landing v4 interactions
(() => {
  const uploadButton = document.getElementById('v4UploadButton');
  const fileInput = document.getElementById('fileInput');
  const home = document.getElementById('view-upload');

  uploadButton?.addEventListener('click', () => fileInput?.click());

  // Keep landing sections subtly responsive without adding heavy animation libraries.
  const revealTargets = document.querySelectorAll(
    '.v4-stats, .v4-section-head, .v4-mosaic, .v4-flow-grid, .v4-organize, .v4-benefit-grid, .v4-pricing, .v4-final-cta'
  );

  revealTargets.forEach(target => target.classList.add('v4-reveal'));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    revealTargets.forEach(target => observer.observe(target));
  } else {
    revealTargets.forEach(target => target.classList.add('is-visible'));
  }

  // If the user returns to UPLOAD from an app sub-view, show the top of the new landing cleanly.
  document.querySelectorAll('[data-view="upload"]').forEach(button => {
    button.addEventListener('click', () => {
      if (!home) return;
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    });
  });
})();
