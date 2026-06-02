# Frontend

Next.js editor for rendering PDF templates and editing reusable text overlays.

Run locally:

```powershell
npm install
npm run dev
```

`npm run dev` starts the FastAPI backend from `../backend` and the Next.js frontend together.

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:3000`

The backend virtual environment must exist at `../backend/.venv`. Override the API URL with `NEXT_PUBLIC_API_BASE` if needed.
