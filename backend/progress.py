from datetime import date, timedelta
from sqlalchemy.orm import Session
from models import Goal, Activity, DailyProgress


def calculate_goal_progress(db: Session, goal: Goal) -> float:
    today = date.today()
    week_start = today - timedelta(days=6)

    activities = (
        db.query(Activity)
        .filter(
            Activity.user_id == goal.user_id,
            Activity.category == goal.category,
            Activity.activity_date >= week_start,
            Activity.activity_date <= today
        )
        .all()
    )

    total_duration = sum(item.duration or 0 for item in activities)
    target = goal.weekly_target or 0
    activity_progress = min((total_duration / target) * 100, 100) if target > 0 else 0

    milestone_count = len(goal.milestones)
    if milestone_count:
        completed = sum(1 for milestone in goal.milestones if milestone.completed)
        milestone_progress = completed / milestone_count * 100
        result = (activity_progress + milestone_progress) / 2
    else:
        result = activity_progress

    return round(max(0, min(result, 100)), 2)


def update_goal_progress(db: Session, goal: Goal):
    goal.progress = calculate_goal_progress(db, goal)
    if goal.progress >= 100:
        goal.status = "Completed"
    elif goal.progress > 0:
        goal.status = "In Progress"
    else:
        goal.status = "Not Started"


def update_user_progress(db: Session, user_id: int):
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    for goal in goals:
        update_goal_progress(db, goal)

    overall = sum(goal.progress or 0 for goal in goals) / len(goals) if goals else 0
    today = date.today()

    snapshot = (
        db.query(DailyProgress)
        .filter(
            DailyProgress.user_id == user_id,
            DailyProgress.progress_date == today
        )
        .first()
    )

    if snapshot:
        snapshot.overall_progress = round(overall, 2)
    else:
        db.add(DailyProgress(
            user_id=user_id,
            progress_date=today,
            overall_progress=round(overall, 2)
        ))

    db.commit()
    return round(overall, 2)
