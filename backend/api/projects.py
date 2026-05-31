from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth import get_current_user
from models.database import get_db
from models.project import Project

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    client: str | None = None
    address: str | None = None
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    client: str | None = None
    address: str | None = None
    description: str | None = None


def _project_dict(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "client": p.client,
        "address": p.address,
        "description": p.description,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "estimate_count": len(p.estimates),
    }


@router.get("")
def list_projects(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return [_project_dict(p) for p in db.query(Project).order_by(Project.created_at.desc()).all()]


@router.post("", status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    p = Project(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _project_dict(p)


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    return _project_dict(p)


@router.patch("/{project_id}")
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _project_dict(p)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    db.delete(p)
    db.commit()
