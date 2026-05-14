/* ===========================
   TANDAI — script.js
   Vanilla JS, localStorage-based
   =========================== */

// ─── Constants ──────────────────────────────────────────
const XP_PER_TASK   = 10;
const XP_MAX_DAILY  = 100;

// ─── State ──────────────────────────────────────────────
let currentUser = null;

// ─── Utility: Storage helpers ────────────────────────────
function getUsers() {
  return JSON.parse(localStorage.getItem('tandai_users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('tandai_users', JSON.stringify(users));
}

function getUserData(username) {
  const users = getUsers();
  return users[username] || null;
}

function saveUserData(username, data) {
  const users = getUsers();
  users[username] = data;
  saveUsers(users);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Auth Logic ──────────────────────────────────────────
function handleSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl    = document.getElementById('signup-error');

  errEl.classList.add('hidden');

  if (!username || username.length < 2) {
    showAuthError(errEl, 'Username minimal 2 karakter.');
    return;
  }
  if (!password || password.length < 4) {
    showAuthError(errEl, 'Password minimal 4 karakter.');
    return;
  }

  const users = getUsers();
  if (users[username]) {
    showAuthError(errEl, 'Username sudah dipakai. Pilih yang lain.');
    return;
  }

  const newUser = {
    password,
    streak: 0,
    lastUsed: null,
    tasks: [],
    taskDate: null,
    xpToday: 0,
  };

  saveUserData(username, newUser);
  showAuthError(errEl, ''); // clear
  // Auto-login after signup
  loginUser(username);
}

function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  errEl.classList.add('hidden');

  const userData = getUserData(username);
  if (!userData || userData.password !== password) {
    showAuthError(errEl, 'Username atau password salah.');
    return;
  }

  loginUser(username);
}

function loginUser(username) {
  localStorage.setItem('tandai_session', username);
  currentUser = username;
  checkDailyReset();
  updateStreak();
  loadDashboard();
}

function handleLogout() {
  localStorage.removeItem('tandai_session');
  currentUser = null;
  switchScreen('auth-screen');
  // Reset login fields
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

function showAuthError(el, msg) {
  if (!msg) { el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─── Auth Screen toggles ────────────────────────────────
function switchToSignup() {
  document.getElementById('login-card').classList.remove('active');
  document.getElementById('signup-card').classList.add('active');
}

function switchToLogin() {
  document.getElementById('signup-card').classList.remove('active');
  document.getElementById('login-card').classList.add('active');
}

// ─── Screen switching ────────────────────────────────────
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
    s.style.opacity = '0';
  });
  const target = document.getElementById(screenId);
  target.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.style.opacity = '1';
      target.classList.add('active');
    });
  });
}

// ─── Daily Reset ─────────────────────────────────────────
function checkDailyReset() {
  const data = getUserData(currentUser);
  if (!data) return;

  const today = todayStr();
  if (data.taskDate !== today) {
    data.tasks    = [];
    data.xpToday  = 0;
    data.taskDate = today;
    saveUserData(currentUser, data);
  }
}

// ─── Streak Logic ─────────────────────────────────────────
function updateStreak() {
  const data = getUserData(currentUser);
  if (!data) return;

  const today     = todayStr();
  const yesterday = yesterdayStr();

  if (data.lastUsed === today) {
    // Already logged today, streak intact
    return;
  }

  if (data.lastUsed === yesterday) {
    // Consecutive day
    data.streak   = (data.streak || 0) + 1;
  } else if (data.lastUsed === null) {
    // First time ever
    data.streak = 1;
  } else {
    // Missed a day
    data.streak = 1;
  }

  data.lastUsed = today;
  saveUserData(currentUser, data);
}

// ─── Dashboard ───────────────────────────────────────────
function loadDashboard() {
  switchScreen('dashboard-screen');

  const data = getUserData(currentUser);
  if (!data) return;

  // Username display
  document.getElementById('display-username').textContent = currentUser;

  // Streak
  document.getElementById('streak-count').textContent = data.streak || 0;

  // Date footer
  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('footer-date').textContent =
    now.toLocaleDateString('id-ID', options);

  // Render tasks + XP
  renderTasks();
  renderXP();
}

// ─── Task CRUD ───────────────────────────────────────────
function addTask() {
  const input = document.getElementById('task-input');
  const text  = input.value.trim();
  if (!text) {
    input.focus();
    input.style.borderColor = '#F4A261';
    setTimeout(() => input.style.borderColor = '', 700);
    return;
  }

  const data = getUserData(currentUser);
  const task = {
    id:   Date.now(),
    text,
    done: false,
  };

  data.tasks.push(task);
  saveUserData(currentUser, data);
  input.value = '';
  input.focus();

  renderTasks();
  renderXP();
}

function toggleTask(taskId) {
  const data = getUserData(currentUser);
  const task = data.tasks.find(t => t.id === taskId);
  if (!task) return;

  const wasDone = task.done;
  task.done = !task.done;

  // XP
  if (!wasDone && task.done) {
    data.xpToday = Math.min((data.xpToday || 0) + XP_PER_TASK, XP_MAX_DAILY);
    spawnXPFloat();
  } else if (wasDone && !task.done) {
    data.xpToday = Math.max((data.xpToday || 0) - XP_PER_TASK, 0);
  }

  saveUserData(currentUser, data);
  renderTasks();
  renderXP();
}

