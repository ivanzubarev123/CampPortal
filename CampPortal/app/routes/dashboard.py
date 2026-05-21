from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from app import models, schemas
from app.database import get_db
from app.auth import get_current_user

router = APIRouter()

@router.get("/upcoming")
def upcoming_events(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Ближайшие события (сегодня и завтра)"""
    today = date.today()
    tomorrow = today + timedelta(days=1)
    events = []
    
    # Режимные моменты (актуальны всегда, показываем для текущего времени)
    # Упростим: берём все routine_events для активной смены
    active_shift = db.query(models.Shift).filter(models.Shift.is_active == True).first()
    if active_shift:
        routines = db.query(models.RoutineEvent).filter(models.RoutineEvent.shift_id == active_shift.id).order_by(models.RoutineEvent.time).all()
        for r in routines:
            events.append(schemas.UpcomingEvent(
                type="routine",
                name=r.name,
                time=str(r.time),
                date=today,
                location=None
            ))
    # Мероприятия на сегодня и завтра
    upcoming_acts = db.query(models.Activity).filter(
        models.Activity.date.in_([today, tomorrow])
    ).order_by(models.Activity.date, models.Activity.start_time).all()
    for a in upcoming_acts:
        events.append(schemas.UpcomingEvent(
            type="activity",
            name=a.title,
            time=str(a.start_time),
            date=a.date,
            location=a.location
        ))
    # Сортировка: сначала по дате, потом по времени
    events.sort(key=lambda x: (x.date, x.time))
    return events

@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    active_shift = db.query(models.Shift).filter(models.Shift.is_active == True).first()
    if not active_shift:
        return {"error": "No active shift"}
    children_count = db.query(models.Child).filter(models.Child.shift_id == active_shift.id, models.Child.status == "active").count()
    groups_count = db.query(models.Group).filter(models.Group.shift_id == active_shift.id).count()
    staff_count = db.query(models.User).count()  # или только привязанных к смене, упрощённо
    activities_today = db.query(models.Activity).filter(models.Activity.shift_id == active_shift.id, models.Activity.date == date.today()).count()
    return {
        "shift_name": active_shift.name,
        "children_active": children_count,
        "groups": groups_count,
        "staff": staff_count,
        "activities_today": activities_today
    }