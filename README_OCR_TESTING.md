# OCR Endpoint Testing Guide

## Quick Start: Generate Test Document and Validate OCR

### Step 1: Install Required Dependencies

```bash
cd backend
pip install reportlab
```

### Step 2: Generate Test Document

```bash
cd backend
python generate_test_document.py
```

This will create `test_monthly_statement.pdf` in the backend directory with:
- Property information (name, address, ID)
- Financial summary (income, expenses, net cash flow)
- Structured data that OCR can extract

### Step 3: Test OCR Upload

#### Option A: Using the Frontend Dashboard

1. Start the backend server:
   ```bash
   cd backend
   python main.py
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open Dashboard (`http://localhost:3000/dashboard`)
4. Check "Use OCR (AWS Textract)" checkbox
5. Select a property
6. Upload the generated `test_monthly_statement.pdf`
7. Check browser console for detailed logs
8. Check the Documents page to see extracted data

#### Option B: Using the Test Script

1. Get your access token:
   - Log in through the frontend
   - Open browser console
   - Run: `localStorage.getItem('access_token')`
   - Copy the token

2. Get a property ID:
   - Go to Dashboard
   - Select a property
   - Copy the `_id` from the URL or browser console

3. Run the test script:
   ```bash
   ./test_ocr_upload.sh YOUR_TOKEN YOUR_PROPERTY_ID backend/test_monthly_statement.pdf
   ```

#### Option C: Using curl Directly

```bash
curl -X POST "http://localhost:8000/api/ocr/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "property_id=YOUR_PROPERTY_ID" \
  -F "document_type=monthly_statement" \
  -F "file=@backend/test_monthly_statement.pdf"
```

#### Option D: Using Python Script

```python
import requests
import os

# Configuration
API_URL = "http://localhost:8000"
TOKEN = "your_access_token_here"
PROPERTY_ID = "your_property_id_here"
DOCUMENT_PATH = "backend/test_monthly_statement.pdf"

# Prepare the request
url = f"{API_URL}/api/ocr/upload"
headers = {
    "Authorization": f"Bearer {TOKEN}"
}
files = {
    "file": open(DOCUMENT_PATH, "rb")
}
data = {
    "property_id": PROPERTY_ID,
    "document_type": "monthly_statement"
}

# Send request
response = requests.post(url, headers=headers, files=files, data=data)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")
```

## Expected Results

### Without AWS Credentials:
```json
{
  "message": "Document uploaded and processed successfully",
  "document": {
    "extracted_data": {
      "status": "aws_credentials_not_configured",
      "notes": "AWS Textract integration pending"
    }
  }
}
```

### With AWS Credentials (OCR Enabled):
```json
{
  "message": "Document uploaded and processed successfully",
  "document": {
    "extracted_data": {
      "Rental Income": "2500.00",
      "Maintenance": "150.00",
      "Insurance": "120.00",
      "Property Tax": "300.00",
      ...
    }
  }
}
```

## Test Document Contents

The generated test document includes:
- **Property Information**: Name, Address, Property ID
- **Financial Data**:
  - Rental Income: $2,500.00
  - Expenses: Maintenance, Insurance, Property Tax, etc.
  - Net Cash Flow: $1,725.00

## Verifying OCR Results

1. Upload the document with OCR enabled
2. Go to Documents page (`/documents`)
3. Check the extracted data section
4. Verify that key-value pairs from the document are extracted

## Troubleshooting

### 404 Error
- Make sure backend is running on port 8000
- Check that OCR router is registered in `main.py`
- Verify endpoint URL: `http://localhost:8000/api/ocr/upload`

### Authentication Error (401)
- Ensure you have a valid token
- Token might be expired (re-login)
- Check Authorization header format

### OCR Not Working
- Check AWS credentials are set:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (default: us-west-2)
- Verify boto3 is installed: `pip install boto3`
- Check backend logs for AWS errors

### File Upload Issues
- Ensure file size is reasonable (< 10MB recommended)
- Check file format is supported (PDF, JPG, PNG)
- Verify backend has write permissions for uploads directory

