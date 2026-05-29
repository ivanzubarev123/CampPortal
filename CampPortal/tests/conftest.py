import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
from app.database import Base, get_db
from app.main import app
from app.auth import get_current_user, get_password_hash
from app import models

# --- Тестовая БД ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# --- Создание таблиц один раз ---
@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

# --- Фикстура сессии БД для тестов (каждый тест в своей транзакции, откат после теста) ---
@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    session.begin_nested()
    yield session
    session.rollback()
    session.close()

# --- Создаём админа один раз на всю сессию ---
@pytest.fixture(scope="session")
def admin_user():
    session = TestingSessionLocal()
    # Удаляем старого админа, если есть
    session.query(models.User).filter(models.User.email == "admin@test.com").delete()
    user = models.User(
        full_name="Admin Test",
        email="admin@test.com",
        role="admin",
        password_hash=get_password_hash("admin123"),
        position="Admin",
        phone=""
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    session.close()
    return user

# --- Создаём учителя один раз на всю сессию ---
@pytest.fixture(scope="session")
def teacher_user():
    session = TestingSessionLocal()
    session.query(models.User).filter(models.User.email == "teacher@test.com").delete()
    user = models.User(
        full_name="Teacher Test",
        email="teacher@test.com",
        role="teacher",
        password_hash=get_password_hash("teacher123"),
        position="Teacher",
        phone=""
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    session.close()
    return user

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_client(client, admin_user):
    def _get_admin():
        return admin_user
    app.dependency_overrides[get_current_user] = _get_admin
    yield client
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture
def teacher_client(client, teacher_user):
    def _get_teacher():
        return teacher_user
    app.dependency_overrides[get_current_user] = _get_teacher
    yield client
    app.dependency_overrides.pop(get_current_user, None)