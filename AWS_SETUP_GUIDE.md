# AWS Textract Setup Guide

## Overview
To enable OCR functionality, you need AWS credentials with Textract permissions. This guide walks you through the setup process.

## Step 1: Create an AWS Account (if you don't have one)

1. Go to [AWS Sign Up](https://aws.amazon.com/free/)
2. Create a new account (requires credit card, but free tier available)
3. Verify your email and complete registration

## Step 2: Create an IAM User for Textract

### 2.1 Navigate to IAM Console

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Search for "IAM" in the services search bar
3. Click on "IAM" (Identity and Access Management)

### 2.2 Create a New User

1. In the left sidebar, click **"Users"**
2. Click **"Create user"** button
3. Enter a username (e.g., `property-ocr-user`)
4. Click **"Next"**

### 2.3 Attach Permissions

1. Select **"Attach policies directly"**
2. Search for **"AmazonTextractFullAccess"**
3. Check the box next to `AmazonTextractFullAccess`
4. Click **"Next"**
5. Click **"Create user"**

### 2.4 Create Access Keys

1. Click on the newly created user
2. Go to the **"Security credentials"** tab
3. Scroll down to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Application running outside AWS"** (for local/server use)
6. Click **"Next"**
7. (Optional) Add description: "Property Management OCR"
8. Click **"Create access key"**
9. **IMPORTANT**: Copy both values:
   - **Access key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - **Secret access key** (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   - ⚠️ **You won't be able to see the secret key again!**

## Step 3: Configure Credentials in Your Backend

### Option A: Using .env File (Recommended for Local Development)

1. Create/update `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

2. Add the following to `.env`:

```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
```

3. **Important**: Add `.env` to `.gitignore` (already done):
   ```bash
   # backend/.gitignore should contain:
   *.env
   .env
   ```

### Option B: Environment Variables in Terminal

```bash
export AWS_REGION=us-west-2
export AWS_ACCESS_KEY_ID=your_access_key_id_here
export AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
```

### Option C: For Production (Render/Vercel)

#### Render (Backend):
1. Go to your Render dashboard
2. Select your service
3. Go to **"Environment"** section
4. Click **"Add Environment Variable"**
5. Add:
   - `AWS_REGION` = `us-west-2`
   - `AWS_ACCESS_KEY_ID` = `your_access_key_id`
   - `AWS_SECRET_ACCESS_KEY` = `your_secret_access_key`
6. Save and redeploy

#### Vercel (if needed):
1. Go to your Vercel project
2. Go to **Settings** → **Environment Variables**
3. Add the same variables
4. Redeploy

## Step 4: Verify Setup

### Test Locally:

1. Restart your backend server:
   ```bash
   cd backend
   python main.py
   ```

2. Check logs - you should NOT see warnings about missing credentials

3. Test OCR upload:
   - Go to Dashboard
   - Enable "Use OCR" checkbox
   - Upload a document
   - Check console for successful OCR processing

### Verify Credentials:

You can test if credentials work with this Python script:

```python
import boto3
import os
from dotenv import load_dotenv

load_dotenv()

try:
    client = boto3.client(
        'textract',
        region_name=os.getenv('AWS_REGION', 'us-west-2'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    print("✅ AWS Textract client initialized successfully!")
    print(f"✅ Region: {os.getenv('AWS_REGION', 'us-west-2')}")
except Exception as e:
    print(f"❌ Error: {e}")
```

## Step 5: AWS Textract Pricing & Free Tier

### Free Tier:
- **First 1,000 pages per month** are FREE
- Applies to AnalyzeDocument API
- No credit card charges until you exceed the free tier

### Pricing (after free tier):
- **AnalyzeDocument (Forms)**: $1.50 per 1,000 pages
- Very affordable for small to medium use

### Monitor Usage:
1. Go to [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home)
2. Filter by "Textract" service
3. Set up billing alerts if needed

## Security Best Practices

### ✅ DO:
- Use environment variables for credentials
- Add `.env` to `.gitignore`
- Use IAM user with minimal permissions (only Textract)
- Rotate access keys periodically
- Use different credentials for dev/staging/production

### ❌ DON'T:
- Commit credentials to Git
- Hardcode credentials in code
- Share credentials publicly
- Use root AWS account credentials
- Grant unnecessary permissions

## Troubleshooting

### "Credentials not found"
- Check `.env` file exists in `backend/` directory
- Verify variable names are exact (no typos)
- Restart backend server after adding credentials
- Check file is not in `.gitignore` blocking it (but DO keep it in `.gitignore` for Git)

### "Access Denied"
- Verify IAM user has `AmazonTextractFullAccess` policy
- Check access key is active (not disabled)
- Verify region matches (default: us-west-2)

### "Region Error"
- Set `AWS_REGION=us-west-2` (or your preferred region)
- Available regions: us-east-1, us-west-2, eu-west-1, ap-southeast-1, etc.

### Cost Concerns
- Set up billing alerts in AWS
- Monitor usage in AWS Console
- Free tier covers 1,000 pages/month
- Costs are very low beyond free tier

## Quick Checklist

- [ ] AWS account created
- [ ] IAM user created with Textract permissions
- [ ] Access keys generated and saved securely
- [ ] `.env` file created in `backend/` directory
- [ ] Credentials added to `.env` file
- [ ] `.env` is in `.gitignore`
- [ ] Backend server restarted
- [ ] Test upload successful
- [ ] OCR extraction working

## Next Steps

Once credentials are configured:
1. Upload a test document via Dashboard with OCR enabled
2. Check Documents page to see extracted data
3. Verify extracted fields are populated correctly
4. Celebrate! 🎉

## Need Help?

- [AWS Textract Documentation](https://docs.aws.amazon.com/textract/)
- [AWS IAM User Guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/)
- [AWS Free Tier Details](https://aws.amazon.com/free/)

