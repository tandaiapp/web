/* ===========================
   TANDAI — script.js (v5 "System")
   Quest-based hunter dashboard · rank system · EXP/Level · weekly quest log
   Backend: Google Apps Script (same API contract as before)
   =========================== */

// ─── CONFIG ──────────────────────────────────────────
const API_URL = 'https://script.google.com/macros/s/AKfycbysGZZh3VcJQRW_lGdIEaSFgbX-rFNrsyamjoECydX9JjTjGksHqZ7w6hVQDcuCU08q/exec';

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];

// ─── i18n ────────────────────────────────────────────
const DAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const T = {
  id: {
    systemLabel: 'ANTARMUKA SISTEM — LOG PENCARIAN HARIAN',
    monarchLabel: 'RAJA BAYANGAN',
    lvLabel: 'Lv.',
    dayLabel: 'Hari',
    questProgress: 'KEMAJUAN PENCARIAN',
    questsClear: 'PENCARIAN SELESAI',
    bestStreak: 'STREAK TERBAIK',
    weeklyRate: 'TINGKAT MINGGUAN',
    dailyQuests: 'PENCARIAN HARIAN',
    emptyState: 'Belum ada quest hari ini.<br>Daftarkan pencarian pertamamu!',
    registerQuestBtn: '[ DAFTARKAN PENCARIAN BARU ]',
    questNamePlaceholder: 'Nama pencarian...',
    cancel: 'BATAL',
    confirm: 'KONFIRMASI',
    questLog: 'LOG PENCARIAN',
    thisWeek: 'MINGGU INI',
    lastWeek: 'MINGGU LALU',
    weeksAgo: n => `${n}M LALU`,
    weeklyCompletion: 'PENYELESAIAN MINGGUAN',
    questClear: '▶ PENCARIAN SELESAI',
    allQuestsCleared: '[ SEMUA PENCARIAN SELESAI — BANGKIT ]',
    hunterPotential: '[ HUNTER, POTENSIMU TERUS BERKEMBANG ]',
    theWeak: '[ YANG LEMAH TIDAK BERHAK MEMILIH ]',
    streakUnit: n => `${n}H`,
    days: DAYS_ID, months: MONTHS_ID,
    brandSub: 'Bangkit. Tandai pencarianmu, mulai dari sini.',
    loginHeading: '[ MASUK KE SISTEM ]',
    signupHeading: '[ AWAKENING — DAFTAR ]',
    labelUser: 'Nama Hunter', labelPass: 'Kata Sandi',
    loginBtn: 'MASUK →', signupBtn: 'BANGKIT →',
    loginSwitch: 'Belum terdaftar? ', loginSwitchLink: 'Daftar sebagai Hunter',
    signupSwitch: 'Sudah punya akun? ', signupSwitchLink: 'Masuk',
    loginLoading: 'Memuat...', signupLoading: 'Membangkitkan...',
    errUsernameShort: 'Username minimal 2 karakter.',
    errPasswordShort: 'Password minimal 4 karakter.',
    errFillBoth: 'Isi username dan password dulu.',
    errConn: 'Koneksi gagal.',
    notifTitle: '🔔 PENGINGAT SISTEM',
    notifDesc: 'Atur waktu notifikasi supaya kamu ingat menyelesaikan quest setiap hari.',
    notifToggleLabel: 'Aktifkan Notifikasi',
    notifMorning: 'Waktu Pengingat Pagi', notifEvening: 'Waktu Pengingat Sore',
    notifSave: 'Simpan', notifTest: 'Kirim Notifikasi Test 🔔',
    notifActive: '✓ Notifikasi aktif',
    notifNoSupport: 'Browser kamu tidak mendukung notifikasi.',
    notifDenied: 'Izin notifikasi ditolak. Aktifkan di pengaturan browser.',
    notifNoteNoSupport: 'Browser ini tidak mendukung notifikasi web.',
    notifNoteDenied: 'Notifikasi diblokir. Buka pengaturan browser untuk mengaktifkannya.',
    notifNoteOk: 'Notifikasi hanya aktif saat halaman ini terbuka.',
    notifSavedTime: which => `✓ Waktu ${which === 'morning' ? 'pagi' : 'sore'} disimpan`,
    notifTestTitle: '◈ Halo dari Tandai!',
    notifTestBody: 'Notifikasi berhasil dikirim. Selamat berburu! ⚔',
    notifMorningTitle: '◈ Sistem: Quest harian menanti', notifMorningBody: 'Buka Tandai dan selesaikan pencarianmu.',
    notifEveningTitle: '◈ Sistem: Rekap malam ini', notifEveningBody: 'Selesaikan quest yang tersisa sebelum hari berakhir.',
  },
  en: {
    systemLabel: 'SYSTEM INTERFACE — DAILY QUEST LOG',
    monarchLabel: 'SHADOW MONARCH',
    lvLabel: 'Lv.',
    dayLabel: 'Day',
    questProgress: 'QUEST PROGRESS',
    questsClear: 'QUESTS CLEAR',
    bestStreak: 'BEST STREAK',
    weeklyRate: 'WEEKLY RATE',
    dailyQuests: 'DAILY QUESTS',
    emptyState: 'No quests yet today.<br>Register your first quest!',
    registerQuestBtn: '[ REGISTER NEW QUEST ]',
    questNamePlaceholder: 'Quest name...',
    cancel: 'CANCEL',
    confirm: 'CONFIRM',
    questLog: 'QUEST LOG',
    thisWeek: 'THIS WEEK',
    lastWeek: 'LAST WEEK',
    weeksAgo: n => `${n}W AGO`,
    weeklyCompletion: 'WEEKLY COMPLETION',
    questClear: '▶ QUEST CLEAR',
    allQuestsCleared: '[ ALL QUESTS CLEARED — ARISE ]',
    hunterPotential: '[ HUNTER, YOUR POTENTIAL IS GROWING ]',
    theWeak: '[ THE WEAK DO NOT GET TO CHOOSE ]',
    streakUnit: n => `${n}D`,
    days: DAYS_EN, months: MONTHS_EN,
    brandSub: 'Arise. Mark your quests, starting here.',
    loginHeading: '[ ENTER THE SYSTEM ]',
    signupHeading: '[ AWAKENING — REGISTER ]',
    labelUser: 'Hunter Name', labelPass: 'Password',
    loginBtn: 'ENTER →', signupBtn: 'ARISE →',
    loginSwitch: 'Not registered? ', loginSwitchLink: 'Register as a Hunter',
    signupSwitch: 'Already have an account? ', signupSwitchLink: 'Log in',
    loginLoading: 'Loading...', signupLoading: 'Awakening...',
    errUsernameShort: 'Username must be at least 2 characters.',
    errPasswordShort: 'Password must be at least 4 characters.',
    errFillBoth: 'Fill in username and password first.',
    errConn: 'Connection failed.',
    notifTitle: '🔔 SYSTEM REMINDERS',
    notifDesc: 'Set notification times so you remember to clear your quests every day.',
    notifToggleLabel: 'Enable Notifications',
    notifMorning: 'Morning Reminder Time', notifEvening: 'Evening Reminder Time',
    notifSave: 'Save', notifTest: 'Send Test Notification 🔔',
    notifActive: '✓ Notifications active',
    notifNoSupport: 'Your browser does not support notifications.',
    notifDenied: 'Notification permission denied. Enable it in browser settings.',
    notifNoteNoSupport: 'This browser does not support web notifications.',
    notifNoteDenied: 'Notifications are blocked. Open browser settings to enable them.',
    notifNoteOk: 'Notifications only fire while this page is open.',
    notifSavedTime: which => `✓ ${which === 'morning' ? 'Morning' : 'Evening'} time saved`,
    notifTestTitle: '◈ Hello from Tandai!', notifTestBody: 'Test notification sent. Good hunting! ⚔',
    notifMorningTitle: '◈ System: Daily quests await', notifMorningBody: 'Open Tandai and clear your quests.',
    notifEveningTitle: '◈ System: Evening recap', notifEveningBody: 'Clear your remaining quests before the day ends.',
  },
};

