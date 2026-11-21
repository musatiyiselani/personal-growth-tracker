from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine

# Import models before creating the tables.
import models  # noqa: F401

from routers import users, goals, activities, reflections, achievements, reports, profile

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Personal Growth Tracker API",
    description="Backend API for the Personal Growth Tracker.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(users.router)
app.include_router(goals.router)
app.include_router(activities.router)
app.include_router(reflections.router)
app.include_router(achievements.router)
app.include_router(reports.router)
app.include_router(profile.router)


@app.get("/")
def root():
    return {
        "message": "Personal Growth Tracker API is running.",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
