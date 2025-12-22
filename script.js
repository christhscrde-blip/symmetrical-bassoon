const root = document.documentElement;
const prefersDark =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const defaults = {
  theme: prefersDark ? 'dark' : 'light',
  accent: '#6c72ff',
  motion: 'normal',
  pulse: true,
  noteTitle: '',
  noteBody: '',
  noteSubdomain: '',
};

const state = {
  statsFrozen: false,
  subdomains: [
    { name: 'core.flow', status: 'Online' },
    { name: 'metrics.flow', status: 'Online' },
    { name: 'ops.flow', status: 'Teilweise' },
    { name: 'shop.radioeins.de', status: 'Online' },
    { name: 'stream.radioeins.de', status: 'Online' },
    { name: 'cdn.flow', status: 'Wartung' },
    { name: 'media.flow', status: 'Online' },
    { name: 'beta.flow', status: 'Wartung' },
  ],
  current: 'core.flow',
  latencyMs: 52,
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
    if (toggle.type === 'checkbox') toggle.checked = prefs.theme === 'dark';
    const handler = () => {
      prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
      applyTheme(prefs.theme);
      savePrefs(prefs);
      syncStats(prefs);
      toggles.forEach((t) => {
        if (t && t.type === 'checkbox') t.checked = prefs.theme === 'dark';
      });
      if (toggle.tagName === 'BUTTON') {
        toggle.setAttribute('aria-pressed', prefs.theme === 'dark');
      }
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
      if (pulseToggle && !isCheckbox) pulseToggle.checked = prefs.pulse;
      if (pulsePref && !isCheckbox) pulsePref.checked = prefs.pulse;
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

const liveStats = () => {
  const latency = document.getElementById('latency');
  const latencyLive = document.getElementById('latency-live');
  const throughput = document.getElementById('throughput');
  const throughputLive = document.getElementById('throughput-live');
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
    const throughputText = `${Math.round(sliders.throughput.value)} req/min`;
    throughput && (throughput.textContent = throughputText);
    throughputLive && (throughputLive.textContent = throughputText);
    queue && (queue.textContent = `${sliders.queue.value} Tasks`);
    cpu && (cpu.textContent = `${sliders.cpu.value}%`);
    latencyLive && (latencyLive.textContent = `${sliders.latency.value} ms`);
  };
  Object.values(sliders).forEach((slider) => slider?.addEventListener('input', updateSliderDisplays));
  updateSliderDisplays();

  const applyLatencyMeasurement = (ms) => {
    if (state.statsFrozen) return;
    state.latencyMs = ms;
    const throughputCalc = Math.min(
      2000,
      Math.max(200, Math.round(60000 / Math.max(ms, 20)))
    );
    sliders.latency.value = Math.min(180, Math.max(20, Math.round(ms)));
    sliders.throughput.value = throughputCalc;
    sliders.queue.value = Math.max(0, Math.min(50, Math.round(60 - throughputCalc / 40)));
    sliders.cpu.value = Math.max(5, Math.min(95, Math.round(20 + throughputCalc / 40)));
    updateSliderDisplays();
    latency && (latency.textContent = `${Math.round(ms)} ms`);
    bars.forEach((bar, idx) => {
      const base = 30 + throughputCalc / 40 - idx * 3;
      bar.style.height = `${Math.max(24, Math.min(90, base))}%`;
    });
  };

  const measureLatency = () => {
    const start = performance.now();
    return fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
      .then(() => performance.now() - start)
      .catch(() => 120 + Math.random() * 80);
  };

  const loop = async () => {
    const ms = await measureLatency();
    applyLatencyMeasurement(ms);
    setTimeout(loop, 7000);
  };
  loop();
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

const loadNotes = (prefs) => {
  const title = document.getElementById('note-title');
  const body = document.getElementById('note-body');
  const sub = document.getElementById('note-subdomain');
  const status = document.getElementById('note-status');
  if (!title || !body || !sub) return;
  title.value = prefs.noteTitle || '';
  body.value = prefs.noteBody || '';
  sub.value = prefs.noteSubdomain || '';
  if (status && (prefs.noteTitle || prefs.noteBody || prefs.noteSubdomain)) {
    status.textContent = 'Gespeichert';
  }
};

const wireNotes = (prefs) => {
  const form = document.getElementById('notes-form');
  const title = document.getElementById('note-title');
  const body = document.getElementById('note-body');
  const sub = document.getElementById('note-subdomain');
  const status = document.getElementById('note-status');
  if (!form || !title || !body || !sub) return;

  const persist = () => {
    prefs.noteTitle = title.value;
    prefs.noteBody = body.value;
    prefs.noteSubdomain = sub.value;
    savePrefs(prefs);
    if (status) status.textContent = 'Gespeichert';
  };

  [title, body, sub].forEach((el) => el.addEventListener('input', persist));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    persist();
  });
};

const wireTabs = () => {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;
      const target = document.getElementById(targetId);
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
};

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
        <p>Status: <span class="chip ${status === 'Online' ? 'success status' : 'status'}">${status}</span></p>
      </div>
      <div class="actions">
        <button class="chip" data-action="activate">Aktivieren</button>
        <button class="chip subtle" data-action="open">Öffnen</button>
      </div>
    `;
    item.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => handleSubdomainAction(btn.dataset.action, name));
    });
    list.appendChild(item);
  });
  const activeLabel = document.getElementById('active-label');
  if (activeLabel) activeLabel.textContent = `${state.subdomains.length} aktiv`;
};

const handleSubdomainAction = (action, name) => {
  if (action === 'activate') {
    state.current = name;
    const label = document.getElementById('status-label');
    const chip = document.getElementById('status-chip');
    if (label) label.textContent = name;
    if (chip) chip.textContent = 'Online';
  }
  if (action === 'open') {
    window.open(`https://${name}`, '_blank');
  }
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
  animateSessions();
  liveStats();
  fetchIP();
  loadNotes(prefs);
  wireNotes(prefs);
  wireTabs();

  const refreshIp = document.getElementById('refresh-ip');
  refreshIp?.addEventListener('click', fetchIP);

  document.getElementById('cta-settings')?.addEventListener('click', () => {
    window.location.href = 'https://christhscrde-blip.github.io/symmetrical-bassoon/settings';
  });
  document.getElementById('open-settings')?.addEventListener('click', () => {
    window.location.href = 'https://christhscrde-blip.github.io/symmetrical-bassoon/settings';
  });
  document.getElementById('quick-settings')?.addEventListener('click', () => {
    window.location.href = 'https://christhscrde-blip.github.io/symmetrical-bassoon/settings';
  });
  document.getElementById('ping-test')?.addEventListener('click', () => {
    const latency = document.getElementById('latency');
    if (latency) latency.textContent = `${20 + Math.round(Math.random() * 80)} ms`;
  });

  const darkToggle = document.getElementById('dark-mode-toggle');
  if (darkToggle) {
    darkToggle.checked = prefs.theme === 'dark';
    darkToggle.addEventListener('change', () => {
      prefs.theme = darkToggle.checked ? 'dark' : 'light';
      applyTheme(prefs.theme);
      savePrefs(prefs);
      syncStats(prefs);
    });
  }
});
