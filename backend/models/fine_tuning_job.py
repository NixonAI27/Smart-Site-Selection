from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .database import Base


class FineTuningJob(Base):
    __tablename__ = "fine_tuning_jobs"

    id = Column(Integer, primary_key=True, index=True)
    anthropic_job_id = Column(String(255), unique=True)
    status = Column(String(20), default="pending")  # pending|running|succeeded|failed
    fine_tuned_model_id = Column(String(255))
    training_doc_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, default=1)
    fine_tuned_model_id = Column(String(255))
    active_job_id = Column(String(255))
