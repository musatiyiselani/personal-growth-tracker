from datetime import date, timedelta
from io import BytesIO
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from database import get_db
from models import Goal, Activity, Reflection, Achievement, DailyProgress
from auth import get_current_user
from progress import update_user_progress

router = APIRouter(prefix="/reports", tags=["Reports"])


def collect_report_data(db: Session, user_id: int, start_date: date, end_date: date):
    goals = db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.asc()).all()
    activities = db.query(Activity).filter(
        Activity.user_id == user_id,
        Activity.activity_date >= start_date,
        Activity.activity_date <= end_date
    ).order_by(Activity.activity_date.desc()).all()
    reflections = db.query(Reflection).filter(
        Reflection.user_id == user_id,
        Reflection.reflection_date >= start_date,
        Reflection.reflection_date <= end_date
    ).order_by(Reflection.reflection_date.desc()).all()
    achievements = db.query(Achievement).filter(
        Achievement.user_id == user_id,
        Achievement.achievement_date >= start_date,
        Achievement.achievement_date <= end_date
    ).order_by(Achievement.achievement_date.desc()).all()
    history = db.query(DailyProgress).filter(
        DailyProgress.user_id == user_id,
        DailyProgress.progress_date >= start_date,
        DailyProgress.progress_date <= end_date
    ).order_by(DailyProgress.progress_date.asc()).all()

    category_data = {}
    for activity in activities:
        category = activity.category or "Other"
        category_data[category] = category_data.get(category, 0) + (activity.duration or 0)

    average_progress = sum(goal.progress or 0 for goal in goals) / len(goals) if goals else 0

    return {
        "period": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
        "summary": {
            "total_goals": len(goals),
            "completed_goals": sum(1 for goal in goals if goal.status == "Completed"),
            "overall_progress": round(average_progress, 2),
            "total_activities": len(activities),
            "activity_duration": round(sum(item.duration or 0 for item in activities), 2),
            "total_reflections": len(reflections),
            "total_achievements": len(achievements),
            "completed_milestones": sum(1 for goal in goals for milestone in goal.milestones if milestone.completed),
            "total_milestones": sum(len(goal.milestones) for goal in goals)
        },
        "goals": [{
            "id": goal.id,
            "title": goal.title,
            "category": goal.category,
            "status": goal.status,
            "progress": goal.progress,
            "unit": goal.unit,
            "start_date": goal.start_date.isoformat(),
            "deadline": goal.deadline.isoformat() if goal.deadline else None,
            "milestones": [{"title": m.title, "completed": m.completed} for m in goal.milestones]
        } for goal in goals],
        "activities": [{
            "title": item.title,
            "category": item.category,
            "duration": item.duration,
            "unit": item.unit,
            "date": item.activity_date.isoformat()
        } for item in activities],
        "growth_by_category": [{
            "category": key,
            "activity_duration": round(value, 2)
        } for key, value in sorted(category_data.items())],
        "reflections": [{
            "title": item.title,
            "mood": item.mood,
            "date": item.reflection_date.isoformat()
        } for item in reflections],
        "achievements": [{
            "title": item.title,
            "description": item.description,
            "date": item.achievement_date.isoformat()
        } for item in achievements],
        "progress_history": [{
            "date": item.progress_date.isoformat(),
            "progress": item.overall_progress
        } for item in history]
    }


def resolve_dates(start_date, end_date):
    today = date.today()
    end_date = end_date or today
    start_date = start_date or (end_date - timedelta(days=29))
    if start_date > end_date or end_date > today:
        raise HTTPException(status_code=400, detail="Please provide a valid report date range.")
    return start_date, end_date


@router.get("/")
def get_report(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    start_date, end_date = resolve_dates(start_date, end_date)
    update_user_progress(db, current_user.id)
    return collect_report_data(db, current_user.id, start_date, end_date)


@router.get("/pdf")
def download_report_pdf(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    start_date, end_date = resolve_dates(start_date, end_date)
    update_user_progress(db, current_user.id)
    data = collect_report_data(db, current_user.id, start_date, end_date)
    buffer = BytesIO()

    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    def text(value, default="") -> str:
        # ReportLab's Paragraph reads text as markup, so user-entered characters
        # such as < and & must be escaped before they are placed in a paragraph.
        if value is None or value == "":
            value = default
        return escape(str(value))

    def paragraph(value, style="Normal"):
        return Paragraph(value, styles[style])

    story = [
        paragraph("Personal Growth Report", "Title"),
        Spacer(1, 8),
        paragraph(f"Period: {text(start_date.isoformat())} to {text(end_date.isoformat())}"),
        Spacer(1, 16),
        paragraph("Summary", "Heading2")
    ]

    summary = data["summary"]
    rows = [
        ["Metric", "Result"],
        ["Goals", str(summary["total_goals"])],
        ["Completed goals", str(summary["completed_goals"])],
        ["Overall progress", f"{summary['overall_progress']}%"],
        ["Activities", str(summary["total_activities"])],
        ["Activity duration", str(summary["activity_duration"])],
        ["Reflections", str(summary["total_reflections"])],
        ["Achievements", str(summary["total_achievements"])],
        ["Milestones completed", f"{summary['completed_milestones']} / {summary['total_milestones']}"]
    ]
    table = Table(rows, colWidths=[280, 180], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1c4e80")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("PADDING", (0, 0), (-1, -1), 7)
    ]))
    story.extend([table, Spacer(1, 16), paragraph("Goals", "Heading2")])

    goal_rows = [["Goal", "Category", "Status", "Progress"]]
    for goal in data["goals"]:
        goal_rows.append([goal["title"], goal["category"], goal["status"], f"{goal['progress']}%"])
    if len(goal_rows) == 1:
        story.append(paragraph("No goals recorded."))
    else:
        goal_table = Table(goal_rows, colWidths=[190, 100, 100, 70], repeatRows=1)
        goal_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#245586")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 5)
        ]))
        story.append(goal_table)

    story.extend([Spacer(1, 14), paragraph("Growth by Activity Category", "Heading2")])
    for item in data["growth_by_category"]:
        story.append(paragraph(f"{text(item['category'])}: {item['activity_duration']} recorded units"))
    if not data["growth_by_category"]:
        story.append(paragraph("No activities recorded in this period."))

    story.extend([Spacer(1, 14), paragraph("Activities", "Heading2")])
    for item in data["activities"]:
        duration = "not recorded" if item["duration"] is None else f"{item['duration']} {item['unit']}"
        story.append(paragraph(
            f"{text(item['date'])} — {text(item['title'])} ({text(item['category'])}); duration: {text(duration)}"
        ))
    if not data["activities"]:
        story.append(paragraph("No activities recorded in this period."))

    story.extend([Spacer(1, 14), paragraph("Achievements", "Heading2")])
    for item in data["achievements"]:
        story.append(paragraph(
            f"{text(item['date'])} — {text(item['title'])}: {text(item['description'])}"
        ))
    if not data["achievements"]:
        story.append(paragraph("No achievements recorded in this period."))

    story.extend([Spacer(1, 14), paragraph("Reflections", "Heading2")])
    for item in data["reflections"]:
        story.append(paragraph(
            f"{text(item['date'])} — {text(item['title'], 'Reflection')}; mood: {text(item['mood'], 'Not specified')}"
        ))
    if not data["reflections"]:
        story.append(paragraph("No reflections recorded in this period."))

    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="personal_growth_report.pdf"'}
    )
