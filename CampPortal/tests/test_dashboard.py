from datetime import date, time
from app import models

def test_upcoming_events(admin_client, db_session, admin_user):
    # Деактивируем все остальные смены
    db_session.query(models.Shift).update({models.Shift.is_active: False})
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30), is_active=True)
    db_session.add(shift)
    db_session.commit()
    routine = models.RoutineEvent(name="Ужин", time=time(19, 0), shift_id=shift.id)
    activity = models.Activity(
        title="Концерт",
        date=date.today(),
        start_time=time(18, 0),
        shift_id=shift.id,
        created_by=admin_user.id
    )
    db_session.add_all([routine, activity])
    db_session.commit()
    response = admin_client.get("/api/dashboard/upcoming")
    assert response.status_code == 200
    data = response.json()
    # Должны быть и режимный момент, и мероприятие
    assert len(data) >= 2

def test_dashboard_stats(admin_client, db_session):
    # Деактивируем все остальные смены
    db_session.query(models.Shift).update({models.Shift.is_active: False})
    shift = models.Shift(name="Active", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30), is_active=True)
    db_session.add(shift)
    db_session.commit()
    child = models.Child(full_name="Вася", shift_id=shift.id, status="active")
    group = models.Group(name="Группа", shift_id=shift.id)
    db_session.add_all([child, group])
    db_session.commit()
    response = admin_client.get("/api/dashboard/stats")
    assert response.status_code == 200
    stats = response.json()
    assert stats["shift_name"] == "Active"
    assert stats["children_active"] == 1
    assert stats["groups"] == 1