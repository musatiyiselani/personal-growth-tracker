from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Achievement
from schemas import AchievementCreate, AchievementResponse
from auth import get_current_user

router = APIRouter(prefix="/achievements", tags=["Achievements"])


@router.post("/", response_model=AchievementResponse, status_code=status.HTTP_201_CREATED)
def create_achievement(data: AchievementCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if data.achievement_date > date.today():
        raise HTTPException(status_code=400, detail="Achievement date cannot be in the future.")
    achievement = Achievement(**data.model_dump(), user_id=current_user.id)
    db.add(achievement)
    db.commit()
    db.refresh(achievement)
    return achievement


@router.get("/", response_model=list[AchievementResponse])
def list_achievements(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Achievement).filter(Achievement.user_id == current_user.id).order_by(Achievement.achievement_date.desc()).all()


@router.get("/{achievement_id}", response_model=AchievementResponse)
def get_achievement(achievement_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id, Achievement.user_id == current_user.id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found.")
    return achievement


@router.put("/{achievement_id}", response_model=AchievementResponse)
def edit_achievement(achievement_id: int, data: AchievementCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id, Achievement.user_id == current_user.id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found.")
    if data.achievement_date > date.today():
        raise HTTPException(status_code=400, detail="Achievement date cannot be in the future.")
    for key, value in data.model_dump().items():
        setattr(achievement, key, value)
    db.commit()
    db.refresh(achievement)
    return achievement


@router.delete("/{achievement_id}")
def remove_achievement(achievement_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id, Achievement.user_id == current_user.id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found.")
    db.delete(achievement)
    db.commit()
    return {"message": "Achievement deleted successfully."}
