# Atlas Workspace

Atlas is a React + TypeScript dashboard backed by a FastAPI service and a SQLite project store. The Python analytics model scores project health from completion, open work, overdue tasks, and estimated effort.

## Run the full stack

Install the frontend:

```bash
npm ci
```

Install the backend:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
```

Start the API in one terminal:

```bash
backend/.venv/bin/uvicorn backend.app.main:app --reload --port 8000
```

Start the dashboard in another:

```bash
npm run dev
```

The dashboard runs on `http://127.0.0.1:5173`; API docs are available at `http://127.0.0.1:8000/docs`.

Set `VITE_API_URL` when the API is hosted somewhere other than `http://127.0.0.1:8000`. The frontend keeps a local browser fallback for creating projects when the API is unavailable.

## Validate

```bash
npm run lint
npm run build
backend/.venv/bin/python -m pytest backend/tests -q
```

See [backend/README.md](backend/README.md) for the endpoint list and model details.

The symbol classifier accepts handwritten images at `POST /api/symbols/predict` using multipart field `image`. It returns the predicted Sinhala symbol plus ranked alternatives.
