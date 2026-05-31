from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Estimate(Base):
    __tablename__ = "estimates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    version = Column(Integer, default=1)
    status = Column(String(20), default="draft")  # draft | final
    total_labor = Column(Float, default=0.0)
    total_materials = Column(Float, default=0.0)
    markup_pct = Column(Float, default=15.0)
    grand_total = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="estimates")
    line_items = relationship("LineItem", back_populates="estimate", cascade="all, delete-orphan")
