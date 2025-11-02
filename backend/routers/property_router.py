from fastapi import APIRouter, HTTPException, status, Depends
from pymongo import MongoClient
from bson import ObjectId
from typing import List

from models.property_model import PropertyModel, PropertyCreate, UpdatePropertyModel
from utils.auth_utils import get_current_user
from datetime import datetime
import os

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
    
    update_data.updated_at = datetime.utcnow()
    result = properties_collection.find_one_and_update(
        {"_id": ObjectId(property_id), "owner_id": ObjectId(user_id)},
        {"$set": update_data.dict(exclude_unset=True)},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Property not found or access denied")
    updated_property = properties_collection.find_one({"_id": ObjectId(property_id)})
    # Convert ObjectId to string
    prop_dict = dict(updated_property)
    prop_dict["_id"] = str(prop_dict["_id"])
    prop_dict["owner_id"] = str(prop_dict["owner_id"])
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