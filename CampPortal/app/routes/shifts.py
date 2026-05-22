from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import date
from app import models
from app.database import get_db
from app.auth import get_current_user, require_role

router = APIRouter()

class ShiftCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_active: bool = False

class ShiftOut(ShiftCreate):
    id: int

@router.get("/", response_model=List[ShiftOut])
def list_shifts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.Shift).all()

@router.get("/active", response_model=ShiftOut)
def get_active_shift(db: Session = Depends(get_db)):
    shift = db.query(models.Shift).filter(models.Shift.is_active == True).first()
    if not shift:
        raise HTTPException(status_code=404, detail="No active shift")
    return shift

@router.post("/", response_model=ShiftOut, dependencies=[Depends(require_role("admin"))])
def create_shift(shift: ShiftCreate, db: Session = Depends(get_db)):
    db_shift = models.Shift(**shift.dict())
    # если новая смена активна, деактивируем все остальные
    if shift.is_active:
        db.query(models.Shift).update({models.Shift.is_active: False})
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@router.put("/{shift_id}/activate", dependencies=[Depends(require_role("admin"))])
def activate_shift(shift_id: int, db: Session = Depends(get_db)):
    # деактивируем все
    db.query(models.Shift).update({models.Shift.is_active: False})
    shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift.is_active = True
    db.commit()
    return {"ok": True}

@router.delete("/{shift_id}", dependencies=[Depends(require_role("admin"))])
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return {"ok": True}