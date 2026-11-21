from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Activity
from schemas import ActivityCreate, ActivityUpdate, ActivityResponse
from auth import get_current_user
from progress import update_user_progress

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.post("/", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(data: ActivityCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if data.activity_date > date.today():
        raise HTTPException(status_code=400, detail="Activities cannot be dated in the future.")
    activity = Activity(**data.model_dump(), user_id=current_user.id)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    update_user_progress(db, current_user.id)
    return activity


@router.get("/", response_model=list[ActivityResponse])
def list_activities(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Activity).filter(Activity.user_id == current_user.id).order_by(Activity.activity_date.desc()).all()


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(activity_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    activity = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == current_user.id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")
    return activity


@router.put("/{activity_id}", response_model=ActivityResponse)
def edit_activity(activity_id: int, data: ActivityUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    activity = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == current_user.id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    updates = data.model_dump(exclude_unset=True)
    new_date = updates.get("activity_date", activity.activity_date)
    if new_date and new_date > date.today():
        raise HTTPException(status_code=400, detail="Activities cannot be dated in the future.")

    for key, value in updates.items():
        setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    update_user_progress(db, current_user.id)
    return activity


@router.delete("/{activity_id}")
def remove_activity(activity_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    activity = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == current_user.id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")
    db.delete(activity)
    db.commit()
    update_user_progress(db, current_user.id)
    return {"message": "Activity deleted successfully."}
