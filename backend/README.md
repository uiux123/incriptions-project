# Atlas backend

The backend is a small FastAPI service with SQLite persistence and a transparent project-health model.

## Run locally

From the repository root:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

The API is available at `http://127.0.0.1:8000`, with interactive docs at `/docs`.

## API surface

- `GET /api/health` — service readiness
- `GET /api/projects` — list projects with derived progress
- `POST /api/projects` — create a project
- `GET /api/projects/{id}` — project and task detail
- `POST /api/projects/{id}/tasks` — add a task
- `PATCH /api/tasks/{id}` — update task status, hours, or due date
- `GET /api/insights/overview` — workspace metrics and model-generated health insights
- `GET /api/symbols/model-info` — loaded symbol model metadata and Sinhala class labels
- `POST /api/symbols/predict` — upload an image as multipart field `image` and receive the top symbol candidates

The SQLite file defaults to `backend/atlas.db`. Set `ATLAS_DB_PATH` to use another location, especially in tests or deployment.

The current model is deterministic and explainable: it combines completion rate, open work, overdue tasks, and remaining estimated hours. Its output is intentionally isolated in `backend/app/insights.py` so a trained model can replace the scoring function without changing the API.

## Handwritten symbol model

`model_artifacts/hog_random_forest_model.pkl` is loaded by `backend/app/symbol_model.py`. The artifact contains a 300-tree Random Forest trained for nine Sinhala symbols. Inference converts an uploaded image to grayscale, resizes it to 96×96, extracts HOG features using the artifact's stored parameters, and returns ranked predictions with confidence scores.

The runtime pins scikit-learn to the artifact's recorded training version (1.9.1). The endpoint is structurally validated by tests; accuracy still requires a labeled evaluation set representative of the handwritten symbols you expect users to upload.
