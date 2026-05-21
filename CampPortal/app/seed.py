import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app import models
from app.auth import get_password_hash
from datetime import date, time, timedelta

def seed():
    db = SessionLocal()
    try:
        # Очистка таблиц (для повторного запуска) – осторожно!
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

        # 1. Создаём активную смену
        shift = models.Shift(
            name="Летняя смена 2025",
            start_date=date(2025, 6, 1),
            end_date=date(2025, 6, 21),
            is_active=True
        )
        db.add(shift)
        db.commit()
        print("Смена создана")

        # 2. Пользователи (админ, вожатые)
        admin = models.User(
            full_name="Иванов Иван Иванович",
            position="Директор",
            role="admin",
            email="admin@camp.ru",
            phone="+79991234567",
            password_hash=get_password_hash("admin123")
        )
        db.add(admin)
        
        teacher1 = models.User(
            full_name="Петрова Мария Сергеевна",
            position="Вожатая",
            role="teacher",
            email="teacher1@camp.ru",
            phone="+79991112233",
            password_hash=get_password_hash("teacher123")
        )
        db.add(teacher1)
        
        teacher2 = models.User(
            full_name="Сидоров Алексей Викторович",
            position="Вожатый",
            role="teacher",
            email="teacher2@camp.ru",
            phone="+79994445566",
            password_hash=get_password_hash("teacher123")
        )
        db.add(teacher2)
        
        org = models.User(
            full_name="Козлова Ольга Дмитриевна",
            position="Педагог-организатор",
            role="org",
            email="org@camp.ru",
            phone="+79997778899",
            password_hash=get_password_hash("org123")
        )
        db.add(org)
        db.commit()

        # 3. Отряды
        group1 = models.Group(name="Солнышко", shift_id=shift.id, age_range="7-9 лет")
        group2 = models.Group(name="Радуга", shift_id=shift.id, age_range="10-12 лет")
        db.add_all([group1, group2])
        db.commit()

        # 4. Дети (по 4 ребёнка в отряд)
        children_data = [
            # отряд 1
            ("Анна Смирнова", date(2016, 5, 12), "+79101112233", "Смирнова Елена", "", shift.id, date(2025,6,1), None),
            ("Максим Иванов", date(2015, 8, 20), "+79102223344", "Иванов Дмитрий", "аллергия на молоко", shift.id, date(2025,6,1), None),
            ("Дарья Кузнецова", date(2017, 2, 3), "+79103334455", "Кузнецова Татьяна", "", shift.id, date(2025,6,1), None),
            ("Егор Попов", date(2015, 11, 30), "+79104445566", "Попов Андрей", "", shift.id, date(2025,6,1), None),
            # отряд 2
            ("София Васильева", date(2013, 7, 15), "+79105556677", "Васильева Ирина", "", shift.id, date(2025,6,1), None),
            ("Артём Новиков", date(2014, 3, 22), "+79106667788", "Новикова Светлана", "", shift.id, date(2025,6,1), None),
            ("Полина Морозова", date(2013, 12, 5), "+79107778899", "Морозов Александр", "", shift.id, date(2025,6,1), None),
            ("Даниил Волков", date(2014, 9, 10), "+79108889900", "Волкова Наталья", "", shift.id, date(2025,6,1), None),
        ]
        children_objs = []
        for fname, bdate, pphone, pname, med, sid, arrival, departure in children_data:
            child = models.Child(
                full_name=fname, birth_date=bdate, parent_phone=pphone, parent_name=pname,
                medical_notes=med, shift_id=sid, arrival_date=arrival, departure_date=departure
            )
            db.add(child)
            children_objs.append(child)
        db.commit()

        # Распределение по отрядам: первые 4 ребёнка в group1, остальные в group2
        for i, child in enumerate(children_objs):
            membership = models.GroupMembership(child_id=child.id, group_id=group1.id if i < 4 else group2.id)
            db.add(membership)
        db.commit()

        # 5. Назначение вожатых на отряды
        db.add(models.GroupStaff(group_id=group1.id, user_id=teacher1.id))
        db.add(models.GroupStaff(group_id=group2.id, user_id=teacher2.id))
        db.commit()

        # 6. Режимные моменты
        routines = [
            ("Подъём", time(7,30), 1),
            ("Зарядка", time(8,0), 2),
            ("Завтрак", time(8,30), 3),
            ("Обед", time(13,0), 8),
            ("Тихий час", time(14,0), 9),
            ("Ужин", time(19,0), 14),
            ("Отбой", time(22,0), 17),
        ]
        for name, tm, idx in routines:
            ev = models.RoutineEvent(name=name, time=tm, shift_id=shift.id, order_index=idx)
            db.add(ev)
        db.commit()

        # 7. Мероприятия (несколько)
        activities_data = [
            ("Открытие смены", "торжественное", date(2025,6,2), time(10,0), "Стадион", [group1.id, group2.id]),
            ("Весёлые старты", "спорт", date(2025,6,4), time(16,0), "Спортзал", [group1.id, group2.id]),
            ("Мастер-класс по рисованию", "творчество", date(2025,6,6), time(15,0), "Кружковая", [group1.id]),
            ("Поход в лес", "экскурсия", date(2025,6,8), time(9,0), "Лес", [group2.id]),
            ("Дискотека", "развлечение", date(2025,6,10), time(20,0), "Актовый зал", [group1.id, group2.id]),
            ("Закрытие смены", "торжественное", date(2025,6,20), time(18,0), "Стадион", [group1.id, group2.id]),
        ]
        acts = []
        for title, typ, d, st, loc, grp_ids in activities_data:
            act = models.Activity(
                title=title, type=typ, date=d, start_time=st, location=loc,
                shift_id=shift.id, created_by=org.id
            )
            db.add(act)
            db.flush()   # чтобы получить act.id
            for gid in grp_ids:
                db.add(models.ActivityParticipant(activity_id=act.id, group_id=gid))
            acts.append(act)
        db.commit()

        # 8. Отметки участия (для примера: первые 2 мероприятия отметим некоторых детей)
        # Все дети из отрядов-участников
        for act in acts[:2]:
            participants = db.query(models.Child).join(models.GroupMembership).filter(
                models.GroupMembership.group_id.in_(
                    db.query(models.ActivityParticipant.group_id).filter(models.ActivityParticipant.activity_id == act.id)
                )
            ).all()
            for child in participants:
                # поставим "участвовал" случайно (true/false), для примера true всем
                mark = models.Attendance(
                    child_id=child.id, activity_id=act.id, participated=True, marked_by=teacher1.id
                )
                db.add(mark)
        db.commit()

        print("База данных успешно заполнена тестовыми данными!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()