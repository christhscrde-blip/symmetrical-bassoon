const root = document.documentElement;
const prefersDark =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const defaults = {
  theme: prefersDark ? 'dark' : 'light',
  accent: '#7c3aed',
  motion: 'normal',
  pulse: true,
};

const state = {
  subdomains: [
    { name: 'core.flow', status: 'Online' },
    { name: 'metrics.flow', status: 'Online' },
    { name: 'ops.flow', status: 'Teilweise' },
  ],
  current: 'core.flow',
  statsFrozen: false,
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
    const handler = () => {
      prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
      applyTheme(prefs.theme);
      savePrefs(prefs);
      syncStats(prefs);
      toggles.forEach((t) => {
        if (t && t.type === 'checkbox') t.checked = prefs.theme === 'dark';
      });
    };
    toggle.addEventListener(toggle.type === 'checkbox' ? 'change' : 'click', handler);
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
  }, 2200);
};

const randomStatus = () => (Math.random() > 0.85 ? 'Wartung' : 'Online');

const renderSubdomains = () => {
  const list = document.getElementById('subdomain-list');
  if (!list) return;
  list.innerHTML = '';
  state.subdomains.forEach(({ name, status }) => {
    const item = document.createElement('div');
    item.className = 'subdomain-item';
    item.innerHTML = `
      <div>
        <strong>${name}</strong>
        <p>Status: <span class="chip ${status === 'Online' ? 'success' : ''}">${status}</span></p>
      </div>
      <div class="actions">
        <button class="chip" data-action="activate">Aktivieren</button>
        <button class="chip subtle" data-action="duplicate">Duplizieren</button>
        <button class="chip subtle" data-action="remove">Löschen</button>
      </div>
    `;
    item.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => handleSubdomainAction(btn.dataset.action, name));
    });
    list.appendChild(item);
  });
  document.getElementById('subdomain-count')?.textContent = state.subdomains.length;
  document.getElementById('active-label')?.textContent = `${state.subdomains.length} aktiv`;
};

const handleSubdomainAction = (action, name) => {
  if (action === 'activate') {
    state.current = name;
    updateCurrentSubdomain();
  } else if (action === 'duplicate') {
    const next = `${name.split('.')[0]}-copy.${name.split('.').slice(1).join('.')}`;
    state.subdomains.push({ name: next, status: randomStatus() });
    renderSubdomains();
  } else if (action === 'remove') {
    state.subdomains = state.subdomains.filter((s) => s.name !== name);
    if (state.current === name && state.subdomains.length) {
      state.current = state.subdomains[0].name;
    }
    renderSubdomains();
    updateCurrentSubdomain();
  }
};

const wireSubdomainForm = () => {
  const input = document.getElementById('subdomain-input');
  const add = document.getElementById('add-subdomain');
  const open = document.getElementById('open-current');
  if (add && input) {
    add.addEventListener('click', () => {
      const value = input.value.trim();
      if (!value) return;
      state.subdomains.push({ name: value, status: 'Online' });
      state.current = value;
      input.value = '';
      renderSubdomains();
      updateCurrentSubdomain();
    });
  }
  if (open) {
    open.addEventListener('click', () => {
      alert(`Subdomain "${state.current}" geöffnet (simuliert).`);
    });
  }
  const shuffle = document.getElementById('shuffle-subdomain');
  if (shuffle) {
    shuffle.addEventListener('click', () => {
      const pick = state.subdomains[Math.floor(Math.random() * state.subdomains.length)];
      state.current = pick.name;
      updateCurrentSubdomain();
    });
  }
};

const updateCurrentSubdomain = () => {
  const current = document.getElementById('current-subdomain');
  const note = document.getElementById('subdomain-note');
  const status = document.getElementById('current-status');
  if (!current || !status) return;
  const match = state.subdomains.find((s) => s.name === state.current) || state.subdomains[0];
  current.textContent = match?.name || '–';
  status.textContent = match?.status || 'Offline';
  status.classList.toggle('success', match?.status === 'Online');
  if (note) note.textContent = match?.status === 'Online' ? 'Routing stabil – 99,96% Uptime' : 'Wartung aktiv – Rollback möglich';
};

