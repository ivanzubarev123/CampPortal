from datetime import date
from app import models

def test_admin_can_delete_any_child(admin_client, db_session):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    child = models.Child(full_name="Ребёнок", shift_id=shift.id)
    db_session.add(child)
    db_session.commit()
    response = admin_client.delete(f"/api/children/{child.id}")
    assert response.status_code == 200
    assert db_session.query(models.Child).filter(models.Child.id == child.id).first() is None

def test_teacher_cannot_delete_child(teacher_client, db_session):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    child = models.Child(full_name="Ребёнок", shift_id=shift.id)
    db_session.add(child)
    db_session.commit()
    response = teacher_client.delete(f"/api/children/{child.id}")
    assert response.status_code == 403