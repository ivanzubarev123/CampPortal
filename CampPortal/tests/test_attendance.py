from datetime import date, time
from app import models

def test_mark_attendance_batch(admin_client, db_session):
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

    # created_by = 1 — этот пользователь должен существовать в БД
    # В админ-клиенте admin_user имеет id=1, он уже создан в фикстуре
    activity = models.Activity(
        title="Спортландия",
        date=date(2025, 6, 10),
        start_time=time(10, 0),
        shift_id=shift.id,
        created_by=1
    )
    db_session.add(activity)
    db_session.commit()

    participant = models.ActivityParticipant(activity_id=activity.id, group_id=group.id)
    db_session.add(participant)
    db_session.commit()

    response = admin_client.post(f"/api/attendance/activity/{activity.id}/batch", json={
        "marks": [{"child_id": child.id, "participated": True}]
    })
    assert response.status_code == 200

    get_resp = admin_client.get(f"/api/attendance/activity/{activity.id}")
    assert get_resp.status_code == 200
    marks = get_resp.json()
    assert len(marks) == 1
    assert marks[0]["participated"] is True