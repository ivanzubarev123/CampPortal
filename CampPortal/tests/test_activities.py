from datetime import date
from app import models

def test_create_activity(admin_client, db_session, admin_user):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    group = models.Group(name="Группа", shift_id=shift.id)
    db_session.add(group)
    db_session.commit()
    response = admin_client.post("/api/activities", json={
        "title": "Зарядка",
        "type": "спорт",
        "date": "2025-06-10",
        "start_time": "09:00",
        "location": "спортивная площадка",
        "shift_id": shift.id,
        "group_ids": [group.id]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Зарядка"
    assert data["shift_id"] == shift.id

def test_teacher_cannot_create_activity(teacher_client, db_session):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    response = teacher_client.post("/api/activities", json={
        "title": "Зарядка",
        "date": "2025-06-10",
        "start_time": "09:00",
        "shift_id": shift.id,
        "group_ids": []
    })
    assert response.status_code == 403