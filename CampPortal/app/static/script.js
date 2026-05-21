const API_BASE = '/api';

let token = localStorage.getItem('access_token');
let currentUser = null;
let activeShiftId = null;  // будет получено при загрузке

const appDiv = document.getElementById('app');

function showLogin() {
    appDiv.innerHTML = `
        <div class="login-form">
            <h2>Вход в систему</h2>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" placeholder="admin@camp.ru">
            </div>
            <div class="form-group">
                <label>Пароль</label>
                <input type="password" id="password">
            </div>
            <button onclick="login()">Войти</button>
            <div id="login-error" class="error"></div>
        </div>
    `;
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    try {
        const resp = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: email, password: password })
        });
        if (resp.ok) {
            const data = await resp.json();
            localStorage.setItem('access_token', data.access_token);
            token = data.access_token;
            await loadCurrentUser();
            await loadActiveShift();
            renderMainLayout();
        } else {
            errorDiv.innerText = 'Неверный email или пароль';
        }
    } catch (err) {
        errorDiv.innerText = 'Ошибка соединения';
    }
}

async function loadCurrentUser() {
    if (!token) return;
    const resp = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resp.ok) currentUser = await resp.json();
    else logout();
}

async function loadActiveShift() {
    const resp = await fetch(`${API_BASE}/shifts/active`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (resp.ok) {
        const shift = await resp.json();
        activeShiftId = shift.id;
    } else {
        activeShiftId = null;
    }
}

function logout() {
    localStorage.removeItem('access_token');
    token = null;
    currentUser = null;
    activeShiftId = null;
    showLogin();
}

async function apiCall(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, { ...options, headers });
    if (resp.status === 401) { logout(); throw new Error('Unauthorized'); }
    return resp;
}

function renderMainLayout() {
    appDiv.innerHTML = `
        <div class="container">
            <header>
                <h1>??? Лагерь. Управление</h1>
                <div class="user-info">
                    <span>${currentUser ? currentUser.full_name + ' (' + currentUser.role + ')' : ''}</span>
                    <button class="logout-btn" onclick="logout()">Выйти</button>
                </div>
            </header>
            <nav>
                <button class="tab-btn" data-tab="dashboard">?? Дашборд</button>
                <button class="tab-btn" data-tab="children">?? Дети</button>
                <button class="tab-btn" data-tab="groups">?? Отряды</button>
                <button class="tab-btn" data-tab="activities">?? Мероприятия</button>
                <button class="tab-btn" data-tab="attendance">? Отметить участие</button>
                <button class="tab-btn" data-tab="report">?? Отчёт</button>
            </nav>
            <div id="tab-content" class="tab-content">Загрузка...</div>
        </div>
    `;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            setActiveTab(tab);
            loadTabContent(tab);
        });
    });
    setActiveTab('dashboard');
    loadTabContent('dashboard');
}

function setActiveTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

async function loadTabContent(tab) {
    const container = document.getElementById('tab-content');
    if (!container) return;
    container.innerHTML = '<div class="loading">? Загрузка...</div>';
    if (tab === 'dashboard') await renderDashboard(container);
    else if (tab === 'children') await renderChildren(container);
    else if (tab === 'groups') await renderGroups(container);
    else if (tab === 'activities') await renderActivities(container);
    else if (tab === 'attendance') await renderAttendance(container);
    else if (tab === 'report') await renderReport(container);
}

// ----- Рендер дашборда -----
async function renderDashboard(container) {
    if (!activeShiftId) { container.innerHTML = '<div class="error">Нет активной смены</div>'; return; }
    try {
        const statsResp = await apiCall(`${API_BASE}/dashboard/stats`);
        const stats = await statsResp.json();
        const eventsResp = await apiCall(`${API_BASE}/dashboard/upcoming`);
        const events = await eventsResp.json();
        let html = `<div class="stats-card">
                        <div class="stat"><div class="stat-value">${stats.children_active || 0}</div><div class="stat-label">Детей активно</div></div>
                        <div class="stat"><div class="stat-value">${stats.groups || 0}</div><div class="stat-label">Отрядов</div></div>
                        <div class="stat"><div class="stat-value">${stats.staff || 0}</div><div class="stat-label">Сотрудников</div></div>
                        <div class="stat"><div class="stat-value">${stats.activities_today || 0}</div><div class="stat-label">Мероприятий сегодня</div></div>
                    </div>
                    <h3>?? Ближайшие события</h3><ul>`;
        for (let ev of events.slice(0, 8)) {
            html += `<li><strong>${ev.date} ${ev.time}</strong> – ${ev.name} (${ev.type}) ${ev.location ? '?? '+ev.location : ''}</li>`;
        }
        html += `</ul>`;
        container.innerHTML = html;
    } catch(e) { container.innerHTML = '<div class="error">Ошибка загрузки дашборда</div>'; }
}

