from datetime import date, timedelta

from backend.app.insights import score_project


def test_model_flags_overdue_open_work():
    result = score_project(
        {"id": 7, "name": "At-risk project"},
        [{
            "status": "todo",
            "estimate_hours": 12,
            "actual_hours": 0,
            "due_date": (date.today() - timedelta(days=1)).isoformat(),
        }],
    )

    assert result["risk"] == "medium"
    assert result["overdue_tasks"] == 1
    assert result["estimated_days_remaining"] == 2
