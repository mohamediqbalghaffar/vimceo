// ════════ STATE ════════
const ADMIN_PASS = "Admin1234";
let currentUser = JSON.parse(localStorage.getItem('cu')) || null;
let pollInterval = null;
let currentCategoryFilter = 'تەکنیکی';

// ════════ API HELPERS ════════
const API = {
    async get(path) {
        const r = await fetch(path); return r.json();
    },
    async post(path, body) {
        const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        return r.json();
    },
    async patch(path, body) {
        const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        return r.json();
    },
    async del(path) {
        const r = await fetch(path, { method: 'DELETE' }); return r.json();
    }
};

// ════════ DOM REFS ════════
const $ = id => document.getElementById(id);
const splashScreen = $('splash-screen');
const loginScreen = $('login-screen');
const app = $('app');
const loginError = $('login-error');
const loginUserSelect = $('login-user-select');
const dashboardList = $('dashboard-list');
const accountList = $('account-list');
const navFab = $('nav-fab-create');
const btnAddHeader = $('btn-add-task-header');

// ════════ INIT ════════
window.addEventListener('DOMContentLoaded', () => {
    setupLoginEvents();
    setupNavigation();
    setupAdminEvents();
    setupSenderEvents();
    setupModalEvents();
    setTimeout(() => {
        splashScreen.style.opacity = '0';
        splashScreen.style.transition = 'opacity 0.4s';
        setTimeout(() => { splashScreen.style.display = 'none'; checkAuth(); }, 400);
    }, 1800);
});

function checkAuth() {
    currentUser ? showApp() : showLogin();
}

// ════════ TOAST ════════
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast${type === 'error' ? ' error' : ''}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 50);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
}

// ════════ PASSWORD TOGGLE ════════
window.togglePassword = (id, btn) => {
    const input = document.getElementById(id);
    const icon = btn.querySelector('i');
    if (input.type === 'password') { input.type = 'text'; icon.setAttribute('data-lucide', 'eye-off'); }
    else { input.type = 'password'; icon.setAttribute('data-lucide', 'eye'); }
    lucide.createIcons();
};



