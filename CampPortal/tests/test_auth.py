from datetime import date
from app import models
from app.auth import get_password_hash

def test_create_user(admin_client, db_session):
    response = admin_client.post("/api/auth/users", json={
        "full_name": "New Manager",
        "email": "manager@test.com",
        "password": "secret123",
        "role": "org",
        "position": "Организатор",
        "phone": "123456"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "manager@test.com"
    assert data["role"] == "org"

def test_login_success(client, db_session):
    # Создаём пользователя напрямую в БД с реальным хэшем
    user = models.User(
        full_name="Test User",
        email="test@example.com",
        password_hash=get_password_hash("password123"),
        role="teacher"
    )
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/auth/login", data={
        "username": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()