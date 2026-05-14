/* ===========================
   TANDAI — script.js (v2)
   Backend: Google Apps Script
   =========================== */

// ─── CONFIG ──────────────────────────────────────────
const API_URL      = 'https://script.google.com/macros/s/AKfycbysGZZh3VcJQRW_lGdIEaSFgbX-rFNrsyamjoECydX9JjTjGksHqZ7w6hVQDcuCU08q/exec';
const XP_PER_TASK  = 10;
const XP_MAX_DAILY = 100;

// ─── State ───────────────────────────────────────────
let currentUser  = null;
let sessionToken = null;
let localTasks   = [];
let localXP      = 0;
let localStreak  = 0;

// ─── API Helper ──────────────────────────────────────
async function api(action, body = {}) {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify({ action, ...body }),
  });
  return res.json();
}

// ─── Session ─────────────────────────────────────────
function saveSession(token, username) {
  localStorage.setItem('tandai_token', token);
  localStorage.setItem('tandai_user',  username);
}
function clearSession() {
  localStorage.removeItem('tandai_token');
  localStorage.removeItem('tandai_user');
}
function loadSession() {
  return {
    token:    localStorage.getItem('tandai_token'),
    username: localStorage.getItem('tandai_user'),
  };
}

// ─── Auth ─────────────────────────────────────────────
async function handleSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl    = document.getElementById('signup-error');
  errEl.classList.add('hidden');

  if (!username || username.length < 2) return showAuthError(errEl, 'Username minimal 2 karakter.');
  if (!password || password.length < 4) return showAuthError(errEl, 'Password minimal 4 karakter.');

  setAuthLoading(true, 'signup');
  const res = await api('signup', { username, password }).catch(() => ({ ok: false, error: 'Koneksi gagal.' }));
  setAuthLoading(false, 'signup');

  if (!res.ok) return showAuthError(errEl, res.error || 'Signup gagal.');

  sessionToken = res.token;
  currentUser  = res.username;
  localStreak  = res.streak || 1;
  localXP      = res.xpToday || 0;
  localTasks   = [];
  saveSession(sessionToken, currentUser);
  loadDashboard();
}

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.classList.add('hidden');

  if (!username || !password) return showAuthError(errEl, 'Isi username dan password dulu.');

  setAuthLoading(true, 'login');
  const res = await api('login', { username, password }).catch(() => ({ ok: false, error: 'Koneksi gagal.' }));
  setAuthLoading(false, 'login');

  if (!res.ok) return showAuthError(errEl, res.error || 'Login gagal.');

  sessionToken = res.token;
  currentUser  = res.username;
  localStreak  = res.streak || 0;
  localXP      = res.xpToday || 0;
  localTasks   = [];
  saveSession(sessionToken, currentUser);
  await loadDashboard();
}

async function handleLogout() {
  if (sessionToken) api('logout', { token: sessionToken });
  clearSession();
  currentUser  = null;
  sessionToken = null;
  localTasks   = [];
  localXP      = 0;
  localStreak  = 0;
  switchScreen('auth-screen');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

// ─── Loading states ───────────────────────────────────
function setAuthLoading(on, form) {
  const btn = document.querySelector(`#${form}-card .btn-primary`);
  if (!btn) return;
  btn.disabled    = on;
  btn.textContent = on ? 'Memuat...' : (form === 'login' ? 'Masuk →' : 'Buat Akun →');
}

function setDashLoading(show) {
  let el = document.getElementById('dash-loading');
  if (!el && show) {
    el = document.createElement('div');
    el.id = 'dash-loading';
    el.className = 'dash-loading-overlay';
    el.innerHTML = '<div class="dash-loading-spinner">✦</div><p>Memuat data...</p>';
    document.getElementById('dashboard-screen').prepend(el);
  }
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ─── Screen switching ─────────────────────────────────
function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
    s.style.opacity = '0';
  });
  const t = document.getElementById(id);
  t.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.classList.add('active');
  }));
}

