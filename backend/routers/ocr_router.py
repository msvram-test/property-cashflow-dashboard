from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from typing import Dict, Any, Optional, Tuple
import os
from bson import ObjectId
from datetime import datetime
from models.document_model import DocumentModel
from utils.auth_utils import get_current_user

router = APIRouter(tags=["OCR"])

# Import shared MongoDB client from main.py
from main import mongo_client
DB_NAME = os.getenv("DB_NAME", "property_management")
db = mongo_client[DB_NAME]

AWS_REGION = os.getenv("AWS_REGION", "us-west-2")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# Lazy import boto3 to avoid import errors if not installed or incompatible
textract_client: Optional[Any] = None

def get_textract_client():
    """Lazy initialization of Textract client."""
    global textract_client
    if textract_client is not None:
        return textract_client
    
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        return None
    
    try:
        import boto3
        textract_client = boto3.client(
            "textract",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
        return textract_client
    except ImportError:
        print("Warning: boto3 is not installed. AWS Textract functionality will not be available.")
        return None
    except Exception as e:
        print(f"Warning: Failed to initialize AWS Textract client: {e}")
        return None


def extract_numeric_value(value_str: str) -> Optional[float]:
    """Extract numeric value from string, handling currency formatting."""
    if not value_str or not isinstance(value_str, str):
        return None
    
    try:
        # Remove currency symbols, commas, and whitespace
        cleaned = value_str.replace("$", "").replace(",", "").replace(" ", "").strip()
        # Handle negative values (e.g., "-$150.00" or "-$ 150.00")
        is_negative = cleaned.startswith("-")
        if is_negative:
            cleaned = cleaned[1:]
        
        # Extract just the numeric part (before any text)
        import re
        match = re.search(r'(\d+\.?\d*)', cleaned)
        if match:
            value = float(match.group(1))
            return -value if is_negative else value
        return None
    except (ValueError, AttributeError):
        return None


def parse_fields_from_raw_text(raw_text: str) -> Dict[str, Any]:
    """Parse structured fields from raw OCR text.
    
    Looks for common patterns like "Label: Value" or "Label\nValue"
    and extracts financial data like income, expenses, cash flow.
    """
    if not raw_text:
        return {}
    
    import re
    fields = {}
    lines = raw_text.split('\n')
    
    # Common field patterns we want to extract
    field_patterns = {
        # Income-related
        r'rental\s+income[:\s]*\$?([\d,]+\.?\d*)': 'Rental Income',
        r'total\s+income[:\s]*\$?([\d,]+\.?\d*)': 'Total Income',
        r'income[:\s]*\$?([\d,]+\.?\d*)': 'Income',
        
        # Expense-related
        r'total\s+expenses?[:\s]*-?\$?([\d,]+\.?\d*)': 'Total Expenses',
        r'expenses?[:\s]*-?\$?([\d,]+\.?\d*)': 'Expenses',
        
        # Cash flow
        r'net\s+cash\s+flow[:\s]*\$?([\d,]+\.?\d*)': 'Net Cash Flow',
        r'cash\s+flow[:\s]*\$?([\d,]+\.?\d*)': 'Cash Flow',
        
        # Individual expenses (to sum up)
        r'maintenance[:\s]*-?\$?([\d,]+\.?\d*)': 'Maintenance',
        r'insurance[:\s]*-?\$?([\d,]+\.?\d*)': 'Insurance',
        r'property\s+tax[:\s]*-?\$?([\d,]+\.?\d*)': 'Property Tax',
        r'utilities?[:\s]*-?\$?([\d,]+\.?\d*)': 'Utilities',
        r'property\s+management[:\s]*-?\$?([\d,]+\.?\d*)': 'Property Management',
        r'management[:\s]*-?\$?([\d,]+\.?\d*)': 'Management',
        r'roof\s+repair[:\s]*-?\$?([\d,]+\.?\d*)': 'Roof Repair',
        r'plumbing\s+repair[:\s]*-?\$?([\d,]+\.?\d*)': 'Plumbing Repair',
        r'hvac\s+service[:\s]*-?\$?([\d,]+\.?\d*)': 'HVAC Service',
        r'repair[:\s]*-?\$?([\d,]+\.?\d*)': 'Repair',
        r'service[:\s]*-?\$?([\d,]+\.?\d*)': 'Service',
    }
    
    # Combine all lines into one string for pattern matching
    text_lower = raw_text.lower()
    
    # Try pattern matching first
    for pattern, field_name in field_patterns.items():
        matches = re.finditer(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            value_str = match.group(1)
            if value_str:
                numeric_value = extract_numeric_value(value_str)
                if numeric_value is not None:
                    # Store both formatted string and raw value for compatibility
                    display_name = field_name
                    # Store as formatted string that can be parsed later
                    fields[display_name] = f"${abs(numeric_value):,.2f}" if numeric_value < 0 else f"${numeric_value:,.2f}"
    
    # Also try line-by-line parsing for "Label: Value" patterns
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Pattern: "Label: Value" or "Label Value"
        if ':' in line:
            parts = line.split(':', 1)
            if len(parts) == 2:
                label = parts[0].strip()
                value = parts[1].strip()
                # Check if value looks like a currency amount
                if re.search(r'\$?[\d,]+\.[\d]{2}', value):
                    fields[label] = value
        else:
            # Check if this line is a label and next line is a value
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                # If next line looks like currency, treat this as a label
                if re.search(r'^-?\$?[\d,]+\.[\d]{2}', next_line):
                    fields[line] = next_line
    
    return fields


def extract_statement_date(raw_text: str, extracted_fields: Dict[str, Any]) -> Optional[str]:
    """Extract statement date from raw text or extracted fields.
    
    Looks for patterns like "Statement Date: January 31, 2025"
    """
    import re
    from datetime import datetime
    
    try:
        # First check extracted fields for date
        if extracted_fields and isinstance(extracted_fields, dict):
            for key, value in extracted_fields.items():
                if not key or not value:
                    continue
                try:
                    key_lower = str(key).lower()
                    if 'statement' in key_lower and 'date' in key_lower:
                        return str(value)
                    elif key_lower == 'date' or 'statement date' in key_lower:
                        return str(value)
                except Exception:
                    continue
        
        # Search in raw text
        if raw_text and isinstance(raw_text, str):
            # Pattern: "Statement Date: January 31, 2025" or "Statement Date January 31, 2025"
            patterns = [
                r'statement\s+date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})',
                r'statement\s+date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})',
                r'date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            ]
            
            for pattern in patterns:
                try:
                    match = re.search(pattern, raw_text, re.IGNORECASE)
                    if match:
                        date_str = match.group(1).strip()
                        # Try to parse and normalize the date
                        try:
                            # Try common date formats
                            for fmt in ['%B %d, %Y', '%B %d %Y', '%m/%d/%Y', '%m-%d-%Y', '%d/%m/%Y']:
                                try:
                                    parsed_date = datetime.strptime(date_str, fmt)
                                    return parsed_date.strftime('%Y-%m-%d')
                                except ValueError:
                                    continue
                            # If parsing fails, return as-is
                            return date_str
                        except Exception:
                            return date_str
                except Exception:
                    continue
    except Exception as e:
        print(f"[OCR] Error in extract_statement_date: {e}")
    
    return None


def aggregate_property_totals_from_all_documents(collection, property_id: str) -> Tuple[float, float]:
    """Aggregate rental_income and expenses from ALL documents for a property.
    
    Returns:
        tuple: (total_income, total_expenses) aggregated from all documents
    """
    try:
        prop = collection.find_one({"_id": ObjectId(property_id)})
        if not prop:
            print(f"[Aggregate] Property {property_id} not found")
            return (0.0, 0.0)
        
        documents = prop.get("documents", []) or []
        if not documents:
            return (0.0, 0.0)
        
        total_income = 0.0
        total_expenses = 0.0
        
        income_keywords = [
            "rental income", "total income", "income", "revenue", "rental revenue",
            "monthly income", "rental", "rent", "gross income"
        ]
        
        # Individual expense keywords - always sum these up
        individual_expense_keywords = [
            "maintenance", "insurance", "property tax", "utilities", "management",
            "roof repair", "plumbing repair", "hvac service", "repair", "service",
            "tax", "property management", "cleaning", "lawn", "snow", "trash",
            "water", "electric", "gas", "sewer", "advertising", "legal", "accounting"
        ]
        
        # Process ALL documents (not just monthly statements)
        for doc in documents:
            extracted_data = doc.get("extracted_data", {})
            extracted_fields = extracted_data.get("extracted_fields", {})
            
            if not extracted_fields:
                continue
            
            print(f"[Aggregate] Processing document: {doc.get('filename', 'unknown')}")
            print(f"[Aggregate] Extracted fields: {list(extracted_fields.keys())}")
            
            doc_income = 0.0
            doc_expenses = 0.0
            processed_expense_details = []  # Track (value, keyword) pairs to detect related duplicates
            
            # Extract income from this document
            for key, value in extracted_fields.items():
                key_lower = str(key).lower().strip()
                value_str = str(value).strip() if value else ""
                
                # Skip "Total Expenses" field when checking for individual expenses
                if "total" in key_lower and ("expenses" in key_lower or "expense" in key_lower):
                    continue
                
                if any(kw in key_lower for kw in income_keywords):
                    parsed = extract_numeric_value(value_str)
                    if parsed is not None and parsed > 0:
                        # Prefer "total" or "rental" income
                        if "total" in key_lower or "rental" in key_lower:
                            if doc_income == 0 or "total" in key_lower:
                                doc_income = parsed
                        elif doc_income == 0:
                            doc_income = parsed
                
                # Sum individual expense items - check if key matches any expense keyword
                # Prioritize more specific keywords first (longer keywords first)
                matched_keyword = None
                matched_keyword_length = 0
                for ind_kw in individual_expense_keywords:
                    if ind_kw in key_lower and len(ind_kw) > matched_keyword_length:
                        matched_keyword = ind_kw
                        matched_keyword_length = len(ind_kw)
                
                if matched_keyword:
                    parsed = extract_numeric_value(value_str)
                    if parsed is not None:
                        abs_value = abs(parsed)
                        # Check if we've already processed this exact value with a related keyword
                        # This prevents double-counting when "Property Management" and "Management" both match with same value
                        is_duplicate = False
                        for processed_value, processed_keyword in processed_expense_details:
                            if abs_value == processed_value:
                                # Check if keywords are related (one contains the other)
                                if (matched_keyword in processed_keyword or processed_keyword in matched_keyword):
                                    is_duplicate = True
                                    print(f"[Aggregate] Skipping duplicate expense '{key}' (keyword: '{matched_keyword}') = ${abs_value:.2f} (already counted as '{processed_keyword}')")
                                    break
                        
                        if not is_duplicate:
                            processed_expense_details.append((abs_value, matched_keyword))
                            doc_expenses += abs_value
                            print(f"[Aggregate] Matched expense '{key}' (keyword: '{matched_keyword}') = ${abs_value:.2f}, doc total: ${doc_expenses:.2f}")
            
            # If no individual expenses found, try "Total Expenses" field
            if doc_expenses == 0:
                for key, value in extracted_fields.items():
                    key_lower = str(key).lower().strip()
                    value_str = str(value).strip() if value else ""
                    
                    if "total" in key_lower and ("expenses" in key_lower or "expense" in key_lower):
                        parsed = extract_numeric_value(value_str)
                        if parsed is not None:
                            doc_expenses = abs(parsed)
                            break
            
            # Add this document's values to totals
            total_income += doc_income
            total_expenses += doc_expenses
            
            if doc_income > 0 or doc_expenses > 0:
                print(f"[Aggregate] Document {doc.get('filename', 'unknown')}: income=${doc_income:.2f}, expenses=${doc_expenses:.2f}")
        
        print(f"[Aggregate] Property {property_id} totals: income=${total_income:.2f}, expenses=${total_expenses:.2f}")
        return (total_income, total_expenses)
        
    except Exception as e:
        print(f"[Aggregate] Error aggregating property {property_id} totals: {e}")
        return (0.0, 0.0)


def update_property_from_extracted_data(collection, property_id: str, document_type: str, extracted_data: dict):
    """Update property fields based on extracted document data for cash flow calculations.
    
    Intelligently maps Textract-extracted fields to property rental_income and expenses.
    """
    extracted_fields = extracted_data.get("extracted_fields", {})
    print(f"[OCR Update] Starting update for property {property_id}")
    print(f"[OCR Update] Extracted fields count: {len(extracted_fields)}")
    print(f"[OCR Update] Extracted fields: {extracted_fields}")
    
    if not extracted_fields:
        print(f"[OCR Update] No extracted fields found, skipping update")
        return
    
    update_fields = {}
    
    # Field name mappings - map common Textract field names to property fields
    income_keywords = [
        "rental income", "total income", "income", "revenue", "rental revenue",
        "monthly income", "rental", "rent", "gross income"
    ]
    expense_keywords = [
        "total expenses", "expenses", "total expense", "expense", "costs"
    ]
    
    # Individual expense keywords - always sum these up
    individual_expense_keywords = [
        "maintenance", "insurance", "property tax", "utilities", "management",
        "roof repair", "plumbing repair", "hvac service", "repair", "service",
        "tax", "property management", "cleaning", "lawn", "snow", "trash",
        "water", "electric", "gas", "sewer", "advertising", "legal", "accounting"
    ]
    
    # Find income and expense values
    income_value = None
    expense_value = None
    net_cash_flow = None
    
    # Process all fields
    for key, value in extracted_fields.items():
        key_lower = str(key).lower().strip()
        value_str = str(value).strip() if value else ""
        
        # Check for income-related fields
        if any(keyword in key_lower for keyword in income_keywords):
            parsed = extract_numeric_value(value_str)
            if parsed is not None and parsed > 0:
                # Prefer "total income" or "rental income" over generic "income"
                if "total" in key_lower or "rental" in key_lower:
                    if income_value is None or "total" in key_lower:
                        income_value = parsed
                elif income_value is None:
                    income_value = parsed
        
        # Always sum individual expense items (ignore "Total Expenses" field)
        elif any(ind_keyword in key_lower for ind_keyword in individual_expense_keywords):
            parsed = extract_numeric_value(value_str)
            if parsed is not None:
                # Initialize expense_value if needed
                if expense_value is None:
                    expense_value = 0
                # Add the absolute value (expenses are often negative in statements)
                abs_value = abs(parsed)
                expense_value += abs_value
                print(f"[OCR Update] Adding individual expense: {key_lower} = ${abs_value:,.2f} (total so far: ${expense_value:,.2f})")
        
        # Check for net cash flow
        elif "net" in key_lower and ("cash flow" in key_lower or "flow" in key_lower):
            parsed = extract_numeric_value(value_str)
            if parsed is not None:
                net_cash_flow = parsed
    
    # If no individual expenses were found, fall back to "Total Expenses" field
    if expense_value is None:
        for key, value in extracted_fields.items():
            key_lower = str(key).lower().strip()
            value_str = str(value).strip() if value else ""
            
            if "total" in key_lower and ("expenses" in key_lower or "expense" in key_lower):
                parsed = extract_numeric_value(value_str)
                if parsed is not None:
                    expense_value = abs(parsed)
                    print(f"[OCR Update] Using Total Expenses field: ${expense_value:,.2f}")
                    break
    
    if expense_value is not None:
        print(f"[OCR Update] Final calculated expenses: ${expense_value:,.2f}")
    
    # If we found net cash flow and it's positive, try to infer income
    # net_cash_flow = income - expenses, so income = net_cash_flow + expenses
    if net_cash_flow is not None and net_cash_flow > 0:
        if income_value is None and expense_value:
            # Estimate income from cash flow and expenses
            income_value = net_cash_flow + expense_value
        elif expense_value is None and income_value:
            # Calculate expenses from income and cash flow
            expense_value = income_value - net_cash_flow
    
    # Aggregate totals from ALL documents (not just this one)
    total_income, total_expenses = aggregate_property_totals_from_all_documents(collection, property_id)
    
    # Update property with aggregated totals from all documents
    update_fields = {
        "rental_income": total_income if total_income > 0 else 0,
        "expenses": total_expenses if total_expenses > 0 else 0,
        "updated_at": datetime.utcnow()
    }
    
    # Apply updates
    result = collection.update_one(
        {"_id": ObjectId(property_id)},
        {"$set": update_fields}
    )
    
    if result.modified_count > 0:
        print(f"✅ Successfully updated property {property_id} with aggregated totals: {update_fields}")
        # Verify the update
        updated_prop = collection.find_one({"_id": ObjectId(property_id)})
        if updated_prop:
            print(f"[OCR Update] Verified - rental_income: {updated_prop.get('rental_income')}, expenses: {updated_prop.get('expenses')}")
    else:
        print(f"⚠️ Update query ran but no document was modified for property {property_id}")
    
    if total_income == 0 and total_expenses == 0:
        print(f"ℹ️ No cash flow fields extracted from any documents for property {property_id}")
        print(f"[OCR Update] Current document - income_value: {income_value}, expense_value: {expense_value}, net_cash_flow: {net_cash_flow}")

@router.post("/upload", response_model=dict)
async def upload_document(
    property_id: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Handle PDF upload and initiate OCR using AWS Textract."""
    try:
        # Resolve user ObjectId
        user_id = current_user.get("_id")
        if not user_id and current_user.get("email"):
            users_collection = db["users"]
            user_doc = users_collection.find_one({"email": current_user["email"]})
            if user_doc:
                user_id = user_doc["_id"]
        
        if not user_id:
            raise HTTPException(status_code=403, detail="Invalid authentication payload")
        
        # Save the uploaded file to uploads directory (matching property_router structure)
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", property_id)
        os.makedirs(upload_dir, exist_ok=True)

        import uuid
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Perform OCR using AWS Textract (only if client is available)
        extracted_data = {"status": "uploaded"}
        client = get_textract_client()
        if client:
            try:
                # Read file content
                with open(file_path, "rb") as document:
                    file_bytes = document.read()
                
                # Validate file size (Textract has limits)
                if len(file_bytes) > 5000000:  # 5MB limit for AnalyzeDocument
                    raise ValueError("File size exceeds 5MB limit for Textract AnalyzeDocument. Please use a smaller file.")
                
                # Call AWS Textract
                response = client.analyze_document(
                    Document={"Bytes": file_bytes},
                    FeatureTypes=["FORMS", "TABLES"]  # Added TABLES for better extraction
                )

                # Process response
                extracted_data = {"status": "ocr_success"}
                extracted_fields = {}
                
                # Extract key-value pairs
                for block in response.get("Blocks", []):
                    if block["BlockType"] == "KEY_VALUE_SET" and "EntityTypes" in block:
                        key = value = None
                        for rel in block.get("Relationships", []):
                            if rel["Type"] == "VALUE":
                                value_block = next((b for b in response["Blocks"] if b["Id"] in rel["Ids"]), None)
                                if value_block and "Text" in value_block:
                                    value = value_block["Text"]
                        if "Text" in block:
                            key = block["Text"]
                        if key and value:
                            extracted_fields[key] = value
                
                # Also extract all text blocks for additional data
                all_text = []
                for block in response.get("Blocks", []):
                    if block["BlockType"] == "LINE" and "Text" in block:
                        all_text.append(block["Text"])
                
                raw_text_str = "\n".join(all_text) if all_text else ""
                
                # If Textract didn't find structured fields but we have raw text,
                # try to parse structured data from raw text
                if not extracted_fields and raw_text_str:
                    print(f"[OCR] No KEY_VALUE_SET blocks found, parsing raw text for structured fields")
                    parsed_fields = parse_fields_from_raw_text(raw_text_str)
                    if parsed_fields:
                        extracted_fields = parsed_fields
                        print(f"[OCR] Extracted {len(extracted_fields)} fields from raw text: {list(extracted_fields.keys())}")
                
                if extracted_fields:
                    extracted_data["extracted_fields"] = extracted_fields
                if raw_text_str:
                    extracted_data["raw_text"] = raw_text_str
                    
            except Exception as ocr_error:
                error_msg = str(ocr_error)
                error_type = type(ocr_error).__name__
                
                # Extract AWS error code from ClientError if present
                aws_error_code = None
                try:
                    # Try to import botocore to check for ClientError
                    from botocore.exceptions import ClientError
                    if isinstance(ocr_error, ClientError) and hasattr(ocr_error, "response"):
                        aws_error_code = ocr_error.response.get("Error", {}).get("Code", "")
                except ImportError:
                    pass
                
                # Fallback: check error message for subscription error
                if not aws_error_code and "SubscriptionRequiredException" in error_msg:
                    aws_error_code = "SubscriptionRequiredException"
                
                # Log detailed error for debugging
                print(f"OCR Error Type: {error_type}")
                print(f"OCR Error Message: {error_msg}")
                print(f"File Path: {file_path}")
                print(f"File Size: {len(content) if 'content' in locals() else 'unknown'} bytes")
                if aws_error_code:
                    print(f"AWS Error Code: {aws_error_code}")
                
                # Provide user-friendly error messages
                user_friendly_error = error_msg
                if "SubscriptionRequiredException" in error_msg or aws_error_code == "SubscriptionRequiredException":
                    user_friendly_error = "AWS Textract subscription required. Your AWS account needs to be enabled for Textract service. Please enable Textract in your AWS account or contact your administrator."
                elif "InvalidParameterException" in error_type or "InvalidParameter" in error_msg:
                    user_friendly_error = "Invalid file format. Textract supports PDF, PNG, JPEG, and TIFF files."
                elif "InvalidS3ObjectException" in error_type:
                    user_friendly_error = "File access error. Please try uploading again."
                elif "ProvisionedThroughputExceededException" in error_type:
                    user_friendly_error = "AWS Textract service is temporarily unavailable. Please try again in a few moments."
                elif "ThrottlingException" in error_type:
                    user_friendly_error = "Too many requests. Please wait a moment and try again."
                elif "LimitExceededException" in error_type:
                    user_friendly_error = "AWS Textract limit exceeded. Please check your AWS account limits."
                elif "AccessDeniedException" in error_type or "UnauthorizedOperation" in error_msg:
                    user_friendly_error = "AWS access denied. Please check your IAM user has Textract permissions."
                elif "5MB" in error_msg or "size" in error_msg.lower():
                    user_friendly_error = error_msg
                
                extracted_data = {
                    "status": "ocr_failed",
                    "error": user_friendly_error,
                    "error_type": error_type,
                    "technical_details": error_msg
                }
        else:
            extracted_data = {"status": "aws_credentials_not_configured", "notes": "AWS Textract integration pending"}

        # Create document data structure matching property_router format
        import uuid as uuid_module
        now = datetime.utcnow()
        
        # Extract statement date from raw text or extracted fields (with error handling)
        statement_date = None
        try:
            raw_text_for_date = extracted_data.get("raw_text", "") if extracted_data else ""
            extracted_fields_for_date = extracted_data.get("extracted_fields", {}) if extracted_data else {}
            if raw_text_for_date or extracted_fields_for_date:
                statement_date = extract_statement_date(raw_text_for_date, extracted_fields_for_date)
        except Exception as date_error:
            print(f"[OCR] Warning: Failed to extract statement date: {date_error}")
            statement_date = None
        
        document_data = {
            "_id": str(uuid_module.uuid4()),
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
        
        # Only add statement_date if it was found
        if statement_date:
            document_data["statement_date"] = statement_date

        # Update property with document (matching property_router pattern)
        properties_collection = db["properties"]
        prop = properties_collection.find_one({"_id": ObjectId(property_id)})
        if prop:
            documents = prop.get("documents", []) or []
            documents.append(document_data)
            properties_collection.update_one(
                {"_id": ObjectId(property_id)},
                {
                    "$set": {
                        "documents": documents,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Update property fields from extracted data for cash flow calculations
            if extracted_data.get("status") == "ocr_success" and extracted_data.get("extracted_fields"):
                print(f"[OCR] Updating property {property_id} from extracted data")
                print(f"[OCR] Extracted fields: {extracted_data.get('extracted_fields')}")
                print(f"[OCR] Document type: {document_type}")
                update_property_from_extracted_data(properties_collection, property_id, document_type, extracted_data)
            else:
                print(f"[OCR] Skipping property update - status: {extracted_data.get('status')}, has_fields: {bool(extracted_data.get('extracted_fields'))}")

        return {
            "message": "Document uploaded and processed successfully",
            "document": document_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status", response_model=dict)
def get_ocr_status(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get OCR service status and configuration."""
    client = get_textract_client()
    
    status_info = {
        "ocr_enabled": client is not None,
        "region": AWS_REGION,
        "credentials_configured": bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY),
        "access_key_set": bool(AWS_ACCESS_KEY_ID),
        "secret_key_set": bool(AWS_SECRET_ACCESS_KEY),
    }
    
    if client:
        status_info["status"] = "ready"
        status_info["message"] = "OCR service is ready to process documents"
    elif AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        status_info["status"] = "error"
        status_info["message"] = "Credentials are set but client initialization failed. Check backend logs."
    else:
        status_info["status"] = "not_configured"
        status_info["message"] = "AWS credentials not configured. See AWS_SETUP_GUIDE.md for instructions."
    
    return status_info

@router.get("/parsed/{document_id}")
async def get_parsed_document(document_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetch parsed document data by document_id."""
    document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": current_user["_id"]})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentModel(**document)


@router.put("/update/{document_id}")
async def update_extracted_data(document_id: str, update_fields: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    """Allow user to modify extracted OCR data manually."""
    document = db.documents.find_one({"_id": ObjectId(document_id), "user_id": current_user["_id"]})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    db.documents.update_one(
        {"_id": ObjectId(document_id), "user_id": current_user["_id"]},
        {"$set": {"extracted_data": update_fields, "updated_at": datetime.utcnow()}}
    )

    updated_doc = db.documents.find_one({"_id": ObjectId(document_id)})
    return DocumentModel(**updated_doc)