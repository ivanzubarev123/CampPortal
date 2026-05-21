from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from app import models, schemas
from app.database import get_db
from app.auth import get_current_user

router = APIRouter()

@router.post("/activity", response_model=List[schemas.AttendanceReportRow])
def activity_report(req: schemas.ReportRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Базовая выборка детей
    query_children = db.query(models.Child).filter(models.Child.shift_id == req.shift_id)
    if req.group_id:
        query_children = query_children.join(models.GroupMembership).filter(models.GroupMembership.group_id == req.group_id)
    if req.child_id:
        query_children = query_children.filter(models.Child.id == req.child_id)
    children = query_children.all()
    
    # Получаем все мероприятия за период
    activities = db.query(models.Activity).filter(
        models.Activity.shift_id == req.shift_id,
        models.Activity.date >= req.date_from,
        models.Activity.date <= req.date_to
    ).all()
    total_activities = len(activities)
    if total_activities == 0:
        return []

    # Для каждого ребёнка считаем количество посещённых мероприятий
    result = []
    for child in children:
        attended_count = db.query(func.count(models.Attendance.id)).filter(
            models.Attendance.child_id == child.id,
            models.Attendance.participated == True,
            models.Attendance.activity_id.in_([a.id for a in activities])
        ).scalar() or 0
        # Группа ребёнка
        group = db.query(models.Group).join(models.GroupMembership).filter(models.GroupMembership.child_id == child.id).first()
        group_name = group.name if group else "Не назначен"
        percent = (attended_count / total_activities) * 100 if total_activities > 0 else 0
        result.append(schemas.AttendanceReportRow(
            child_id=child.id,
            child_name=child.full_name,
            group_name=group_name,
            attended_count=attended_count,
            total_activities=total_activities,
            percent=round(percent, 2)
        ))
    return result

@router.get("/export-csv")
def export_activity_csv(req: schemas.ReportRequest = Depends(), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Возвращает CSV строку (упрощённо)"""
    data = activity_report(req, db, current_user)
    import csv
    from io import StringIO
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["child_id", "child_name", "group_name", "attended_count", "total_activities", "percent"])
    for row in data:
        writer.writerow([row.child_id, row.child_name, row.group_name, row.attended_count, row.total_activities, row.percent])
    return {"csv": output.getvalue()}