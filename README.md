# Sri Lankan Ancient Inscription Translator

This is a React + TypeScript research interface backed by FastAPI. It presents three inscription representations, accepts a handwritten/eye-copy image, and sends it to the bundled HOG + Random Forest model for Sinhala character recognition. The backend also includes a SQLite project store and workspace insight endpoints for the wider research workspace.

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

Start the API in one terminal from the repository root:

```bash
backend/.venv/bin/uvicorn backend.app.main:app --reload --port 8000
```

Start the dashboard in another:

```bash
npm run dev
```

The translator runs on `http://127.0.0.1:5173`; API docs are available at `http://127.0.0.1:8000/docs`.

Set `VITE_API_URL` when the API is hosted somewhere other than `http://127.0.0.1:8000`. The recognition screen reports whether the model endpoint is online, previews the selected image, and only submits it when you press **Identify Character**.

## Validate

```bash
npm run lint
npm run build
backend/.venv/bin/python -m pytest backend/tests -q
```

See [backend/README.md](backend/README.md) for the endpoint list and model details.

The symbol classifier accepts handwritten images at `POST /api/symbols/predict` using multipart field `image`. It returns the predicted Sinhala symbol plus ranked alternatives.
