from app.database import SessionLocal
from app import models
from app.auth import get_password_hash
from datetime import date, time

def seed():
    db = SessionLocal()

    try:
        print("🚀 SEED STARTED")

        db.query(models.Attendance).delete()
        db.query(models.ActivityParticipant).delete()
        db.query(models.Activity).delete()
        db.query(models.RoutineEvent).delete()
        db.query(models.GroupStaff).delete()
        db.query(models.GroupMembership).delete()
        db.query(models.Child).delete()
        db.query(models.Group).delete()
        db.query(models.User).delete()
        db.query(models.Shift).delete()

        db.commit()

        # 1. Shift
        shift = models.Shift(
            name="Летняя смена 2025",
            start_date=date(2025, 6, 1),
            end_date=date(2025, 6, 21),
            is_active=True
        )
        db.add(shift)
        db.commit()
        db.refresh(shift)

        # 2. Users
        admin = models.User(
            full_name="Иванов Иван Иванович",
            position="Директор",
            role="admin",
            email="admin@camp.ru",
            phone="+79991234567",
            password_hash=get_password_hash("admin123")
        )

        teacher1 = models.User(
            full_name="Петрова Мария Сергеевна",
            position="Вожатая",
            role="teacher",
            email="teacher1@camp.ru",
            phone="+79991112233",
            password_hash=get_password_hash("teacher123")
        )

        teacher2 = models.User(
            full_name="Сидоров Алексей Викторович",
            position="Вожатый",
            role="teacher",
            email="teacher2@camp.ru",
            phone="+79994445566",
            password_hash=get_password_hash("teacher123")
        )

        org = models.User(
            full_name="Козлова Ольга Дмитриевна",
            position="Организатор",
            role="org",
            email="org@camp.ru",
            phone="+79997778899",
            password_hash=get_password_hash("org123")
        )

        db.add_all([admin, teacher1, teacher2, org])
        db.commit()
        db.refresh(org)
        db.refresh(teacher1)
        db.refresh(teacher2)

        # 3. Groups
        group1 = models.Group(name="Солнышко", shift_id=shift.id, age_range="7-9 лет")
        group2 = models.Group(name="Радуга", shift_id=shift.id, age_range="10-12 лет")

        db.add_all([group1, group2])
        db.commit()
        db.refresh(group1)
        db.refresh(group2)

        # 4. Children
        children = [
            ("Анна Смирнова", date(2016, 5, 12)),
            ("Максим Иванов", date(2015, 8, 20)),
            ("Дарья Кузнецова", date(2017, 2, 3)),
            ("Егор Попов", date(2015, 11, 30)),
        ]

        child_objs = []
        for name, bdate in children:
            c = models.Child(
                full_name=name,
                birth_date=bdate,
                shift_id=shift.id,
                parent_phone="+70000000000",
                parent_name="Parent",
                arrival_date=date(2025, 6, 1)
            )
            db.add(c)
            child_objs.append(c)

        db.commit()

        for i, child in enumerate(child_objs):
            db.add(models.GroupMembership(
                child_id=child.id,
                group_id=group1.id if i < 2 else group2.id
            ))

        db.commit()

        # 5. Staff
        db.add_all([
            models.GroupStaff(group_id=group1.id, user_id=teacher1.id),
            models.GroupStaff(group_id=group2.id, user_id=teacher2.id),
        ])

        db.commit()

        print("✅ SEED DONE SUCCESSFULLY")

    except Exception as e:
        db.rollback()
        print("❌ SEED FAILED:", e)
        raise

    finally:
        db.close()
