import pytest
import requests
from typing import Dict, Any

BASE_URL = "http://localhost:8000"


# -------------------- Фикстуры --------------------

@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


def get_token(base_url: str, email: str, password: str) -> str:
    """Получить JWT токен через form data."""
    resp = requests.post(
        f"{base_url}/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Login failed for {email}"
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(base_url: str) -> str:
    return get_token(base_url, "admin@camp.ru", "admin123")


@pytest.fixture(scope="session")
def org_token(base_url: str) -> str:
    return get_token(base_url, "org@camp.ru", "org123")


@pytest.fixture(scope="session")
def teacher_token(base_url: str) -> str:
    return get_token(base_url, "teacher1@camp.ru", "teacher123")


def auth_headers(token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# -------------------- Хелперы --------------------

def get_active_shift_id(base_url: str, token: str) -> int:
    """Возвращает ID активной смены, если нет – создаёт новую."""
    resp = requests.get(f"{base_url}/api/shifts/active", headers=auth_headers(token))
    if resp.status_code == 200:
        return resp.json()["id"]
    # Создаём активную смену
    shift_data = {
        "name": "Тестовая смена",
        "start_date": "2025-07-01",
        "end_date": "2025-07-15",
        "is_active": True,
    }
    resp = requests.post(f"{base_url}/api/shifts", json=shift_data, headers=auth_headers(token))
    assert resp.status_code == 200, "Failed to create active shift"
    return resp.json()["id"]


# -------------------- Тесты Auth --------------------

def test_login_success(base_url: str):
    resp = requests.post(f"{base_url}/api/auth/login", data={"username": "admin@camp.ru", "password": "admin123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"


def test_login_fail_wrong_password(base_url: str):
    resp = requests.post(f"{base_url}/api/auth/login", data={"username": "admin@camp.ru", "password": "wrong"})
    assert resp.status_code == 401


def test_get_current_user(base_url: str, admin_token: str):
    resp = requests.get(f"{base_url}/api/auth/me", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    user = resp.json()
    assert user["email"] == "admin@camp.ru"
    assert user["role"] == "admin"


# -------------------- Тесты Shifts --------------------

def test_list_shifts(base_url: str, admin_token: str):
    resp = requests.get(f"{base_url}/api/shifts", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    shifts = resp.json()
    assert isinstance(shifts, list)


def test_create_and_activate_shift(base_url: str, admin_token: str):
    # Создаём смену (не активную)
    shift_data = {
        "name": "Осенняя смена",
        "start_date": "2025-10-01",
        "end_date": "2025-10-10",
        "is_active": False,
    }
    resp = requests.post(f"{base_url}/api/shifts", json=shift_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    shift_id = resp.json()["id"]

    # Активируем её
    resp = requests.put(f"{base_url}/api/shifts/{shift_id}/activate", headers=auth_headers(admin_token))
    assert resp.status_code == 200

    # Проверяем, что активная смена изменилась
    resp = requests.get(f"{base_url}/api/shifts/active", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["id"] == shift_id

    # Удаляем смену (очистка)
    resp = requests.delete(f"{base_url}/api/shifts/{shift_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200


# -------------------- Тесты Groups --------------------

def test_create_group(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)
    group_data = {
        "name": "Тестовый отряд",
        "shift_id": shift_id,
        "min_age": 7,
        "max_age": 9,
    }
    resp = requests.post(f"{base_url}/api/groups", json=group_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    group = resp.json()
    assert group["name"] == "Тестовый отряд"
    assert group["shift_id"] == shift_id
    group_id = group["id"]

    # Очистка
    requests.delete(f"{base_url}/api/groups/{group_id}", headers=auth_headers(admin_token))


def test_list_groups(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)
    resp = requests.get(f"{base_url}/api/groups?shift_id={shift_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    groups = resp.json()
    assert isinstance(groups, list)


def test_assign_child_to_group(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)

    # Создаём ребёнка
    child_data = {
        "full_name": "Тестовый Ребёнок",
        "shift_id": shift_id,
    }
    resp = requests.post(f"{base_url}/api/children", json=child_data, headers=auth_headers(admin_token))
    child_id = resp.json()["id"]

    # Создаём отряд
    group_data = {"name": "Отряд для назначения", "shift_id": shift_id}
    resp = requests.post(f"{base_url}/api/groups", json=group_data, headers=auth_headers(admin_token))
    group_id = resp.json()["id"]

    # Назначаем ребёнка в отряд
    resp = requests.post(
        f"{base_url}/api/groups/{group_id}/children",
        json={"child_id": child_id},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200

    # Проверяем, что ребёнок в отряде
    resp = requests.get(f"{base_url}/api/groups/{group_id}", headers=auth_headers(admin_token))
    group = resp.json()
    child_ids = [c["id"] for c in group["children"]]
    assert child_id in child_ids

    # Удаляем назначение
    requests.delete(f"{base_url}/api/groups/{group_id}/children/{child_id}", headers=auth_headers(admin_token))
    # Очистка
    requests.delete(f"{base_url}/api/children/{child_id}", headers=auth_headers(admin_token))
    requests.delete(f"{base_url}/api/groups/{group_id}", headers=auth_headers(admin_token))


# -------------------- Тесты Children --------------------

def test_crud_child(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)
    child_data = {
        "full_name": "Иван Петров",
        "birth_date": "2015-05-10",
        "parent_phone": "+7 123 456 78 90",
        "shift_id": shift_id,
    }
    # Create
    resp = requests.post(f"{base_url}/api/children", json=child_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    child_id = resp.json()["id"]
    assert resp.json()["full_name"] == "Иван Петров"

    # Read
    resp = requests.get(f"{base_url}/api/children/{child_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["id"] == child_id

    # Update
    update_data = {"full_name": "Иван Сидоров", "shift_id": shift_id}
    resp = requests.put(f"{base_url}/api/children/{child_id}", json=update_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Иван Сидоров"

    # Delete
    resp = requests.delete(f"{base_url}/api/children/{child_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200


def test_list_children(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)
    resp = requests.get(f"{base_url}/api/children?shift_id={shift_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    children = resp.json()
    assert isinstance(children, list)


# -------------------- Тесты Routine --------------------

def test_routine_crud(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)
    routine_data = {
        "name": "Полдник",
        "time": "15:30:00",
        "shift_id": shift_id,
    }
    # Create
    resp = requests.post(f"{base_url}/api/routines", json=routine_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    routine_id = resp.json()["id"]
    assert resp.json()["name"] == "Полдник"

    # List
    resp = requests.get(f"{base_url}/api/routines?shift_id={shift_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    routines = resp.json()
    assert any(r["id"] == routine_id for r in routines)

    # Delete
    resp = requests.delete(f"{base_url}/api/routines/{routine_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200


# -------------------- Тесты Activities --------------------

def test_activity_crud(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)

    # Создаём отряд (нужен для group_ids)
    group_resp = requests.post(
        f"{base_url}/api/groups",
        json={"name": "Отряд для мероприятия", "shift_id": shift_id},
        headers=auth_headers(admin_token),
    )
    group_id = group_resp.json()["id"]

    activity_data = {
        "title": "Весёлые старты",
        "type": "спорт",
        "date": "2025-07-05",
        "start_time": "10:00:00",
        "location": "спортивная площадка",
        "shift_id": shift_id,
        "group_ids": [group_id],
    }
    # Create
    resp = requests.post(f"{base_url}/api/activities", json=activity_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    act_id = resp.json()["id"]
    assert resp.json()["title"] == "Весёлые старты"

    # List
    resp = requests.get(f"{base_url}/api/activities?shift_id={shift_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    activities = resp.json()
    assert any(a["id"] == act_id for a in activities)

    # Get groups for activity
    resp = requests.get(f"{base_url}/api/activities/{act_id}/groups", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    groups = resp.json()
    assert groups[0]["id"] == group_id

    # Delete
    resp = requests.delete(f"{base_url}/api/activities/{act_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200

    # Очистка отряда
    requests.delete(f"{base_url}/api/groups/{group_id}", headers=auth_headers(admin_token))


def test_activity_update(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)
    # Создаём отряд
    group_resp = requests.post(
        f"{base_url}/api/groups",
        json={"name": "Отряд для обновления", "shift_id": shift_id},
        headers=auth_headers(admin_token),
    )
    group_id = group_resp.json()["id"]

    # Создаём мероприятие
    act_data = {
        "title": "Старое название",
        "date": "2025-07-06",
        "start_time": "09:00:00",
        "shift_id": shift_id,
        "group_ids": [group_id],
    }
    resp = requests.post(f"{base_url}/api/activities", json=act_data, headers=auth_headers(admin_token))
    act_id = resp.json()["id"]

    # Update
    update_data = {"title": "Новое название", "group_ids": [group_id]}
    resp = requests.put(f"{base_url}/api/activities/{act_id}", json=update_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["title"] == "Новое название"

    # Очистка
    requests.delete(f"{base_url}/api/activities/{act_id}", headers=auth_headers(admin_token))
    requests.delete(f"{base_url}/api/groups/{group_id}", headers=auth_headers(admin_token))


# -------------------- Тесты Attendance --------------------

def test_attendance_marking(base_url: str, admin_token: str, teacher_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)

    # Создаём отряд и ребёнка
    group_resp = requests.post(
        f"{base_url}/api/groups",
        json={"name": "Отряд для посещаемости", "shift_id": shift_id},
        headers=auth_headers(admin_token),
    )
    group_id = group_resp.json()["id"]

    child_resp = requests.post(
        f"{base_url}/api/children",
        json={"full_name": "Тестовый Ученик", "shift_id": shift_id},
        headers=auth_headers(admin_token),
    )
    child_id = child_resp.json()["id"]

    # Назначаем ребёнка в отряд
    requests.post(
        f"{base_url}/api/groups/{group_id}/children",
        json={"child_id": child_id},
        headers=auth_headers(admin_token),
    )

    # Создаём мероприятие
    act_data = {
        "title": "Мероприятие для посещаемости",
        "date": "2025-07-10",
        "start_time": "14:00:00",
        "shift_id": shift_id,
        "group_ids": [group_id],
    }
    act_resp = requests.post(f"{base_url}/api/activities", json=act_data, headers=auth_headers(admin_token))
    act_id = act_resp.json()["id"]

    # Получаем список детей для мероприятия
    resp = requests.get(f"{base_url}/api/attendance/activity/{act_id}", headers=auth_headers(teacher_token))
    assert resp.status_code == 200
    marks = resp.json()
    assert len(marks) == 1
    assert marks[0]["child_id"] == child_id
    assert marks[0]["participated"] is False

    # Отмечаем участие
    batch = {"marks": [{"child_id": child_id, "participated": True}]}
    resp = requests.post(
        f"{base_url}/api/attendance/activity/{act_id}/batch",
        json=batch,
        headers=auth_headers(teacher_token),
    )
    assert resp.status_code == 200

    # Проверяем, что отметка сохранилась
    resp = requests.get(f"{base_url}/api/attendance/activity/{act_id}", headers=auth_headers(teacher_token))
    assert resp.json()[0]["participated"] is True

    # Очистка
    requests.delete(f"{base_url}/api/activities/{act_id}", headers=auth_headers(admin_token))
    requests.delete(f"{base_url}/api/groups/{group_id}/children/{child_id}", headers=auth_headers(admin_token))
    requests.delete(f"{base_url}/api/children/{child_id}", headers=auth_headers(admin_token))
    requests.delete(f"{base_url}/api/groups/{group_id}", headers=auth_headers(admin_token))


# -------------------- Тесты Reports --------------------

def test_activity_report(base_url: str, admin_token: str):
    shift_id = get_active_shift_id(base_url, admin_token)
    report_data = {
        "shift_id": shift_id,
        "date_from": "2025-07-01",
        "date_to": "2025-07-31",
    }
    resp = requests.post(f"{base_url}/api/reports/activity", json=report_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    report = resp.json()
    assert isinstance(report, list)
    if report:
        assert "child_name" in report[0]
        assert "attended_count" in report[0]


# -------------------- Тесты Staff (Users) --------------------

def test_list_users(base_url: str, admin_token: str):
    resp = requests.get(f"{base_url}/api/auth/users", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    users = resp.json()
    assert isinstance(users, list)
    assert any(u["email"] == "admin@camp.ru" for u in users)


def test_create_and_delete_user(base_url: str, admin_token: str):
    user_data = {
        "full_name": "Тестовый Пользователь",
        "email": "testuser@camp.ru",
        "role": "teacher",
        "position": "Вожатый",
        "phone": "+7 999 123 45 67",
        "password": "test123",
    }
    # Create
    resp = requests.post(f"{base_url}/api/auth/users", json=user_data, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    user_id = resp.json()["id"]
    assert resp.json()["email"] == "testuser@camp.ru"

    # Delete
    resp = requests.delete(f"{base_url}/api/auth/users/{user_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200


# -------------------- Тесты прав доступа --------------------

def test_org_cannot_create_user(base_url: str, org_token: str):
    user_data = {
        "full_name": "Попытка от организатора",
        "email": "orgtries@camp.ru",
        "role": "teacher",
        "password": "pass",
    }
    resp = requests.post(f"{base_url}/api/auth/users", json=user_data, headers=auth_headers(org_token))
    assert resp.status_code == 403  # Недостаточно прав


def test_teacher_cannot_delete_group(base_url: str, teacher_token: str):
    resp = requests.delete(f"{base_url}/api/groups/1", headers=auth_headers(teacher_token))
    assert resp.status_code == 403


def test_teacher_can_mark_attendance(base_url: str, teacher_token: str):
    # Просто проверяем, что эндпоинт доступен (есть мероприятие с его отрядом)
    shift_id = get_active_shift_id(base_url, teacher_token)
    resp = requests.get(f"{base_url}/api/activities?shift_id={shift_id}", headers=auth_headers(teacher_token))
    assert resp.status_code == 200
    # Если есть мероприятия, пробуем получить посещаемость
    activities = resp.json()
    if activities:
        act_id = activities[0]["id"]
        resp = requests.get(f"{base_url}/api/attendance/activity/{act_id}", headers=auth_headers(teacher_token))
        assert resp.status_code == 200
