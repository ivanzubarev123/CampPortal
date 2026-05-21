from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.database import get_db
from app.auth import get_current_user, require_role

router = APIRouter()

@router.get("/", response_model=List[schemas.ChildOut])
def list_children(
    shift_id: Optional[int] = Query(None),
    group_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(models.Child)
    if shift_id:
        query = query.filter(models.Child.shift_id == shift_id)
    if group_id:
        subq = db.query(models.GroupMembership.child_id).filter(models.GroupMembership.group_id == group_id)
        query = query.filter(models.Child.id.in_(subq))
    if status:
        query = query.filter(models.Child.status == status)
    return query.all()

@router.post("/", response_model=schemas.ChildOut, dependencies=[Depends(require_role("admin"))])
def create_child(child: schemas.ChildCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    shift = db.query(models.Shift).filter(models.Shift.id == child.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db_child = models.Child(**child.dict())
    db.add(db_child)
    db.commit()
    db.refresh(db_child)
    return db_child

@router.get("/{child_id}", response_model=schemas.ChildOut)
def get_child(child_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return child

@router.put("/{child_id}", response_model=schemas.ChildOut, dependencies=[Depends(require_role("admin"))])
def update_child(child_id: int, child_update: schemas.ChildCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    for key, value in child_update.dict().items():
        setattr(child, key, value)
    db.commit()
    db.refresh(child)
    return child

@router.delete("/{child_id}", dependencies=[Depends(require_role("admin"))])
def delete_child(child_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    db.delete(child)
    db.commit()
    return {"ok": True}

@router.post("/{child_id}/arrival", dependencies=[Depends(require_role("admin"))])
def mark_arrival(child_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    from datetime import date
    child.arrival_date = date.today()
    child.status = "active"
    db.commit()
    return {"ok": True}

@router.post("/{child_id}/departure", dependencies=[Depends(require_role("admin"))])
def mark_departure(child_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    child = db.query(models.Child).filter(models.Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    from datetime import date
    child.departure_date = date.today()
    child.status = "left"
    db.commit()
    return {"ok": True}