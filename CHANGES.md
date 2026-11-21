# Change log

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
