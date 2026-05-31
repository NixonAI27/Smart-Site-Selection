from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"), nullable=False)
    category = Column(String(50))  # trim|millwork|cabinetry|hardware|labor|other
    description = Column(String(500), nullable=False)
    quantity = Column(Float, default=1.0)
    unit = Column(String(30))  # lf, sf, ea, hr
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    ai_generated = Column(Boolean, default=False)

    estimate = relationship("Estimate", back_populates="line_items")
