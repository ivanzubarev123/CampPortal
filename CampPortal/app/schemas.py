from pydantic import BaseModel, field_validator, Field
from datetime import date, time
from datetime import date as dt_date, time as dt_time
from app.models import ActivityLocation, ActivityType

class UserCreate(BaseModel):
    full_name: str
    position: str | None = None
    role: str
    email: str
    phone: str | None = None
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    position: str | None = None
    role: str
    email: str
    phone: str | None = None

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: str
    password: str

class ChildCreate(BaseModel):
    full_name: str
    birth_date: date | None = None
    parent_phone: str | None = None
    parent_name: str | None = None
    medical_notes: str | None = None
    shift_id: int
    arrival_date: date | None = None
    departure_date: date | None = None


class ChildOut(BaseModel):
    id: int
    full_name: str
    birth_date: date | None = None
    parent_phone: str | None = None
    parent_name: str | None = None
    medical_notes: str | None = None
    shift_id: int
    arrival_date: date | None = None
    departure_date: date | None = None
    status: str

    model_config = {"from_attributes": True}

class GroupCreate(BaseModel):
    name: str
    shift_id: int
    min_age: int | None = None
    max_age: int | None = None

    @field_validator("max_age")
    @classmethod
    def validate_age_range(cls, v, info):
        min_age = info.data.get("min_age")

        if v is not None and min_age is not None:
            if v < min_age:
                raise ValueError("max_age не может быть меньше min_age")

        return v


class GroupOut(BaseModel):
    id: int
    name: str
    shift_id: int
    min_age: int | None = None
    max_age: int | None = None

    children: list[ChildOut] = Field(default_factory=list)
    staff: list[UserOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}

class ActivityBase(BaseModel):
    title: str
    type: ActivityType | None = None
    date: date
    start_time: time
    location: ActivityLocation | None = None
    shift_id: int


class ActivityCreate(ActivityBase):
    group_ids: list[int]


class ActivityUpdate(BaseModel):
    title: str | None = None
    type: str | None = None
    date: dt_date | None = None
    start_time: dt_time | None = None
    location: ActivityLocation | None = None
    group_ids: list[int] | None = None


class ActivityOut(ActivityBase):
    id: int
    created_by: int | None = None

    model_config = {
        "from_attributes": True,
        "use_enum_values": True
    }

class AttendanceMark(BaseModel):
    child_id: int
    participated: bool


class AttendanceBatch(BaseModel):
    marks: list[AttendanceMark]


class AttendanceMarkSingle(BaseModel):
    participated: bool


class AttendanceReportRow(BaseModel):
    child_id: int
    child_name: str
    group_name: str
    attended_count: int
    total_activities: int
    percent: float

class ReportRequest(BaseModel):
    shift_id: int
    group_id: int | None = None
    child_id: int | None = None
    date_from: date
    date_to: date

class UpcomingEvent(BaseModel):
    type: str
    name: str
    time: str
    date: date
    location: str | None = None

class GroupStaffAssign(BaseModel):
    user_id: int
class ChildGroupAssign(BaseModel):
    child_id: int