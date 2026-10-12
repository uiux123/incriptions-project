from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ProjectStatus = Literal["planning", "active", "paused", "completed"]
TaskStatus = Literal["todo", "in_progress", "done"]
RiskLevel = Literal["low", "medium", "high"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    status: ProjectStatus = "planning"


class Project(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    status: ProjectStatus
    progress: int = Field(ge=0, le=100)
    task_count: int = Field(ge=0)
    completed_task_count: int = Field(ge=0)
    created_at: datetime


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    status: TaskStatus = "todo"
    estimate_hours: float = Field(default=0, ge=0, le=10000)
    due_date: date | None = None


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    actual_hours: float | None = Field(default=None, ge=0, le=10000)
    due_date: date | None = None


class Task(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    status: TaskStatus
    estimate_hours: float
    actual_hours: float
    due_date: date | None
    created_at: datetime


class ProjectDetail(Project):
    tasks: list[Task]


class ProjectInsight(BaseModel):
    project_id: int
    project_name: str
    health_score: int = Field(ge=0, le=100)
    risk: RiskLevel
    completion_rate: int = Field(ge=0, le=100)
    overdue_tasks: int = Field(ge=0)
    estimated_days_remaining: int = Field(ge=0)
    summary: str


class WorkspaceInsights(BaseModel):
    project_count: int = Field(ge=0)
    task_count: int = Field(ge=0)
    completed_task_count: int = Field(ge=0)
    completion_rate: int = Field(ge=0, le=100)
    insights: list[ProjectInsight]


class SymbolCandidate(BaseModel):
    symbol: str
    confidence: float = Field(ge=0, le=1)


class SymbolPrediction(BaseModel):
    symbol: str
    confidence: float = Field(ge=0, le=1)
    candidates: list[SymbolCandidate]
