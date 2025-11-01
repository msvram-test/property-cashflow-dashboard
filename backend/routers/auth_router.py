from fastapi import APIRouter, HTTPException, Depends, status, Header
from pymongo import MongoClient
from datetime import timedelta
from jose import JWTError
import os

from models.user_model import UserCreate, UserInDB, user_to_dict
from utils.auth_utils import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Database setup
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_USERNAME = os.getenv("MONGODB_USERNAME")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")

client = MongoClient(
    MONGODB_URI, username=MONGODB_USERNAME, password=MONGODB_PASSWORD, serverSelectionTimeoutMS=5000
)
db = client.get_default_database()
users_collection = db["users"]

@router.post("/register", response_model=dict)
def register(user: UserCreate):
    """Register a new user if not already exists."""
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = hash_password(user.password)
    new_user = UserInDB(email=user.email, hashed_password=hashed_pw)
    users_collection.insert_one(user_to_dict(new_user))
    return {"message": f"User {user.email} registered successfully!"}

@router.post("/login", response_model=dict)
def login(user: UserCreate):
    """Authenticate user and return JWT token."""
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=timedelta(minutes=60)
    )
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(authorization: str = Header(None)):
    """Decode JWT and return current user email."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return email

@router.get("/protected", response_model=dict)
def protected_route(current_user: str = Depends(get_current_user)):
    """Protected route requiring valid JWT."""
    return {"message": f"Access granted to {current_user}"}