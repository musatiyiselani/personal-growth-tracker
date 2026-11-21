from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from database import get_db
from models import ProfilePicture, User, UserSettings
from schemas import UserUpdate, UserResponse, SettingsUpdate, SettingsResponse
from auth import get_current_user
from backend.picture_rules import MAX_PICTURE_BYTES, content_type_for_extension, matches_image_signature

router = APIRouter(prefix="/profile", tags=["Profile"])

PICTURE_URL = "/profile/picture"


@router.get("/", response_model=UserResponse)
def get_profile(current_user=Depends(get_current_user)):
    return current_user


@router.put("/", response_model=UserResponse)
def update_profile(data: UserUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    updates = data.model_dump(exclude_unset=True)
    if updates.get("email"):
        updates["email"] = updates["email"].lower()
        duplicate = db.query(User).filter(User.email == updates["email"], User.id != current_user.id).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="That email address is already in use.")
    for key, value in updates.items():
        setattr(current_user, key, value)
    try:
        db.commit()
    except IntegrityError:
        # Another request claimed the same email between the check above and the commit.
        db.rollback()
        raise HTTPException(status_code=400, detail="That email address is already in use.")
    db.refresh(current_user)
    return current_user


@router.get("/picture")
def get_profile_picture(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    picture = db.query(ProfilePicture).filter(ProfilePicture.user_id == current_user.id).first()
    if picture is None:
        raise HTTPException(status_code=404, detail="No profile picture is currently set.")
    return Response(
        content=picture.data,
        media_type=picture.content_type,
        headers={"Cache-Control": "private, no-cache"},
    )


@router.post("/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    extension = Path(file.filename or "").suffix.lower()
    content_type = content_type_for_extension(extension)
    if content_type is None:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP files are allowed.")

    # Read one byte past the limit so oversized files are detected without loading them all.
    content = await file.read(MAX_PICTURE_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > MAX_PICTURE_BYTES:
        raise HTTPException(status_code=400, detail="The profile picture cannot exceed 5 MB.")
    if not matches_image_signature(content, extension):
        raise HTTPException(status_code=400, detail="The file is not a valid image of the type it claims to be.")

    # One picture per user: insert, or replace the existing row in a single statement.
    now = datetime.utcnow()
    statement = pg_insert(ProfilePicture).values(
        user_id=current_user.id,
        content_type=content_type,
        data=content,
        updated_at=now,
    )
    statement = statement.on_conflict_do_update(
        index_elements=["user_id"],
        set_={
            "content_type": statement.excluded.content_type,
            "data": statement.excluded.data,
            "updated_at": statement.excluded.updated_at,
        },
    )
    db.execute(statement)
    db.commit()

    return {"message": "Profile picture uploaded successfully.", "profile_picture": PICTURE_URL}


@router.delete("/picture")
def delete_profile_picture(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    deleted = (
        db.query(ProfilePicture)
        .filter(ProfilePicture.user_id == current_user.id)
        .delete(synchronize_session=False)
    )
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="No profile picture is currently set.")
    return {"message": "Profile picture removed successfully."}


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/settings", response_model=SettingsResponse)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.flush()

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)
    return settings
