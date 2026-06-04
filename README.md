# Certificate PDF Template Editor

Production-oriented local foundation for Canva-exported PDF templates. The uploaded PDF is treated as immutable artwork; all changes are text overlay metadata that can be saved, previewed, and rendered into new PDFs.

## Architecture

- `backend/` is a FastAPI service with SQLModel on SQLite, Supabase-backed file/database backup, PyMuPDF PDF inspection/rendering, and Pydantic request validation.
- `frontend/` is a Next.js TypeScript app with Tailwind CSS, `react-pdf` rendering, a visual text overlay editor, variable manager, and generation screens.
- Uploaded originals are stored locally under `backend/storage/templates/originals` and backed up to Supabase Storage in production.
- Generated PDFs and batch ZIPs are stored locally under `backend/storage/generated` and backed up to Supabase Storage when generated for download.
- The SQLite database lives at `backend/data/app.db`, is created automatically on startup, and can be restored from Supabase Storage.

## Data Flow

1. A user uploads a Canva PDF through the frontend.
2. The backend validates the file, stores the original PDF, reads page count and page dimensions, and creates `Template` plus `TemplatePage` records.
3. The editor renders the original PDF and lets users place text boxes using browser-style top-left coordinates based on real PDF page dimensions.
4. Saving sends template name, text elements, and variable schema to the backend.
5. The backend persists text overlays, extracts variables like `{{student_name}}`, preserves existing variable metadata where possible, and removes deleted elements.
6. Generation loads the original PDF, validates provided data, replaces variables, converts browser coordinates to PDF coordinates, draws text overlays with PyMuPDF, and saves a selectable-text PDF.

## Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The backend database and storage folders are created automatically when the API starts.

## One-Command Development

```powershell
cd frontend
npm install
npm run dev
```

This starts both services:

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:3000`

If the backend runs somewhere else, set `NEXT_PUBLIC_API_BASE`.

## Production Deployment

- Deploy the backend to Render with the root `render.yaml` blueprint.
- Deploy the frontend to Vercel with Root Directory set to `frontend`.
- In Vercel, set `NEXT_PUBLIC_API_BASE` to the Render backend URL, for example `https://your-render-service.onrender.com`.
- In Render, set `FRONTEND_ORIGIN` to the Vercel frontend URL.
- In Render, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_BUCKET=templates` so uploaded templates and SQLite metadata survive deploys.
- To email certificates, deploy `docs/apps-script-certificate-mailer.gs` as a Google Apps Script Web App and set Render env `APPS_SCRIPT_WEBHOOK_URL` to that Web App URL.
- Email-batch certificates are rendered in memory and sent to Apps Script immediately; they are not saved as generated files in backend storage.
- Render's free filesystem is ephemeral, so production persistence is handled through Supabase Storage instead of Render disks.

## API Endpoints

- `POST /api/templates/upload`
- `GET /api/templates`
- `GET /api/templates/{template_id}`
- `GET /api/templates/{template_id}/original.pdf`
- `PUT /api/templates/{template_id}`
- `POST /api/templates/{template_id}/save-layout`
- `POST /api/templates/{template_id}/generate`
- `POST /api/templates/{template_id}/generate-batch`
- `GET /api/generated`
- `GET /api/generated/{document_id}/download`

## Coordinate Model

Overlay boxes are stored in original PDF page units with a browser origin: `x`, `y`, `width`, and `height` are all relative to the page's real dimensions, with `y` measured from the top. This keeps the layout independent of editor zoom. During generation, `browser_to_pdf_coords()` flips `y` because PDF coordinates are bottom-left origin.

```text
x_pdf = x_browser
y_pdf = page_height - y_browser - height
```

## Storage Layer

`StorageService` owns path validation and directory choices. Replacing local disk with S3, R2, or Google Cloud Storage should primarily require swapping this service while keeping API and generation logic stable.