function switchToSignup() {
  document.getElementById('login-card').classList.remove('active');
  document.getElementById('signup-card').classList.add('active');
}
function switchToLogin() {
  document.getElementById('signup-card').classList.remove('active');
  document.getElementById('login-card').classList.add('active');
}

// ─── Dashboard ────────────────────────────────────────
async function loadDashboard() {
  switchScreen('dashboard-screen');
  setDashLoading(true);
  document.getElementById('display-username').textContent = currentUser;
  document.getElementById('streak-count').textContent    = localStreak;

  const now = new Date();
  document.getElementById('footer-date').textContent =
    now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  try {
    const res = await api('getTasks', { token: sessionToken });
    if (res.ok) localTasks = res.tasks || [];
  } catch(e) { console.warn('Load tasks failed:', e); }

  setDashLoading(false);
  renderTasks();
  renderXP();
  setupConfettiObserver();
}

// ─── Task CRUD ────────────────────────────────────────
function addTask() {
  const input = document.getElementById('task-input');
  const text  = input.value.trim();
  if (!text) {
    input.style.borderColor = '#F4A261';
    setTimeout(() => input.style.borderColor = '', 700);
    input.focus();
    return;
  }
  localTasks.push({ id: String(Date.now()), text, done: false });
  input.value = '';
  input.focus();
  renderTasks();
  syncTasks();
}

function toggleTask(taskId) {
  const task = localTasks.find(t => t.id === taskId);
  if (!task) return;
  const wasDone = task.done;
  task.done = !task.done;
  if (!wasDone && task.done) {
    localXP = Math.min(localXP + XP_PER_TASK, XP_MAX_DAILY);
    spawnXPFloat();
  } else if (wasDone && !task.done) {
    localXP = Math.max(localXP - XP_PER_TASK, 0);
  }
  renderTasks();
  renderXP();
  syncTasks();
  syncXP();
}

function deleteTask(taskId) {
  const task = localTasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.done) localXP = Math.max(localXP - XP_PER_TASK, 0);

  const el = document.querySelector(`[data-task-id="${taskId}"]`);
  if (el) {
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      localTasks = localTasks.filter(t => t.id !== taskId);
      renderTasks(); renderXP(); syncTasks(); syncXP();
    }, { once: true });
  } else {
    localTasks = localTasks.filter(t => t.id !== taskId);
    renderTasks(); renderXP(); syncTasks(); syncXP();
  }
}

// ─── Debounced Sync ───────────────────────────────────
let syncTimer = null;
function syncTasks() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    if (!sessionToken) return;
    try { await api('saveTasks', { token: sessionToken, tasks: localTasks }); }
    catch(e) { console.warn('Sync tasks gagal:', e); }
  }, 800);
}

let xpTimer = null;
function syncXP() {
  clearTimeout(xpTimer);
  xpTimer = setTimeout(async () => {
    if (!sessionToken) return;
    try { await api('saveUserData', { token: sessionToken, xpToday: localXP }); }
    catch(e) { console.warn('Sync XP gagal:', e); }
  }, 800);
}

// ─── Render Tasks ─────────────────────────────────────
function renderTasks() {
  const list     = document.getElementById('task-list');
  const empty    = document.getElementById('empty-state');
  const progress = document.getElementById('task-progress-text');
  const footer   = document.getElementById('footer-progress');

  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (localTasks.length === 0) {
    empty.style.display = 'flex';
    progress.textContent = '0 / 0 selesai';
    footer.textContent   = '0% selesai';
    return;
  }

  empty.style.display = 'none';
  const done  = localTasks.filter(t => t.done).length;
  const total = localTasks.length;
  const pct   = Math.round((done / total) * 100);

  progress.textContent = `${done} / ${total} selesai`;
  footer.textContent   = `${pct}% selesai`;

  localTasks.forEach(task => {
    const item = document.createElement('div');
    item.className      = `task-item${task.done ? ' done' : ''}`;
    item.dataset.taskId = task.id;
    item.innerHTML = `
      <div class="task-checkbox${task.done ? ' checked' : ''}" onclick="toggleTask('${task.id}')">
        <span class="check-icon">✓</span>
      </div>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-delete" onclick="deleteTask('${task.id}')" title="Hapus task">✕</button>
    `;
    list.appendChild(item);
  });
}

