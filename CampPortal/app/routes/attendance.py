from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.auth import get_current_user, require_role

router = APIRouter()

@router.get("/activity/{activity_id}")
def get_attendance_for_activity(activity_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Список детей с отметками участия для данного мероприятия"""
    # Проверяем, есть ли мероприятие
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    # Получаем всех детей, которые участвуют (из отрядов-участников)
    subq = db.query(models.ActivityParticipant.group_id).filter(models.ActivityParticipant.activity_id == activity_id)
    children = db.query(models.Child).join(models.GroupMembership).filter(
        models.GroupMembership.group_id.in_(subq)
    ).all()
    # Загружаем существующие отметки
    marks = db.query(models.Attendance).filter(models.Attendance.activity_id == activity_id).all()
    mark_dict = {m.child_id: m for m in marks}
    result = []
    for child in children:
        mark = mark_dict.get(child.id)
        result.append({
            "child_id": child.id,
            "child_name": child.full_name,
            "participated": mark.participated if mark else False,
            "marked_at": mark.marked_at if mark else None,
        })
    return result

@router.post("/activity/{activity_id}/batch", dependencies=[Depends(require_role("teacher"))])
def mark_attendance_batch(
    activity_id: int,
    batch: schemas.AttendanceBatch,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Массовая отметка участия для нескольких детей на одном мероприятии"""
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    # Для проверки прав: если учитель, то только для своего отряда (доп. логика при желании)
    for mark in batch.marks:
        # Ищем или создаём запись attendance
        att = db.query(models.Attendance).filter(
            models.Attendance.child_id == mark.child_id,
            models.Attendance.activity_id == activity_id
        ).first()
        if not att:
            att = models.Attendance(
                child_id=mark.child_id,
                activity_id=activity_id,
                participated=mark.participated,
                marked_by=current_user.id
            )
            db.add(att)
        else:
            att.participated = mark.participated
            att.marked_by = current_user.id
            att.marked_at = db.func.now()
    db.commit()
    return {"ok": True}

@router.put("/activity/{activity_id}/child/{child_id}")
def mark_single_child(
    activity_id: int,
    child_id: int,
    mark: schemas.AttendanceMarkSingle,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    att = db.query(models.Attendance).filter(
        models.Attendance.child_id == child_id,
        models.Attendance.activity_id == activity_id
    ).first()
    if not att:
        att = models.Attendance(
            child_id=child_id,
            activity_id=activity_id,
            participated=mark.participated,
            marked_by=current_user.id
        )
        db.add(att)
    else:
        att.participated = mark.participated
        att.marked_by = current_user.id
        att.marked_at = db.func.now()
    db.commit()
    return {"ok": True}