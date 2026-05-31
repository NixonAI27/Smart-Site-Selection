from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    client = Column(String(255))
    address = Column(String(500))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    estimates = relationship("Estimate", back_populates="project", cascade="all, delete-orphan")
