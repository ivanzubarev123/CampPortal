from datetime import date, time
from app import models

def test_create_routine(admin_client, db_session):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    response = admin_client.post("/api/routines", json={
        "name": "Подъём",
        "time": "08:00",
        "shift_id": shift.id
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Подъём"
    # Сравниваем только первые 5 символов (HH:MM)
    assert data["time"][:5] == "08:00"

def test_list_routines(admin_client, db_session):
    shift = models.Shift(name="Shift", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30))
    db_session.add(shift)
    db_session.commit()
    routine = models.RoutineEvent(name="Отбой", time=time(22, 0), shift_id=shift.id, order_index=1)
    db_session.add(routine)
    db_session.commit()
    response = admin_client.get(f"/api/routines?shift_id={shift.id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Отбой"