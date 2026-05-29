from datetime import date
from app import models

def test_list_groups_empty(admin_client, db_session):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    response = admin_client.get(f"/api/groups?shift_id={shift.id}")
    assert response.status_code == 200
    assert response.json() == []

def test_create_group(admin_client, db_session):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    response = admin_client.post("/api/groups", json={
        "name": "Орлята",
        "shift_id": shift.id,
        "min_age": 7,
        "max_age": 10
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Орлята"
    assert data["shift_id"] == shift.id

def test_teacher_cannot_create_group(teacher_client, db_session):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    response = teacher_client.post("/api/groups", json={
        "name": "Орлята",
        "shift_id": shift.id
    })
    assert response.status_code == 403

def test_add_child_to_group(admin_client, db_session):
    # Очищаем все существующие привязки, чтобы избежать конфликта unique
    db_session.query(models.GroupMembership).delete()
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    group = models.Group(name="Группа", shift_id=shift.id)
    child = models.Child(full_name="Петя", shift_id=shift.id)
    db_session.add_all([group, child])
    db_session.commit()
    response = admin_client.post(f"/api/groups/{group.id}/children", json={"child_id": child.id})
    assert response.status_code == 200
    # Обновляем объект группы из БД, чтобы подтянуть связь
    db_session.refresh(group)
    assert len(group.children) == 1
    assert group.children[0].id == child.id