from sqlalchemy import Column, Integer, String, Boolean, Date, Time, ForeignKey, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

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

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    age_range = Column(String(50))

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
    type = Column(String(50))
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    location = Column(String(100))
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))

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