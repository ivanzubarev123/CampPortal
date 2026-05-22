// --- глобальные переменные ---
let token = localStorage.getItem('access_token');
let currentUser = null;
let activeShiftId = null;
let myGroupId = null;        // для вожатого

// --- вспомогательные функции API ---
async function apiCall(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, { ...options, headers });
    if (resp.status === 401) { logout(); throw new Error('Unauthorized'); }
    return resp;
}

function logout() {
    localStorage.removeItem('access_token');
    token = null;
    currentUser = null;
    activeShiftId = null;
    myGroupId = null;
    renderLogin();
}

async function loadActiveShift() {
    const resp = await apiCall('/api/shifts/active');
    if (resp.ok) {
        const shift = await resp.json();
        activeShiftId = shift.id;
    } else {
        activeShiftId = null;
    }
}

async function loadUser() {
    const resp = await apiCall('/api/auth/me');
    if (resp.ok) {
        currentUser = await resp.json();
        if (currentUser.role === 'teacher') {
            const groupResp = await apiCall('/api/groups/my-group');
            if (groupResp.ok) {
                const group = await groupResp.json();
                myGroupId = group.id;
            }
        }
    } else {
        currentUser = null;
    }
}

function renderLogin() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `
        <div class="login-form">
            <h2>Вход в систему лагеря</h2>
            <div class="form-group"><label>Email</label><input type="email" id="email" placeholder="admin@camp.ru"></div>
            <div class="form-group"><label>Пароль</label><input type="password" id="password"></div>
            <button onclick="login()">Войти</button>
            <div id="login-error" class="error"></div>
            <hr><small>Тестовые: admin@camp.ru / admin123<br>org@camp.ru / org123<br>teacher1@camp.ru / teacher123</small>
        </div>
    `;
}

window.login = async function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    try {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: email, password: password })
        });
        if (resp.ok) {
            const data = await resp.json();
            localStorage.setItem('access_token', data.access_token);
            token = data.access_token;
            await loadUser();
            await loadActiveShift();
            renderMain();
        } else {
            errorDiv.innerText = 'Неверный email или пароль';
        }
    } catch(err) {
        errorDiv.innerText = 'Ошибка соединения';
    }
};

function renderMain() {
    const appDiv = document.getElementById('app');

    let navHtml = `<div class="container">
        <div class="user-info">
            <span>${escapeHtml(currentUser.full_name)} (${currentUser.role === 'admin' ? 'Администратор' : currentUser.role === 'org' ? 'Организатор' : currentUser.role === 'teacher' ? 'Вожатый' : currentUser.role})</span>
            <button id="logoutBtn" class="logout-btn">Выйти</button>
        </div>

        ${!activeShiftId ? '<div class="warning" style="background:#fef9c3; padding:8px; margin-bottom:16px;">Нет активной смены. Перейдите в "Смены" и создайте или активируйте смену.</div>' : ''}

        <nav class="nav">`;

    if (currentUser.role === 'admin') {
        navHtml += `<button class="tab-btn" data-tab="routine">Режим дня</button>
                    <button class="tab-btn" data-tab="activities">Мероприятия</button>
                    <button class="tab-btn" data-tab="groups">Отряды</button>
                    <button class="tab-btn" data-tab="children">Дети</button>
                    <button class="tab-btn" data-tab="staff">Сотрудники</button>
                    <button class="tab-btn" data-tab="attendance">Отметить участие</button>
                    <button class="tab-btn" data-tab="report">Отчёт</button>
                    <button class="tab-btn" data-tab="shifts">Смены</button>`;
    } else if (currentUser.role === 'org') {
        navHtml += `<button class="tab-btn" data-tab="activities">Мероприятия (управление)</button>
                    <button class="tab-btn" data-tab="groups">Отряды (управление)</button>
                    <button class="tab-btn" data-tab="children">Дети (все)</button>
                    <button class="tab-btn" data-tab="staff">Сотрудники</button>
                    <button class="tab-btn" data-tab="report">Отчёт</button>`;
    } else if (currentUser.role === 'teacher') {
        navHtml += `<button class="tab-btn" data-tab="mygroup">Мой отряд</button>
                    <button class="tab-btn" data-tab="attendance_teacher">Отметить участие</button>
                    <button class="tab-btn" data-tab="report_teacher">Отчёт по отряду</button>
                    <button class="tab-btn" data-tab="schedule">Расписание</button>`;
    }

    navHtml += `</nav><div id="tab-content" class="tab-content">Загрузка...</div></div>`;

    appDiv.innerHTML = navHtml;

    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveTab(btn.dataset.tab);
            loadTabContent(btn.dataset.tab);
        });
    });

    const firstTab = document.querySelector('.tab-btn')?.dataset.tab;
    if (firstTab) loadTabContent(firstTab);
}

function setActiveTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
}

async function loadTabContent(tab) {
    const container = document.getElementById('tab-content');
    container.innerHTML = '<div class="loading">Загрузка...</div>';

    switch(tab) {
        case 'routine': await renderRoutine(container); break;
        case 'activities': await renderActivities(container); break;
        case 'groups': await renderGroupsAdmin(container); break;
        case 'children': await renderChildrenAll(container); break;
        case 'attendance': await renderAttendanceAdmin(container); break;
        case 'report': await renderReportAdmin(container); break;
        case 'mygroup': await renderMyGroup(container); break;
        case 'attendance_teacher': await renderAttendanceTeacher(container); break;
        case 'report_teacher': await renderReportTeacher(container); break;
        case 'schedule': await renderSchedule(container); break;
        case 'staff': await renderStaff(container); break;
        case 'shifts': await renderShifts(container); break;
        default: container.innerHTML = '<p>Нет данных</p>';
    }
}

/* ---------------- ROUTINE ---------------- */

async function renderRoutine(container) {
    const resp = await apiCall(`/api/routines?shift_id=${activeShiftId}`);
    const routines = await resp.json();

    let html = `<h2>Режим дня</h2>
        <div class="form-card">
            <h3>Добавить режимный момент</h3>
            <div class="form-group"><label>Название</label><input type="text" id="r_name"></div>
            <div class="form-group"><label>Время</label><input type="time" id="r_time"></div>
            <button id="createRoutineBtn">Создать</button>
        </div>

        <h3>Список</h3>
        <table><thead><tr><th>Название</th><th>Время</th><th>Действие</th></tr></thead><tbody>`;

    for (let r of routines) {
        html += `<tr>
            <td>${escapeHtml(r.name)}</td>
            <td>${r.time}</td>
            <td><button class="danger" data-id="${r.id}" data-action="deleteRoutine">Удалить</button></td>
        </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;

    document.getElementById('createRoutineBtn')?.addEventListener('click', async () => {
        const name = document.getElementById('r_name').value;
        const time = document.getElementById('r_time').value;
        if (!name || !time) return alert('Заполните поля');

        const resp = await apiCall('/api/routines', {
            method: 'POST',
            body: JSON.stringify({ name, time, shift_id: activeShiftId })
        });

        if (resp.ok) loadTabContent('routine');
    });

    document.querySelectorAll('[data-action="deleteRoutine"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            await apiCall(`/api/routines/${btn.dataset.id}`, { method: 'DELETE' });
            loadTabContent('routine');
        });
    });
}

/* ---------------- ACTIVITIES ---------------- */

async function renderActivities(container) {
    const [actsResp, groupsResp] = await Promise.all([
        apiCall(`/api/activities?shift_id=${activeShiftId}`),
        apiCall(`/api/groups?shift_id=${activeShiftId}`)
    ]);

    const activities = await actsResp.json();
    const groups = await groupsResp.json();
    const canEdit = ['admin', 'org'].includes(currentUser.role);

    let html = `<h2>Мероприятия</h2>`;

    if (canEdit) {
        html += `<div class="form-card">
            <h3>Добавить</h3>
            <div class="form-group"><label>Название</label><input id="act_title"></div>
            <div class="form-group"><label>Дата</label><input type="date" id="act_date"></div>
            <div class="form-group"><label>Время</label><input type="time" id="act_time"></div>
            <div class="form-group"><label>Место</label><input id="act_location"></div>
            <button id="createActivityBtn">Создать</button>
        </div>`;
    }

    html += `<h3>Список</h3><table><thead><tr><th>Название</th><th>Дата/Время</th><th>Место</th>${canEdit ? '<th>Действие</th>' : ''}</tr></thead><tbody>`;

    for (let a of activities) {
        html += `<tr>
            <td>${escapeHtml(a.title)}</td>
            <td>${a.date} ${a.start_time}</td>
            <td>${escapeHtml(a.location || '')}</td>
            ${canEdit ? `<td><button class="danger" data-id="${a.id}" data-action="deleteActivity">Удалить</button></td>` : ''}
        </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* ---------------- GROUPS ---------------- */

async function renderGroupsAdmin(container) {
    const groupsResp = await apiCall(`/api/groups?shift_id=${activeShiftId}`);
    const groups = await groupsResp.json();

    let html = `<h2>Управление отрядами</h2>
        <div class="form-card">
            <h3>Создать отряд</h3>
            <div class="form-group"><label>Название</label><input id="group_name"></div>
            <button id="createGroupBtn">Создать</button>
        </div>

        <h3>Существующие отряды</h3>`;

    for (let g of groups) {
        html += `<div>
            <strong>${escapeHtml(g.name)}</strong>
            <button class="danger" data-id="${g.id}" data-action="deleteGroup">Удалить</button>
            <button data-id="${g.id}" data-action="manageGroup">Назначить детей / вожатых</button>
            <div id="group-detail-${g.id}" style="display:none;"></div>
        </div>`;
    }

    container.innerHTML = html;
}

/* ---------------- CHILDREN ---------------- */

async function renderChildrenAll(container) {
    const resp = await apiCall(`/api/children?shift_id=${activeShiftId}`);
    const children = await resp.json();

    const canEdit = ['admin', 'org'].includes(currentUser.role);

    let html = `<h2>Все дети</h2>`;

    if (canEdit) {
        html += `<div class="batch-actions">
            <button id="batchDeleteBtn" class="danger" style="display:none;">Удалить выбранных</button>
            <button id="selectAllBtn">Выбрать всех</button>
            <button id="clearAllBtn">Снять все</button>
            <button id="showAddChildFormBtn">Добавить ребёнка</button>
        </div>`;
    }

    html += `<table><thead><tr>
        <th>ФИО</th>
        <th>Отряд</th>
        <th>Статус</th>
        ${canEdit ? '<th>Действие</th>' : ''}
    </tr></thead><tbody>`;

    for (let c of children) {
        html += `<tr>
            <td>${escapeHtml(c.full_name)}</td>
            <td>—</td>
            <td>${c.status}</td>
            ${canEdit ? `<td><button class="danger delete-one" data-id="${c.id}">Удалить</button></td>` : ''}
        </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* ---------------- STAFF ---------------- */

async function renderStaff(container) {
    const resp = await apiCall('/api/auth/users');
    const users = await resp.json();

    const canEdit = currentUser.role === 'admin';

    let html = `<h2>Сотрудники</h2>`;

    if (canEdit) {
        html += `<button id="showAddStaffFormBtn">Добавить сотрудника</button>`;
    }

    html += `<table><thead><tr>
        <th>ФИО</th><th>Email</th><th>Роль</th><th>Должность</th><th>Телефон</th>
        ${canEdit ? '<th>Действие</th>' : ''}
    </tr></thead><tbody>`;

    for (let u of users) {
        html += `<tr>
            <td>${escapeHtml(u.full_name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${u.role}</td>
            <td>${escapeHtml(u.position || '')}</td>
            <td>${escapeHtml(u.phone || '')}</td>
            ${canEdit ? `<td><button class="danger delete-staff" data-id="${u.id}">Удалить</button></td>` : ''}
        </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* ---------------- SHIFTS ---------------- */

async function renderShifts(container) {
    const resp = await apiCall('/api/shifts/');
    const shifts = await resp.json();

    let html = `<h2>Управление сменами</h2>
        <div class="form-card">
            <h3>Создать новую смену</h3>
            <button id="createShiftBtn">Создать</button>
        </div>

        <h3>Список смен</h3>

        <table><thead><tr><th>ID</th><th>Название</th><th>Период</th><th>Активна</th><th>Действие</th></tr></thead><tbody>`;

    for (let s of shifts) {
        html += `<tr>
            <td>${s.id}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${s.start_date} — ${s.end_date}</td>
            <td>${s.is_active ? 'Да' : 'Нет'}</td>
            <td>
                ${!s.is_active ? `<button class="activate-shift" data-id="${s.id}">Активировать</button>` : ''}
                <button class="danger delete-shift" data-id="${s.id}">Удалить</button>
            </td>
        </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* ---------------- UTIL ---------------- */

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    }[m]));
}

/* ---------------- INIT ---------------- */

if (token) {
    loadUser().then(async () => {
        if (currentUser) {
            await loadActiveShift();
            renderMain();
        } else renderLogin();
    });
} else {
    renderLogin();
}
