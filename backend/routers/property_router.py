from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from pymongo import MongoClient
from bson import ObjectId
from typing import List
import uuid
import os

from models.property_model import PropertyModel, PropertyCreate, UpdatePropertyModel
from models.document_model import DocumentModel
from utils.auth_utils import get_current_user
from datetime import datetime

router = APIRouter(tags=["Properties"])

from main import mongo_client

DB_NAME = os.getenv("DB_NAME", "property_management")
db = mongo_client[DB_NAME]
properties_collection = db["properties"]


@router.post("/", response_model=PropertyModel, status_code=status.HTTP_201_CREATED)
def create_property(property_data: PropertyCreate, current_user: dict = Depends(get_current_user)):
    # Resolve user ObjectId
    user_id = current_user.get("_id")
    if not user_id and current_user.get("email"):
        users_collection = db["users"]
        user_doc = users_collection.find_one({"email": current_user["email"]})
        if user_doc:
            user_id = user_doc["_id"]

    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid authentication payload")

    property_dict = property_data.dict(by_alias=True)
    property_dict["owner_id"] = ObjectId(user_id)
    property_dict["documents"] = []  # Initialize empty documents array
    property_dict["created_at"] = datetime.utcnow()
    property_dict["updated_at"] = datetime.utcnow()
    result = properties_collection.insert_one(property_dict)
    created_property = properties_collection.find_one({"_id": result.inserted_id})
    # Convert ObjectId to string
    prop_dict = dict(created_property)
    prop_dict["_id"] = str(prop_dict["_id"])
    prop_dict["owner_id"] = str(prop_dict["owner_id"])
    return PropertyModel(**prop_dict)


@router.get("/", response_model=List[PropertyModel])
def get_properties(current_user: dict = Depends(get_current_user)):
    # Resolve user ObjectId
    user_id = current_user.get("_id")
    if not user_id and current_user.get("email"):
        users_collection = db["users"]
        user_doc = users_collection.find_one({"email": current_user["email"]})
        if user_doc:
            user_id = user_doc["_id"]

    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid authentication payload")

    properties = list(properties_collection.find({"owner_id": ObjectId(user_id)}))
    # Convert ObjectId to string for each property document
    result = []
    for prop in properties:
        prop_dict = dict(prop)
        # Convert ObjectId fields to strings
        prop_dict["_id"] = str(prop_dict["_id"])
        prop_dict["owner_id"] = str(prop_dict["owner_id"])
        
        # Ensure rental_income and expenses have default values if missing or None
        if "rental_income" not in prop_dict or prop_dict["rental_income"] is None:
            prop_dict["rental_income"] = 0
        if "expenses" not in prop_dict or prop_dict["expenses"] is None:
            prop_dict["expenses"] = 0
        
        # Ensure they are floats (not strings)
        try:
            prop_dict["rental_income"] = float(prop_dict["rental_income"])
            prop_dict["expenses"] = float(prop_dict["expenses"])
        except (ValueError, TypeError):
            prop_dict["rental_income"] = 0
            prop_dict["expenses"] = 0
        
        result.append(PropertyModel(**prop_dict))
    return result


@router.get("/{property_id}", response_model=PropertyModel)
def get_property(property_id: str, current_user: dict = Depends(get_current_user)):
    # Resolve user ObjectId
    user_id = current_user.get("_id")
    if not user_id and current_user.get("email"):
        users_collection = db["users"]
        user_doc = users_collection.find_one({"email": current_user["email"]})
        if user_doc:
            user_id = user_doc["_id"]
    
    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid authentication payload")
    
    prop = properties_collection.find_one({"_id": ObjectId(property_id), "owner_id": ObjectId(user_id)})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    # Convert ObjectId to string
    prop_dict = dict(prop)
    prop_dict["_id"] = str(prop_dict["_id"])
    prop_dict["owner_id"] = str(prop_dict["owner_id"])
    return PropertyModel(**prop_dict)


