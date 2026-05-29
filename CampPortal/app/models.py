from sqlalchemy import Column, Integer, String, Boolean, Date, Time, ForeignKey, Text, TIMESTAMP, Enum
from sqlalchemy.sql import func
from app.database import Base
from sqlalchemy.orm import relationship
from sqlalchemy import Enum
from enum import Enum as PyEnum

class ActivityType(str, PyEnum):
    SPORT = "спорт"
    CONCERT = "концерт"
    MASTER_CLASS = "мастер-класс"
    EXCURSION = "экскурсия"
    GAME = "игра"
    COMPETITION = "соревнование"
    OTHER = "другое"


class ActivityLocation(str, PyEnum):
    ASSEMBLY_HALL = "актовый зал"
    SPORTS_GROUND = "спортивная площадка"
    CANTEEN = "столовая"
    GROUP_BUILDING = "корпус отряда"
    LIBRARY = "библиотека"
    MEDICAL_ROOM = "медицинский пункт"
    PLAYROOM = "игровая комната"
    OUTSIDE = "улица"
    OTHER = "другое"

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    min_age = Column(Integer, nullable=True)
    max_age = Column(Integer, nullable=True)
    children = relationship("Child", secondary="group_memberships", lazy="joined")
    staff = relationship("User", secondary="group_staff", lazy="joined")

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    position = Column(String(100))
    role = Column(String(50), nullable=False)   # admin, teacher, org, viewer
    email = Column(String(100), unique=True)
    phone = Column(String(20))
    password_hash = Column(String(255))
    created_at = Column(TIMESTAMP, server_default=func.now())

class Child(Base):
    __tablename__ = "children"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    birth_date = Column(Date)
    parent_phone = Column(String(20))
    parent_name = Column(String(200))
    medical_notes = Column(Text)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    arrival_date = Column(Date)
    departure_date = Column(Date)
    status = Column(String(20), default="active")

class GroupMembership(Base):
    __tablename__ = "group_memberships"
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id", ondelete="CASCADE"), unique=True, nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)

class GroupStaff(Base):
    __tablename__ = "group_staff"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

class RoutineEvent(Base):
    __tablename__ = "routine_events"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    time = Column(Time, nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer)

class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    type = Column(Enum( ActivityType, name="activity_type", values_callable=lambda enum: [e.value for e in enum] ), nullable=True)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    location = Column(Enum( ActivityLocation, name="activity_location", values_callable=lambda enum: [e.value for e in enum] ), nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    participants = relationship("ActivityParticipant", cascade="all, delete-orphan", lazy="joined")

class ActivityParticipant(Base):
    __tablename__ = "activity_participants"
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    participated = Column(Boolean, default=False)
    marked_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    marked_at = Column(TIMESTAMP, server_default=func.now())