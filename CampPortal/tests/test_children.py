from datetime import date
from app import models

def test_list_children_empty(admin_client, db_session):
    shift = models.Shift(
        name="Empty Shift",
        start_date=date(2025, 7, 1),
        end_date=date(2025, 7, 31)
    )
    db_session.add(shift)
    db_session.commit()

    response = admin_client.get(f"/api/children?shift_id={shift.id}")
    assert response.status_code == 200
    assert response.json() == []

def test_create_child(admin_client, db_session):
    shift = models.Shift(
        name="Test Shift",
        start_date=date(2025, 6, 1),
        end_date=date(2025, 6, 30),
        is_active=True
    )
    db_session.add(shift)
    db_session.commit()

    response = admin_client.post("/api/children", json={
        "full_name": "Иван Петров",
        "birth_date": "2010-05-10",
        "parent_phone": "+79991234567",
        "shift_id": shift.id
    })
    assert response.status_code == 200
    child = response.json()
    assert child["full_name"] == "Иван Петров"
    assert child["shift_id"] == shift.id

def test_teacher_cannot_create_child(teacher_client, db_session):
    shift = models.Shift(
        name="Shift",
        start_date=date(2025, 6, 1),
        end_date=date(2025, 6, 30)
    )
    db_session.add(shift)
    db_session.commit()

    response = teacher_client.post("/api/children", json={
        "full_name": "Анна Сидорова",
        "shift_id": shift.id
    })
    assert response.status_code == 403