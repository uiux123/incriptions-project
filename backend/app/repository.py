from __future__ import annotations

import sqlite3
from datetime import date, datetime, timezone
from pathlib import Path

from .db import connect
from .schemas import ProjectCreate, TaskCreate, TaskUpdate


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _project_from_row(row: sqlite3.Row) -> dict[str, object]:
    task_count = int(row["task_count"] or 0)
    completed_count = int(row["completed_task_count"] or 0)
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "status": row["status"],
        "progress": round((completed_count / task_count) * 100) if task_count else 0,
        "task_count": task_count,
        "completed_task_count": completed_count,
        "created_at": row["created_at"],
    }


def _project_query() -> str:
    return """
        SELECT p.*, COUNT(t.id) AS task_count,
               COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0)
                   AS completed_task_count
        FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
    """


def list_projects(db_path: Path) -> list[dict[str, object]]:
    connection = connect(db_path)
    rows = connection.execute(_project_query() + " GROUP BY p.id ORDER BY p.created_at DESC").fetchall()
    connection.close()
    return [_project_from_row(row) for row in rows]


def get_project(db_path: Path, project_id: int) -> dict[str, object] | None:
    connection = connect(db_path)
    row = connection.execute(_project_query() + " WHERE p.id = ? GROUP BY p.id", (project_id,)).fetchone()
    connection.close()
    return _project_from_row(row) if row else None


def create_project(db_path: Path, project: ProjectCreate) -> dict[str, object]:
    connection = connect(db_path)
    cursor = connection.execute(
        "INSERT INTO projects (name, description, status, created_at) VALUES (?, ?, ?, ?)",
        (project.name.strip(), project.description.strip(), project.status, now_iso()),
    )
    connection.commit()
    project_id = int(cursor.lastrowid)
    connection.close()
    return get_project(db_path, project_id)  # type: ignore[return-value]


def list_tasks(db_path: Path, project_id: int | None = None) -> list[dict[str, object]]:
    connection = connect(db_path)
    if project_id is None:
        rows = connection.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
    else:
        rows = connection.execute("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC", (project_id,)).fetchall()
    connection.close()
    return [_task_from_row(row) for row in rows]


def _task_from_row(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "title": row["title"],
        "status": row["status"],
        "estimate_hours": row["estimate_hours"],
        "actual_hours": row["actual_hours"],
        "due_date": date.fromisoformat(row["due_date"]) if row["due_date"] else None,
        "created_at": row["created_at"],
    }


def create_task(db_path: Path, project_id: int, task: TaskCreate) -> dict[str, object] | None:
    connection = connect(db_path)
    project_exists = connection.execute("SELECT 1 FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not project_exists:
        connection.close()
        return None
    cursor = connection.execute(
        """INSERT INTO tasks
           (project_id, title, status, estimate_hours, actual_hours, due_date, created_at)
           VALUES (?, ?, ?, ?, 0, ?, ?)""",
        (project_id, task.title.strip(), task.status, task.estimate_hours, task.due_date.isoformat() if task.due_date else None, now_iso()),
    )
    connection.commit()
    task_id = int(cursor.lastrowid)
    row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    connection.close()
    return _task_from_row(row) if row else None


def update_task(db_path: Path, task_id: int, update: TaskUpdate) -> dict[str, object] | None:
    values: dict[str, object] = {}
    if update.status is not None:
        values["status"] = update.status
    if update.actual_hours is not None:
        values["actual_hours"] = update.actual_hours
    if update.due_date is not None:
        values["due_date"] = update.due_date.isoformat()
    if not values:
        tasks = list_tasks(db_path)
        return next((task for task in tasks if task["id"] == task_id), None)

    connection = connect(db_path)
    assignments = ", ".join(f"{column} = ?" for column in values)
    cursor = connection.execute(f"UPDATE tasks SET {assignments} WHERE id = ?", (*values.values(), task_id))
    connection.commit()
    if cursor.rowcount == 0:
        connection.close()
        return None
    row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    connection.close()
    return _task_from_row(row) if row else None
