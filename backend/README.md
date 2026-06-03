# Backend

FastAPI backend for uploading immutable PDF template artwork, saving text overlays, and generating final PDFs.

Run locally:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

SQLite is created at `data/app.db`. Storage directories are created at startup.

Render deployment:

- Root Directory: `backend`
- Build Command: `pip install -r app/requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/health`
