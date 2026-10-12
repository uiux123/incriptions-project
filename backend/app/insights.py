from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date
from math import ceil


def score_project(
    project: Mapping[str, object],
    tasks: Sequence[Mapping[str, object]],
    today: date | None = None,
) -> dict[str, object]:
    """Score project health using transparent, replaceable heuristics.

    The model intentionally has no training dependency: it turns delivery signals
    into a stable API contract that can later be replaced by a learned model.
    """
    current_day = today or date.today()
    total_tasks = len(tasks)
    completed_tasks = sum(task.get("status") == "done" for task in tasks)
    open_tasks = [task for task in tasks if task.get("status") != "done"]
    overdue_tasks = sum(
        bool(task.get("due_date"))
        and date.fromisoformat(str(task["due_date"])) < current_day
        and task.get("status") != "done"
        for task in tasks
    )
    remaining_hours = sum(
        max(float(task.get("estimate_hours", 0)) - float(task.get("actual_hours", 0)), 0)
        for task in open_tasks
    )
    completion_rate = round((completed_tasks / total_tasks) * 100) if total_tasks else 0
    overdue_penalty = min(overdue_tasks * 18, 54)
    open_work_penalty = round((len(open_tasks) / max(total_tasks, 1)) * 20)
    health_score = max(0, min(100, 100 - overdue_penalty - open_work_penalty + round(completion_rate * 0.2)))

    if health_score >= 75:
        risk = "low"
        summary = "The project is moving at a healthy pace."
    elif health_score >= 50:
        risk = "medium"
        summary = "A few open items need attention to protect the timeline."
    else:
        risk = "high"
        summary = "Overdue or unfinished work puts the delivery timeline at risk."

    return {
        "project_id": int(project["id"]),
        "project_name": str(project["name"]),
        "health_score": health_score,
        "risk": risk,
        "completion_rate": completion_rate,
        "overdue_tasks": overdue_tasks,
        "estimated_days_remaining": ceil(remaining_hours / 6) if remaining_hours else 0,
        "summary": summary,
    }


def build_workspace_insights(
    projects: Sequence[Mapping[str, object]],
    tasks_by_project: Mapping[int, Sequence[Mapping[str, object]]],
) -> dict[str, object]:
    all_tasks = [task for tasks in tasks_by_project.values() for task in tasks]
    completed_tasks = sum(task.get("status") == "done" for task in all_tasks)
    project_insights = [
        score_project(project, tasks_by_project.get(int(project["id"]), []))
        for project in projects
    ]
    project_insights.sort(key=lambda insight: (insight["health_score"], insight["project_name"]))

    return {
        "project_count": len(projects),
        "task_count": len(all_tasks),
        "completed_task_count": completed_tasks,
        "completion_rate": round((completed_tasks / len(all_tasks)) * 100) if all_tasks else 0,
        "insights": project_insights,
    }
