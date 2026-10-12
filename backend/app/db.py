from __future__ import annotations

import sqlite3
from pathlib import Path


DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "atlas.db"


def connect(db_path: Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db(db_path: Path = DEFAULT_DB_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = connect(db_path)
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'planning'
                CHECK (status IN ('planning', 'active', 'paused', 'completed')),
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in_progress', 'done')),
            estimate_hours REAL NOT NULL DEFAULT 0 CHECK (estimate_hours >= 0),
            actual_hours REAL NOT NULL DEFAULT 0 CHECK (actual_hours >= 0),
            due_date TEXT,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        """
    )
    connection.commit()
    connection.close()