// ════════ LOGIN ════════
async function showLogin() {
    loginScreen.classList.add('active');
    app.style.display = 'none';
    loginError.textContent = '';
    if ($('login-user-pass')) $('login-user-pass').value = '';
    if ($('login-admin-pass')) $('login-admin-pass').value = '';
    loginUserSelect.innerHTML = '<option value="">چاوەڕوانە...</option>';
    try {
        const users = await API.get('/api/users');
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.name} (${u.role === 'sender' ? 'نێرەر' : 'وەرگر'})`;
            loginUserSelect.appendChild(opt);
        });
    } catch (e) { /* offline */ }
}

function showApp() {
    loginScreen.classList.remove('active');
    app.style.display = 'flex';
    if ($('login-user-pass')) $('login-user-pass').value = '';
    if ($('login-admin-pass')) $('login-admin-pass').value = '';
    $('current-user-name').textContent = `بەخێربێیت، ${currentUser.name || 'ئادمین'}`;
    ['nav-hub','nav-dashboard','nav-management','nav-account'].forEach(id => $(id).style.display = 'none');
    navFab.style.display = 'none';
    btnAddHeader.style.display = 'none';

    if (currentUser.role === 'admin') {
        $('nav-management').style.display = 'flex';
        $('nav-account').style.display = 'flex';
        switchScreen('management');
        loadUsers();
    } else if (currentUser.role === 'sender') {
        $('nav-dashboard').style.display = 'flex';
        $('nav-account').style.display = 'flex';
        navFab.style.display = 'flex';
        btnAddHeader.style.display = 'flex';
        switchScreen('dashboard');
        startPollingTasks();
    } else if (currentUser.role === 'receiver') {
        $('nav-dashboard').style.display = 'flex';
        $('nav-account').style.display = 'flex';
        switchScreen('dashboard');
        startPollingTasks();
    }
    renderProfile();
    lucide.createIcons();
    initNotifications();
}

async function initNotifications() {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported in this browser');
        return;
    }
    
    // Detect placeholders
    if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey === 'YOUR_API_KEY') {
        console.error('Firebase configuration is not set up. Please update firebase-config.js with your real credentials.');
        return;
    }

    try {
        const messaging = firebase.messaging();
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        
        if (permission === 'granted') {
            const vapidKey = 'YOUR_VAPID_KEY'; // MUST BE UPDATED
            if (vapidKey === 'YOUR_VAPID_KEY') {
                console.warn('VAPID Key is missing in app.js. Push notifications will not work without it.');
                return;
            }
            
            const token = await messaging.getToken({ vapidKey });
            if (token) {
                console.log('FCM Token received:', token);
                await API.post('/api/users/update-token', { userId: currentUser.id, token });
                console.log('FCM Token saved to server');
            } else {
                console.warn('No registration token available. Request permission to generate one.');
            }
        }
    } catch (err) {
        console.error('Notification initialization failed:', err);
    }
}

function setupLoginEvents() {
    $('tab-user').addEventListener('click', () => {
        $('tab-user').classList.add('active'); $('tab-admin').classList.remove('active');
        $('login-user-form').classList.add('active'); $('login-admin-form').classList.remove('active');
        loginError.textContent = '';
    });
    $('tab-admin').addEventListener('click', () => {
        $('tab-admin').classList.add('active'); $('tab-user').classList.remove('active');
        $('login-admin-form').classList.add('active'); $('login-user-form').classList.remove('active');
        loginError.textContent = '';
    });

    $('btn-login-admin').addEventListener('click', () => {
        if ($('login-admin-pass').value === ADMIN_PASS) {
            currentUser = { id: 'admin', name: 'ئادمین', role: 'admin' };
            localStorage.setItem('cu', JSON.stringify(currentUser));
            showApp();
        } else { loginError.textContent = 'تێپەڕەوشە هەڵەیە!'; }
    });

    $('btn-login-user').addEventListener('click', async () => {
        const userId = loginUserSelect.value;
        const pass = $('login-user-pass').value.trim();
        if (!userId) { loginError.textContent = 'تکایە بەکارهێنەرێک هەڵبژێرە'; return; }
        try {
            const users = await API.get('/api/users');
            const user = users.find(u => u.id === userId);
            if (!user) { loginError.textContent = 'بەکارهێنەر نەدۆزرایەوە'; return; }
            if (user.password !== pass) { loginError.textContent = 'تێپەڕەوشە هەڵەیە!'; return; }
            currentUser = user;
            localStorage.setItem('cu', JSON.stringify(currentUser));
            showApp();
        } catch (e) { loginError.textContent = 'کێشەی پەیوەندی'; }
    });

    const doLogout = () => {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        currentUser = null;
        localStorage.removeItem('cu');
        showLogin();
    };
    $('btn-logout').addEventListener('click', doLogout);
    $('btn-logout-profile').addEventListener('click', doLogout);
}

// ════════ NAVIGATION ════════
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.getAttribute('data-screen');
            if (screen) switchScreen(screen);
        });
    });
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = $('screen-' + id);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-screen') === id);
    });
    $('screen-container').scrollTop = 0;
}

// ════════ ADMIN — USER MANAGEMENT ════════
function setupAdminEvents() {
    $('add-user-btn').addEventListener('click', async () => {
        const name = $('new-user-name').value.trim();
        const password = $('new-user-pass').value.trim();
        const role = $('new-user-role').value;
        if (!name || !password) { showToast('تکایە ناو و تێپەڕەوشە پڕبکەرەوە', 'error'); return; }
        const btn = $('add-user-btn'); btn.disabled = true;
        try {
            const res = await API.post('/api/users', { name, password, role, adminPass: ADMIN_PASS });
            if (res.error) { showToast(res.error, 'error'); } else {
                $('new-user-name').value = ''; $('new-user-pass').value = '';
                showToast(`${name} زیادکرا ✓`);
                loadUsers();
            }
        } catch (e) { showToast('کێشەی پەیوەندی', 'error'); }
        btn.disabled = false;
    });
}

async function loadUsers() {
    accountList.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><span>چاوەڕوانبە...</span></div>';
    try {
        const users = await API.get('/api/users');
        if (!users.length) { accountList.innerHTML = '<div class="empty-state"><p>هیچ بەکارهێنەرێک نییە</p></div>'; return; }
        accountList.innerHTML = users.map(u => `
            <div class="account-item">
                <div class="account-item-info">
                    <strong>${u.name}</strong>
                    <small>${u.role === 'sender' ? 'نێرەر' : 'وەرگر'}</small>
                </div>
                <button class="account-del-btn" onclick="deleteUser('${u.id}','${u.name}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>`).join('');
        lucide.createIcons();
    } catch (e) { accountList.innerHTML = '<div class="empty-state"><p>کێشەی بارکردن</p></div>'; }
}