function deleteTask(taskId) {
  const data  = getUserData(currentUser);
  const task  = data.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Undo XP if task was done
  if (task.done) {
    data.xpToday = Math.max((data.xpToday || 0) - XP_PER_TASK, 0);
  }

  const el = document.querySelector(`[data-task-id="${taskId}"]`);
  if (el) {
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      data.tasks = data.tasks.filter(t => t.id !== taskId);
      saveUserData(currentUser, data);
      renderTasks();
      renderXP();
    }, { once: true });
  } else {
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    saveUserData(currentUser, data);
    renderTasks();
    renderXP();
  }
}

// ─── Render Tasks ─────────────────────────────────────────
function renderTasks() {
  const data     = getUserData(currentUser);
  const tasks    = data?.tasks || [];
  const list     = document.getElementById('task-list');
  const empty    = document.getElementById('empty-state');
  const progress = document.getElementById('task-progress-text');
  const footerProg = document.getElementById('footer-progress');

  // Clear existing task items (keep empty-state)
  list.querySelectorAll('.task-item').forEach(el => el.remove());

  if (tasks.length === 0) {
    empty.style.display = 'flex';
    progress.textContent = '0 / 0 selesai';
    footerProg.textContent = '0% selesai';
    return;
  }

  empty.style.display = 'none';

  const doneCount  = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  progress.textContent   = `${doneCount} / ${totalCount} selesai`;
  footerProg.textContent = `${pct}% selesai`;

  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item${task.done ? ' done' : ''}`;
    item.dataset.taskId = task.id;

    item.innerHTML = `
      <div class="task-checkbox${task.done ? ' checked' : ''}" onclick="toggleTask(${task.id})">
        <span class="check-icon">✓</span>
      </div>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-delete" onclick="deleteTask(${task.id})" title="Hapus task">✕</button>
    `;

    list.appendChild(item);
  });
}

// ─── Render XP ────────────────────────────────────────────
function renderXP() {
  const data    = getUserData(currentUser);
  const xp      = data?.xpToday || 0;
  const pct     = Math.min((xp / XP_MAX_DAILY) * 100, 100);

  document.getElementById('xp-value').textContent = `${xp} XP`;
  document.getElementById('xp-bar-fill').style.width  = `${pct}%`;
  document.getElementById('xp-bar-glow').style.width  = `${pct}%`;

  const sublabel = document.getElementById('xp-sublabel');
  if (xp === 0) {
    sublabel.textContent = 'Selesaikan task untuk dapat XP! ✨';
  } else if (xp >= XP_MAX_DAILY) {
    sublabel.textContent = 'Level max hari ini! Luar biasa! 🎉';
  } else {
    const remaining = (XP_MAX_DAILY - xp) / XP_PER_TASK;
    sublabel.textContent = `${remaining} task lagi untuk mencapai XP max 💪`;
  }
}

// ─── XP Float Spawn ───────────────────────────────────────
function spawnXPFloat() {
  const container = document.getElementById('xp-floats');
  const xpSection = document.querySelector('.xp-section');
  const rect      = xpSection.getBoundingClientRect();

  const float = document.createElement('div');
  float.className = 'xp-float';
  float.textContent = `+${XP_PER_TASK} XP ✦`;

  const x = rect.left + Math.random() * rect.width * 0.6 + rect.width * 0.2;
  const y = rect.bottom - 10;

  float.style.left = `${x}px`;
  float.style.top  = `${y}px`;
  container.appendChild(float);

  float.addEventListener('animationend', () => float.remove());
}

// ─── Confetti ─────────────────────────────────────────────
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const colors  = ['#A8C3A0', '#F4A261', '#F6F1E8', '#6A9966', '#FBBF8C', '#B8D4B2'];
  const pieces  = Array.from({ length: 80 }, () => ({
    x:   Math.random() * canvas.width,
    y:   Math.random() * -200,
    r:   Math.random() * 7 + 3,
    d:   Math.random() * 80 + 20,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltInc: Math.random() * 0.07 + 0.05,
    speed: Math.random() * 2 + 1.5,
  }));

  let frame = 0;
  const maxFrames = 160;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.fillStyle   = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tiltAngle);
      ctx.fillRect(0, 0, p.r, p.r * 2);
      ctx.restore();

      p.tiltAngle += p.tiltInc;
      p.y += p.speed;
      p.x += Math.sin(frame / 20) * 0.8;
      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });

    frame++;
    if (frame < maxFrames) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  draw();
}

// ─── Helpers ──────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Boot ─────────────────────────────────────────────────
(function init() {
  const session = localStorage.getItem('tandai_session');
  if (session && getUserData(session)) {
    currentUser = session;
    checkDailyReset();
    updateStreak();
    loadDashboard();
  } else {
    switchScreen('auth-screen');
  }

  // Enter key on login
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('login-username').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('signup-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSignup();
  });
  document.getElementById('signup-username').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSignup();
  });

  // Watch for all tasks done (confetti trigger)
  const observer = new MutationObserver(() => {
    const data = getUserData(currentUser);
    if (!data || !data.tasks.length) return;
    const allDone = data.tasks.every(t => t.done);
    if (allDone && data.tasks.length >= 3) {
      triggerConfetti();
    }
  });

  const taskList = document.getElementById('task-list');
  if (taskList) {
    observer.observe(taskList, { childList: true, subtree: true, attributes: true });
  }
})();
