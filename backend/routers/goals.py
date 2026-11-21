from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Goal, Milestone
from schemas import GoalCreate, GoalUpdate, GoalResponse, MilestoneCreate, MilestoneUpdate, MilestoneResponse
from auth import get_current_user
from progress import update_user_progress

router = APIRouter(prefix="/goals", tags=["Goals"])


def owned_goal(db: Session, goal_id: int, user_id: int):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")
    return goal


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(data: GoalCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if data.start_date > date.today():
        raise HTTPException(status_code=400, detail="Goal start date cannot be in the future.")
    if data.deadline and data.deadline < data.start_date:
        raise HTTPException(status_code=400, detail="Deadline cannot be before the start date.")

    goal = Goal(**data.model_dump(), user_id=current_user.id, progress=0, status="Not Started")
    db.add(goal)
    db.commit()
    db.refresh(goal)
    update_user_progress(db, current_user.id)
    db.refresh(goal)
    return goal


# Progress depends on the last seven days, so it is recalculated on every read.
# Otherwise a stored value would stay the same until the next write.

@router.get("/", response_model=list[GoalResponse])
def list_goals(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    update_user_progress(db, current_user.id)
    return db.query(Goal).filter(Goal.user_id == current_user.id).order_by(Goal.created_at.desc()).all()


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    update_user_progress(db, current_user.id)
    return owned_goal(db, goal_id, current_user.id)


@router.put("/{goal_id}", response_model=GoalResponse)
def edit_goal(goal_id: int, data: GoalUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    goal = owned_goal(db, goal_id, current_user.id)
    updates = data.model_dump(exclude_unset=True)

    start = updates.get("start_date", goal.start_date)
    deadline = updates.get("deadline", goal.deadline)
    if start and start > date.today():
        raise HTTPException(status_code=400, detail="Goal start date cannot be in the future.")
    if deadline and deadline < start:
        raise HTTPException(status_code=400, detail="Deadline cannot be before the start date.")

    for key, value in updates.items():
        setattr(goal, key, value)

    db.commit()
    update_user_progress(db, current_user.id)
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}")
def remove_goal(goal_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    goal = owned_goal(db, goal_id, current_user.id)
    db.delete(goal)
    db.commit()
    update_user_progress(db, current_user.id)
    return {"message": "Goal deleted successfully."}


@router.post("/{goal_id}/milestones", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
def add_milestone(goal_id: int, data: MilestoneCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    goal = owned_goal(db, goal_id, current_user.id)
    milestone = Milestone(**data.model_dump(), goal_id=goal.id)
    if milestone.completed:
        milestone.completed_at = datetime.utcnow()
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    update_user_progress(db, current_user.id)
    return milestone


@router.get("/{goal_id}/milestones", response_model=list[MilestoneResponse])
def list_milestones(goal_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    goal = owned_goal(db, goal_id, current_user.id)
    return db.query(Milestone).filter(Milestone.goal_id == goal.id).order_by(Milestone.id.asc()).all()


@router.put("/{goal_id}/milestones/{milestone_id}", response_model=MilestoneResponse)
def edit_milestone(goal_id: int, milestone_id: int, data: MilestoneUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    goal = owned_goal(db, goal_id, current_user.id)
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.goal_id == goal.id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(milestone, key, value)

    if updates.get("completed") is True:
        milestone.completed_at = milestone.completed_at or datetime.utcnow()
    elif updates.get("completed") is False:
        milestone.completed_at = None

    db.commit()
    db.refresh(milestone)
    update_user_progress(db, current_user.id)
    return milestone


@router.delete("/{goal_id}/milestones/{milestone_id}")
def remove_milestone(goal_id: int, milestone_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    goal = owned_goal(db, goal_id, current_user.id)
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.goal_id == goal.id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")
    db.delete(milestone)
    db.commit()
    update_user_progress(db, current_user.id)
    return {"message": "Milestone deleted successfully."}
