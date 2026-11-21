from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_cors_origins
from database import check_database_connection, init_db
from routers import users, goals, activities, reflections, achievements, reports, profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing tables when the server starts. Existing data is not touched.
    init_db()
    yield


app = FastAPI(
    title="Personal Growth Tracker API",
    description="Backend API for the Personal Growth Tracker.",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

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
    # Does not touch the database, so the service is reported as alive even if the database is asleep.
    return {"status": "healthy"}


@app.get("/health/db")
def database_health_check():
    try:
        check_database_connection()
    except Exception:
        # The error text is not returned: it can contain connection details.
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "unreachable"},
        )
    return {"status": "healthy", "database": "connected"}