let lang = 'id';
function t() { return T[lang]; }

// ─── State ───────────────────────────────────────────
let currentUser  = null;
let sessionToken = null;
let localQuests  = []; // { id, text, rank, completions: [ 'YYYY-MM-DD', ... ] }
let weekOffset   = 0;  // 0 = this week
let addingQuest  = false;
let newQuestRank = 'C';

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
  return { token: localStorage.getItem('tandai_token'), username: localStorage.getItem('tandai_user') };
}

// ─── Language ────────────────────────────────────────
function initLang() {
  lang = localStorage.getItem('tandai_lang') || 'id';
}
function setLang(l) {
  lang = l;
  localStorage.setItem('tandai_lang', l);
  applyStaticText();
  renderLangToggles();
  if (currentUser) renderAll();
}
function renderLangToggles() {
  ['lang-toggle', 'auth-lang-toggle'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    ['id', 'en'].forEach(l => {
      const b = document.createElement('button');
      b.className = `lang-btn${lang === l ? ' active' : ''}`;
      b.textContent = l.toUpperCase();
      b.onclick = () => setLang(l);
      el.appendChild(b);
    });
  });
}

// ─── Date helpers ────────────────────────────────────
function todayDate() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function dateToKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayKey() { return dateToKey(todayDate()); }
function weekStart(date) { const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d; }