@router.patch("/{property_id}", response_model=PropertyModel)
def update_property(property_id: str, update_data: UpdatePropertyModel, current_user: dict = Depends(get_current_user)):
    # Resolve user ObjectId
    user_id = current_user.get("_id")
    if not user_id and current_user.get("email"):
        users_collection = db["users"]
        user_doc = users_collection.find_one({"email": current_user["email"]})
        if user_doc:
            user_id = user_doc["_id"]
    
    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid authentication payload")
    
    # Ensure updated_at is always set to current time
    update_dict = update_data.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow()
    
    print(f"[Update Property] Updating property {property_id} with fields: {list(update_dict.keys())}")
    print(f"[Update Property] Update data: {update_dict}")
    
    # Use update_one to ensure the update is committed, then fetch the updated document
    result = properties_collection.update_one(
        {"_id": ObjectId(property_id), "owner_id": ObjectId(user_id)},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found or access denied")
    
    if result.modified_count == 0:
        print(f"[Update Property] Warning: Property {property_id} was found but no fields were modified")
    else:
        print(f"[Update Property] Successfully updated property {property_id}. Modified count: {result.modified_count}")
    
    # Fetch the updated property from database
    updated_property = properties_collection.find_one({"_id": ObjectId(property_id)})
    if not updated_property:
        raise HTTPException(status_code=404, detail="Property not found after update")
    
    # Convert ObjectId to string
    prop_dict = dict(updated_property)
    prop_dict["_id"] = str(prop_dict["_id"])
    prop_dict["owner_id"] = str(prop_dict["owner_id"])
    
    print(f"[Update Property] Property {property_id} updated_at: {prop_dict.get('updated_at')}")
    
    return PropertyModel(**prop_dict)


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(property_id: str, current_user: dict = Depends(get_current_user)):
    # Resolve user ObjectId
    user_id = current_user.get("_id")
    if not user_id and current_user.get("email"):
        users_collection = db["users"]
        user_doc = users_collection.find_one({"email": current_user["email"]})
        if user_doc:
            user_id = user_doc["_id"]
    
    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid authentication payload")
    
    result = properties_collection.delete_one({"_id": ObjectId(property_id), "owner_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found or access denied")
    return {"message": "Property deleted successfully"}


@router.post("/{property_id}/documents", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_document(
    property_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document for a property and extract relevant data."""
    # Resolve user ObjectId
    user_id = current_user.get("_id")
    if not user_id and current_user.get("email"):
        users_collection = db["users"]
        user_doc = users_collection.find_one({"email": current_user["email"]})
        if user_doc:
            user_id = user_doc["_id"]
    
    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid authentication payload")
    
    # Verify property exists and belongs to user
    prop = properties_collection.find_one({"_id": ObjectId(property_id), "owner_id": ObjectId(user_id)})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Validate document type
    valid_types = ["property_document", "monthly_statement", "property_insurance", "property_tax", "mortgage_statement"]
    if document_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}")
    
    # Create uploads directory if it doesn't exist
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", property_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Extract data from document (basic implementation)
    # TODO: Integrate AWS Textract for better extraction
    extracted_data = extract_document_data(file_path, document_type, file.content_type)
    
    # Create document entry
    now = datetime.utcnow()
    document_data = {
        "_id": str(uuid.uuid4()),
        "property_id": property_id,
        "document_type": document_type,
        "filename": file.filename or unique_filename,
        "file_path": file_path,
        "file_size": len(content),
        "content_type": file.content_type,
        "extracted_data": extracted_data,
        "uploaded_at": now,
        "updated_at": now
    }
    
    # Update property with document
    documents = prop.get("documents", []) or []
    documents.append(document_data)
    
    # Update property in database
    properties_collection.update_one(
        {"_id": ObjectId(property_id)},
        {
            "$set": {
                "documents": documents,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Update extracted data in property fields if applicable
    update_property_from_document(properties_collection, property_id, document_type, extracted_data)
    
    return {
        "message": "Document uploaded successfully",
        "document": document_data
    }


@router.delete("/{property_id}/documents/{document_id}", response_model=dict, status_code=status.HTTP_200_OK)
def delete_document(
    property_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document from a property, including the file and database entry."""
    # Resolve user ObjectId
    user_id = current_user.get("_id")
    if not user_id and current_user.get("email"):
        users_collection = db["users"]
        user_doc = users_collection.find_one({"email": current_user["email"]})
        if user_doc:
            user_id = user_doc["_id"]
    
    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid authentication payload")
    
    # Verify property exists and belongs to user
    prop = properties_collection.find_one({"_id": ObjectId(property_id), "owner_id": ObjectId(user_id)})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Find the document in the property's documents array
    documents = prop.get("documents", []) or []
    document_to_delete = None
    document_index = -1
    
    for index, doc in enumerate(documents):
        if doc.get("_id") == document_id:
            document_to_delete = doc
            document_index = index
            break
    
    if not document_to_delete:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete the file from file system
    file_path = document_to_delete.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            # Log error but continue with database deletion
            print(f"Warning: Failed to delete file {file_path}: {str(e)}")
    
    # Remove document from documents array
    documents.pop(document_index)
    
    # Update property in database
    properties_collection.update_one(
        {"_id": ObjectId(property_id)},
        {
            "$set": {
                "documents": documents,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Recalculate property totals from remaining documents
    # This ensures cashflow is updated correctly after deletion
    recalculate_property_totals_from_documents(properties_collection, property_id)
    
    return {
        "message": "Document deleted successfully",
        "document_id": document_id
    }


def extract_document_data(file_path: str, document_type: str, content_type: str) -> dict:
    """Extract relevant data from uploaded document."""
    # Basic implementation - just return metadata
    # TODO: Integrate AWS Textract for actual OCR/data extraction
    
    extracted_data = {
        "document_type": document_type,
        "content_type": content_type,
        "uploaded_at": datetime.utcnow().isoformat(),
        "status": "uploaded",
        "notes": "Data extraction pending - AWS Textract integration needed"
    }
    
    # Basic pattern matching for common document types
    if document_type == "monthly_statement":
        # Simulate extraction of rental income and expenses (mocked values)
        # In production, these will come from AWS Textract parsing
        extracted_data["extracted_fields"] = {
            "income": 2500.0,   # Example mock income
            "expenses": 750.0,  # Example mock expenses
            "date": datetime.utcnow().strftime("%Y-%m-%d")
        }
    elif document_type == "mortgage_statement":
        extracted_data["extracted_fields"] = {
            "principal": None,
            "interest": None,
            "escrow": None,
            "total_payment": None
        }
    elif document_type == "property_tax":
        extracted_data["extracted_fields"] = {
            "tax_amount": None,
            "assessment_value": None,
            "due_date": None
        }
    elif document_type == "property_insurance":
        extracted_data["extracted_fields"] = {
            "premium_amount": None,
            "coverage_amount": None,
            "policy_number": None,
            "expiration_date": None
        }
    
    return extracted_data


def recalculate_property_totals_from_documents(collection, property_id: str):
    """Recalculate property rental_income and expenses from all remaining documents.
    
    This function should be called after a document is deleted to update
    property totals based on remaining documents. It aggregates from ALL documents.
    """
    try:
        # Import the aggregation function from ocr_router
        try:
            from routers.ocr_router import aggregate_property_totals_from_all_documents
            total_income, total_expenses = aggregate_property_totals_from_all_documents(collection, property_id)
        except ImportError:
            # Fallback: if import fails, set to zero
            print(f"[Recalculate] Warning: Could not import aggregation function, resetting to zero")
            total_income = 0.0
            total_expenses = 0.0
        
        # Update property with recalculated totals
        update_fields = {
            "rental_income": total_income if total_income > 0 else 0,
            "expenses": total_expenses if total_expenses > 0 else 0,
            "updated_at": datetime.utcnow()
        }
        
        collection.update_one(
            {"_id": ObjectId(property_id)},
            {"$set": update_fields}
        )
        
        print(f"[Recalculate] Updated property {property_id}: rental_income={update_fields['rental_income']}, expenses={update_fields['expenses']}")
        
    except Exception as e:
        print(f"[Recalculate] Error recalculating property {property_id} totals: {e}")


def update_property_from_document(collection, property_id: str, document_type: str, extracted_data: dict):
    """Update property fields based on extracted document data."""
    # This function will be enhanced when AWS Textract is integrated
    # For now, it's a placeholder for future implementation
    
    update_fields = {}
    
    fields = extracted_data.get("extracted_fields", {})

    # Update rental income if available
    if document_type == "monthly_statement" and fields.get("income") is not None:
        update_fields["rental_income"] = float(fields["income"])

    # Update expenses if available
    if document_type == "monthly_statement" and fields.get("expenses") is not None:
        update_fields["expenses"] = float(fields["expenses"])
    
    if update_fields:
        update_fields["updated_at"] = datetime.utcnow()
        print(f"[DEBUG] Updating property {property_id} with fields: {update_fields}")
        try:
            from bson import ObjectId as BsonObjectId
            filter_id = BsonObjectId(property_id) if BsonObjectId.is_valid(property_id) else property_id
        except Exception:
            filter_id = property_id

        result = collection.update_one(
            {"_id": filter_id},
            {"$set": update_fields}
        )
        if result.modified_count == 0:
            print(f"[WARN] ⚠️ No property updated for ID: {property_id}, attempted filter: {filter_id}")
        else:
            print(f"[INFO] ✅ Property {property_id} updated with income={update_fields.get('rental_income')} and expenses={update_fields.get('expenses')}.")