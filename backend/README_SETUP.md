# Backend setup (local development)

The backend is a FastAPI application. It stores data in **PostgreSQL** (Neon in production; any PostgreSQL database for local work). Tables are created automatically when the server starts.

For deploying to the internet, see `../DEPLOYMENT.md`.

## 1. Requirements

- Python **3.12** (recommended; 3.11 and 3.13 should also work).
- A PostgreSQL database. Two easy options:
  - a **Neon** project or branch (the same service used in production), or
  - a PostgreSQL server installed on your computer.

## 2. Create a virtual environment and install the packages

Run these commands from the `backend` folder (Windows PowerShell shown; use `source venv/bin/activate` on macOS/Linux):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3. Create `backend/.env`

Copy the example file:

```powershell
copy .env.example .env
```

Edit `.env`:

- `SECRET_KEY`: generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `DATABASE_URL`: your PostgreSQL connection string. For Neon, copy the **pooled** string from the Connect dialog (see `../DEPLOYMENT.md`, Step 1). For a local server it looks like `postgresql://postgres:YOUR_PASSWORD@localhost:5432/growth`.
- `CORS_ORIGINS`: leave the default for local development.

`.env` is excluded from Git. Do not share it.

Settings can also come from real environment variables; those take priority over `.env`.

## 4. Check the database connection and create the tables

```powershell
python init_db.py
```

You should see "Connected to the database." and "Tables are ready." If you see an error, the message names the problem (for example, `DATABASE_URL is not set`). It never prints the password.

## 5. Start the API

```powershell
uvicorn main:app --reload
```

- API: http://127.0.0.1:8000
- Interactive documentation: http://127.0.0.1:8000/docs
- Health checks: `/health` (server alive) and `/health/db` (database reachable)

## 6. Start the frontend

In a second terminal, from the `frontend` folder:

```powershell
python -m http.server 5500
```

Open http://127.0.0.1:5500/index.html. Keep `frontend/js/config.js` pointing at `http://127.0.0.1:8000` for local work.

The API accepts requests from `http://127.0.0.1:5500` and `http://localhost:5500` by default. To allow another address, add it to `CORS_ORIGINS` in `.env`, separated by commas.

## 7. Run the automated tests

Install the test packages once:

```powershell
pip install -r requirements-dev.txt
```

**Tests that need no database** (configuration, picture rules, request validation):

```powershell
pytest tests/test_config.py tests/test_picture_rules.py tests/test_schemas.py
```

**Database and API tests.** These need a database that you have set aside for testing. They **delete all tables** in that database at the start of the run, so never point them at your real database. Create a separate Neon branch named `test` (see `../DEPLOYMENT.md`) and set `TEST_DATABASE_URL` to its pooled connection string:

```powershell
$env:TEST_DATABASE_URL = "postgresql://USER:PASSWORD@ep-test-pooler.region.aws.neon.tech/neondb?sslmode=require"
pytest
```

Without `TEST_DATABASE_URL`, the database tests are skipped and reported as skipped. The tests never read `DATABASE_URL`.

Frontend tests (run from the project root, need Node.js):

```powershell
node tests/common_test.js
node tests/dashboard_test.js
node tests/profile_test.js
```

## Notes

- **Progress** for a goal is the share of the weekly target reached by activities in the same category during the last seven days, averaged with milestone completion when a goal has milestones. Activities in a category count toward every goal in that category.
- **Activity units:** each goal stores its unit, and new activities take the unit of the goal they are recorded against.
- **Profile pictures** are stored in the database (table `profile_pictures`), so they survive restarts. Each user keeps one picture; uploading a new one replaces the old one. Maximum size 5 MB; JPG, PNG and WEBP only.
- **Schema changes:** tables are created when missing, but existing tables are not altered. If a later version changes an existing table, that change needs a migration. This version creates the new `profile_pictures` table automatically.
- **Earlier SQLite data is not migrated.** The database file from earlier versions cannot be used with this version.