const liveStats = () => {
  const latency = document.getElementById('latency');
  const latencyLive = document.getElementById('latency-live');
  const throughput = document.getElementById('throughput');
  const queue = document.getElementById('queue');
  const cpu = document.getElementById('cpu');
  const bars = document.querySelectorAll('#sparkline .bar');
  const sliders = {
    throughput: document.getElementById('throughput-slider'),
    queue: document.getElementById('queue-slider'),
    cpu: document.getElementById('cpu-slider'),
    latency: document.getElementById('latency-slider'),
  };
  const freeze = document.getElementById('freeze-stats');
  if (freeze) {
    freeze.addEventListener('click', () => {
      state.statsFrozen = !state.statsFrozen;
      freeze.textContent = state.statsFrozen ? 'Resume' : 'Freeze';
    });
  }
  const updateSliderDisplays = () => {
    throughput && (throughput.textContent = `${sliders.throughput.value} req/min`);
    queue && (queue.textContent = `${sliders.queue.value} Tasks`);
    cpu && (cpu.textContent = `${sliders.cpu.value}%`);
    latencyLive && (latencyLive.textContent = `${sliders.latency.value} ms`);
  };
  Object.values(sliders).forEach((slider) => slider?.addEventListener('input', updateSliderDisplays));
  updateSliderDisplays();

  setInterval(() => {
    if (state.statsFrozen) return;
    const jitter = (val, maxDelta, min, max) => {
      const delta = (Math.random() * 2 - 1) * maxDelta;
      return Math.min(max, Math.max(min, Math.round(val + delta)));
    };
    sliders.throughput.value = jitter(Number(sliders.throughput.value), 120, 200, 2000);
    sliders.queue.value = jitter(Number(sliders.queue.value), 6, 0, 50);
    sliders.cpu.value = jitter(Number(sliders.cpu.value), 8, 5, 95);
    sliders.latency.value = jitter(Number(sliders.latency.value), 14, 20, 180);
    updateSliderDisplays();
    latency && (latency.textContent = `${sliders.latency.value} ms`);
    bars.forEach((bar) => {
      bar.style.height = `${jitter(60, 25, 24, 96)}%`;
    });
  }, 1600);
};

const fetchIP = () => {
  const ipText = document.getElementById('ip-text');
  const ipChip = document.getElementById('ip-chip');
  fetch('https://api.ipify.org?format=json')
    .then((res) => res.json())
    .then((data) => {
      if (ipText) ipText.textContent = data.ip;
      if (ipChip) ipChip.textContent = `IP: ${data.ip}`;
    })
    .catch(() => {
      if (ipText) ipText.textContent = 'nicht ermittelbar';
      if (ipChip) ipChip.textContent = 'IP unbekannt';
    });
};

const accentRandomizer = (prefs) => {
  const btn = document.getElementById('accent-random');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const palette = ['#7c3aed', '#2563eb', '#10b981', '#f59e0b', '#ec4899', '#22d3ee'];
    const pick = palette[Math.floor(Math.random() * palette.length)];
    prefs.accent = pick;
    applyAccent(pick);
    savePrefs(prefs);
    syncStats(prefs);
  });
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
  accentRandomizer(prefs);
  renderSubdomains();
  wireSubdomainForm();
  updateCurrentSubdomain();
  animateSessions();
  liveStats();
  fetchIP();

  const refreshIp = document.getElementById('refresh-ip');
  refreshIp?.addEventListener('click', fetchIP);

  const openCurrent = document.getElementById('open-current');
  openCurrent?.addEventListener('click', () => {
    const info = document.getElementById('status-list');
    if (info) {
      const li = document.createElement('li');
      li.innerHTML = `<span>Zuletzt geöffnet</span><strong>${state.current}</strong>`;
      info.prepend(li);
      if (info.children.length > 6) info.removeChild(info.lastChild);
    }
  });
});
