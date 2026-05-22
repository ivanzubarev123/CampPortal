from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import time
from app import models
from app.database import get_db
from app.auth import get_current_user, require_role

router = APIRouter()

class RoutineCreate(BaseModel):
    name: str
    time: time
    shift_id: int
    order_index: Optional[int] = None   # теперь необязательный

class RoutineOut(RoutineCreate):
    id: int

@router.get("/", response_model=List[RoutineOut])
def list_routines(shift_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    routines = db.query(models.RoutineEvent).filter(models.RoutineEvent.shift_id == shift_id).order_by(models.RoutineEvent.order_index).all()
    return routines

@router.post("/", response_model=RoutineOut, dependencies=[Depends(require_role("admin"))])
def create_routine(routine: RoutineCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Вычисляем следующий порядковый номер, если не указан
    if routine.order_index is None:
        max_order = db.query(models.RoutineEvent).filter(models.RoutineEvent.shift_id == routine.shift_id).count()
        # Новый порядок = количество уже существующих + 1
        order = max_order + 1
    else:
        order = routine.order_index
    db_routine = models.RoutineEvent(
        name=routine.name,
        time=routine.time,
        shift_id=routine.shift_id,
        order_index=order
    )
    db.add(db_routine)
    db.commit()
    db.refresh(db_routine)
    return db_routine

@router.delete("/{routine_id}", dependencies=[Depends(require_role("admin"))])
def delete_routine(routine_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    routine = db.query(models.RoutineEvent).filter(models.RoutineEvent.id == routine_id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    db.delete(routine)
    db.commit()
    return {"ok": True}