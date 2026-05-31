import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.database import engine, Base
import models.project  # noqa: F401 - register tables
import models.estimate  # noqa: F401
import models.line_item  # noqa: F401
import models.knowledge_doc  # noqa: F401
import models.fine_tuning_job  # noqa: F401

from api.auth import router as auth_router
from api.projects import router as projects_router
from api.estimates import router as estimates_router
from api.documents import router as documents_router
from api.knowledge import router as knowledge_router
from api.finetuning import router as finetuning_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Carpentry Estimating Tool", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(estimates_router)
app.include_router(documents_router)
app.include_router(knowledge_router)
app.include_router(finetuning_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
