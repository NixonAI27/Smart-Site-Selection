import json
import os
from datetime import datetime, timezone
from pathlib import Path

import anthropic

FINETUNING_DATA_DIR = Path(os.getenv("FINETUNING_DATA_DIR", "./finetuning_data"))

CARPENTRY_SYSTEM_PROMPT = """You are an expert finish carpentry estimator. Given project information and drawings,
generate a structured list of line items for a finish carpentry estimate including category, description,
quantity, unit, and unit cost."""


def prepare_training_data(db) -> dict:
    """Convert all finalized estimates in the DB to JSONL training examples."""
    from models.estimate import Estimate
    from models.project import Project
    from models.line_item import LineItem

    estimates = (
        db.query(Estimate)
        .filter(Estimate.status == "final")
        .all()
    )

    if not estimates:
        return {"count": 0, "file_path": None, "message": "No finalized estimates found."}

    FINETUNING_DATA_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = FINETUNING_DATA_DIR / f"training_{timestamp}.jsonl"

    examples = []
    for est in estimates:
        project = db.query(Project).filter(Project.id == est.project_id).first()
        items = db.query(LineItem).filter(LineItem.estimate_id == est.id).all()
        if not items:
            continue

        user_text = f"Project: {project.name if project else 'Unknown'}\n"
        if project and project.description:
            user_text += f"Description: {project.description}\n"
        if project and project.address:
            user_text += f"Address: {project.address}\n"
        user_text += "\nGenerate a finish carpentry estimate with line items for this project."

        assistant_items = [
            {
                "category": item.category,
                "description": item.description,
                "quantity": item.quantity,
                "unit": item.unit,
                "unit_cost": item.unit_cost,
                "total_cost": item.total_cost,
            }
            for item in items
        ]
        assistant_text = json.dumps({"line_items": assistant_items}, indent=2)

        example = {
            "messages": [
                {"role": "user", "content": user_text},
                {"role": "assistant", "content": assistant_text},
            ]
        }
        examples.append(example)

    with open(output_path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")

    return {"count": len(examples), "file_path": str(output_path)}


def submit_fine_tune_job(jsonl_path: str, db) -> dict:
    """Upload training file and submit fine-tuning job to Anthropic."""
    from models.fine_tuning_job import FineTuningJob

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    with open(jsonl_path, "rb") as f:
        file_response = client.beta.files.upload(
            file=(Path(jsonl_path).name, f, "application/jsonl"),
        )
    file_id = file_response.id

    job = client.fine_tuning.jobs.create(
        model="claude-sonnet-4-6",
        training_file=file_id,
        hyperparameters={"n_epochs": 3},
    )

    with open(jsonl_path) as f:
        doc_count = sum(1 for _ in f)

    db_job = FineTuningJob(
        anthropic_job_id=job.id,
        status="running",
        training_doc_count=doc_count,
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return {"db_job_id": db_job.id, "anthropic_job_id": job.id, "status": "running"}


def poll_job_status(db_job_id: int, db) -> dict:
    """Poll Anthropic for the latest status and update DB."""
    from models.fine_tuning_job import FineTuningJob, AppSettings

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    db_job = db.query(FineTuningJob).filter(FineTuningJob.id == db_job_id).first()
    if not db_job:
        return {"error": "Job not found"}

    job = client.fine_tuning.jobs.retrieve(db_job.anthropic_job_id)
    db_job.status = job.status
    if job.status == "succeeded" and hasattr(job, "fine_tuned_model"):
        db_job.fine_tuned_model_id = job.fine_tuned_model
        db_job.completed_at = datetime.now(timezone.utc)
    elif job.status in ("failed", "cancelled"):
        db_job.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_job)
    return {
        "id": db_job.id,
        "anthropic_job_id": db_job.anthropic_job_id,
        "status": db_job.status,
        "fine_tuned_model_id": db_job.fine_tuned_model_id,
        "training_doc_count": db_job.training_doc_count,
    }


def activate_model(db_job_id: int, db) -> dict:
    """Set the fine-tuned model as the active model for document analysis."""
    from models.fine_tuning_job import FineTuningJob, AppSettings

    db_job = db.query(FineTuningJob).filter(FineTuningJob.id == db_job_id).first()
    if not db_job or db_job.status != "succeeded":
        return {"error": "Job not succeeded or not found"}

    settings = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if not settings:
        settings = AppSettings(id=1)
        db.add(settings)
    settings.fine_tuned_model_id = db_job.fine_tuned_model_id
    settings.active_job_id = db_job.anthropic_job_id
    db.commit()
    return {"active_model": db_job.fine_tuned_model_id}
