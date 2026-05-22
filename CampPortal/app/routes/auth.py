from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app import schemas, models
from app.database import get_db
from app.auth import get_current_user, require_role, get_password_hash, authenticate_user, create_access_token

router = APIRouter()

# --- Логин ---
@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Текущий пользователь ---
@router.get("/me", response_model=schemas.UserOut)
def get_current_user_info(current_user=Depends(get_current_user)):
    return current_user

# --- Список пользователей (только админ) ---
@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    return query.all()

# --- Схема создания пользователя ---
class UserCreateAdmin(BaseModel):
    full_name: str
    email: EmailStr
    role: str          # admin, org, teacher, viewer
    position: Optional[str] = None
    phone: Optional[str] = None
    password: str

# --- Создание пользователя (только админ) ---
@router.post("/users", response_model=schemas.UserOut, dependencies=[Depends(require_role("admin"))])
def create_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Создание нового пользователя (только для админа)"""
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        full_name=user_data.full_name,
        position=user_data.position,
        role=user_data.role,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Удаление пользователя (только админ) ---
@router.delete("/users/{user_id}", dependencies=[Depends(require_role("admin"))])
def delete_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Удаление пользователя (нельзя удалить самого себя)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}