window.deleteUser = async (id, name) => {
    if (!confirm(`ئایا دڵنیای لە سڕینەوەی ${name}؟`)) return;
    try {
        await API.del(`/api/users/${id}`);
        showToast(`${name} سڕایەوە`);
        loadUsers();
    } catch (e) { showToast('هەڵە', 'error'); }
};

// ════════ TASKS — POLLING ════════
function startPollingTasks() {
    loadTasks();
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(loadTasks, 8000); // refresh every 8s
}

async function loadTasks() {
    if (!currentUser || currentUser.role === 'admin') return;
    try {
        const tasks = await API.get(`/api/tasks?userId=${currentUser.id}&role=${currentUser.role}`);
        renderDashboard(tasks);
        renderProfileStats(tasks);
    } catch (e) { /* silent */ }
}

// ════════ SENDER — TASK CREATION ════════
async function openCreateModal() {
    const users = await API.get('/api/users');
    const receivers = users.filter(u => u.role === 'receiver');
    const sel = $('task-receiver');
    sel.innerHTML = receivers.length ? receivers.map(r => `<option value="${r.id}">${r.name}</option>`).join('') : '<option>هیچ وەرگرێک نییە</option>';
    $('modal-create-task').classList.remove('hidden');
    lucide.createIcons();
}

function setupSenderEvents() {
    navFab.addEventListener('click', openCreateModal);
    btnAddHeader.addEventListener('click', openCreateModal);
    const techBtn = $('btn-tech'), adminHubBtn = $('btn-admin-hub');
    if (techBtn) techBtn.addEventListener('click', () => switchScreen('dashboard'));
    if (adminHubBtn) adminHubBtn.addEventListener('click', () => switchScreen('dashboard'));

    // Dashboard Filter Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategoryFilter = tab.getAttribute('data-category');
            loadTasks(); // Trigger re-render with new filter
        });
    });

    $('btn-submit-task').addEventListener('click', async () => {
        const title = $('task-title').value.trim();
        const note = $('task-note').value.trim();
        const link = $('task-link').value.trim();
        const category = $('task-category').value;
        const receiverId = $('task-receiver').value;
        if (!title || !receiverId) { showToast('بابەت و وەرگر پرکردنەوەیان پێویستە', 'error'); return; }
        const btn = $('btn-submit-task'); btn.disabled = true;
        try {
            const res = await API.post('/api/tasks', { title, note, link, category, senderId: currentUser.id, receiverId });
            if (res.error) { showToast(res.error, 'error'); } else {
                $('task-title').value = ''; $('task-note').value = ''; $('task-link').value = '';
                $('modal-create-task').classList.add('hidden');
                showToast('نووسراو نێردرا ✓');
                switchScreen('dashboard');
                loadTasks();
            }
        } catch (e) { showToast('کێشەی پەیوەندی', 'error'); }
        btn.disabled = false;
    });
}