function getStreak(completions, refDate) {
  let streak = 0;
  const d = new Date(refDate);
  while (completions.includes(dateToKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

// ─── Stats (computed from quests) ────────────────────
function computeStats() {
  const today = todayDate();
  const tKey = todayKey();
  const completedToday = localQuests.filter(q => q.completions.includes(tKey)).length;
  const total = localQuests.length;
  const pct = total > 0 ? Math.round((completedToday / total) * 100) : 0;
  const maxStreak = localQuests.reduce((m, q) => Math.max(m, getStreak(q.completions, today)), 0);
  const totalExp = localQuests.reduce((sum, q) => sum + getStreak(q.completions, today) * (RANKS.indexOf(q.rank) + 1) * 10, 0);
  const level = Math.min(100, Math.floor(totalExp / 50) + 1);

  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - i); return d; });
  const totSlots = localQuests.length * 7;
  const weeklyDone = localQuests.reduce((s, q) => s + last7.filter(d => q.completions.includes(dateToKey(d))).length, 0);
  const weeklyRate = totSlots === 0 ? null : Math.round((weeklyDone / totSlots) * 100);

  return { completedToday, total, pct, maxStreak, totalExp, level, weeklyRate };
}

// ─── Auth ─────────────────────────────────────────────
async function handleSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');

  if (!username || username.length < 2) return showAuthError(errEl, t().errUsernameShort);
  if (!password || password.length < 4) return showAuthError(errEl, t().errPasswordShort);

  setAuthLoading(true, 'signup');
  const res = await api('signup', { username, password }).catch(() => ({ ok: false, error: t().errConn }));
  setAuthLoading(false, 'signup');

  if (!res.ok) return showAuthError(errEl, res.error || 'Signup gagal.');

  sessionToken = res.token;
  currentUser  = res.username;
  localQuests  = [];
  saveSession(sessionToken, currentUser);
  loadQuestsLocal();
  loadDashboard();
}

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  if (!username || !password) return showAuthError(errEl, t().errFillBoth);

  setAuthLoading(true, 'login');
  const res = await api('login', { username, password }).catch(() => ({ ok: false, error: t().errConn }));
  setAuthLoading(false, 'login');

  if (!res.ok) return showAuthError(errEl, res.error || 'Login gagal.');

  sessionToken = res.token;
  currentUser  = res.username;
  localQuests  = [];
  saveSession(sessionToken, currentUser);
  loadQuestsLocal();
  await loadDashboard();
}

