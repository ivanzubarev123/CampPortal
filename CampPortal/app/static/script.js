// --- глобальные переменные ---
let token = localStorage.getItem('access_token');
let currentUser = null;
let activeShiftId = null;
let myGroupId = null;
let activeShiftStart = null;
let activeShiftEnd = null;

// --- вспомогательные функции API ---
async function apiCall(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, { ...options, headers });
    if (resp.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }
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
        activeShiftStart = shift.start_date;
        activeShiftEnd = shift.end_date;
    } else {
        activeShiftId = null;
        activeShiftStart = null;
        activeShiftEnd = null;
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
            const err = await resp.text();
            errorDiv.innerText = err || 'Неверный email или пароль';
        }
    } catch(err) {
        errorDiv.innerText = 'Ошибка соединения';
    }
};

function renderMain() {
    if (!activeShiftId) {
        console.warn("Нет активной смены. Некоторые функции могут быть ограничены.");
    }
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
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logout());
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            setActiveTab(tab);
            loadTabContent(tab);
        });
    });

    const firstTab = document.querySelector('.tab-btn')?.dataset.tab;
    if (firstTab) loadTabContent(firstTab);
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

// ----- РЕЖИМ ДНЯ (только админ) -----
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
        html += `<tr><td>${escapeHtml(r.name)}</td><td>${r.time}</td><td><button class="danger" data-id="${r.id}" data-action="deleteRoutine">Удалить</button></td></tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
    document.getElementById('createRoutineBtn')?.addEventListener('click', async () => {
        const name = document.getElementById('r_name').value.trim();
        const time = document.getElementById('r_time').value;
        if (!name || !time) return alert('Заполните название и время');
        const resp = await apiCall('/api/routines', { method: 'POST', body: JSON.stringify({ name, time, shift_id: activeShiftId }) });
        if (resp.ok) loadTabContent('routine');
        else {
            const err = await resp.text();
            alert(`Ошибка: ${err}`);
        }
    });
    document.querySelectorAll('[data-action="deleteRoutine"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить?')) {
                const resp = await apiCall(`/api/routines/${btn.dataset.id}`, { method: 'DELETE' });
                if (resp.ok) loadTabContent('routine');
                else alert('Ошибка удаления');
            }
        });
    });
}

// ----- МЕРОПРИЯТИЯ (админ и орг) -----
async function renderActivities(container) {
    const [actsResp, groupsResp] = await Promise.all([
        apiCall(`/api/activities?shift_id=${activeShiftId}`),
        apiCall(`/api/groups?shift_id=${activeShiftId}`)
    ]);
    const activities = await actsResp.json();
    const groups = await groupsResp.json();
    const canEdit = currentUser.role === 'admin' || currentUser.role === 'org';
    
    const activityTypes = [
        { value: "спорт", label: "Спорт" },
        { value: "концерт", label: "Концерт" },
        { value: "мастер-класс", label: "Мастер-класс" },
        { value: "экскурсия", label: "Экскурсия" },
        { value: "игра", label: "Игра" },
        { value: "соревнование", label: "Соревнование" },
        { value: "другое", label: "Другое" }
    ];

    const activityLocations = [
        { value: "актовый зал", label: "Актовый зал" },
        { value: "спортивная площадка", label: "Спортивная площадка" },
        { value: "столовая", label: "Столовая" },
        { value: "корпус отряда", label: "Корпус отряда" },
        { value: "библиотека", label: "Библиотека" },
        { value: "медицинский пункт", label: "Медицинский пункт" },
        { value: "игровая комната", label: "Игровая комната" },
        { value: "улица", label: "Улица" },
        { value: "другое", label: "Другое" }
    ];
    
    let html = `<h2>Мероприятия</h2>`;
    if (canEdit) {
        // Информация о допустимом диапазоне дат
        let dateHint = '';

        html += `<div class="form-card">
            <h3>Добавить</h3>
            <div class="form-group"><label>Название</label><input id="act_title"></div>
            <div class="form-group"><label>Тип</label>
                <select id="act_type">
                    ${activityTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Дата</label>
                <input type="date" id="act_date">
                ${dateHint}
            </div>
            <div class="form-group"><label>Время</label><input type="time" id="act_time"></div>
            <div class="form-group"><label>Место</label>
                <select id="act_location">
                    <option value="">-- Выберите место --</option>
                    ${activityLocations.map(l => `<option value="${l.value}">${l.label}</option>`).join('')}
                </select>
            </div>
            <div class="checkbox-group" id="groups-checkboxes">`;
        for (let g of groups) {
            html += `<label><input type="checkbox" value="${g.id}" class="act-group-cb"> ${escapeHtml(g.name)}</label>`;
        }
        html += `</div><button id="createActivityBtn">Создать</button></div>`;
    }
    html += `<h3>Список</h3>
        <table>
            <thead>
                <tr><th>Название</th><th>Тип</th><th>Дата/Время</th><th>Место</th>${canEdit ? '<th>Действие</th>' : ''}</tr>
            </thead>
            <tbody>`;
    for (let a of activities) {
        let typeLabel = a.type ? a.type.charAt(0).toUpperCase() + a.type.slice(1) : '';
        html += `<tr>
            <td>${escapeHtml(a.title)}</td>
            <td>${escapeHtml(typeLabel)}</td>
            <td>${a.date} ${a.start_time}</td>
            <td>${escapeHtml(a.location || '')}</td>
            ${canEdit ? `<td><button class="danger delete-activity" data-id="${a.id}">Удалить</button></td>` : ''}
        </tr>`;
    }
    html += `</tbody>
        </table>`;
    container.innerHTML = html;
    
    if (canEdit) {
        document.getElementById('createActivityBtn')?.addEventListener('click', async () => {
            const title = document.getElementById('act_title').value.trim();
            const type = document.getElementById('act_type').value;
            const date = document.getElementById('act_date').value;
            const start_time = document.getElementById('act_time').value;
            const location = document.getElementById('act_location').value;

            if (!title) return alert('Введите название мероприятия');
            if (!date) return alert('Выберите дату');
            if (!start_time) return alert('Выберите время');

            // Проверка, что дата в пределах смены
            if (activeShiftStart && activeShiftEnd) {
                const selectedDate = new Date(date);
                const shiftStart = new Date(activeShiftStart);
                const shiftEnd = new Date(activeShiftEnd);
                // Устанавливаем время в 00:00:00 для корректного сравнения
                shiftStart.setHours(0,0,0,0);
                shiftEnd.setHours(0,0,0,0);
                if (selectedDate < shiftStart || selectedDate > shiftEnd) {
                    alert(`Дата мероприятия должна быть в пределах смены (${activeShiftStart} – ${activeShiftEnd})`);
                    return;
                }
            }

            const group_ids = Array.from(
                document.querySelectorAll('.act-group-cb:checked')
            ).map(cb => parseInt(cb.value));

            const body = {
                title,
                type,
                date,
                start_time,
                location: location || null,
                shift_id: activeShiftId,
                group_ids
            };

            try {
                const resp = await apiCall('/api/activities', {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                if (resp.ok) {
                    loadTabContent('activities');
                } else {
                    const err = await resp.json();
                    alert(`Ошибка: ${err.detail || 'Не удалось создать мероприятие'}`);
                }
            } catch (err) {
                alert('Ошибка соединения');
            }
        });

        // Удаление мероприятий (было добавлено ранее)
        document.querySelectorAll('.delete-activity').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Удалить мероприятие?')) return;
                const resp = await apiCall(`/api/activities/${btn.dataset.id}`, { method: 'DELETE' });
                if (resp.ok) loadTabContent('activities');
                else alert('Ошибка удаления');
            });
        });
    }
}

// ----- УПРАВЛЕНИЕ ОТРЯДАМИ (админ и орг) -----
async function renderGroupsAdmin(container) {
    const groupsResp = await apiCall(`/api/groups?shift_id=${activeShiftId}`);
    const groups = await groupsResp.json();

    let html = `
        <h2>Управление отрядами</h2>

        <div class="form-card">
            <h3>Создать отряд</h3>

            <div class="form-group">
                <label>Название</label>
                <input id="group_name">
            </div>

            <div class="form-group">
                <label>Мин. возраст</label>
                <input id="group_min_age" type="number" min="0">
            </div>

            <div class="form-group">
                <label>Макс. возраст</label>
                <input id="group_max_age" type="number" min="0">
            </div>

            <button id="createGroupBtn">Создать</button>
        </div>

        <h3>Существующие отряды</h3>
    `;

    for (let g of groups) {
        html += `
            <div style="border:1px solid #ccc; margin-bottom:10px; padding:10px;">
                <strong>${escapeHtml(g.name)}</strong>
                (${g.min_age ?? '-'} - ${g.max_age ?? '-'})

                <button class="danger" data-id="${g.id}" data-action="deleteGroup">
                    Удалить отряд
                </button>

                <button data-id="${g.id}" data-action="manageGroup">
                    Назначить детей / вожатых
                </button>

                <div id="group-detail-${g.id}" style="display:none; margin-top:10px;"></div>
            </div>
        `;
    }

    container.innerHTML = html;

    document.getElementById('createGroupBtn')?.addEventListener('click', async () => {
        const name = document.getElementById('group_name').value.trim();
        if (!name) return alert('Введите название отряда');
        let min_age = document.getElementById('group_min_age').value;
        let max_age = document.getElementById('group_max_age').value;

        if (min_age && max_age && Number(min_age) > Number(max_age)) {
            return alert('Максимальный возраст не может быть меньше минимального');
        }

        const body = {
            name,
            shift_id: activeShiftId,
            min_age: min_age ? Number(min_age) : null,
            max_age: max_age ? Number(max_age) : null
        };

        const resp = await apiCall('/api/groups', { method: 'POST', body: JSON.stringify(body) });
        if (resp.ok) {
            loadTabContent('groups');
        } else {
            const err = await resp.json();
            alert(`Ошибка: ${err.detail || 'Не удалось создать отряд'}`);
        }
    });

    document.querySelectorAll('[data-action="deleteGroup"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Удалить отряд? Дети останутся без отряда.')) return;
            const resp = await apiCall(`/api/groups/${btn.dataset.id}`, { method: 'DELETE' });
            if (resp.ok) loadTabContent('groups');
            else alert('Ошибка удаления');
        });
    });

    document.querySelectorAll('[data-action="manageGroup"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const groupId = btn.dataset.id;
            const detailDiv = document.getElementById(`group-detail-${groupId}`);
            if (detailDiv.style.display === 'none') {
                detailDiv.innerHTML = '<i>Загрузка данных...</i>';
                detailDiv.style.display = 'block';

                try {
                    const groupResp = await apiCall(`/api/groups/${groupId}`);
                    const groupData = groupResp.ok ? await groupResp.json() : {};
                    const groupChildren = groupData.children || [];
                    const groupStaff = groupData.staff || [];

                    const allChildrenResp = await apiCall(`/api/children?shift_id=${activeShiftId}`);
                    const allChildren = allChildrenResp.ok ? await allChildrenResp.json() : [];
                    const freeChildren = allChildren.filter(c =>
                        !groupChildren.some(gc => gc.id === c.id)
                    );

                    const staffResp = await apiCall(`/api/auth/users`);
                    const allStaff = staffResp.ok ? await staffResp.json() : [];
                    const staffList = allStaff.filter(s => s.role === 'teacher');

                    const childrenListHtml = groupChildren.length
                        ? `<ul style="list-style:none;padding:0;">
                            ${groupChildren.map(c => `
                                <li style="display:flex;justify-content:space-between;margin-bottom:5px;">
                                    ${escapeHtml(c.full_name)}
                                    <button class="danger" onclick="window.removeChildFromGroup(${groupId}, ${c.id})">Удалить</button>
                                </li>
                            `).join('')}
                        </ul>`
                        : `<p>В отряде нет детей</p>`;

                    const staffListHtml = groupStaff.length
                        ? `<ul style="list-style:none;padding:0;">
                            ${groupStaff.map(s => `
                                <li style="display:flex;justify-content:space-between;margin-bottom:5px;">
                                    ${escapeHtml(s.full_name)}
                                    <button class="danger" onclick="window.removeStaffFromGroup(${groupId}, ${s.id})">Удалить</button>
                                </li>
                            `).join('')}
                        </ul>`
                        : `<p>Вожатые не назначены</p>`;

                    detailDiv.innerHTML = `
                        <div style="display:flex;gap:20px;margin-top:10px;border-top:1px solid #ccc;padding-top:10px;">
                            <div style="flex:1;">
                                <h4>Дети</h4>
                                ${childrenListHtml}
                                <select id="child-select-${groupId}" style="width:100%;margin-top:10px;">
                                    <option value="">-- выбрать ребёнка --</option>
                                    ${freeChildren.map(c => `<option value="${c.id}">${escapeHtml(c.full_name)}</option>`).join('')}
                                </select>
                                <button onclick="window.addChildToGroup(${groupId})">Добавить ребёнка</button>
                            </div>
                            <div style="flex:1;">
                                <h4>Вожатые</h4>
                                ${staffListHtml}
                                <select id="staff-select-${groupId}" style="width:100%;margin-top:10px;">
                                    <option value="">-- выбрать сотрудника --</option>
                                    ${staffList.map(s => `<option value="${s.id}">${escapeHtml(s.full_name)}</option>`).join('')}
                                </select>
                                <button onclick="window.assignStaffToGroup(${groupId})">Назначить вожатого</button>
                            </div>
                        </div>
                    `;
                } catch (err) {
                    detailDiv.innerHTML = `<p style="color:red;">Ошибка загрузки данных</p>`;
                }
            } else {
                detailDiv.style.display = 'none';
            }
        });
    });
}

window.addChildToGroup = async (groupId) => {
    const childId = document.getElementById(`child-select-${groupId}`).value;
    if (!childId) return alert('Выберите ребёнка');
    const resp = await apiCall(`/api/groups/${groupId}/children`, {
        method: 'POST',
        body: JSON.stringify({ child_id: parseInt(childId) })
    });
    if (resp.ok) {
        alert('Ребёнок добавлен в отряд');
        loadTabContent('groups');
    } else {
        const err = await resp.json();
        alert(`Ошибка: ${err.detail || 'Не удалось добавить ребёнка'}`);
    }
};

window.assignStaffToGroup = async (groupId) => {
    const userId = document.getElementById(`staff-select-${groupId}`).value;
    if (!userId) return alert('Выберите сотрудника');
    const resp = await apiCall(`/api/groups/${groupId}/staff`, {
        method: 'POST',
        body: JSON.stringify({ user_id: parseInt(userId) })
    });
    if (resp.ok) {
        alert('Вожатый назначен');
        loadTabContent('groups');
    } else {
        const err = await resp.json();
        alert(`Ошибка: ${err.detail || 'Не удалось назначить вожатого'}`);
    }
};

window.removeChildFromGroup = async (groupId, childId) => {
    if (!confirm('Убрать ребёнка из отряда?')) return;
    const resp = await apiCall(`/api/groups/${groupId}/children/${childId}`, { method: 'DELETE' });
    if (resp.ok) loadTabContent('groups');
    else {
        const err = await resp.json();
        alert(`Ошибка: ${err.detail || 'Не удалось удалить'}`);
    }
};

window.removeStaffFromGroup = async (groupId, userId) => {
    if (!confirm('Открепить вожатого?')) return;
    const resp = await apiCall(`/api/groups/${groupId}/staff/${userId}`, { method: 'DELETE' });
    if (resp.ok) loadTabContent('groups');
    else {
        const err = await resp.json();
        alert(`Ошибка: ${err.detail || 'Не удалось открепить'}`);
    }
};

// ----- ДЕТИ -----
async function renderChildrenAll(container) {
    const resp = await apiCall(`/api/children?shift_id=${activeShiftId}`);
    const children = await resp.json();
    const canEdit = currentUser.role === 'admin' || currentUser.role === 'org';
    let html = `<h2>Все дети</h2>`;
    if (canEdit) {
        html += `<div class="batch-actions">
            <button id="batchDeleteBtn" class="danger" style="display:none;">Удалить выбранных</button>
            <button id="selectAllBtn">Выбрать всех</button>
            <button id="clearAllBtn">Снять все</button>
            <button id="showAddChildFormBtn" style="background:#10b981;">Добавить ребёнка</button>
        </div>`;
    } else {
        html += `<button id="showAddChildFormBtn">Добавить ребёнка</button>`;
    }
    html += `<div id="addChildForm" style="display:none;" class="form-card">
                <h3>Новый ребёнок</h3>
                <div class="form-group"><label>ФИО *</label><input id="child_full_name"></div>
                <div class="form-group"><label>Дата рождения</label><input type="date" id="child_birth_date"></div>
                <div class="form-group"><label>Телефон родителя</label><input id="child_parent_phone"></div>
                <div class="form-group"><label>ФИО родителя</label><input id="child_parent_name"></div>
                <div class="form-group"><label>Мед. особенности</label><input id="child_medical_notes"></div>
                <button id="submitChildBtn">Сохранить</button>
                <button id="cancelChildBtn" style="background:#64748b;">Отмена</button>
            </div>`;
    html += `<div style="overflow-x:auto;">
        <table>
            <thead>
                <tr>
                    ${canEdit ? '<th class="checkbox-col"><input type="checkbox" id="masterCheckbox"></th>' : ''}
                    <th>ФИО</th>
                    <th>Отряд</th>
                    <th>Статус</th>
                    ${canEdit ? '<th>Действие</th>' : ''}
                </tr>
            </thead>
            <tbody id="childrenTableBody">`;
    for (let c of children) {
        let groupName = '—';
        try {
            const groupResp = await apiCall(`/api/groups?child_id=${c.id}`);
            if (groupResp.ok) {
                const groups = await groupResp.json();
                if (groups.length) groupName = groups[0].name;
            }
        } catch(e) {}
        html += `<tr data-child-id="${c.id}">
                    ${canEdit ? `<td class="checkbox-col"><input type="checkbox" class="child-checkbox" value="${c.id}"></td>` : ''}
                    <td>${escapeHtml(c.full_name)}</td>
                    <td>${groupName}</td>
                    <td>${c.status}</td>
                    ${canEdit ? `<td class="action-icons"><button class="icon-btn danger delete-one" data-id="${c.id}" data-name="${escapeHtml(c.full_name)}">Удалить</button></td>` : ''}
                 </tr>`;
    }
    html += `</tbody>
        </table>
        </div>`;
    container.innerHTML = html;

    if (!canEdit) return;

    // Массовые операции
    const masterCheckbox = document.getElementById('masterCheckbox');
    const childCheckboxes = () => document.querySelectorAll('.child-checkbox');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    function updateBatchButton() {
        const checked = document.querySelectorAll('.child-checkbox:checked').length;
        batchDeleteBtn.style.display = checked ? 'inline-block' : 'none';
        if (checked) batchDeleteBtn.innerText = `Удалить выбранных (${checked})`;
    }
    if (masterCheckbox) masterCheckbox.addEventListener('change', (e) => {
        childCheckboxes().forEach(cb => cb.checked = e.target.checked);
        updateBatchButton();
    });
    childCheckboxes().forEach(cb => cb.addEventListener('change', updateBatchButton));
    document.getElementById('selectAllBtn')?.addEventListener('click', () => {
        childCheckboxes().forEach(cb => cb.checked = true);
        if (masterCheckbox) masterCheckbox.checked = true;
        updateBatchButton();
    });
    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
        childCheckboxes().forEach(cb => cb.checked = false);
        if (masterCheckbox) masterCheckbox.checked = false;
        updateBatchButton();
    });
    batchDeleteBtn?.addEventListener('click', async () => {
        const selectedIds = Array.from(childCheckboxes()).filter(cb => cb.checked).map(cb => parseInt(cb.value));
        if (!selectedIds.length) return;
        if (!confirm(`Удалить ${selectedIds.length} ребёнка(ей)?`)) return;
        for (let id of selectedIds) {
            await apiCall(`/api/children/${id}`, { method: 'DELETE' });
        }
        loadTabContent('children');
    });
    document.querySelectorAll('.delete-one').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            if (!confirm(`Удалить ребёнка "${name}"?`)) return;
            const row = btn.closest('tr');
            row.style.opacity = '0.5';
            const resp = await apiCall(`/api/children/${id}`, { method: 'DELETE' });
            if (resp.ok) {
                row.remove();
                if (document.querySelectorAll('#childrenTableBody tr').length === 0) {
                    document.getElementById('childrenTableBody').innerHTML = '<tr><td colspan="5">Нет детей</td</tr>';
                }
                updateBatchButton();
                if (masterCheckbox) masterCheckbox.checked = false;
            } else {
                alert('Ошибка удаления');
                row.style.opacity = '1';
            }
        });
    });

    // Добавление ребёнка
    const showBtn = document.getElementById('showAddChildFormBtn');
    const formDiv = document.getElementById('addChildForm');
    const cancelBtn = document.getElementById('cancelChildBtn');
    showBtn.addEventListener('click', () => { formDiv.style.display = formDiv.style.display === 'none' ? 'block' : 'none'; });
    if (cancelBtn) cancelBtn.addEventListener('click', () => { formDiv.style.display = 'none'; });
    document.getElementById('submitChildBtn')?.addEventListener('click', async () => {
        const full_name = document.getElementById('child_full_name').value.trim();
        if (!full_name) return alert('ФИО обязательно');
        const birth_date = document.getElementById('child_birth_date').value || null;
        if (birth_date && new Date(birth_date) > new Date()) return alert('Дата рождения не может быть в будущем');
        const parent_phone = document.getElementById('child_parent_phone').value.trim() || null;
        const parent_name = document.getElementById('child_parent_name').value.trim() || null;
        const medical_notes = document.getElementById('child_medical_notes').value.trim() || null;
        const body = { full_name, birth_date, parent_phone, parent_name, medical_notes, shift_id: activeShiftId, arrival_date: null, departure_date: null };
        const resp = await apiCall('/api/children', { method: 'POST', body: JSON.stringify(body) });
        if (resp.ok) {
            formDiv.style.display = 'none';
            document.getElementById('child_full_name').value = '';
            document.getElementById('child_birth_date').value = '';
            document.getElementById('child_parent_phone').value = '';
            document.getElementById('child_parent_name').value = '';
            document.getElementById('child_medical_notes').value = '';
            loadTabContent('children');
        } else {
            const err = await resp.json();
            alert(`Ошибка: ${err.detail || 'Не удалось добавить ребёнка'}`);
        }
    });
}

// ----- ОТМЕТКА УЧАСТИЯ (админ/орг) -----
async function renderAttendanceAdmin(container) {
    const actsResp = await apiCall(`/api/activities?shift_id=${activeShiftId}`);
    const activities = await actsResp.json();
    container.innerHTML = `<h2>Отметка участия</h2>
        <select id="att_act_id">${activities.map(a => `<option value="${a.id}">${a.title} (${a.date})</option>`).join('')}</select>
        <button id="loadAttendanceBtn">Загрузить детей</button>
        <div id="attendance-area"></div>`;
    document.getElementById('loadAttendanceBtn').addEventListener('click', async () => {
        const actId = document.getElementById('att_act_id').value;
        const resp = await apiCall(`/api/attendance/activity/${actId}`);
        if (!resp.ok) { alert('Ошибка загрузки'); return; }
        const data = await resp.json();
        let formHtml = `<form id="attForm"><tr><thead><tr><th>Ребёнок</th><th>Участвовал</th></tr></thead><tbody>`;
        for (let item of data) {
            formHtml += `<tr><td>${item.child_name}</td><td><input type="checkbox" data-child="${item.child_id}" ${item.participated ? 'checked' : ''}></td></tr>`;
        }
        formHtml += `</tbody></table><button type="submit">Сохранить</button></form>`;
        document.getElementById('attendance-area').innerHTML = formHtml;
        document.getElementById('attForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const marks = Array.from(document.querySelectorAll('#attForm input[type="checkbox"]')).map(cb => ({ child_id: parseInt(cb.dataset.child), participated: cb.checked }));
            const saveResp = await apiCall(`/api/attendance/activity/${actId}/batch`, { method: 'POST', body: JSON.stringify({ marks }) });
            if (saveResp.ok) alert('Сохранено');
            else alert('Ошибка сохранения');
        });
    });
}

// ----- ВОЖАТЫЙ: мой отряд -----
async function renderMyGroup(container) {
    if (!myGroupId) { container.innerHTML = '<p>Вы не привязаны ни к одному отряду.</p>'; return; }
    const childrenResp = await apiCall(`/api/children?shift_id=${activeShiftId}&group_id=${myGroupId}`);
    const children = await childrenResp.json();
    let html = `<h2>Мой отряд (ID ${myGroupId})</h2></table><thead><tr><th>ФИО</th><th>Дата рождения</th><th>Телефон родителя</th></tr></thead><tbody>`;
    for (let c of children) {
        html += `<tr><td>${escapeHtml(c.full_name)}</td><td>${c.birth_date || ''}</td><td>${escapeHtml(c.parent_phone || '')}</td></tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ----- ВОЖАТЫЙ: отметка участия -----
async function renderAttendanceTeacher(container) {
    const actsResp = await apiCall(`/api/activities?shift_id=${activeShiftId}`);
    let activities = await actsResp.json();
    const filtered = [];
    for (let act of activities) {
        const partResp = await apiCall(`/api/activities/${act.id}/groups`);
        const groups = await partResp.json();
        if (groups.some(g => g.id === myGroupId)) filtered.push(act);
    }
    container.innerHTML = `<h2>Отметка участия (мой отряд)</h2>
        <select id="att_act_id_teacher">${filtered.map(a => `<option value="${a.id}">${a.title} (${a.date})</option>`).join('')}</select>
        <button id="loadTeacherAttendance">Загрузить детей</button>
        <div id="attendance-area-teacher"></div>`;
    document.getElementById('loadTeacherAttendance').addEventListener('click', async () => {
        const actId = document.getElementById('att_act_id_teacher').value;
        const resp = await apiCall(`/api/attendance/activity/${actId}`);
        let data = await resp.json();
        const myChildrenResp = await apiCall(`/api/children?shift_id=${activeShiftId}&group_id=${myGroupId}`);
        const myChildren = await myChildrenResp.json();
        const myChildIds = new Set(myChildren.map(c => c.id));
        data = data.filter(item => myChildIds.has(item.child_id));
        let formHtml = `<form id="attFormTeacher">能 table><thead><tr><th>Ребёнок</th><th>Участвовал</th></tr></thead><tbody>`;
        for (let item of data) {
            formHtml += `<tr><td>${item.child_name}</td><td><input type="checkbox" data-child="${item.child_id}" ${item.participated ? 'checked' : ''}></td></tr>`;
        }
        formHtml += `</tbody></table><button type="submit">Сохранить</button></form>`;
        document.getElementById('attendance-area-teacher').innerHTML = formHtml;
        document.getElementById('attFormTeacher').addEventListener('submit', async (e) => {
            e.preventDefault();
            const marks = Array.from(document.querySelectorAll('#attFormTeacher input[type="checkbox"]')).map(cb => ({ child_id: parseInt(cb.dataset.child), participated: cb.checked }));
            const saveResp = await apiCall(`/api/attendance/activity/${actId}/batch`, { method: 'POST', body: JSON.stringify({ marks }) });
            if (saveResp.ok) alert('Сохранено');
            else alert('Ошибка сохранения');
        });
    });
}

// ----- ВОЖАТЫЙ: отчёт -----
async function renderReportTeacher(container) {
    container.innerHTML = `<h2>Отчёт по активности (мой отряд)</h2>
        <div class="form-group"><label>Дата от</label><input type="date" id="report_from"></div>
        <div class="form-group"><label>Дата до</label><input type="date" id="report_to"></div>
        <button id="generateTeacherReport">Сформировать</button>
        <div id="reportResult"></div>`;
    document.getElementById('generateTeacherReport').addEventListener('click', async () => {
        const date_from = document.getElementById('report_from').value;
        const date_to = document.getElementById('report_to').value;
        if (!date_from || !date_to) return alert('Укажите обе даты');
        const body = { shift_id: activeShiftId, group_id: myGroupId, date_from, date_to };
        const resp = await apiCall('/api/reports/activity', { method: 'POST', body: JSON.stringify(body) });
        if (!resp.ok) { alert('Ошибка формирования отчёта'); return; }
        const data = await resp.json();
        let html = `<table><thead><tr><th>Ребёнок</th><th>Посещено</th><th>Всего</th><th>%</th></tr></thead><tbody>`;
        for (let row of data) {
            html += `<tr><td>${row.child_name}</td><td>${row.attended_count}</td><td>${row.total_activities}</td><td>${row.percent}%</td></tr>`;
        }
        html += `</tbody></table>`;
        document.getElementById('reportResult').innerHTML = html;
    });
}

// ----- ВОЖАТЫЙ: расписание -----
async function renderSchedule(container) {
    const [routinesResp, actsResp] = await Promise.all([
        apiCall(`/api/routines?shift_id=${activeShiftId}`),
        apiCall(`/api/activities?shift_id=${activeShiftId}`)
    ]);
    const routines = await routinesResp.json();
    let activities = await actsResp.json();
    const filteredActs = [];
    for (let act of activities) {
        const partResp = await apiCall(`/api/activities/${act.id}/groups`);
        const groups = await partResp.json();
        if (groups.some(g => g.id === myGroupId)) filteredActs.push(act);
    }
    let html = `<h2>Расписание на сегодня (пример)</h2>
        <h3>Режим дня</h3><ul>${routines.map(r => `<li>${r.time} — ${r.name}</li>`).join('')}</ul>
        <h3>Мероприятия для моего отряда</h3><ul>${filteredActs.map(a => `<li>${a.date} ${a.start_time} — ${a.title} (${a.location||''})</li>`).join('')}</ul>`;
    container.innerHTML = html;
}

// ----- ОТЧЁТ админ/орг -----
async function renderReportAdmin(container) {
    const groupsResp = await apiCall(`/api/groups?shift_id=${activeShiftId}`);
    const groups = await groupsResp.json();
    container.innerHTML = `<h2>Отчёт по активности</h2>
        <div class="form-group"><label>Дата от</label><input type="date" id="report_from"></div>
        <div class="form-group"><label>Дата до</label><input type="date" id="report_to"></div>
        <div class="form-group"><label>Отряд</label><select id="report_group"><option value="">Все</option>${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}</select></div>
        <button id="generateReportAll">Сформировать</button>
        <div id="reportResult"></div>`;
    document.getElementById('generateReportAll').addEventListener('click', async () => {
        const date_from = document.getElementById('report_from').value;
        const date_to = document.getElementById('report_to').value;
        if (!date_from || !date_to) return alert('Укажите обе даты');
        const group_id = document.getElementById('report_group').value;
        const body = { shift_id: activeShiftId, date_from, date_to };
        if (group_id) body.group_id = parseInt(group_id);
        const resp = await apiCall('/api/reports/activity', { method: 'POST', body: JSON.stringify(body) });
        if (!resp.ok) { alert('Ошибка формирования отчёта'); return; }
        const data = await resp.json();
        let html = `<table><thead><tr><th>Ребёнок</th><th>Отряд</th><th>Посещено</th><th>Всего</th><th>%</th></tr></thead><tbody>`;
        for (let row of data) {
            html += `<tr><td>${row.child_name}</td><td>${row.group_name}</td><td>${row.attended_count}</td><td>${row.total_activities}</td><td>${row.percent}%</td></tr>`;
        }
        html += `</tbody></table>`;
        document.getElementById('reportResult').innerHTML = html;
    });
}

// ----- СОТРУДНИКИ -----
async function renderStaff(container) {
    const resp = await apiCall('/api/auth/users');
    if (!resp.ok) {
        container.innerHTML = '<p>Ошибка загрузки сотрудников</p>';
        return;
    }
    const users = await resp.json();
    const canEdit = currentUser.role === 'admin';

    let html = `<h2>Сотрудники лагеря</h2>`;
    if (canEdit) {
        html += `<div class="batch-actions">
            <button id="showAddStaffFormBtn" style="background:#10b981;">Добавить сотрудника</button>
        </div>`;
    }
    html += `<div id="addStaffForm" style="display:none;" class="form-card">
                <h3>Новый сотрудник</h3>
                <div class="form-group"><label>ФИО *</label><input id="staff_full_name"></div>
                <div class="form-group"><label>Email *</label><input id="staff_email" type="email"></div>
                <div class="form-group"><label>Пароль *</label><input id="staff_password" type="password"></div>
                <div class="form-group"><label>Роль</label>
                    <select id="staff_role">
                        <option value="teacher">Вожатый</option>
                        <option value="org">Организатор</option>
                        <option value="admin">Администратор</option>
                        <option value="viewer">Наблюдатель</option>
                    </select>
                </div>
                <div class="form-group"><label>Должность</label><input id="staff_position"></div>
                <div class="form-group"><label>Телефон</label><input id="staff_phone"></div>
                <button id="submitStaffBtn">Сохранить</button>
                <button id="cancelStaffBtn" style="background:#64748b;">Отмена</button>
            </div>`;
    html += `<div style="overflow-x:auto;">
        <table class="data-table">
            <thead>
                <tr><th>ФИО</th><th>Email</th><th>Роль</th><th>Должность</th><th>Телефон</th>${canEdit ? '<th>Действие</th>' : ''}</tr>
            </thead>
            <tbody id="staffTableBody">`;
    for (let u of users) {
        html += `<tr data-user-id="${u.id}">
                    <td>${escapeHtml(u.full_name)}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${u.role}</td>
                    <td>${escapeHtml(u.position || '')}</td>
                    <td>${escapeHtml(u.phone || '')}</td>
                    ${canEdit ? `<td><button class="danger delete-staff" data-id="${u.id}" data-name="${escapeHtml(u.full_name)}">Удалить</button></td>` : ''}
                </tr>`;
    }
    html += `</tbody>
        </table>
        </div>`;
    container.innerHTML = html;

    if (!canEdit) return;

    const showFormBtn = document.getElementById('showAddStaffFormBtn');
    const formDiv = document.getElementById('addStaffForm');
    const cancelBtn = document.getElementById('cancelStaffBtn');
    showFormBtn?.addEventListener('click', () => { formDiv.style.display = formDiv.style.display === 'none' ? 'block' : 'none'; });
    cancelBtn?.addEventListener('click', () => { formDiv.style.display = 'none'; });

    document.getElementById('submitStaffBtn')?.addEventListener('click', async () => {
        const full_name = document.getElementById('staff_full_name').value.trim();
        const email = document.getElementById('staff_email').value.trim();
        const password = document.getElementById('staff_password').value.trim();
        if (!full_name || !email || !password) return alert('Заполните ФИО, Email и пароль');
        const role = document.getElementById('staff_role').value;
        const position = document.getElementById('staff_position').value.trim() || null;
        const phone = document.getElementById('staff_phone').value.trim() || null;
        const body = { full_name, email, password, role, position, phone };
        const response = await apiCall('/api/auth/users', { method: 'POST', body: JSON.stringify(body) });
        if (response.ok) {
            alert('Сотрудник добавлен');
            formDiv.style.display = 'none';
            document.getElementById('staff_full_name').value = '';
            document.getElementById('staff_email').value = '';
            document.getElementById('staff_password').value = '';
            document.getElementById('staff_position').value = '';
            document.getElementById('staff_phone').value = '';
            loadTabContent('staff');
        } else {
            const err = await response.json();
            alert(`Ошибка: ${err.detail || 'Не удалось добавить сотрудника'}`);
        }
    });

    document.querySelectorAll('.delete-staff').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            if (!confirm(`Удалить сотрудника "${name}"?`)) return;
            const row = btn.closest('tr');
            row.style.opacity = '0.5';
            const delResp = await apiCall(`/api/auth/users/${id}`, { method: 'DELETE' });
            if (delResp.ok) {
                row.remove();
                if (document.querySelectorAll('#staffTableBody tr').length === 0) {
                    document.getElementById('staffTableBody').innerHTML = '<tr><td colspan="6">Нет сотрудников</td></tr>';
                }
            } else {
                alert('Ошибка удаления');
                row.style.opacity = '1';
            }
        });
    });
}

