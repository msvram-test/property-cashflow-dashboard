# Quick Start: Test OCR Endpoint

## Method 1: Generate PDF with Python (Recommended)

### Install fpdf2 (lightweight):
```bash
cd backend
pip install fpdf2
python simple_test_document.py
```

This creates `test_monthly_statement.pdf` in the backend directory.

## Method 2: Use the Text File (Convert to PDF)

1. Open `backend/test_monthly_statement.txt`
2. Print it to PDF (Ctrl+P or Cmd+P, then Save as PDF)
3. Save it as `test_monthly_statement.pdf`

## Method 3: Use Any Existing PDF

You can use any PDF document you have - the OCR will attempt to extract text from it.

## Test Upload via Frontend

1. **Start Backend:**
   ```bash
   cd backend
   python main.py
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Upload Document:**
   - Go to `http://localhost:3000/dashboard`
   - Check "Use OCR (AWS Textract)" checkbox
   - Select a property
   - Upload `backend/test_monthly_statement.pdf`
   - Check browser console for logs

4. **Verify Results:**
   - Go to Documents page (`/documents`)
   - Check extracted data section

## Test Upload via curl

```bash
# Get your token from browser: localStorage.getItem('access_token')
# Get property ID from dashboard

curl -X POST "http://localhost:8000/api/ocr/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "property_id=YOUR_PROPERTY_ID" \
  -F "document_type=monthly_statement" \
  -F "file=@backend/test_monthly_statement.pdf"
```

## What to Expect

### Without AWS Credentials:
- Document uploads successfully
- Shows message: "AWS Textract credentials not configured"
- Document is stored but no OCR extraction occurs

### With AWS Credentials:
- Document uploads successfully
- AWS Textract processes the document
- Extracted key-value pairs appear in the response
- Data is stored in the property's documents array

## Test Document Contains:
- Property Name: Test Property 123
- Address: 123 Main Street, San Francisco, CA 94105
- Rental Income: $2,500.00
- Various expenses
- Net Cash Flow: $1,725.00

These fields should be extractable by OCR when AWS credentials are configured.

