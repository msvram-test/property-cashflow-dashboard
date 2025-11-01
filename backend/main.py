import os
import sys
from fastapi import FastAPI
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend module discoverability
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_USERNAME = os.getenv("MONGODB_USERNAME")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
MONGODB_API_VERSION = os.getenv("MONGODB_API_VERSION")

# Clean up MONGODB_URI - strip quotes and whitespace if present
if MONGODB_URI:
    MONGODB_URI = MONGODB_URI.strip().strip('"').strip("'")

app = FastAPI(title="Property CashFlow Dashboard API", version="1.0.0")

# Enable CORS for local frontend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",  # In case Next.js uses a different port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MongoDB client
try:
    if not MONGODB_URI:
        raise ValueError("MONGODB_URI environment variable is not set")
    
    # If URI contains credentials (has @ symbol after the scheme), use it directly
    # Otherwise, use username and password parameters
    if "@" in MONGODB_URI and (MONGODB_URI.startswith("mongodb://") or MONGODB_URI.startswith("mongodb+srv://")):
        # URI already contains credentials, don't pass username/password separately
        mongo_client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
    else:
        # URI doesn't contain credentials, use username/password parameters
        mongo_client = MongoClient(
            MONGODB_URI,
            username=MONGODB_USERNAME,
            password=MONGODB_PASSWORD,
            serverSelectionTimeoutMS=5000
        )
    mongo_client.server_info()
    db_connection_status = "connected"
except Exception as e:
    db_connection_status = f"connection_failed: {e}"

@app.get("/")
def root():
    return {
        "status": "running",
        "message": "Property CashFlow Dashboard Backend is live on Render",
        "routes": ["/", "/health"]
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "mongodb": db_connection_status,
        "service": "Property CashFlow Dashboard API"
    }

# Import and include authentication router
from routers import auth_router, property_router
app.include_router(auth_router.router)
app.include_router(property_router.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)