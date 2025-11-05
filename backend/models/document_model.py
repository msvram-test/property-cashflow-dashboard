from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class DocumentModel(BaseModel):
    """Model for property documents."""
    id: Optional[str] = Field(default=None, alias="_id")
    property_id: str = Field(...)
    document_type: str = Field(...)  # property_document, monthly_statement, property_insurance, property_tax, mortgage_statement
    filename: str = Field(...)
    file_path: Optional[str] = Field(default=None)
    file_size: Optional[int] = Field(default=None)
    content_type: Optional[str] = Field(default=None)
    extracted_data: Optional[Dict[str, Any]] = Field(default=None, description="Extracted data from document")
    average_confidence: Optional[float] = Field(default=None, description="Average OCR confidence score for document")
    confidence_scores: Optional[list[float]] = Field(default=None, description="List of OCR block confidence values")
    analytics_summary: Optional[Dict[str, Any]] = Field(default=None, description="Computed analytics summary and insights for this document")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        from_attributes = True