async function handleLogout() {
  if (sessionToken) api('logout', { token: sessionToken });
  clearSession();
  currentUser  = null;
  sessionToken = null;
  localQuests  = [];
  weekOffset   = 0;
  switchScreen('auth-screen');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

function setAuthLoading(on, form) {
  const btn = document.getElementById(`${form}-btn`);
  if (!btn) return;
  btn.disabled = on;
  btn.textContent = on ? (form === 'login' ? t().loginLoading : t().signupLoading) : (form === 'login' ? t().loginBtn : t().signupBtn);
}

function setDashLoading(show) {
  let el = document.getElementById('dash-loading');
  if (!el && show) {
    el = document.createElement('div');
    el.id = 'dash-loading';
    el.className = 'dash-loading-overlay';
    el.innerHTML = `<div class="dash-loading-spinner">◈</div><p>${lang === 'id' ? 'Memuat data...' : 'Loading data...'}</p>`;
    document.getElementById('dashboard-screen').prepend(el);
  }
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ─── Screen switching ─────────────────────────────────
function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; s.style.opacity = '0'; });
  const target = document.getElementById(id);
  target.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => { target.style.opacity = '1'; target.classList.add('active'); }));
}
function switchToSignup() { document.getElementById('login-card').classList.remove('active'); document.getElementById('signup-card').classList.add('active'); }
function switchToLogin() { document.getElementById('signup-card').classList.remove('active'); document.getElementById('login-card').classList.add('active'); }

// ─── Local persistence of quests (per user, mirrors backend) ──
function saveQuestsLocal() {
  if (!currentUser) return;
  try { localStorage.setItem(`tandai_quests_${currentUser}`, JSON.stringify(localQuests)); } catch (e) { /* ignore */ }
}
function loadQuestsLocal() {
  if (!currentUser) return;
  try {
    const stored = JSON.parse(localStorage.getItem(`tandai_quests_${currentUser}`) || 'null');
    if (stored && Array.isArray(stored)) localQuests = stored;
  } catch (e) { /* ignore */ }
}

// ─── Dashboard boot ───────────────────────────────────
async function loadDashboard() {
  switchScreen('dashboard-screen');
  setDashLoading(true);

  try {
    const res = await api('getTasks', { token: sessionToken });
    if (res.ok && Array.isArray(res.tasks) && res.tasks.length) {
      // Migrate legacy {id,text,done} shape if backend still returns old format
      localQuests = res.tasks.map(migrateQuest);
    }
  } catch (e) { console.warn('Load quests failed:', e); }

  setDashLoading(false);
  weekOffset = 0;
  renderAll();
  setupConfettiObserver();
  setupNotifSchedule();
}

function migrateQuest(q) {
  if (q && Array.isArray(q.completions)) return { id: q.id, text: q.text, rank: q.rank || 'C', completions: q.completions };
  // legacy shape { id, text, done }
  const completions = q && q.done ? [todayKey()] : [];
  return { id: q.id || String(Date.now() + Math.random()), text: q.text || '', rank: 'C', completions };
}

// ─── Render: everything ───────────────────────────────
function renderAll() {
  applyStaticText();
  renderHeader();
  renderStats();
  renderQuestList();
  renderQuestLog();
  renderMotivation();
}

