from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from fastapi import HTTPException

router = APIRouter()

@router.get("/active")
def get_active_shift(db: Session = Depends(get_db)):
    shift = db.query(models.Shift).filter(models.Shift.is_active == True).first()
    if not shift:
        raise HTTPException(status_code=404, detail="No active shift")
    return shift