// ─── Render XP ────────────────────────────────────────
function renderXP() {
  const pct = Math.min((localXP / XP_MAX_DAILY) * 100, 100);
  document.getElementById('xp-value').textContent     = `${localXP} XP`;
  document.getElementById('xp-bar-fill').style.width  = `${pct}%`;
  document.getElementById('xp-bar-glow').style.width  = `${pct}%`;
  document.getElementById('streak-count').textContent = localStreak;

  const sub = document.getElementById('xp-sublabel');
  if (localXP === 0)            sub.textContent = 'Selesaikan task untuk dapat XP! ✨';
  else if (localXP >= XP_MAX_DAILY) sub.textContent = 'Level max hari ini! Luar biasa! 🎉';
  else sub.textContent = `${(XP_MAX_DAILY - localXP) / XP_PER_TASK} task lagi untuk XP max 💪`;
}

// ─── XP Float ────────────────────────────────────────
function spawnXPFloat() {
  const container = document.getElementById('xp-floats');
  const rect      = document.querySelector('.xp-section').getBoundingClientRect();
  const f = document.createElement('div');
  f.className   = 'xp-float';
  f.textContent = `+${XP_PER_TASK} XP ✦`;
  f.style.left  = `${rect.left + rect.width * 0.3 + Math.random() * rect.width * 0.4}px`;
  f.style.top   = `${rect.bottom - 10}px`;
  container.appendChild(f);
  f.addEventListener('animationend', () => f.remove());
}

// ─── Confetti ─────────────────────────────────────────
let confettiObserver = null;
function setupConfettiObserver() {
  if (confettiObserver) confettiObserver.disconnect();
  confettiObserver = new MutationObserver(() => {
    if (localTasks.length >= 3 && localTasks.every(t => t.done)) triggerConfetti();
  });
  const tl = document.getElementById('task-list');
  if (tl) confettiObserver.observe(tl, { childList:true, subtree:true, attributes:true });
}

function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  const colors = ['#A8C3A0','#F4A261','#F6F1E8','#6A9966','#FBBF8C','#B8D4B2'];
  const pieces = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * -200,
    r: Math.random() * 7 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    tiltAngle: 0, tiltInc: Math.random() * 0.07 + 0.05, speed: Math.random() * 2 + 1.5,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tiltAngle);
      ctx.fillRect(0, 0, p.r, p.r * 2); ctx.restore();
      p.tiltAngle += p.tiltInc; p.y += p.speed; p.x += Math.sin(frame / 20) * 0.8;
      if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
    });
    if (++frame < 160) requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  }
  draw();
}

// ─── Helpers ──────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function showAuthError(el, msg) {
  if (!msg) { el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─── Boot ─────────────────────────────────────────────
(function init() {
  const { token, username } = loadSession();

  if (token && username) {
    sessionToken = token;
    currentUser  = username;
    api('getUserData', { token })
      .then(res => {
        if (!res.ok) { clearSession(); switchScreen('auth-screen'); return; }
        localStreak = res.streak  || 0;
        localXP     = res.xpToday || 0;
        loadDashboard();
      })
      .catch(() => { localStreak = 0; localXP = 0; loadDashboard(); });
  } else {
    switchScreen('auth-screen');
  }

  ['login-username','login-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key==='Enter') handleLogin(); }));
  ['signup-username','signup-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key==='Enter') handleSignup(); }));
  document.getElementById('task-input').addEventListener('keydown', e => { if (e.key==='Enter') addTask(); });
})();
