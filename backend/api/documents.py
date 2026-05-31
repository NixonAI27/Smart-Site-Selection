import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from api.auth import get_current_user
from models.database import get_db
from services.doc_parser import parse_document
from services.ai_service import analyze_document
from services.estimator import build_rag_suggestions

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".dxf", ".jpg", ".jpeg", ".png"}

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_and_analyze(
    file: UploadFile = File(...),
    project_description: str = Form(""),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / unique_name

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    parsed = parse_document(str(save_path), file.filename)
    if parsed.get("error"):
        raise HTTPException(422, parsed["error"])

    scope = analyze_document(parsed, db)

    rag_suggestions = []
    if scope.get("scope_items") and project_description:
        try:
            rag_suggestions = build_rag_suggestions(project_description, scope["scope_items"])
        except Exception:
            pass  # RAG is best-effort

    return {
        "filename": file.filename,
        "saved_as": unique_name,
        "scope": scope,
        "rag_suggestions": rag_suggestions,
    }