function applyStaticText() {
  const d = t();
  document.getElementById('hdr-system-label').textContent = d.systemLabel;
  document.getElementById('hdr-monarch-label').textContent = d.monarchLabel;
  document.getElementById('hdr-lv-label').textContent = d.lvLabel;
  document.getElementById('progress-label').textContent = d.questProgress;
  document.getElementById('stat-label-clear').textContent = d.questsClear;
  document.getElementById('stat-label-streak').textContent = d.bestStreak;
  document.getElementById('stat-label-rate').textContent = d.weeklyRate;
  document.getElementById('section-title-quests').textContent = d.dailyQuests;
  document.getElementById('empty-state-text').innerHTML = d.emptyState;
  document.getElementById('btn-add-quest-label').textContent = d.registerQuestBtn;
  document.getElementById('add-quest-title-label').textContent = d.registerQuestBtn;
  document.getElementById('quest-input').placeholder = d.questNamePlaceholder;
  document.getElementById('btn-cancel-quest').textContent = d.cancel;
  document.getElementById('btn-confirm-quest').textContent = d.confirm;
  document.getElementById('quest-log-tag').textContent = d.questLog;
  document.getElementById('weekly-summary-label').textContent = d.weeklyCompletion;

  document.getElementById('auth-brand-tag').textContent = lang === 'id' ? 'ANTARMUKA SISTEM' : 'SYSTEM INTERFACE';
  document.getElementById('auth-brand-sub').textContent = d.brandSub;
  document.getElementById('login-heading').textContent = d.loginHeading;
  document.getElementById('signup-heading').textContent = d.signupHeading;
  document.getElementById('login-label-user').textContent = d.labelUser;
  document.getElementById('login-label-pass').textContent = d.labelPass;
  document.getElementById('signup-label-user').textContent = d.labelUser;
  document.getElementById('signup-label-pass').textContent = d.labelPass;
  document.getElementById('login-btn').textContent = d.loginBtn;
  document.getElementById('signup-btn').textContent = d.signupBtn;
  document.getElementById('login-switch-text').innerHTML = `${d.loginSwitch}<span onclick="switchToSignup()">${d.loginSwitchLink}</span>`;
  document.getElementById('signup-switch-text').innerHTML = `${d.signupSwitch}<span onclick="switchToLogin()">${d.signupSwitchLink}</span>`;

  document.getElementById('notif-title').textContent = d.notifTitle;
  document.getElementById('notif-desc').textContent = d.notifDesc;
  document.getElementById('notif-toggle-label').textContent = d.notifToggleLabel;
  document.getElementById('notif-time-label-morning').textContent = d.notifMorning;
  document.getElementById('notif-time-label-evening').textContent = d.notifEvening;
  document.getElementById('notif-save-morning').textContent = d.notifSave;
  document.getElementById('notif-save-evening').textContent = d.notifSave;
  document.getElementById('notif-test-btn').textContent = d.notifTest;
  updateNotifNote();

  buildRankSelect();
  renderLangToggles();
}

function renderHeader() {
  const d = t();
  const today = todayDate();
  document.getElementById('hdr-day-title').innerHTML = `${d.days[today.getDay()].toUpperCase()}<span class="dot">.</span>`;
  const dayNum = Math.floor((today.getTime() - new Date(2024, 0, 1).getTime()) / 86400000);
  document.getElementById('hdr-date-sub').textContent = `${d.months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()} — ${d.dayLabel} ${dayNum}`;
  document.getElementById('hdr-username-display').textContent = currentUser || '';

  const stats = computeStats();
  document.getElementById('player-level-value').textContent = stats.level;
  document.getElementById('player-exp-value').textContent = `${stats.totalExp} EXP`;

  const pctEl = document.getElementById('progress-pct');
  pctEl.textContent = `${stats.pct}%`;
  pctEl.classList.toggle('full', stats.pct === 100);
  const fillEl = document.getElementById('progress-fill');
  fillEl.style.width = `${stats.pct}%`;
  fillEl.classList.toggle('full', stats.pct === 100);
}

function renderStats() {
  const d = t();
  const s = computeStats();
  document.getElementById('stat-value-clear').textContent = `${s.completedToday}/${s.total}`;
  document.getElementById('stat-value-streak').textContent = d.streakUnit(s.maxStreak);
  document.getElementById('stat-value-rate').textContent = s.weeklyRate === null ? '—' : `${s.weeklyRate}%`;
}

function renderMotivation() {
  const d = t();
  const s = computeStats();
  const text = s.pct === 100 ? d.allQuestsCleared : s.pct >= 50 ? d.hunterPotential : d.theWeak;
  document.getElementById('motivation-text').textContent = text;
}

