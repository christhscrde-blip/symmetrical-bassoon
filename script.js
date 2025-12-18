const root = document.documentElement;
const prefersDark =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const defaults = {
  theme: prefersDark ? 'dark' : 'light',
  accent: '#7c3aed',
  motion: 'normal',
  pulse: true,
};

const loadPrefs = () => {
  const stored = JSON.parse(localStorage.getItem('flowdesk-prefs') || '{}');
  return { ...defaults, ...stored };
};

const savePrefs = (prefs) => {
  localStorage.setItem('flowdesk-prefs', JSON.stringify(prefs));
};

const applyTheme = (theme) => {
  root.dataset.theme = theme;
};

const applyAccent = (accent) => {
  root.style.setProperty('--accent', accent);
  const chips = document.querySelectorAll('.chip.accent');
  chips.forEach((chip) => {
    chip.classList.toggle('active-accent', chip.dataset.accent === accent);
  });
};

const applyMotion = (level) => {
  const reduced = level === 'reduced';
  root.style.setProperty('--motion', reduced ? 'reduce' : 'normal');
  document.body.style.scrollBehavior = reduced ? 'auto' : 'smooth';
  document.querySelectorAll('.bar').forEach((bar) => {
    bar.style.animationPlayState = reduced ? 'paused' : 'running';
  });
};

const applyPulse = (enabled) => {
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.style.boxShadow = enabled
      ? '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 18px 60px color-mix(in srgb, var(--accent) 26%, transparent)'
      : 'none';
  }
};

const syncStats = (prefs) => {
  const motion = document.getElementById('stat-motion');
  const theme = document.getElementById('stat-theme');
  const accent = document.getElementById('stat-accent');
  if (motion) motion.textContent = prefs.motion === 'reduced' ? 'reduziert' : 'weich';
  if (theme) theme.textContent = prefs.theme === 'dark' ? 'dunkel' : 'hell';
  if (accent) accent.textContent = prefs.accent;
};

const wireThemeToggle = (prefs) => {
  const toggles = [document.getElementById('theme-toggle'), document.getElementById('dark-mode-toggle')];
  toggles.forEach((toggle) => {
    if (!toggle) return;
    toggle.checked = prefs.theme === 'dark';
    toggle.addEventListener('click', () => {
      prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
      applyTheme(prefs.theme);
      savePrefs(prefs);
      syncStats(prefs);
      toggles.forEach((t) => {
        if (t && t.type === 'checkbox') t.checked = prefs.theme === 'dark';
      });
    });
  });
};

const wireMotionToggle = (prefs) => {
  const motionToggle = document.getElementById('motion-toggle');
  if (!motionToggle) return;
  motionToggle.checked = prefs.motion === 'reduced';
  motionToggle.addEventListener('change', () => {
    prefs.motion = motionToggle.checked ? 'reduced' : 'normal';
    applyMotion(prefs.motion);
    savePrefs(prefs);
    syncStats(prefs);
  });
};

const wirePulse = (prefs) => {
  const pulseToggle = document.getElementById('pulse-toggle');
  const pulsePref = document.getElementById('pulse-pref');
  [pulseToggle, pulsePref].forEach((el) => {
    if (!el) return;
    const isCheckbox = el.type === 'checkbox';
    if (isCheckbox) el.checked = prefs.pulse;
    el.addEventListener(isCheckbox ? 'change' : 'click', () => {
      prefs.pulse = isCheckbox ? el.checked : !prefs.pulse;
      if (pulseToggle && !isCheckbox) pulseToggle.textContent = prefs.pulse ? 'Pulse aktiv' : 'Pulse aus';
      if (pulsePref && !isCheckbox) pulsePref.checked = prefs.pulse;
      if (pulsePref && isCheckbox) pulseToggle && (pulseToggle.textContent = prefs.pulse ? 'Pulse aktiv' : 'Pulse aus');
      applyPulse(prefs.pulse);
      savePrefs(prefs);
    });
  });
};

const wireAccent = (prefs) => {
  const options = document.querySelectorAll('[data-accent]');
  options.forEach((opt) => {
    opt.addEventListener('click', () => {
      const color = opt.dataset.accent;
      prefs.accent = color;
      applyAccent(color);
      savePrefs(prefs);
      syncStats(prefs);
    });
  });
};

const animateSessions = () => {
  const el = document.getElementById('session-counter');
  if (!el) return;
  let value = parseInt(el.textContent, 10) || 0;
  setInterval(() => {
    const delta = Math.random() > 0.5 ? 1 : -1;
    value = Math.max(8, value + delta);
    el.textContent = value;
  }, 2400);
};

document.addEventListener('DOMContentLoaded', () => {
  const prefs = loadPrefs();
  applyTheme(prefs.theme);
  applyAccent(prefs.accent);
  applyMotion(prefs.motion);
  applyPulse(prefs.pulse);
  syncStats(prefs);

  wireThemeToggle(prefs);
  wireMotionToggle(prefs);
  wirePulse(prefs);
  wireAccent(prefs);
  animateSessions();
});
