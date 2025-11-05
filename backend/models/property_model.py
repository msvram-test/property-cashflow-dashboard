from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from bson import ObjectId


class PropertyModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    owner_id: str = Field(...)
    name: str = Field(..., min_length=1, max_length=200)
    address: Dict[str, Any] = Field(
        ...,
        example={
            "street": "123 Main St",
            "city": "Los Angeles",
            "state": "CA",
            "zip": "90001"
        }
    )
    purchase_price: float = Field(..., ge=0, description="Purchase price must be greater than or equal to 0")
    current_value: Optional[float] = Field(default=None, ge=0, description="Current value must be greater than or equal to 0")
    rental_income: Optional[float] = Field(default=0, ge=0, description="Rental income must be greater than or equal to 0")
    expenses: Optional[float] = Field(default=0, ge=0, description="Expenses must be greater than or equal to 0")
    documents: Optional[List[Dict[str, Any]]] = Field(default=[], description="List of uploaded documents")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True  # Pydantic v2 equivalent of allow_population_by_field_name
        from_attributes = True  # Pydantic v2 equivalent of orm_mode
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "owner_id": "60c72b2f9b1d8b6d5c8d3a2e",
                "name": "Downtown Apartment",
                "address": {
                    "street": "456 Market St",
                    "city": "San Francisco",
                    "state": "CA",
                    "zip": "94105"
                },
                "purchase_price": 450000,
                "current_value": 560000,
                "rental_income": 2500,
                "expenses": 500
            }
        }


class PropertyCreate(BaseModel):
    """Model for creating a new property (owner_id is added by the backend)."""
    name: str = Field(..., min_length=1, max_length=200)
    address: Dict[str, Any] = Field(
        ...,
        example={
            "street": "123 Main St",
            "city": "Los Angeles",
            "state": "CA",
            "zip": "90001"
        }
    )
    purchase_price: float = Field(..., ge=0, description="Purchase price must be greater than or equal to 0")
    current_value: Optional[float] = Field(default=None, ge=0, description="Current value must be greater than or equal to 0")
    rental_income: Optional[float] = Field(default=0, ge=0, description="Rental income must be greater than or equal to 0")
    expenses: Optional[float] = Field(default=0, ge=0, description="Expenses must be greater than or equal to 0")


class UpdatePropertyModel(BaseModel):
    name: Optional[str]
    address: Optional[Dict[str, Any]]
    purchase_price: Optional[float] = Field(default=None, ge=0, description="Purchase price must be greater than or equal to 0")
    current_value: Optional[float] = Field(default=None, ge=0, description="Current value must be greater than or equal to 0")
    rental_income: Optional[float] = Field(default=None, ge=0, description="Rental income must be greater than or equal to 0")
    expenses: Optional[float] = Field(default=None, ge=0, description="Expenses must be greater than or equal to 0")
    updated_at: datetime = Field(default_factory=datetime.utcnow)