// ─── Quest list rendering ─────────────────────────────
function renderQuestList() {
  const d = t();
  const list = document.getElementById('quest-list');
  const empty = document.getElementById('empty-state');
  const tKey = todayKey();
  const today = todayDate();

  list.querySelectorAll('.quest-item').forEach(el => el.remove());

  if (localQuests.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  localQuests.forEach(q => {
    const done = q.completions.includes(tKey);
    const streak = getStreak(q.completions, today);
    const item = document.createElement('div');
    item.className = `quest-item rank-${q.rank}${done ? ' done' : ''}`;
    item.dataset.questId = q.id;
    item.innerHTML = `
      <div class="quest-rank-bar"></div>
      <div class="quest-checkbox${done ? ' checked' : ''}" onclick="toggleQuest('${q.id}', '${tKey}', event)">
        <span class="check-icon">✓</span>
      </div>
      <div class="quest-body">
        <span class="quest-text">${escapeHtml(q.text)}</span>
        ${done ? `<span class="quest-clear-tag">${d.questClear}</span>` : ''}
      </div>
      <span class="rank-badge">${q.rank}</span>
      ${streak > 0 ? `<span class="streak-chip">🔥${d.streakUnit(streak)}</span>` : ''}
      <button class="quest-delete" onclick="deleteQuest('${q.id}')" title="Hapus">✕</button>
    `;
    list.appendChild(item);
  });
}

function buildRankSelect() {
  const el = document.getElementById('rank-select');
  el.innerHTML = '';
  RANKS.forEach(r => {
    const b = document.createElement('button');
    b.className = `rank-${r}${newQuestRank === r ? ' active' : ''}`;
    b.textContent = r;
    b.onclick = () => { newQuestRank = r; buildRankSelect(); };
    el.appendChild(b);
  });
}

function showAddQuestForm() {
  addingQuest = true;
  document.getElementById('btn-show-add-quest').classList.add('hidden');
  document.getElementById('add-quest-form').classList.remove('hidden');
  document.getElementById('quest-input').focus();
  buildRankSelect();
}
function hideAddQuestForm() {
  addingQuest = false;
  document.getElementById('quest-input').value = '';
  newQuestRank = 'C';
  document.getElementById('add-quest-form').classList.add('hidden');
  document.getElementById('btn-show-add-quest').classList.remove('hidden');
}

function addQuest() {
  const input = document.getElementById('quest-input');
  const text = input.value.trim();
  if (!text) return;
  localQuests.push({ id: String(Date.now()), text, rank: newQuestRank, completions: [] });
  hideAddQuestForm();
  renderAll();
  persistQuests();
}

function toggleQuest(id, dateKey, e) {
  const q = localQuests.find(x => x.id === id);
  if (!q) return;
  const had = q.completions.includes(dateKey);
  if (!had) {
    if (e) spawnXPFloat(e.clientX, e.clientY);
    q.completions.push(dateKey);
  } else {
    q.completions = q.completions.filter(k => k !== dateKey);
  }
  renderAll();
  persistQuests();
}

function deleteQuest(id) {
  const el = document.querySelector(`[data-quest-id="${id}"]`);
  const finish = () => {
    localQuests = localQuests.filter(q => q.id !== id);
    renderAll();
    persistQuests();
  };
  if (el) {
    el.classList.add('removing');
    el.addEventListener('animationend', finish, { once: true });
  } else finish();
}

let syncTimer = null;
function persistQuests() {
  saveQuestsLocal();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    if (!sessionToken) return;
    try { await api('saveTasks', { token: sessionToken, tasks: localQuests }); }
    catch (e) { console.warn('Sync gagal:', e); }
  }, 800);
}

// ─── Quest log (weekly grid) ─────────────────────────
function changeWeek(delta) {
  weekOffset = Math.min(weekOffset + delta, 0);
  renderQuestLog();
}

