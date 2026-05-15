/* ===========================
   TANDAI — script.js (v4)
   Single-page · Weekly strip · No tab footer
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

// Week strip state: offset in weeks from current week (0 = this week)
let weekOffset = 0;
// Currently selected date key (YYYY-MM-DD), null = today
let selectedDateKey = null;

let historyData = {}; // { "YYYY-MM-DD": { tasks: [], xp: 0 } }

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

// ─── Date helpers ────────────────────────────────────
function todayKey() {
  const d = new Date();
  return dateToKey(d);
}

function dateToKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function keyToDate(key) {
  return new Date(key + 'T00:00:00');
}

// Get the Sunday of the week containing `date`
function weekStart(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// ─── History (local storage) ─────────────────────────
function saveHistoryLocal() {
  if (!currentUser) return;
  const today = todayKey();
  const snapshot = {
    tasks: localTasks.map(t => ({ ...t })),
    xp:    localXP,
  };
  try {
    const stored = JSON.parse(localStorage.getItem(`tandai_history_${currentUser}`) || '{}');
    stored[today] = snapshot;
    const keys = Object.keys(stored).sort();
    while (keys.length > 90) { delete stored[keys.shift()]; }
    localStorage.setItem(`tandai_history_${currentUser}`, JSON.stringify(stored));
    historyData = stored;
  } catch(e) { console.warn('History save failed:', e); }
}

function loadHistoryLocal() {
  if (!currentUser) return;
  try {
    historyData = JSON.parse(localStorage.getItem(`tandai_history_${currentUser}`) || '{}');
  } catch(e) { historyData = {}; }
}

// ─── Dark Mode ───────────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem('tandai_theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tandai_theme', theme);
  const icon = theme === 'dark' ? '☀️' : '🌙';
  document.querySelectorAll('#darkmode-icon').forEach(el => el.textContent = icon);
}

function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
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
  loadHistoryLocal();
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
  loadHistoryLocal();
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
  historyData  = {};
  weekOffset   = 0;
  selectedDateKey = null;
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

  try {
    const res = await api('getTasks', { token: sessionToken });
    if (res.ok) localTasks = res.tasks || [];
  } catch(e) { console.warn('Load tasks failed:', e); }

  saveHistoryLocal();
  setDashLoading(false);

  // Always start on today view
  weekOffset = 0;
  selectedDateKey = null;
  showTodayView();

  renderWeekStrip();
  renderTasks();
  renderXP();
  setupConfettiObserver();
  setupNotifSchedule();
}

// ─── View switching: Today vs Day Detail ─────────────
function showTodayView() {
  selectedDateKey = null;
  document.getElementById('view-today').classList.remove('hidden');
  document.getElementById('view-daydetail').classList.add('hidden');
  // Re-highlight today on strip
  renderWeekStrip();
}

function showDayDetail(dateKey) {
  selectedDateKey = dateKey;
  const today = todayKey();

  // Update strip highlight
  renderWeekStrip();

  const dateObj = keyToDate(dateKey);
  const label   = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const dayData = historyData[dateKey];
  const xp      = dayData ? (dayData.xp || 0) : 0;

  document.getElementById('day-detail-big-title').textContent  = label;
  document.getElementById('day-detail-xp-badge').textContent   = `${xp} XP`;

  // Show stats only for past days
  const statsEl = document.getElementById('history-stats-mini');
  if (dateKey < today) {
    // Compute overall stats
    const keys        = Object.keys(historyData).sort();
    const activeDays  = keys.filter(k => historyData[k]?.tasks?.length > 0).length;
    const totalDone   = keys.reduce((sum, k) => sum + (historyData[k]?.tasks?.filter(t => t.done).length || 0), 0);
    document.getElementById('hist-total-days').textContent  = activeDays;
    document.getElementById('hist-total-tasks').textContent = totalDone;
    document.getElementById('hist-best-streak').textContent = localStreak;
    statsEl.style.display = 'grid';
  } else {
    statsEl.style.display = 'none';
  }

  // Render tasks
  const tasksEl = document.getElementById('day-detail-tasks');
  tasksEl.innerHTML = '';

  if (!dayData || !dayData.tasks || dayData.tasks.length === 0) {
    tasksEl.innerHTML = '<div class="day-detail-empty">Tidak ada task tercatat hari ini.</div>';
  } else {
    dayData.tasks.forEach(t => {
      const el = document.createElement('div');
      el.className = `day-detail-task${t.done ? ' done' : ''}`;
      el.innerHTML = `<div class="day-detail-task-dot"></div>${escapeHtml(t.text)}`;
      tasksEl.appendChild(el);
    });
  }

  document.getElementById('view-today').classList.add('hidden');
  document.getElementById('view-daydetail').classList.remove('hidden');
}

// ─── Weekly Strip ────────────────────────────────────
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function changeWeek(delta) {
  weekOffset += delta;
  renderWeekStrip();
}

function renderWeekStrip() {
  const today    = new Date();
  today.setHours(0,0,0,0);
  const todayStr = dateToKey(today);

  // Base: Sunday of current real week
  const baseWeekSun = weekStart(today);
  // Offset by weekOffset weeks
  const stripStart  = new Date(baseWeekSun);
  stripStart.setDate(stripStart.getDate() + weekOffset * 7);

  // Build 7 days of this strip
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(stripStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  // Month label: show month of the majority or range
  const firstDay = days[0];
  const lastDay  = days[6];
  let monthLabel;
  if (firstDay.getMonth() === lastDay.getMonth()) {
    monthLabel = `${MONTHS_ID[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  } else {
    monthLabel = `${MONTHS_ID[firstDay.getMonth()]} – ${MONTHS_ID[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
  }
  document.getElementById('week-month-label').textContent = monthLabel;

  const row = document.getElementById('week-days-row');
  row.innerHTML = '';

  // Determine active date
  const activeKey = selectedDateKey || todayStr;

  days.forEach(d => {
    const key       = dateToKey(d);
    const isToday   = key === todayStr;
    const isFuture  = d > today;
    const isSelected = key === activeKey;
    const dayData   = historyData[key];
    const hasAct    = dayData && dayData.tasks && dayData.tasks.length > 0;
    const allDone   = hasAct && dayData.tasks.every(t => t.done);

    const el = document.createElement('div');
    el.className = 'week-day';
    if (isToday)   el.classList.add('is-today');
    if (isSelected) el.classList.add('is-selected');
    if (hasAct)    el.classList.add('has-activity');
    if (allDone)   el.classList.add('all-done');

    el.innerHTML = `<span>${d.getDate()}</span><div class="week-dot"></div>`;

    if (!isFuture) {
      el.addEventListener('click', () => {
        if (isToday && !selectedDateKey) {
          // Already on today view, do nothing special
          showTodayView();
        } else if (key === todayStr) {
          showTodayView();
        } else {
          showDayDetail(key);
        }
      });
    } else {
      el.style.opacity = '0.4';
      el.style.cursor  = 'default';
      el.style.pointerEvents = 'none';
    }

    row.appendChild(el);
  });
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
  renderWeekStrip();
  syncTasks();
  saveHistoryLocal();
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
  renderWeekStrip();
  syncTasks();
  syncXP();
  saveHistoryLocal();
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
      renderTasks(); renderXP(); renderWeekStrip();
      syncTasks(); syncXP(); saveHistoryLocal();
    }, { once: true });
  } else {
    localTasks = localTasks.filter(t => t.id !== taskId);
    renderTasks(); renderXP(); renderWeekStrip();
    syncTasks(); syncXP(); saveHistoryLocal();
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

  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (localTasks.length === 0) {
    empty.style.display = 'flex';
    progress.textContent = '0 / 0 selesai';
    return;
  }

  empty.style.display = 'none';
  const done  = localTasks.filter(t => t.done).length;
  const total = localTasks.length;
  progress.textContent = `${done} / ${total} selesai`;

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
  document.getElementById('xp-value').textContent    = `${localXP} XP`;
  document.getElementById('xp-bar-fill').style.width = `${pct}%`;
  document.getElementById('xp-bar-glow').style.width = `${pct}%`;
  document.getElementById('streak-count').textContent = localStreak;

  const sub = document.getElementById('xp-sublabel');
  if (localXP === 0)                sub.textContent = 'Selesaikan task untuk dapat XP! ✨';
  else if (localXP >= XP_MAX_DAILY) sub.textContent = 'Level max hari ini! Luar biasa! 🎉';
  else sub.textContent = `${(XP_MAX_DAILY - localXP) / XP_PER_TASK} task lagi untuk XP max 💪`;
}

// ─── XP Float ────────────────────────────────────────
function spawnXPFloat() {
  const container = document.getElementById('xp-floats');
  const xpSection = document.querySelector('.xp-section');
  if (!xpSection) return;
  const rect = xpSection.getBoundingClientRect();
  const f = document.createElement('div');
  f.className   = 'xp-float';
  f.textContent = `+${XP_PER_TASK} XP ✦`;
  f.style.left  = `${rect.left + rect.width * 0.3 + Math.random() * rect.width * 0.4}px`;
  f.style.top   = `${rect.bottom - 10}px`;
  container.appendChild(f);
  f.addEventListener('animationend', () => f.remove());
}

// ─── Notifications ────────────────────────────────────
let notifTimers = [];

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (panel.classList.contains('hidden')) {
    openNotifPanel();
  } else {
    closeNotifPanel();
  }
}

function openNotifPanel() {
  loadNotifSettings();
  document.getElementById('notif-panel').classList.remove('hidden');
  document.getElementById('notif-overlay').classList.remove('hidden');
}

function closeNotifPanel() {
  document.getElementById('notif-panel').classList.add('hidden');
  document.getElementById('notif-overlay').classList.add('hidden');
}

function loadNotifSettings() {
  const enabled = localStorage.getItem('tandai_notif_enabled') === 'true';
  const morning = localStorage.getItem('tandai_notif_morning') || '08:00';
  const evening = localStorage.getItem('tandai_notif_evening') || '19:00';
  document.getElementById('notif-master-toggle').checked = enabled;
  document.getElementById('notif-time-morning').value    = morning;
  document.getElementById('notif-time-evening').value    = evening;
  updateNotifNote();
}

async function handleNotifToggle(enabled) {
  if (enabled) {
    if (!('Notification' in window)) {
      document.getElementById('notif-permission-note').textContent = 'Browser kamu tidak mendukung notifikasi.';
      document.getElementById('notif-master-toggle').checked = false;
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      document.getElementById('notif-permission-note').textContent = 'Izin notifikasi ditolak. Aktifkan di pengaturan browser.';
      document.getElementById('notif-master-toggle').checked = false;
      localStorage.setItem('tandai_notif_enabled', 'false');
      return;
    }
    localStorage.setItem('tandai_notif_enabled', 'true');
    document.getElementById('notif-status').textContent = '✓ Notifikasi aktif';
  } else {
    localStorage.setItem('tandai_notif_enabled', 'false');
    document.getElementById('notif-status').textContent = '';
    clearNotifTimers();
  }
  updateNotifNote();
  setupNotifSchedule();
}

function saveNotifTime(which) {
  const val = document.getElementById(`notif-time-${which}`).value;
  localStorage.setItem(`tandai_notif_${which}`, val);
  document.getElementById('notif-status').textContent = `✓ Waktu ${which === 'morning' ? 'pagi' : 'sore'} disimpan: ${val}`;
  setupNotifSchedule();
  setTimeout(() => {
    const el = document.getElementById('notif-status');
    if (el) el.textContent = localStorage.getItem('tandai_notif_enabled') === 'true' ? '✓ Notifikasi aktif' : '';
  }, 2500);
}

function updateNotifNote() {
  const note = document.getElementById('notif-permission-note');
  if (!('Notification' in window)) {
    note.textContent = 'Browser ini tidak mendukung notifikasi web.';
  } else if (Notification.permission === 'denied') {
    note.textContent = 'Notifikasi diblokir. Buka pengaturan browser untuk mengaktifkannya.';
  } else {
    note.textContent = 'Notifikasi hanya aktif saat halaman ini terbuka.';
  }
}

function clearNotifTimers() {
  notifTimers.forEach(t => clearTimeout(t));
  notifTimers = [];
}

function setupNotifSchedule() {
  clearNotifTimers();
  const enabled = localStorage.getItem('tandai_notif_enabled') === 'true';
  if (!enabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  ['morning', 'evening'].forEach(which => {
    const timeStr = localStorage.getItem(`tandai_notif_${which}`) || (which === 'morning' ? '08:00' : '19:00');
    const [h, m]  = timeStr.split(':').map(Number);
    const now     = new Date();
    const target  = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    const messages = {
      morning: { title: '🌿 Hai! Sudah siap tandai hari ini?', body: 'Buka Tandai dan mulai task kamu ✦' },
      evening: { title: '🌙 Mau recap hari ini?', body: 'Tandai task yang belum selesai sebelum tidur 💪' },
    };
    const timer = setTimeout(() => {
      const msg = messages[which];
      new Notification(msg.title, { body: msg.body, icon: 'icon-192.png', badge: 'icon-192.png', tag: `tandai-${which}` });
      setupNotifSchedule();
    }, delay);
    notifTimers.push(timer);
  });
}

function sendTestNotif() {
  if (!('Notification' in window)) { alert('Browser kamu tidak mendukung notifikasi.'); return; }
  if (Notification.permission === 'granted') {
    new Notification('✦ Halo dari Tandai!', { body: 'Notifikasi berhasil dikirim. Selamat tandai! 🎉', icon: 'icon-192.png', tag: 'tandai-test' });
  } else {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification('✦ Halo dari Tandai!', { body: 'Notifikasi berhasil diaktifkan! 🎉', icon: 'icon-192.png', tag: 'tandai-test' });
        localStorage.setItem('tandai_notif_enabled', 'true');
        document.getElementById('notif-master-toggle').checked = true;
        document.getElementById('notif-status').textContent = '✓ Notifikasi aktif';
        setupNotifSchedule();
      } else {
        document.getElementById('notif-permission-note').textContent = 'Izin ditolak. Aktifkan di pengaturan browser kamu.';
      }
    });
  }
}

// ─── Confetti ─────────────────────────────────────────
let confettiObserver = null;
function setupConfettiObserver() {
  if (confettiObserver) confettiObserver.disconnect();
  confettiObserver = new MutationObserver(() => {
    if (localTasks.length >= 3 && localTasks.every(t => t.done)) triggerConfetti();
  });
  const tl = document.getElementById('task-list');
  if (tl) confettiObserver.observe(tl, { childList: true, subtree: true, attributes: true });
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
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function showAuthError(el, msg) {
  if (!msg) { el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─── Boot ─────────────────────────────────────────────
(function init() {
  initDarkMode();

  const { token, username } = loadSession();

  if (token && username) {
    sessionToken = token;
    currentUser  = username;
    loadHistoryLocal();
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