// ════════ RENDER DASHBOARD ════════
async function renderDashboard(tasks) {
    if (!tasks) return;

    // 1. Filter by Category
    let filteredTasks = tasks.filter(t => t.category === currentCategoryFilter);

    // 2. Filter by Receiver Status (Auto-hide done)
    if (currentUser.role === 'receiver') {
        filteredTasks = filteredTasks.filter(t => t.status !== 'done');
    }

    if (!filteredTasks.length) {
        dashboardList.innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><p>هیچ نووسراوێکی ${currentCategoryFilter} نییە</p></div>`;
        lucide.createIcons(); return;
    }

    // Fetch all user names
    const allUsers = await API.get('/api/users');
    const userMap = {};
    allUsers.forEach(u => userMap[u.id] = u.name);

    const rows = filteredTasks.map((task, idx) => {
        const isLast = idx === tasks.length - 1;
        const tagClass = task.category === 'تەکنیکی' ? 'tech' : 'admin';
        const time = new Date(Number(task.createdAt)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const avatarName = currentUser.role === 'sender' ? (userMap[task.receiverId] || '?') : (userMap[task.senderId] || '?');
        const deleteBtn = currentUser.role === 'sender'
            ? `<button class="card-delete-btn" onclick="deleteTask('${task.id}')"><i data-lucide="trash-2"></i></button>` : '';
        const checkbox = currentUser.role === 'receiver' && task.status !== 'done'
            ? `<div class="card-checkbox" onclick="markDone('${task.id}')"></div>`
            : task.status === 'done' ? `<div class="card-checkbox checked"><i data-lucide="check" style="width:13px;height:13px;"></i></div>` : '';
        const linkBtn = task.link ? `<a href="${task.link}" target="_blank" rel="noopener" class="card-link-btn"><i data-lucide="external-link"></i>کردنەوەی بەستەر</a>` : '';
        const statusBadge = task.status === 'done'
            ? `<span class="card-status-badge status-done">تەواوکرا</span>`
            : `<span class="card-status-badge status-pending">چاوەڕوان</span>`;
        return `<div class="timeline-row">
            <div class="card-column">
                <div class="task-card">
                    <div class="card-top">
                        <span class="pill-tag ${tagClass}"><span class="dot"></span>${task.category}</span>
                        <div class="card-actions-top">${deleteBtn}${checkbox}</div>
                    </div>
                    <div class="card-body">
                        <h3>${task.title}</h3>
                        ${task.note ? `<p>${task.note}</p>` : ''}
                        ${linkBtn}
                    </div>
                    <div class="card-divider"></div>
                    <div class="card-footer">
                        <div class="card-time"><i data-lucide="clock"></i>${time}</div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${statusBadge}
                            <div class="avatars">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=random&color=fff&size=64" alt="">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="time-column">
                <span class="time-text">${time.split(' ')[0]}</span>
                <div class="time-dot"></div>
                ${!isLast ? '<div class="time-line"></div>' : ''}
            </div>
        </div>`;
    }).join('');
    dashboardList.innerHTML = `<div class="timeline-container">${rows}</div>`;
    lucide.createIcons();
}

// ════════ MARK DONE / DELETE ════════
let activeTaskId = null;
window.markDone = (id) => { activeTaskId = id; $('modal-backdrop').classList.remove('hidden'); };
window.deleteTask = async (id) => {
    if (!confirm('ئایا دڵنیای لە سڕینەوەی ئەم نووسراوە؟')) return;
    try { await API.del(`/api/tasks/${id}`); showToast('سڕایەوە'); loadTasks(); }
    catch (e) { showToast('هەڵە', 'error'); }
};

// ════════ MODALS ════════
function setupModalEvents() {
    $('modal-cancel').addEventListener('click', () => { $('modal-backdrop').classList.add('hidden'); activeTaskId = null; });
    $('modal-confirm').addEventListener('click', async () => {
        if (!activeTaskId) return;
        try { await API.patch(`/api/tasks/${activeTaskId}`, { status: 'done' }); showToast('تەواوکرا ✓'); loadTasks(); }
        catch (e) { showToast('هەڵە', 'error'); }
        $('modal-backdrop').classList.add('hidden'); activeTaskId = null;
    });
}

// ════════ PROFILE ════════
function renderProfile() {
    if (!currentUser) return;
    const roleMap = { admin: 'ئادمین', sender: 'نێرەر', receiver: 'وەرگر' };
    const name = currentUser.name || 'ئادمین';
    $('profile-name').textContent = name;
    $('profile-role').textContent = roleMap[currentUser.role] || currentUser.role;
    $('profile-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f2c25&color=fff&size=200`;
    const badge = $('profile-role-badge');
    badge.className = 'profile-avatar-badge';
    badge.classList.add(currentUser.role === 'sender' ? 'badge-sender' : currentUser.role === 'receiver' ? 'badge-receiver' : 'badge-admin');
}

function renderProfileStats(tasks) {
    const el = $('profile-stats'); if (!el) return;
    if (currentUser.role === 'sender') {
        const total = tasks.length, done = tasks.filter(t => t.status === 'done').length;
        el.innerHTML = `<div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">کۆی نووسراوەکان</div></div>
                        <div class="stat-box"><div class="stat-num">${done}</div><div class="stat-label">تەواوکراوەکان</div></div>`;
    } else if (currentUser.role === 'receiver') {
        const pending = tasks.filter(t => t.status === 'pending').length, done = tasks.filter(t => t.status === 'done').length;
        el.innerHTML = `<div class="stat-box"><div class="stat-num">${pending}</div><div class="stat-label">چاوەڕوان</div></div>
                        <div class="stat-box"><div class="stat-num">${done}</div><div class="stat-label">تەواوکراو</div></div>`;
    }
}
