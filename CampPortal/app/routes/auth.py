from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app import schemas, models, auth
from app.database import get_db
from typing import List, Optional
from app import schemas
from app.auth import require_role

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def get_current_user_info(current_user=Depends(auth.get_current_user)):
    return current_user

@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    """
    Список пользователей. Доступно только администратору.
    Можно отфильтровать по роли: ?role=teacher
    """
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    users = query.all()
    return users