// ----- Дети (CRUD) -----
async function renderChildren(container) {
    if (!activeShiftId) return;
    const resp = await apiCall(`${API_BASE}/children?shift_id=${activeShiftId}`);
    const children = await resp.json();
    let html = `<h2>Дети</h2><button onclick="window.showAddChildForm()">? Добавить ребёнка</button>
                <table><thead><tr><th>ID</th><th>ФИО</th><th>Дата рождения</th><th>Телефон родителя</th><th>Статус</th><th>Действия</th></tr></thead><tbody>`;
    for (let c of children) {
        html += `<tr><td>${c.id}</td><td>${c.full_name}</td><td>${c.birth_date || ''}</td><td>${c.parent_phone || ''}</td>
                <td>${c.status}</td><td><button class="danger" onclick="window.deleteChild(${c.id})">???</button></td></tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
    window.showAddChildForm = () => {
        const name = prompt('ФИО ребёнка');
        if (name) {
            apiCall(`${API_BASE}/children`, {
                method: 'POST',
                body: JSON.stringify({ full_name: name, shift_id: activeShiftId })
            }).then(() => renderChildren(container));
        }
    };
    window.deleteChild = async (id) => {
        if (confirm('Удалить ребёнка?')) {
            await apiCall(`${API_BASE}/children/${id}`, { method: 'DELETE' });
            renderChildren(container);
        }
    };
}

// ----- Отряды -----
async function renderGroups(container) {
    if (!activeShiftId) return;
    const resp = await apiCall(`${API_BASE}/groups?shift_id=${activeShiftId}`);
    const groups = await resp.json();
    let html = `<h2>Отряды</h2><button onclick="window.showAddGroup()">? Добавить отряд</button>
                <table><thead><tr><th>Название</th><th>Возрастная группа</th><th>Действия</th></tr></thead><tbody>`;
    for (let g of groups) {
        html += `<tr><td>${g.name}</td><td>${g.age_range || ''}</td>
                <td><button class="danger" onclick="window.deleteGroup(${g.id})">???</button></td></tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
    window.showAddGroup = () => {
        const name = prompt('Название отряда');
        if (name) {
            apiCall(`${API_BASE}/groups`, {
                method: 'POST',
                body: JSON.stringify({ name, shift_id: activeShiftId })
            }).then(() => renderGroups(container));
        }
    };
    window.deleteGroup = async (id) => {
        if (confirm('Удалить отряд? (дети останутся)')) {
            await apiCall(`${API_BASE}/groups/${id}`, { method: 'DELETE' });
            renderGroups(container);
        }
    };
}

// ----- Мероприятия -----
async function renderActivities(container) {
    if (!activeShiftId) return;
    const resp = await apiCall(`${API_BASE}/activities?shift_id=${activeShiftId}`);
    const acts = await resp.json();
    let html = `<h2>Мероприятия</h2><button onclick="window.showAddActivity()">? Добавить</button>
                <table><thead><tr><th>Название</th><th>Тип</th><th>Дата</th><th>Время</th><th>Место</th><th>Действия</th></tr></thead><tbody>`;
    for (let a of acts) {
        html += `<tr><td>${a.title}</td><td>${a.type || ''}</td><td>${a.date}</td><td>${a.start_time}</td>
                <td>${a.location || ''}</td><td><button class="danger" onclick="window.deleteActivity(${a.id})">???</button></td></tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
    window.showAddActivity = () => {
        const title = prompt('Название мероприятия');
        if (title) {
            // упрощённое создание (без выбора отрядов)
            apiCall(`${API_BASE}/activities`, {
                method: 'POST',
                body: JSON.stringify({
                    title, shift_id: activeShiftId,
                    date: new Date().toISOString().slice(0,10),
                    start_time: '10:00',
                    group_ids: []
                })
            }).then(() => renderActivities(container));
        }
    };
    window.deleteActivity = async (id) => {
        if (confirm('Удалить мероприятие?')) {
            await apiCall(`${API_BASE}/activities/${id}`, { method: 'DELETE' });
            renderActivities(container);
        }
    };
}

// ----- Отметка участия -----
async function renderAttendance(container) {
    if (!activeShiftId) return;
    const actsResp = await apiCall(`${API_BASE}/activities?shift_id=${activeShiftId}`);
    const activities = await actsResp.json();
    let html = `<h2>Отметка участия</h2>
                <div class="form-group"><label>Мероприятие:</label>
                <select id="att_act_id">${activities.map(a => `<option value="${a.id}">${a.title} (${a.date})</option>`).join('')}</select>
                <button onclick="window.loadAttendanceForm()">Загрузить детей</button></div>
                <div id="attendance-children"></div>`;
    container.innerHTML = html;
    window.loadAttendanceForm = async () => {
        const actId = document.getElementById('att_act_id').value;
        const resp = await apiCall(`${API_BASE}/attendance/activity/${actId}`);
        const data = await resp.json();
        let formHtml = `<form id="att-form"><table>`;
        for (let item of data) {
            formHtml += `<tr><td>${item.child_name}</td>
                         <td><input type="checkbox" data-child="${item.child_id}" ${item.participated ? 'checked' : ''}></td></tr>`;
        }
        formHtml += `</table><button type="submit">?? Сохранить</button></form>`;
        document.getElementById('attendance-children').innerHTML = formHtml;
        document.getElementById('att-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const marks = [];
            document.querySelectorAll('#att-form input[type="checkbox"]').forEach(cb => {
                marks.push({ child_id: parseInt(cb.dataset.child), participated: cb.checked });
            });
            await apiCall(`${API_BASE}/attendance/activity/${actId}/batch`, {
                method: 'POST',
                body: JSON.stringify({ marks })
            });
            alert('Отметки сохранены');
        });
    };
}

// ----- Отчёт -----
async function renderReport(container) {
    if (!activeShiftId) return;
    const groupsResp = await apiCall(`${API_BASE}/groups?shift_id=${activeShiftId}`);
    const groups = await groupsResp.json();
    let html = `<h2>Отчёт по активности</h2>
                <div class="form-group"><label>Дата от:</label><input type="date" id="date_from" value="2025-06-01"></div>
                <div class="form-group"><label>Дата до:</label><input type="date" id="date_to" value="2025-06-21"></div>
                <div class="form-group"><label>Отряд:</label><select id="group_id"><option value="">Все</option>${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}</select></div>
                <button onclick="window.generateReport()">?? Сформировать</button>
                <div id="report-results"></div>`;
    container.innerHTML = html;
    window.generateReport = async () => {
        const date_from = document.getElementById('date_from').value;
        const date_to = document.getElementById('date_to').value;
        const group_id = document.getElementById('group_id').value;
        const body = { shift_id: activeShiftId, date_from, date_to };
        if (group_id) body.group_id = parseInt(group_id);
        const resp = await apiCall(`${API_BASE}/reports/activity`, { method: 'POST', body: JSON.stringify(body) });
        const data = await resp.json();
        let tableHtml = `<table><thead><tr><th>Ребёнок</th><th>Отряд</th><th>Посещено</th><th>Всего</th><th>%</th></tr></thead><tbody>`;
        for (let row of data) {
            tableHtml += `<tr><td>${row.child_name}</td><td>${row.group_name}</td><td>${row.attended_count}</td><td>${row.total_activities}</td><td>${row.percent}%</td></tr>`;
        }
        tableHtml += `</tbody></table>`;
        document.getElementById('report-results').innerHTML = tableHtml;
    };
}

// Инициализация
if (token) {
    loadCurrentUser().then(() => {
        if (currentUser) loadActiveShift().then(() => renderMainLayout());
        else showLogin();
    });
} else {
    showLogin();
}