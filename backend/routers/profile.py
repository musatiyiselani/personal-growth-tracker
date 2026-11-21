from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserSettings
from schemas import UserUpdate, UserResponse, SettingsUpdate, SettingsResponse
from auth import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "profile_pictures"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024


def matches_image_signature(content: bytes, extension: str) -> bool:
    """Check that the file's first bytes match its extension (magic numbers)."""
    if extension in {".jpg", ".jpeg"}:
        return content[:3] == b"\xff\xd8\xff"
    if extension == ".png":
        return content[:8] == b"\x89PNG\r\n\x1a\n"
    if extension == ".webp":
        return content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return False


def remove_old_picture(path_value: str | None):
    if not path_value:
        return
    candidate = UPLOAD_DIR / Path(path_value).name
    try:
        if candidate.is_file():
            candidate.unlink()
    except OSError:
        pass


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
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/picture")
async def upload_profile_picture(file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP files are allowed.")

    # Read one byte past the limit so oversized files are detected without loading them all.
    content = await file.read(MAX_FILE_SIZE + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="The profile picture cannot exceed 5 MB.")
    if not matches_image_signature(content, extension):
        raise HTTPException(status_code=400, detail="The file is not a valid image of the type it claims to be.")

    filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    try:
        destination.write_bytes(content)
    except OSError:
        raise HTTPException(status_code=500, detail="Could not save the profile picture.")

    previous = current_user.profile_picture
    current_user.profile_picture = f"/uploads/profile_pictures/{filename}"
    db.commit()
    db.refresh(current_user)
    remove_old_picture(previous)

    return {"message": "Profile picture uploaded successfully.", "profile_picture": current_user.profile_picture}


@router.delete("/picture")
def delete_profile_picture(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    previous = current_user.profile_picture
    if not previous:
        raise HTTPException(status_code=404, detail="No profile picture is currently set.")
    current_user.profile_picture = None
    db.commit()
    remove_old_picture(previous)
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
