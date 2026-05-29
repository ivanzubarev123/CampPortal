from datetime import date
from app import models

def test_create_shift(admin_client):
    response = admin_client.post("/api/shifts", json={
        "name": "Лето 2025",
        "start_date": "2025-06-01",
        "end_date": "2025-08-31",
        "is_active": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Лето 2025"
    assert data["is_active"] is True

def test_activate_shift(admin_client, db_session):
    shift1 = models.Shift(name="Shift1", start_date=date(2025, 6, 1), end_date=date(2025, 6, 30), is_active=False)
    shift2 = models.Shift(name="Shift2", start_date=date(2025, 7, 1), end_date=date(2025, 7, 31), is_active=False)
    db_session.add_all([shift1, shift2])
    db_session.commit()
    response = admin_client.put(f"/api/shifts/{shift2.id}/activate")
    assert response.status_code == 200
    db_session.refresh(shift1)
    db_session.refresh(shift2)
    assert shift1.is_active is False
    assert shift2.is_active is True