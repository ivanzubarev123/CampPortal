from datetime import date, time
from app import models

def test_activity_report(admin_client, db_session):
    shift = models.Shift(
        name="Summer",
        start_date=date(2025, 6, 1),
        end_date=date(2025, 6, 30)
    )
    db_session.add(shift)
    db_session.commit()

    group = models.Group(name="Орлята", shift_id=shift.id)
    db_session.add(group)
    db_session.commit()

    child = models.Child(full_name="Коля", shift_id=shift.id)
    db_session.add(child)
    db_session.commit()

    membership = models.GroupMembership(child_id=child.id, group_id=group.id)
    db_session.add(membership)

    act1 = models.Activity(
        title="Зарядка",
        date=date(2025, 6, 2),
        start_time=time(9, 0),
        shift_id=shift.id,
        created_by=1
    )
    act2 = models.Activity(
        title="Концерт",
        date=date(2025, 6, 5),
        start_time=time(18, 0),
        shift_id=shift.id,
        created_by=1
    )
    db_session.add_all([act1, act2])
    db_session.commit()

    db_session.add(models.ActivityParticipant(activity_id=act1.id, group_id=group.id))
    db_session.add(models.ActivityParticipant(activity_id=act2.id, group_id=group.id))

    attendance = models.Attendance(
        child_id=child.id,
        activity_id=act1.id,
        participated=True,
        marked_by=1
    )
    db_session.add(attendance)
    db_session.commit()

    response = admin_client.post("/api/reports/activity", json={
        "shift_id": shift.id,
        "group_id": group.id,
        "date_from": "2025-06-01",
        "date_to": "2025-06-30"
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["child_name"] == "Коля"
    assert data[0]["attended_count"] == 1
    assert data[0]["total_activities"] == 2
    assert data[0]["percent"] == 50.0