from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, LargeBinary,
    Date, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship, deferred
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    goals = relationship("Goal", back_populates="owner", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="owner", cascade="all, delete-orphan")
    reflections = relationship("Reflection", back_populates="owner", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="owner", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="owner", uselist=False, cascade="all, delete-orphan")
    daily_progress = relationship("DailyProgress", back_populates="owner", cascade="all, delete-orphan")
    picture = relationship("ProfilePicture", back_populates="owner", uselist=False, cascade="all, delete-orphan")

    @property
    def profile_picture(self):
        """Relative URL of the profile picture, or None. The API serves the image itself."""
        return "/profile/picture" if self.picture is not None else None


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    status = Column(String(50), default="Not Started", nullable=False)
    progress = Column(Float, default=0, nullable=False)
    weekly_target = Column(Float, default=5, nullable=False)
    unit = Column(String(30), default="hours", nullable=False)
    start_date = Column(Date, nullable=False)
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="goals")
    milestones = relationship("Milestone", back_populates="goal", cascade="all, delete-orphan")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    goal = relationship("Goal", back_populates="milestones")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    duration = Column(Float, nullable=True)
    unit = Column(String(30), default="hours", nullable=False)
    activity_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="activities")


class Reflection(Base):
    __tablename__ = "reflections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    mood = Column(String(50), nullable=True)
    reflection_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="reflections")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    achievement_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="achievements")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    dark_mode = Column(Boolean, default=False, nullable=False)
    notifications_enabled = Column(Boolean, default=True, nullable=False)
    week_start = Column(String(20), default="Monday", nullable=False)

    owner = relationship("User", back_populates="settings")


class DailyProgress(Base):
    __tablename__ = "daily_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "progress_date", name="unique_user_progress_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    progress_date = Column(Date, nullable=False)
    overall_progress = Column(Float, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="daily_progress")


class ProfilePicture(Base):
    """One profile picture per user, stored in the database so it survives restarts and redeploys."""
    __tablename__ = "profile_pictures"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    content_type = Column(String(50), nullable=False)
    # deferred: the image bytes are only loaded when the picture itself is requested,
    # not every time a user record is loaded.
    data = deferred(Column(LargeBinary, nullable=False))
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="picture")
