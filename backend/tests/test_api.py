from datetime import date, timedelta
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import create_app


def test_project_task_and_insight_flow(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok", "service": "atlas-api"}

        project_response = client.post(
            "/api/projects",
            json={"name": "Launch campaign", "description": "Ship the spring campaign"},
        )
        assert project_response.status_code == 201
        project = project_response.json()
        assert project["progress"] == 0

        overdue_date = (date.today() - timedelta(days=2)).isoformat()
        first_task = client.post(
            f"/api/projects/{project['id']}/tasks",
            json={"title": "Write launch brief", "estimate_hours": 4, "due_date": overdue_date},
        )
        assert first_task.status_code == 201
        second_task = client.post(
            f"/api/projects/{project['id']}/tasks",
            json={"title": "Approve creative", "estimate_hours": 2},
        )
        assert second_task.status_code == 201

        update_response = client.patch(
            f"/api/tasks/{first_task.json()['id']}",
            json={"status": "done", "actual_hours": 5},
        )
        assert update_response.status_code == 200

        detail = client.get(f"/api/projects/{project['id']}")
        assert detail.status_code == 200
        assert detail.json()["progress"] == 50
        assert len(detail.json()["tasks"]) == 2

        overview = client.get("/api/insights/overview")
        assert overview.status_code == 200
        insight = overview.json()["insights"][0]
        assert overview.json()["completion_rate"] == 50
        assert insight["overdue_tasks"] == 0
        assert insight["estimated_days_remaining"] == 1


def test_missing_resources_return_404(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        assert client.get("/api/projects/999").status_code == 404
        assert client.post("/api/projects/999/tasks", json={"title": "Orphan"}).status_code == 404
        assert client.patch("/api/tasks/999", json={"status": "done"}).status_code == 404


def test_symbol_prediction_endpoint(tmp_path):
    app = create_app(tmp_path / "test.db")
    image_buffer = BytesIO()
    Image.new("L", (96, 96), color=0).save(image_buffer, format="PNG")

    with TestClient(app) as client:
        model_info = client.get("/api/symbols/model-info")
        assert model_info.status_code == 200
        assert model_info.json()["image_size"] == 96
        assert len(model_info.json()["classes"]) == 9

        prediction = client.post(
            "/api/symbols/predict?top_k=3",
            files={"image": ("symbol.png", image_buffer.getvalue(), "image/png")},
        )
        assert prediction.status_code == 200
        body = prediction.json()
        assert body["symbol"] in model_info.json()["classes"]
        assert len(body["candidates"]) == 3
