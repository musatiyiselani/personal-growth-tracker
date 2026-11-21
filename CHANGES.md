# Change log

## Version 1.1: Neon PostgreSQL and free hosting

This version replaces SQLite with Neon PostgreSQL, stores profile pictures in the database, and adds the deployment setup for Render (backend) and GitHub Pages (frontend). Existing features, progress calculations, and user-specific data access are unchanged.

### Database

- **`backend/database.py`** rewritten. The connection string comes from the `DATABASE_URL` environment variable. The engine uses:
  - a small connection pool (`pool_size=5`, `max_overflow=5`);
  - `pool_pre_ping=True` and `pool_recycle=300`, because Neon suspends idle databases;
  - `prepare_threshold=None` (no server-side prepared statements), because Neon's pooler reuses server connections between transactions;
  - `connect_timeout=10`.
  Also adds `init_db()` (creates missing tables) and `check_database_connection()`.
- **`backend/config.py`** adds `get_database_url()` and `normalize_database_url()`:
  - rewrites `postgresql://` and `postgres://` to the `postgresql+psycopg://` driver name;
  - refuses SQLite with a message that explains the change;
  - adds `sslmode=require` for `*.neon.tech` hosts when it is missing;
  - never prints the connection string, because it contains the password.
- **`backend/models.py`**:
  - removed the `User.profile_picture` text column (a file path);
  - added the `ProfilePicture` table (`profile_pictures`): one row per user, the image bytes stored in a `bytea` column, loaded only when the picture is requested (`deferred`), deleted with the user;
  - `User.picture` relationship, and a `User.profile_picture` property that returns `"/profile/picture"` when a picture exists (this keeps the API response field name unchanged).
