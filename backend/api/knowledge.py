import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from api.auth import get_current_user
from models.database import get_db
from models.knowledge_doc import KnowledgeDoc
from services.doc_parser import parse_document
from services.embeddings import add_document, delete_document, list_documents

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".dxf", ".jpg", ".jpeg", ".png"}

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.post("/upload", status_code=201)
async def upload_knowledge_doc(
    file: UploadFile = File(...),
    project_type: str = Form("general"),
    total_value: float = Form(0.0),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / unique_name

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    parsed = parse_document(str(save_path), file.filename)
    text = parsed.get("text", "")
    if not text.strip():
        text = f"[Image/visual document: {file.filename}]"

    doc_id = f"kdoc_{unique_name}"
    add_document(doc_id, text, {
        "filename": file.filename,
        "file_type": ext,
        "project_type": project_type,
        "total_value": str(total_value),
    })

    record = KnowledgeDoc(
        filename=file.filename,
        file_type=ext,
        chroma_doc_id=doc_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "filename": record.filename,
        "file_type": record.file_type,
        "chroma_doc_id": doc_id,
        "upload_date": record.upload_date.isoformat() if record.upload_date else None,
    }


@router.get("")
def list_knowledge_docs(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    records = db.query(KnowledgeDoc).order_by(KnowledgeDoc.upload_date.desc()).all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "file_type": r.file_type,
            "chroma_doc_id": r.chroma_doc_id,
            "upload_date": r.upload_date.isoformat() if r.upload_date else None,
        }
        for r in records
    ]


@router.delete("/{doc_id}", status_code=204)
def delete_knowledge_doc(doc_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    record = db.query(KnowledgeDoc).filter(KnowledgeDoc.id == doc_id).first()
    if not record:
        raise HTTPException(404, "Document not found")
    try:
        delete_document(record.chroma_doc_id)
    except Exception:
        pass
    db.delete(record)
    db.commit()
