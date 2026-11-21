from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Reflection
from schemas import ReflectionCreate, ReflectionUpdate, ReflectionResponse
from auth import get_current_user

router = APIRouter(prefix="/reflections", tags=["Reflections"])


@router.post("/", response_model=ReflectionResponse, status_code=status.HTTP_201_CREATED)
def create_reflection(data: ReflectionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if data.reflection_date > date.today():
        raise HTTPException(status_code=400, detail="Reflections cannot be dated in the future.")
    reflection = Reflection(**data.model_dump(), user_id=current_user.id)
    db.add(reflection)
    db.commit()
    db.refresh(reflection)
    return reflection


@router.get("/", response_model=list[ReflectionResponse])
def list_reflections(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Reflection).filter(Reflection.user_id == current_user.id).order_by(Reflection.reflection_date.desc()).all()


@router.get("/{reflection_id}", response_model=ReflectionResponse)
def get_reflection(reflection_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    reflection = db.query(Reflection).filter(Reflection.id == reflection_id, Reflection.user_id == current_user.id).first()
    if not reflection:
        raise HTTPException(status_code=404, detail="Reflection not found.")
    return reflection


@router.put("/{reflection_id}", response_model=ReflectionResponse)
def edit_reflection(reflection_id: int, data: ReflectionUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    reflection = db.query(Reflection).filter(Reflection.id == reflection_id, Reflection.user_id == current_user.id).first()
    if not reflection:
        raise HTTPException(status_code=404, detail="Reflection not found.")

    updates = data.model_dump(exclude_unset=True)
    new_date = updates.get("reflection_date", reflection.reflection_date)
    if new_date and new_date > date.today():
        raise HTTPException(status_code=400, detail="Reflections cannot be dated in the future.")

    for key, value in updates.items():
        setattr(reflection, key, value)

    db.commit()
    db.refresh(reflection)
    return reflection


@router.delete("/{reflection_id}")
def remove_reflection(reflection_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    reflection = db.query(Reflection).filter(Reflection.id == reflection_id, Reflection.user_id == current_user.id).first()
    if not reflection:
        raise HTTPException(status_code=404, detail="Reflection not found.")
    db.delete(reflection)
    db.commit()
    return {"message": "Reflection deleted successfully."}
