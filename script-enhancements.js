(function () {
  const STORAGE = {
    lastRoute: 'sg2_last_route',
    progress: 'sg2_progress'
  };

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage restrictions
    }
  }

  function ensureProgressBar() {
    if (document.getElementById('siteProgress')) return;
    const bar = document.createElement('div');
    bar.id = 'siteProgress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<span></span>';
    document.body.prepend(bar);
  }

  function updateProgressBar() {
    const units = Array.isArray(window.UNITS) ? window.UNITS : [];
    const progressMap = readStorage(STORAGE.progress, {});
    let completed = 0;

    units.forEach(unit => {
      const item = progressMap['u' + unit.id];
      if (item && item.total && item.score >= item.total) completed++;
    });

    const percent = units.length ? Math.round((completed / units.length) * 100) : 0;
    const fill = document.querySelector('#siteProgress span');
    if (fill) fill.style.width = percent + '%';
  }

  function createResumeCard() {
    const content = document.getElementById('content');
    if (!content || document.getElementById('resumeCard')) return;

    const route = (localStorage.getItem(STORAGE.lastRoute) || '').replace(/^#/, '');
    const match = route.match(/\/unit\/(\d+)/);
    if (!match) return;

    const unitNumber = match[1];
    const card = document.createElement('div');
    card.id = 'resumeCard';
    card.className = 'resume-card';
    card.innerHTML = `
      <div class="resume-copy">
        <b>استئناف التعلم</b>
        <span>تابع من الوحدة ${unitNumber} حيث توقفت.</span>
      </div>
      <button class="btn secondary" type="button" id="resumeBtn">متابعة الوحدة</button>
    `;

    content.prepend(card);

    const button = document.getElementById('resumeBtn');
    if (button && typeof window.goTo === 'function') {
      button.addEventListener('click', () => window.goTo('/unit/' + unitNumber));
    }
  }

  function rememberRoute() {
    const route = window.location.hash || '#/';
    writeStorage(STORAGE.lastRoute, route);
  }

  function init() {
    ensureProgressBar();
    rememberRoute();
    updateProgressBar();
    createResumeCard();
  }

  window.addEventListener('load', init);
  window.addEventListener('hashchange', () => {
    rememberRoute();
    updateProgressBar();
    const oldCard = document.getElementById('resumeCard');
    if (oldCard) oldCard.remove();
    createResumeCard();
  });
})();