function renderQuestLog() {
  const d = t();
  const today = todayDate();
  const tKey = todayKey();

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(today);
    dt.setDate(today.getDate() + weekOffset * 7 - 6 + i);
    return dt;
  });

  document.getElementById('quest-log-week').textContent =
    weekOffset === 0 ? d.thisWeek : weekOffset === -1 ? d.lastWeek : d.weeksAgo(Math.abs(weekOffset));
  document.getElementById('week-next-btn').disabled = weekOffset === 0;

  // Day headers
  const daysEl = document.getElementById('quest-grid-days');
  daysEl.innerHTML = '<div></div>';
  last7.forEach(dt => {
    const key = dateToKey(dt);
    const head = document.createElement('div');
    head.className = `grid-day-head${key === tKey ? ' today' : ''}`;
    head.innerHTML = `<p class="d1">${d.days[dt.getDay()].slice(0,2).toUpperCase()}</p><p class="d2">${dt.getDate()}</p>`;
    daysEl.appendChild(head);
  });

  // Rows
  const rowsEl = document.getElementById('quest-grid-rows');
  rowsEl.innerHTML = '';
  localQuests.forEach(q => {
    const row = document.createElement('div');
    row.className = `grid-row rank-${q.rank}`;
    const name = document.createElement('div');
    name.className = 'grid-row-name';
    name.title = q.text;
    name.textContent = q.text;
    row.appendChild(name);

    last7.forEach(dt => {
      const key = dateToKey(dt);
      const done = q.completions.includes(key);
      const isFuture = dt > today;
      const cell = document.createElement('button');
      cell.className = `grid-cell${done ? ' done' : ''}${key === tKey ? ' today-col' : ''}${isFuture ? ' future' : ''}`;
      if (done) cell.innerHTML = '<span class="dot"></span>';
      if (!isFuture) cell.onclick = () => toggleQuest(q.id, key);
      row.appendChild(cell);
    });
    rowsEl.appendChild(row);
  });

  // Weekly summary bars
  const barsEl = document.getElementById('weekly-summary-bars');
  barsEl.innerHTML = '';
  last7.forEach(dt => {
    const isFuture = dt > today;
    const key = dateToKey(dt);
    const count = isFuture ? 0 : localQuests.filter(q => q.completions.includes(key)).length;
    const fill = isFuture || localQuests.length === 0 ? 0 : count / localQuests.length;
    const track = document.createElement('div');
    track.className = `summary-bar-track${key === tKey ? ' today' : ''}`;
    const barFill = document.createElement('div');
    barFill.className = `summary-bar-fill${fill === 1 ? ' full' : ''}`;
    barFill.style.width = `${fill * 100}%`;
    track.appendChild(barFill);
    barsEl.appendChild(track);
  });

  // Rank legend
  const legendEl = document.getElementById('rank-legend');
  legendEl.innerHTML = '';
  RANKS.forEach(r => {
    const count = localQuests.filter(q => q.rank === r).length;
    if (!count) return;
    const item = document.createElement('div');
    item.className = `rank-legend-item rank-${r}`;
    item.innerHTML = `<span class="dot"></span><span class="txt">${r} ×${count}</span>`;
    legendEl.appendChild(item);
  });
}

// ─── XP Float ──────────────────────────────────────────
function spawnXPFloat(x, y) {
  const container = document.getElementById('xp-floats');
  if (!container) return;
  const f = document.createElement('div');
  f.className = 'xp-float';
  f.textContent = '+EXP';
  f.style.left = `${(x || window.innerWidth/2) - 20}px`;
  f.style.top = `${(y || window.innerHeight/2) - 10}px`;
  container.appendChild(f);
  f.addEventListener('animationend', () => f.remove());
}

