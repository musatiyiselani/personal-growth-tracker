from datetime import date, datetime
from typing import ClassVar, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UpdateModel(BaseModel):
    """Base class for update (PUT) schemas.

    Columns listed in NON_NULLABLE cannot be NULL in the database. Sending an
    explicit `null` for one of them is rejected here with a 422 error, instead
    of reaching the database and causing a 500 error.
    """

    NON_NULLABLE: ClassVar[frozenset] = frozenset()

    @model_validator(mode="after")
    def reject_explicit_nulls(self):
        for name in self.model_fields_set & self.NON_NULLABLE:
            if getattr(self, name) is None:
                raise ValueError(f"'{name}' cannot be set to null.")
        return self


# Authentication and users

def _email_fits_column(value):
    # The email column is VARCHAR(255). PostgreSQL enforces that length, so check it here.
    if value is not None and len(str(value)) > 255:
        raise ValueError("Email address must be 255 characters or fewer.")
    return value


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def check_email_length(cls, value):
        return _email_fits_column(value)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(ORMModel):
    id: int
    name: str
    email: EmailStr
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: datetime


class UserUpdate(UpdateModel):
    NON_NULLABLE: ClassVar[frozenset] = frozenset({"name", "email"})

    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    bio: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("email")
    @classmethod
    def check_email_length(cls, value):
        return _email_fits_column(value)


# Milestones (defined first because goal responses include them)

class MilestoneCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    completed: bool = False


class MilestoneUpdate(UpdateModel):
    NON_NULLABLE: ClassVar[frozenset] = frozenset({"title", "completed"})

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    completed: Optional[bool] = None


class MilestoneResponse(ORMModel):
    id: int
    goal_id: int
    title: str
    description: Optional[str] = None
    completed: bool
    completed_at: Optional[datetime] = None


# Goals

class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = Field(min_length=1, max_length=100)
    weekly_target: float = Field(default=5, gt=0, le=100000)
    unit: str = Field(default="hours", min_length=1, max_length=30)
    start_date: date
    deadline: Optional[date] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.deadline and self.deadline < self.start_date:
            raise ValueError("Deadline cannot be before the start date.")
        return self


class GoalUpdate(UpdateModel):
    NON_NULLABLE: ClassVar[frozenset] = frozenset(
        {"title", "category", "weekly_target", "unit", "start_date"}
    )

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    weekly_target: Optional[float] = Field(default=None, gt=0, le=100000)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=30)
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    # progress and status are deliberately not accepted from clients


class GoalResponse(ORMModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    category: str
    status: str
    progress: float
    weekly_target: float
    unit: str
    start_date: date
    deadline: Optional[date] = None
    created_at: datetime
    milestones: list[MilestoneResponse] = []


# Activities

class ActivityCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = Field(min_length=1, max_length=100)
    duration: Optional[float] = Field(default=None, gt=0, le=100000)
    unit: str = Field(default="hours", min_length=1, max_length=30)
    activity_date: date


class ActivityUpdate(UpdateModel):
    NON_NULLABLE: ClassVar[frozenset] = frozenset(
        {"title", "category", "unit", "activity_date"}
    )

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    duration: Optional[float] = Field(default=None, gt=0, le=100000)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=30)
    activity_date: Optional[date] = None


class ActivityResponse(ORMModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    category: str
    duration: Optional[float] = None
    unit: str
    activity_date: date
    created_at: datetime


# Reflections

class ReflectionCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    content: str = Field(min_length=1)
    mood: Optional[str] = Field(default=None, max_length=50)
    reflection_date: date


class ReflectionUpdate(UpdateModel):
    NON_NULLABLE: ClassVar[frozenset] = frozenset({"content", "reflection_date"})

    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = Field(default=None, min_length=1)
    mood: Optional[str] = Field(default=None, max_length=50)
    reflection_date: Optional[date] = None


class ReflectionResponse(ORMModel):
    id: int
    user_id: int
    title: Optional[str] = None
    content: str
    mood: Optional[str] = None
    reflection_date: date
    created_at: datetime


# Achievements

class AchievementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    achievement_date: date


class AchievementResponse(ORMModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    achievement_date: date
    created_at: datetime


# Settings

class SettingsUpdate(UpdateModel):
    NON_NULLABLE: ClassVar[frozenset] = frozenset(
        {"dark_mode", "notifications_enabled", "week_start"}
    )

    dark_mode: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    week_start: Optional[str] = None

    @field_validator("week_start")
    @classmethod
    def validate_week_start(cls, value):
        if value is not None and value not in {"Monday", "Sunday", "Saturday"}:
            raise ValueError("Week start must be Monday, Sunday, or Saturday.")
        return value


class SettingsResponse(ORMModel):
    id: int
    user_id: int
    dark_mode: bool
    notifications_enabled: bool
    week_start: str


class DailyProgressResponse(ORMModel):
    id: int
    user_id: int
    progress_date: date
    overall_progress: float
    created_at: datetime
