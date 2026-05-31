from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth import get_current_user
from models.database import get_db
from models.fine_tuning_job import FineTuningJob, AppSettings
from services.fine_tuning import prepare_training_data, submit_fine_tune_job, poll_job_status, activate_model

router = APIRouter(prefix="/api/finetuning", tags=["finetuning"])


@router.post("/prepare")
def prepare_data(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    result = prepare_training_data(db)
    return result


@router.post("/submit")
def submit_job(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    prep = prepare_training_data(db)
    if not prep.get("file_path") or prep.get("count", 0) == 0:
        raise HTTPException(400, "No finalized estimates available for training.")
    result = submit_fine_tune_job(prep["file_path"], db)
    return result


@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    jobs = db.query(FineTuningJob).order_by(FineTuningJob.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "anthropic_job_id": j.anthropic_job_id,
            "status": j.status,
            "fine_tuned_model_id": j.fine_tuned_model_id,
            "training_doc_count": j.training_doc_count,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


@router.get("/status/{job_id}")
def get_job_status(job_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    result = poll_job_status(job_id, db)
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result


@router.post("/activate/{job_id}")
def activate_fine_tuned_model(job_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    result = activate_model(job_id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    settings = db.query(AppSettings).filter(AppSettings.id == 1).first()
    from models.estimate import Estimate
    total_finalized = db.query(Estimate).filter(Estimate.status == "final").count()
    return {
        "active_model": settings.fine_tuned_model_id if settings else None,
        "active_job_id": settings.active_job_id if settings else None,
        "finalized_estimate_count": total_finalized,
    }


@router.post("/deactivate")
def deactivate_fine_tuned_model(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    settings = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if settings:
        settings.fine_tuned_model_id = None
        settings.active_job_id = None
        db.commit()
    return {"active_model": None}