// ----- СМЕНЫ -----
async function renderShifts(container) {
    const resp = await apiCall('/api/shifts/');
    const shifts = await resp.json();
    let html = `<h2>Управление сменами</h2>
        <div class="form-card">
            <h3>Создать новую смену</h3>
            <div class="form-group"><label>Название</label><input id="shift_name" placeholder="Лето 2025"></div>
            <div class="form-group"><label>Дата начала</label><input type="date" id="shift_start"></div>
            <div class="form-group"><label>Дата окончания</label><input type="date" id="shift_end"></div>
            <div class="form-group"><label><input type="checkbox" id="shift_active"> Сделать активной</label></div>
            <button id="createShiftBtn">Создать</button>
        </div>
        <h3>Список смен</h3>
        <table>
            <thead><tr><th>ID</th><th>Название</th><th>Период</th><th>Активна</th><th>Действие</th></tr></thead>
            <tbody>`;
    for (let s of shifts) {
        html += `<tr>
            <td>${s.id}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${s.start_date} — ${s.end_date}</td>
            <td>${s.is_active ? '✅ Да' : '❌ Нет'}</td>
            <td>
                ${!s.is_active ? `<button class="activate-shift" data-id="${s.id}">Активировать</button>` : ''}
                <button class="danger delete-shift" data-id="${s.id}" data-name="${escapeHtml(s.name)}">Удалить</button>
            </td>
        </tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;

    document.getElementById('createShiftBtn').addEventListener('click', async () => {
        const name = document.getElementById('shift_name').value.trim();
        const start_date = document.getElementById('shift_start').value;
        const end_date = document.getElementById('shift_end').value;
        if (!name || !start_date || !end_date) return alert('Заполните все поля');
        if (new Date(start_date) > new Date(end_date)) return alert('Дата начала не может быть позже даты окончания');
        const is_active = document.getElementById('shift_active').checked;
        const resp = await apiCall('/api/shifts/', {
            method: 'POST',
            body: JSON.stringify({ name, start_date, end_date, is_active })
        });
        if (resp.ok) {
            await loadTabContent('shifts');
            await loadActiveShift();
            renderMain();
        } else {
            const err = await resp.json();
            alert(`Ошибка: ${err.detail || 'Не удалось создать смену'}`);
        }
    });

    document.querySelectorAll('.activate-shift').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const resp = await apiCall(`/api/shifts/${id}/activate`, { method: 'PUT' });
            if (resp.ok) {
                await loadActiveShift();
                renderMain();
            } else {
                alert('Ошибка активации');
            }
        });
    });

    document.querySelectorAll('.delete-shift').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            if (!confirm(`Удалить смену "${name}"? Все связанные данные будут удалены!`)) return;
            const resp = await apiCall(`/api/shifts/${id}`, { method: 'DELETE' });
            if (resp.ok) {
                await loadTabContent('shifts');
                await loadActiveShift();
                renderMain();
            } else {
                alert('Ошибка удаления');
            }
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// --- инициализация ---
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