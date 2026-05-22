from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.database import get_db
from app.auth import get_current_user, require_role

router = APIRouter()

@router.get("/", response_model=List[schemas.GroupOut])
def list_groups(shift_id: Optional[int] = Query(None), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(models.Group)
    if shift_id:
        query = query.filter(models.Group.shift_id == shift_id)
    return query.all()

@router.post("/", response_model=schemas.GroupOut, dependencies=[Depends(require_role("admin"))])
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    shift = db.query(models.Shift).filter(models.Shift.id == group.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db_group = models.Group(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/my-group")
def get_my_group(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teacher can access")
    group_staff = db.query(models.GroupStaff).filter(models.GroupStaff.user_id == current_user.id).first()
    if not group_staff:
        raise HTTPException(status_code=404, detail="You are not assigned to any group")
    group = db.query(models.Group).filter(models.Group.id == group_staff.group_id).first()
    return group

@router.get("/{group_id}", response_model=schemas.GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@router.put("/{group_id}", response_model=schemas.GroupOut, dependencies=[Depends(require_role("admin"))])
def update_group(group_id: int, group_update: schemas.GroupCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    for key, value in group_update.dict().items():
        setattr(group, key, value)
    db.commit()
    db.refresh(group)
    return group

@router.delete("/{group_id}", dependencies=[Depends(require_role("admin"))])
def delete_group(group_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(group)
    db.commit()
    return {"ok": True}

# Управление членами отряда (только admin или org)
@router.post("/{group_id}/children", dependencies=[Depends(require_role("org"))])
def add_child_to_group(
    group_id: int,
    assign: schemas.ChildGroupAssign,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    child = db.query(models.Child).filter(models.Child.id == assign.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    existing = db.query(models.GroupMembership).filter(models.GroupMembership.child_id == assign.child_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Child already assigned to a group")
    membership = models.GroupMembership(child_id=assign.child_id, group_id=group_id)
    db.add(membership)
    db.commit()
    return {"ok": True}

@router.delete("/{group_id}/children/{child_id}")
def remove_child_from_group(group_id: int, child_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.child_id == child_id,
        models.GroupMembership.group_id == group_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    db.delete(membership)
    db.commit()
    return {"ok": True}

# Назначение сотрудников на отряд
@router.post("/{group_id}/staff")
def assign_staff(group_id: int, assign: schemas.GroupStaffAssign, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    user = db.query(models.User).filter(models.User.id == assign.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    existing = db.query(models.GroupStaff).filter(
        models.GroupStaff.group_id == group_id,
        models.GroupStaff.user_id == assign.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Staff already assigned")
    gs = models.GroupStaff(group_id=group_id, user_id=assign.user_id)
    db.add(gs)
    db.commit()
    return {"ok": True}

@router.delete("/{group_id}/staff/{user_id}")
def remove_staff(group_id: int, user_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    gs = db.query(models.GroupStaff).filter(
        models.GroupStaff.group_id == group_id,
        models.GroupStaff.user_id == user_id
    ).first()
    if not gs:
        raise HTTPException(status_code=404, detail="Staff assignment not found")
    db.delete(gs)
    db.commit()
    return {"ok": True}

