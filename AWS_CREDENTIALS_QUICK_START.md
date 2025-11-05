# AWS Credentials Quick Start

## Step-by-Step Guide

### 1. Create AWS Account (if needed)
- Go to https://aws.amazon.com/free/
- Sign up (free tier includes 1,000 Textract pages/month)

### 2. Create IAM User

1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Name: `property-ocr-user`
4. Click "Next"

### 3. Attach Permissions

1. Select "Attach policies directly"
2. Search: `AmazonTextractFullAccess`
3. Check the box
4. Click "Create user"

### 4. Create Access Keys

1. Click on the user
2. Go to "Security credentials" tab
3. Click "Create access key"
4. Select "Application running outside AWS"
5. Copy BOTH values:
   - **Access key ID**
   - **Secret access key** (shown only once!)

### 5. Add to Backend .env File

Create `backend/.env` file:

```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Replace with your actual keys!

### 6. Test Credentials

```bash
cd backend
python3 test_aws_credentials.py
```

### 7. Restart Backend

```bash
cd backend
python main.py
```

### 8. Test OCR Upload

- Go to Dashboard
- Check "Use OCR" checkbox
- Upload a document
- Should now process with AWS Textract!

## For Production (Render)

Add these as Environment Variables in Render dashboard:
- `AWS_REGION` = `us-west-2`
- `AWS_ACCESS_KEY_ID` = (your key)
- `AWS_SECRET_ACCESS_KEY` = (your secret)

## Cost

- **FREE**: First 1,000 pages/month
- **After**: $1.50 per 1,000 pages
- Very affordable!

## Full Guide

See `AWS_SETUP_GUIDE.md` for detailed instructions.