// ─── Notifications ────────────────────────────────────
let notifTimers = [];

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (panel.classList.contains('hidden')) openNotifPanel(); else closeNotifPanel();
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
  document.getElementById('notif-time-morning').value = morning;
  document.getElementById('notif-time-evening').value = evening;
  updateNotifNote();
}
async function handleNotifToggle(enabled) {
  const d = t();
  if (enabled) {
    if (!('Notification' in window)) {
      document.getElementById('notif-permission-note').textContent = d.notifNoSupport;
      document.getElementById('notif-master-toggle').checked = false;
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      document.getElementById('notif-permission-note').textContent = d.notifDenied;
      document.getElementById('notif-master-toggle').checked = false;
      localStorage.setItem('tandai_notif_enabled', 'false');
      return;
    }
    localStorage.setItem('tandai_notif_enabled', 'true');
    document.getElementById('notif-status').textContent = d.notifActive;
  } else {
    localStorage.setItem('tandai_notif_enabled', 'false');
    document.getElementById('notif-status').textContent = '';
    clearNotifTimers();
  }
  updateNotifNote();
  setupNotifSchedule();
}
function saveNotifTime(which) {
  const d = t();
  const val = document.getElementById(`notif-time-${which}`).value;
  localStorage.setItem(`tandai_notif_${which}`, val);
  document.getElementById('notif-status').textContent = d.notifSavedTime(which);
  setupNotifSchedule();
  setTimeout(() => {
    const el = document.getElementById('notif-status');
    if (el) el.textContent = localStorage.getItem('tandai_notif_enabled') === 'true' ? d.notifActive : '';
  }, 2500);
}
function updateNotifNote() {
  const d = t();
  const note = document.getElementById('notif-permission-note');
  if (!note) return;
  if (!('Notification' in window)) note.textContent = d.notifNoteNoSupport;
  else if (Notification.permission === 'denied') note.textContent = d.notifNoteDenied;
  else note.textContent = d.notifNoteOk;
}
function clearNotifTimers() { notifTimers.forEach(clearTimeout); notifTimers = []; }
function setupNotifSchedule() {
  clearNotifTimers();
  const enabled = localStorage.getItem('tandai_notif_enabled') === 'true';
  if (!enabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  ['morning', 'evening'].forEach(which => {
    const d = t();
    const timeStr = localStorage.getItem(`tandai_notif_${which}`) || (which === 'morning' ? '08:00' : '19:00');
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    const messages = {
      morning: { title: d.notifMorningTitle, body: d.notifMorningBody },
      evening: { title: d.notifEveningTitle, body: d.notifEveningBody },
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
  const d = t();
  if (!('Notification' in window)) { alert(d.notifNoSupport); return; }
  if (Notification.permission === 'granted') {
    new Notification(d.notifTestTitle, { body: d.notifTestBody, icon: 'icon-192.png', tag: 'tandai-test' });
  } else {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification(d.notifTestTitle, { body: d.notifTestBody, icon: 'icon-192.png', tag: 'tandai-test' });
        localStorage.setItem('tandai_notif_enabled', 'true');
        document.getElementById('notif-master-toggle').checked = true;
        document.getElementById('notif-status').textContent = d.notifActive;
        setupNotifSchedule();
      } else {
        document.getElementById('notif-permission-note').textContent = d.notifDenied;
      }
    });
  }
}

// ─── Confetti ─────────────────────────────────────────
let confettiObserver = null;
function setupConfettiObserver() {
  if (confettiObserver) confettiObserver.disconnect();
  confettiObserver = new MutationObserver(() => {
    if (localQuests.length >= 3 && localQuests.every(q => q.completions.includes(todayKey()))) triggerConfetti();
  });
  const list = document.getElementById('quest-list');
  if (list) confettiObserver.observe(list, { childList: true, subtree: true, attributes: true });
}
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  const colors = ['#1A6FFF', '#4D9FFF', '#F5C842', '#FF9500', '#7C3AED', '#BDD8FF'];
  const pieces = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * -200, r: Math.random() * 7 + 3,
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
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function showAuthError(el, msg) {
  if (!msg) { el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─── Boot ─────────────────────────────────────────────
(function init() {
  initLang();
  applyStaticText();

  const { token, username } = loadSession();

  if (token && username) {
    sessionToken = token;
    currentUser  = username;
    loadQuestsLocal();
    api('getUserData', { token })
      .then(() => loadDashboard())
      .catch(() => loadDashboard());
  } else {
    switchScreen('auth-screen');
  }

  ['login-username','login-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); }));
  ['signup-username','signup-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); }));
})();
