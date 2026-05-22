from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app import models, schemas
from app.database import get_db
from app.auth import get_current_user, require_role
#проверка1


router = APIRouter()

@router.get("/", response_model=List[schemas.ActivityOut])
def list_activities(
    shift_id: Optional[int] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(models.Activity)
    if shift_id:
        query = query.filter(models.Activity.shift_id == shift_id)
    if from_date:
        query = query.filter(models.Activity.date >= from_date)
    if to_date:
        query = query.filter(models.Activity.date <= to_date)
    return query.all()

@router.post("/", response_model=schemas.ActivityOut, dependencies=[Depends(require_role("org"))])
def create_activity(act: schemas.ActivityCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    shift = db.query(models.Shift).filter(models.Shift.id == act.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    # Создаём мероприятие
    db_act = models.Activity(
        title=act.title,
        type=act.type,
        date=act.date,
        start_time=act.start_time,
        location=act.location,
        shift_id=act.shift_id,
        created_by=current_user.id
    )
    db.add(db_act)
    db.flush()  # чтобы получить id
    # Добавляем отряды-участники
    for gid in act.group_ids:
        group = db.query(models.Group).filter(models.Group.id == gid).first()
        if not group:
            raise HTTPException(status_code=404, detail=f"Group {gid} not found")
        participant = models.ActivityParticipant(activity_id=db_act.id, group_id=gid)
        db.add(participant)
    db.commit()
    db.refresh(db_act)
    return db_act

@router.get("/{activity_id}", response_model=schemas.ActivityOut)
def get_activity(activity_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    act = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    return act

@router.put("/{activity_id}", response_model=schemas.ActivityOut, dependencies=[Depends(require_role("org"))])
def update_activity(activity_id: int, act_update: schemas.ActivityUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    act = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    # Обновляем поля
    update_data = act_update.dict(exclude_unset=True)
    if "group_ids" in update_data:
        # перезаписываем участников
        db.query(models.ActivityParticipant).filter(models.ActivityParticipant.activity_id == activity_id).delete()
        for gid in update_data["group_ids"]:
            db.add(models.ActivityParticipant(activity_id=activity_id, group_id=gid))
        del update_data["group_ids"]
    for key, value in update_data.items():
        setattr(act, key, value)
    db.commit()
    db.refresh(act)
    return act

@router.delete("/{activity_id}", dependencies=[Depends(require_role("org"))])
def delete_activity(activity_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    act = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(act)
    db.commit()
    return {"ok": True}