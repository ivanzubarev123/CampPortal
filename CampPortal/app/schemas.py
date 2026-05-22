from pydantic import BaseModel
from datetime import date, time
from typing import Optional, List

# --- User ---
class UserCreate(BaseModel):
    full_name: str
    position: Optional[str] = None
    role: str
    email: str
    phone: Optional[str] = None
    password: str

class UserOut(BaseModel):
    id: int
    full_name: str
    position: Optional[str]
    role: str
    email: str
    phone: Optional[str]

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: str
    password: str

# --- Child ---
class ChildCreate(BaseModel):
    full_name: str
    birth_date: Optional[date] = None
    parent_phone: Optional[str] = None
    parent_name: Optional[str] = None
    medical_notes: Optional[str] = None
    shift_id: int
    arrival_date: Optional[date] = None
    departure_date: Optional[date] = None

class ChildOut(ChildCreate):
    id: int
    status: str

# --- Group ---
class GroupCreate(BaseModel):
    name: str
    shift_id: int
    age_range: Optional[str] = None

class GroupOut(GroupCreate):
    id: int

# --- Activity ---
class ActivityCreate(BaseModel):
    title: str
    type: Optional[str] = None
    date: date
    start_time: time
    location: Optional[str] = None
    shift_id: int
    group_ids: List[int]   # какие отряды участвуют

class ActivityOut(BaseModel):
    id: int
    title: str
    type: Optional[str]
    date: date
    start_time: time
    location: Optional[str]
    shift_id: int
    created_by: Optional[int]

# --- Attendance ---
class AttendanceMark(BaseModel):
    child_id: int
    participated: bool

class AttendanceBatch(BaseModel):
    marks: List[AttendanceMark]

# Добавить в конец файла app/schemas.py

# --- Activity (дополнение) ---
class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    date: Optional[date] = None # type: ignore
    start_time: Optional[time] = None
    location: Optional[str] = None
    group_ids: Optional[List[int]] = None

# --- Attendance ---
class AttendanceMarkSingle(BaseModel):
    participated: bool

class AttendanceReportRow(BaseModel):
    child_id: int
    child_name: str
    group_name: str
    attended_count: int
    total_activities: int
    percent: float

# --- Reports ---
class ReportRequest(BaseModel):
    shift_id: int
    group_id: Optional[int] = None
    child_id: Optional[int] = None
    date_from: date
    date_to: date

# --- Dashboard ---
class UpcomingEvent(BaseModel):
    type: str  # "routine" или "activity"
    name: str
    time: str
    date: date
    location: Optional[str] = None

# --- GroupStaff ---
class GroupStaffAssign(BaseModel):
    user_id: int

# --- Child assignment to group ---
class ChildGroupAssign(BaseModel):
    child_id: int