- **Column lengths.** Checked every `String(n)` column against the matching request schema. PostgreSQL enforces lengths (SQLite did not). All request limits match or are lower than the column limits, except email: `schemas.py` now rejects emails longer than 255 characters (`UserCreate`, `UserUpdate`).
- **Duplicate emails under concurrency.** Registration (`/users/register`), profile update (`PUT /profile/`) and account update (`PUT /users/me`) now catch the unique-constraint error and return HTTP 400 with the existing message, instead of an HTTP 500 error. Previously two simultaneous requests could cause a 500.
- **Daily progress snapshot** (`backend/progress.py`). The check-then-insert or update is replaced by one PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` statement. It writes the same value to the same row. **The progress calculation itself is unchanged** (`calculate_goal_progress` is not modified).
- **Automatic table creation.** Tables are created when the server starts (FastAPI `lifespan`), replacing the earlier call at import time. Existing tables and data are never changed. The new `profile_pictures` table is created on first start.

### Profile pictures

- **`backend/routers/profile.py`** picture code rewritten:
  - `POST /profile/picture` stores the image in the database. It uses a single upsert, so a new upload replaces the previous picture.
  - `GET /profile/picture` (new) returns the image bytes with the stored content type. It requires sign-in and returns only the signed-in user's own picture (HTTP 404 if none).
  - `DELETE /profile/picture` removes the picture (HTTP 404 if none).
  - The same checks apply as before: JPG, JPEG, PNG or WEBP only; maximum 5 MB; the file's first bytes must match the file type.
- **`backend/picture_rules.py`** (new): the picture rules (allowed types, size limit, file-signature check), kept free of framework imports so they can be tested on their own.
- **Removed:** the local `backend/uploads/` folder and its `.gitkeep`, the static-file mount that served it, and the code that wrote files to disk. Files on Render's free service would be lost on restart.

### Backend application

- **`backend/main.py`**:
  - CORS origins come from `CORS_ORIGINS` (comma-separated); the default still allows the local frontend on ports 5500 and 3000.
  - removed the `/uploads` static-file mount;
  - added `GET /health/db`, which runs a trivial query and returns HTTP 503 with a generic message if the database is unreachable (the error text is not returned);
  - `/health` is unchanged and does not touch the database;
  - API version shown in the documentation: 1.1.0.
- **`backend/init_db.py`** (new): checks the connection and creates tables. Run with `python init_db.py`.

### Dependencies and configuration

- **`backend/requirements.txt`**: added `psycopg[binary]>=3.1`. All other packages unchanged.
- **`backend/requirements-dev.txt`** (new): test packages (`pytest`, `httpx`), on top of `requirements.txt`.
- **`backend/pytest.ini`** (new): test discovery settings.
- **`backend/.env.example`**: documents `SECRET_KEY`, `DATABASE_URL` (Neon pooled string) and `CORS_ORIGINS`.

### Frontend

- **`frontend/js/config.js`** (new): sets `window.PGT_API_BASE`, the backend address. The default is the local address; `DEPLOYMENT.md` explains how to change it for Render.
- **All 12 HTML pages** load `js/config.js` before `js/common.js`.
- **`frontend/js/profile.js`** rewritten for picture loading:
  - the picture is fetched with the sign-in token and shown from a temporary local URL (a plain image link cannot send the token);
  - previous temporary URLs are released when the picture changes;
  - saving the profile form no longer re-downloads the picture;
  - no picture request is made when the user has no picture.
- No layout, styling or wording changes.

### Deployment files

- **`.github/workflows/deploy-frontend.yml`** (new): publishes the `frontend` folder to GitHub Pages on each push to `main`. Uses GitHub's official Pages actions.
- **`.gitignore`**: removed the upload-folder entries; added `*.db` (old local database files) and `.pytest_cache/`.
- **`DEPLOYMENT.md`** (new): step-by-step guide for Neon, Render and GitHub Pages, the manual configuration checklist, free-tier limits, limitations and troubleshooting.
- **`backend/README_SETUP.md`**: rewritten for local development with PostgreSQL, including the test instructions.
- **`README.md`**: the technology section now describes the current build.

### Tests (new)

Backend, in `backend/tests/`:

- `conftest.py`, `support.py`: shared setup. Database tests run only when `TEST_DATABASE_URL` is set, and they never read `DATABASE_URL`.
- `test_config.py`, `test_picture_rules.py`: no database needed.
- `test_schemas.py`: request validation; needs `pydantic`, no database.
- `test_database.py`: connection, driver, tables, unique email, cascade delete, overlong text rejected by PostgreSQL, picture upsert, daily-progress upsert, progress percentage with the seven-day window and milestones.
- `test_api.py`: the complete API flow, including ownership checks, validation, profile pictures, settings, reports, PDF download, and CORS.

Frontend, in `tests/` (project root, run with Node.js):

- `common_test.js` (existing, still passes), `dashboard_test.js` (existing, still passes), `profile_test.js` (new): picture loading, upload replacement, removal, and no request when there is no picture.

### Behaviour changes to be aware of

- Profile pictures are served from `/profile/picture` (an authenticated request), not from `/uploads/...`.
- Data in the earlier SQLite database is **not** migrated. Start with an empty Neon database.
- A simultaneous duplicate registration now returns HTTP 400 (it used to return HTTP 500).
- An email longer than 255 characters is rejected with HTTP 422.

### Unchanged

Registration and login, password hashing (PBKDF2) and token handling, goals and the percentage-based progress calculation, milestones, activities, daily reflections, achievements, the dashboard, growth history, reports and PDF downloads, profile editing, settings, and the per-user ownership checks on every route.

### Verification status

**Actually executed in the build environment:**

- Every Python file compiles (`py_compile`).
- An AST check confirms that every name imported from a project module exists there.
- `config.py` and `picture_rules.py`: their checks were run directly in Python, and the 27 pure tests in `test_config.py` and `test_picture_rules.py` were run with a small stand-in runner (see below).
- Every frontend API call (32 call sites, 25 distinct endpoints) matches a backend route (40 routes), with the correct HTTP method.
- Element IDs used by each page script exist on the pages that load it.
- Node tests: `common_test.js` (12 checks), `dashboard_test.js`, and `profile_test.js` (4 checks) all pass.
- The GitHub workflow file parses with a YAML parser.

**Not executed (could not be run in the build environment):**

- The FastAPI, SQLAlchemy, psycopg and pydantic code. Those packages could not be installed there.
- `pytest` itself. The pure tests were run with a stand-in runner that implements only the features they use (`parametrize`, `monkeypatch`, `raises`); it was checked to report failures correctly. The real `pytest` must still be run on your machine.
- `test_schemas.py`, `test_database.py`, `test_api.py`: written and compiled, but not run.
- Connection to a real PostgreSQL server or to Neon.
- Deployment to Render or GitHub Pages.

**To complete verification on your machine:** follow `backend/README_SETUP.md` section 7.


---

## Earlier versions

This version connects the frontend to the backend and fixes the problems found in the review.

## Summary of fixes

| # | Problem found in review | Fix |
|---|---|---|
| 1 | Frontend never called the backend; all data lived in the browser | Every page now uses the API (`frontend/js/common.js` is the shared client) |
| 2 | Passwords stored in plain text in `localStorage`; login was a client-side check | Login uses the server; passwords are hashed on the server (PBKDF2) and never stored in the browser |
| 3 | Pages could be opened without logging in | Login guard on every page except index, register and forgot-password |
| 4 | Goals, activities and reflections shared one global store, so accounts shared data | All data is fetched per logged-in user from the API |
| 5 | Explicit `null` values on required fields caused 500 errors | Update schemas reject these with a 422 error and a readable message |
| 6 | PDF report could break on characters such as `<` and `&` | All user text is escaped before it reaches the PDF writer |
| 7 | Profile pictures were checked by file extension only | File contents must match the type (JPG, PNG or WEBP signatures); upload is capped at 5 MB |
| 8 | Goal progress went stale as activities left the 7-day window | Progress is recalculated when goals and reports are read |
| 9 | `.env.example` was never loaded | `backend/config.py` loads `backend/.env`; refuses to start with a missing or placeholder key |
| 10 | Settings values did not match the backend (`monday` vs `Monday`) | Settings use the backend's values; Saturday added |
| 11 | Reflection form allowed future dates; backend rejected them | Date is limited to today in the form |
| 12 | Goal deadline required in form but optional in backend | Form still requires a deadline (matches original UI); backend accepts either |
| 13 | Notification and week-start settings saved but never used | Both are saved on the server and shown on the settings page. Notifications are stored but do not send anything yet; week-start is stored but does not change any calendar display yet |
| 14 | Logout link only navigated away and kept the session | Log Out clears the session on every page |
| 15 | Empty, unused `assets/logo.svg` | Removed |
| 16 | Documentation said PostgreSQL; backend uses SQLite | Top-level README and setup guide now describe the current build |
| 17 | `.gitignore` did not cover the database file | Database and uploaded pictures added to `.gitignore` |

## Backend

### New files
- `backend/config.py`: loads `backend/.env` (standard library only; existing environment variables take priority). `get_secret_key()` raises a clear error if `SECRET_KEY` is missing, still the placeholder, or shorter than 32 characters.

### Changed files
- `backend/auth.py`: reads the secret through `config.get_secret_key()`; the `os` import was removed.
- `backend/models.py`: `Goal.unit` and `Activity.unit` (text, up to 30 characters, default `"hours"`, required).
- `backend/schemas.py`: rewritten.
  - New `UpdateModel` base class. Any field listed in `NON_NULLABLE` rejects an explicit `null`. Applied to user, goal, activity, milestone, reflection and settings updates.
  - `unit` added to goal and activity create, update and response schemas.
  - Goal responses now include their milestones.
  - `week_start` must be `Monday`, `Sunday` or `Saturday`.
  - Milestone, reflection, achievement, settings and daily-progress response schemas added or completed.
  - Goal create checks that the deadline is not before the start date.
- `backend/routers/goals.py`: listing a goal and getting a goal both recalculate progress first.
- `backend/routers/reports.py`: rewritten.
  - Progress is recalculated before a report or PDF is produced.
  - User text is escaped in the PDF.
  - Activities with no recorded duration show "not recorded" instead of "None".
  - The report response keeps the fields the frontend uses: summary, goals, activities, growth by category, reflections, achievements and progress history.
- `backend/routers/profile.py`: uploads check the file signature and are read at most 5 MB + 1 byte.
- `backend/.env.example`: rewritten with generation instructions.
- `backend/README_SETUP.md`: rewritten (setup, secret key, running both servers, upgrade note, behaviour notes).

### Unchanged
- `backend/main.py`, `backend/database.py`, `backend/progress.py` (formula unchanged), `backend/requirements.txt`, `backend/routers/users.py`, `backend/routers/reflections.py`, `backend/routers/achievements.py`, `backend/routers/activities.py`.

## Frontend

### JavaScript
- `js/common.js`: rewritten. Provides the API client (JSON and form requests, bearer token, 401 handling, readable error messages), session storage (remember-me chooses localStorage; otherwise sessionStorage), the login guard, theme handling, Log Out handling, and display helpers.
- `js/auth.js`: rewritten. Login and registration call the API. Forgot-password explains that email reset is not available yet.
- `js/dashboard.js`: rewritten. Counts, overall and per-area progress, recent goals and activities from the API.
- `js/goals.js`: rewritten. Create, edit, delete goals; add, tick, and remove milestones; options menu closes after Edit.
- `js/activities.js`: rewritten. An activity takes its category and unit from the chosen goal; future dates are not allowed.
- `js/reflections.js`: rewritten. One reflection per date (editing an existing date updates it); edit and delete.
- `js/achievements.js`: rewritten. Completed goals and completed milestones from the goals list.
- `js/growth.js`: rewritten. Chart and per-area breakdown from the reports endpoint; resizing redraws without a new request.
- `js/reports.js`: rewritten. Summary for the selected period; PDF download with the sign-in token.
- `js/profile.js`: rewritten. Load and save profile; upload and remove profile picture.
- `js/settings.js`: rewritten. Load and save settings on the server; theme previews on change.

### HTML
- All app pages: the sidebar Log Out link now has the `logout-button` class.
- `reflections.html`: the three prompts (accomplishments, learning, improvement) replaced by a mood select and one text area.
- `profile.html`: new "Profile Picture" section (preview, choose file, upload, remove).
- `settings.html`: week-start options are `Monday`, `Sunday` and `Saturday` (Saturday added).
- `reports.html`: "Download PDF" button added.

### CSS
- `css/style.css`: new section 11 at the end. Adds the hidden-attribute rule, success and error message colours, card headers, options menu, link buttons, milestone form, profile picture row, and growth-area card.

### Removed
- `frontend/assets/logo.svg` (empty and unused) and the now-empty `assets` folder.

## Top-level files
- `README.md`: "Technology Stack" section now describes the current build and what is planned.
- `.gitignore`: added `personal_growth_tracker.db`, `backend/personal_growth_tracker.db` and uploaded profile pictures (the placeholder `.gitkeep` is kept).

## Tests (new)
- `tests/common_test.js`: 12 tests of the API client and shared helpers, run with Node and mocked browser objects.
- `tests/dashboard_test.js`: dashboard rendering from API-shaped data.

Run with `node tests/common_test.js` and `node tests/dashboard_test.js` from the project root.

## Before running this version
1. Delete any existing `backend/personal_growth_tracker.db`. The new `unit` column is not in old databases, and this deletes existing data.
2. Create `backend/.env` with a generated `SECRET_KEY` (see `backend/README_SETUP.md`).
3. Serve the frontend over HTTP, for example `python -m http.server 5500` inside `frontend`, and open `http://127.0.0.1:5500/index.html`.

## Not changed, and why
- **Goal status:** a goal is "Completed" when its weekly progress reaches 100%, and can return to "In Progress" the following week. This is the existing rule; changing it is a product decision.
- **Password reset by email:** not implemented.
- **Manual achievements:** the API endpoints exist, but there is no page for them yet.
- **Activity-to-goal link:** activities count toward every goal in their category, as the original README describes.

## Not verified
- The backend server was not run (FastAPI and SQLAlchemy could not be installed in the build environment).
- The pages were not tested in a browser.
- The PDF escaping change was reasoned from the ReportLab documentation but not run.
