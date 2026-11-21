# Backend setup

The backend is a FastAPI application that uses SQLite. The database file
`personal_growth_tracker.db` is created automatically the first time the server starts.

## 1. Create and activate a virtual environment

Run these commands from the `backend` folder (Windows PowerShell):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. Create the secret key

The server will not start without a real `SECRET_KEY`. Generate one:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copy `.env.example` to `.env` in the `backend` folder, then replace the placeholder with the generated value:

```
SECRET_KEY=paste-the-generated-value-here
```

`.env` is listed in `.gitignore`, so it will not be committed.

## 3. Start the API

```powershell
uvicorn main:app --reload
```

The API runs at http://127.0.0.1:8000. Interactive documentation is at http://127.0.0.1:8000/docs.

## 4. Start the frontend

The frontend is plain HTML, CSS and JavaScript. It must be served over HTTP (not opened directly as a file) so the browser allows it to call the API. From the `frontend` folder:

```powershell
python -m http.server 5500
```

Then open http://127.0.0.1:5500/index.html.

The API accepts requests from `http://127.0.0.1:5500` and `http://localhost:5500`. If you serve the frontend on another port, add that origin to `allow_origins` in `main.py`.

## Upgrading from an earlier version

This version adds a `unit` column to goals and activities. An existing `personal_growth_tracker.db` from an earlier version will not have that column. Delete the database file (this removes all data) and restart the server, or migrate the data with a tool of your choice.

## Notes

- Goal progress is calculated from activities in the last seven calendar days, grouped by category. An activity counts toward every goal in its category, so give goals that should be tracked separately different categories.
- Activity amounts and goal targets are in the same unit (for example, hours or pages). Each goal stores its unit, and new activities take the unit of the goal they are recorded against.
- Password reset by email is not implemented yet.
