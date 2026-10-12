from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Iterator

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from .db import DEFAULT_DB_PATH, init_db
from .insights import build_workspace_insights
from .repository import create_project, create_task, get_project, list_projects, list_tasks, update_task
from .symbol_model import SymbolModel
from .schemas import (
    Project,
    ProjectCreate,
    ProjectDetail,
    ProjectInsight,
    Task,
    TaskCreate,
    TaskUpdate,
    WorkspaceInsights,
    SymbolPrediction,
)


def create_app(db_path: Path | None = None) -> FastAPI:
    database_path = Path(db_path or os.getenv("ATLAS_DB_PATH", DEFAULT_DB_PATH))

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> Iterator[None]:
        init_db(database_path)
        yield

    app = FastAPI(title="Atlas API", version="0.1.0", lifespan=lifespan)
    app.state.db_path = database_path
    app.state.symbol_model = None
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "atlas-api"}

    @app.get("/api/projects", response_model=list[Project])
    def projects(request: Request) -> list[dict[str, object]]:
        return list_projects(request.app.state.db_path)

    @app.post("/api/projects", response_model=Project, status_code=status.HTTP_201_CREATED)
    def add_project(project: ProjectCreate, request: Request) -> dict[str, object]:
        return create_project(request.app.state.db_path, project)

    @app.get("/api/projects/{project_id}", response_model=ProjectDetail)
    def project_detail(project_id: int, request: Request) -> dict[str, object]:
        database_path = request.app.state.db_path
        project = get_project(database_path, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        return {**project, "tasks": list_tasks(database_path, project_id)}

    @app.post("/api/projects/{project_id}/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
    def add_task(project_id: int, task: TaskCreate, request: Request) -> dict[str, object]:
        created_task = create_task(request.app.state.db_path, project_id, task)
        if created_task is None:
            raise HTTPException(status_code=404, detail="Project not found")
        return created_task

    @app.patch("/api/tasks/{task_id}", response_model=Task)
    def edit_task(task_id: int, update: TaskUpdate, request: Request) -> dict[str, object]:
        updated_task = update_task(request.app.state.db_path, task_id, update)
        if updated_task is None:
            raise HTTPException(status_code=404, detail="Task not found")
        return updated_task

    @app.get("/api/insights/overview", response_model=WorkspaceInsights)
    def insights(request: Request) -> dict[str, object]:
        database_path = request.app.state.db_path
        project_rows = list_projects(database_path)
        tasks_by_project = {project["id"]: list_tasks(database_path, int(project["id"])) for project in project_rows}
        return build_workspace_insights(project_rows, tasks_by_project)

    @app.get("/api/symbols/model-info")
    def symbol_model_info(request: Request) -> dict[str, object]:
        if request.app.state.symbol_model is None:
            request.app.state.symbol_model = SymbolModel()
        return request.app.state.symbol_model.metadata()

    @app.post("/api/symbols/predict", response_model=SymbolPrediction)
    async def predict_symbol(
        request: Request,
        image: UploadFile = File(...),
        top_k: int = Query(default=3, ge=1, le=9),
    ) -> dict[str, object]:
        if image.content_type and not image.content_type.startswith("image/"):
            raise HTTPException(status_code=415, detail="Upload a PNG, JPEG, or other image file")
        if request.app.state.symbol_model is None:
            request.app.state.symbol_model = SymbolModel()
        try:
            return request.app.state.symbol_model.predict(await image.read(), top_k=top_k)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    return app


app = create_app()
