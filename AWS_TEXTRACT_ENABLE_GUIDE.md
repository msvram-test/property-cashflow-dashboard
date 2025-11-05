# How to Enable AWS Textract (Fix SubscriptionRequiredException)

## Understanding the Error

If you're seeing **"SubscriptionRequiredException"**, it means:
- Your AWS account exists and has credentials
- But AWS Textract service hasn't been **enabled/activated** for your account yet

## Step-by-Step: Enable Textract in AWS

### Method 1: Enable via AWS Console (Recommended)

1. **Log in to AWS Console**
   - Go to [https://console.aws.amazon.com/](https://console.aws.amazon.com/)
   - Sign in with your AWS account

2. **Navigate to Textract Service**
   - In the top search bar, type **"Textract"**
   - Click on **"Amazon Textract"** service

3. **Enable Textract**
   - If you see a **"Get Started"** or **"Enable"** button, click it
   - This activates Textract for your account
   - You may need to accept the service terms

4. **Verify Account Status**
   - Make sure your AWS account is fully verified:
     - Phone number verified
     - Payment method on file (even if you stay in free tier)
   - Go to [AWS Account Settings](https://console.aws.amazon.com/billing/home)

### Method 2: Enable via AWS CLI (Alternative)

If you have AWS CLI installed:

```bash
# First, configure your credentials
aws configure

# Then verify Textract is accessible
aws textract list-adapters --region us-west-2
```

If you get access denied or subscription errors, proceed with Method 1.

### Method 3: Make Your First API Call (Auto-Activation)

Sometimes Textract auto-activates when you make your first successful API call:

1. Ensure your account is fully verified
2. Ensure payment method is on file (even if you won't be charged due to free tier)
3. Try uploading a document again through your application

## Important Prerequisites

### ✅ Account Verification Required

Your AWS account must be:
- **Email verified** ✅
- **Phone number verified** ✅
- **Payment method added** ✅ (Even if you stay within free tier, AWS requires this)
- **Account in good standing** ✅

### 📋 Check Account Status

1. Go to [AWS Account Settings](https://console.aws.amazon.com/billing/home)
2. Verify:
   - ✅ Account name and email are correct
   - ✅ Payment method is added
   - ✅ Phone number is verified

## Step-by-Step: First-Time Setup (If You Haven't Done This Yet)

### 1. Complete AWS Account Setup

If you just created your AWS account:

1. **Add Payment Method**
   - Go to [AWS Billing Console](https://console.aws.amazon.com/billing/)
   - Click **"Payment methods"**
   - Add a credit card
   - ⚠️ **Don't worry** - You won't be charged if you stay within free tier (1,000 pages/month)

2. **Verify Phone Number**
   - Go to [Account Settings](https://console.aws.amazon.com/billing/home#/account)
   - Add and verify your phone number

### 2. Enable Textract Service

1. Go to [AWS Textract Console](https://console.aws.amazon.com/textract/)
2. If you see:
   - **"Get Started"** → Click it
   - **Service overview page** → Textract is already enabled
   - **Error message** → Follow troubleshooting below

### 3. Create IAM User with Textract Permissions

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **"Users"** → **"Create user"**
3. Username: `textract-user` (or any name you prefer)
4. Click **"Next"**
5. Under **Permissions**:
   - Select **"Attach policies directly"**
   - Search for **"AmazonTextractFullAccess"**
   - ✅ Check the box
6. Click **"Create user"**

### 4. Create Access Keys

1. Click on the user you just created
2. Go to **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"** → **"Create access key"**
7. **IMPORTANT**: Copy both values immediately:
   - **Access key ID**
   - **Secret access key** (shown only once!)

### 5. Add Credentials to Your Backend

Create or update `backend/.env` file:

```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA...your_key_here
AWS_SECRET_ACCESS_KEY=...your_secret_here
```

⚠️ **Security**: Make sure `.env` is in `.gitignore`!

### 6. Restart Your Backend

```bash
cd backend
# Stop current server (Ctrl+C if running)
python main.py
```

### 7. Test Again

Try uploading a document with OCR enabled. The subscription error should be gone!

## Troubleshooting Subscription Errors

### Issue: Still Getting SubscriptionRequiredException

**Possible causes:**

1. **Account not fully verified**
   - Solution: Complete phone verification and add payment method

2. **Service not activated**
   - Solution: Go to Textract console and click "Get Started"

3. **Wrong region**
   - Solution: Ensure `AWS_REGION` matches where Textract is available
   - Try: `us-east-1`, `us-west-2`, `eu-west-1`, etc.

4. **Account restrictions**
   - Solution: Check AWS account status in billing console
   - Contact AWS Support if account is restricted

### Issue: "Access Denied" Instead

This is different from subscription error. It means:
- Textract IS enabled
- But your IAM user doesn't have permissions
- Solution: Verify IAM user has `AmazonTextractFullAccess` policy

### Quick Verification

Test if Textract is accessible:

```python
# Create test file: backend/test_textract_access.py
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
    # Try to list adapters (lightweight API call)
    response = client.list_adapters()
    print("✅ Textract is enabled and accessible!")
except Exception as e:
    error_msg = str(e)
    if "SubscriptionRequired" in error_msg:
        print("❌ Textract subscription required. Follow steps above.")
    elif "AccessDenied" in error_msg:
        print("❌ Access denied. Check IAM permissions.")
    else:
        print(f"❌ Error: {e}")
```

Run it:
```bash
cd backend
python test_textract_access.py
```

## Cost Information

**Free Tier:**
- ✅ **1,000 pages per month** - FREE
- Applies to AnalyzeDocument API (what we use)

**After Free Tier:**
- $1.50 per 1,000 pages
- Very affordable for most use cases

**Set Up Billing Alerts:**
1. Go to [AWS Billing Console](https://console.aws.amazon.com/billing/)
2. Set up CloudWatch billing alerts
3. Get notified if you exceed free tier

## Summary Checklist

- [ ] AWS account created and logged in
- [ ] Payment method added to AWS account
- [ ] Phone number verified
- [ ] Navigated to Textract console
- [ ] Textract service enabled/activated
- [ ] IAM user created with `AmazonTextractFullAccess`
- [ ] Access keys generated and copied
- [ ] Credentials added to `backend/.env` file
- [ ] Backend restarted
- [ ] Test upload completed successfully

## Still Having Issues?

1. **Check AWS Service Health**: [AWS Status Page](https://status.aws.amazon.com/)
2. **Review AWS Documentation**: [Textract Developer Guide](https://docs.aws.amazon.com/textract/)
3. **Contact AWS Support**: If account is verified but still getting errors

## Next Steps After Enabling

Once Textract is enabled:
1. Upload a test document through your dashboard
2. Check the extracted data in the Documents page
3. Verify OCR is extracting fields correctly
4. Celebrate! 🎉

---

**Note**: The subscription error typically resolves within minutes after enabling Textract. If it persists, wait 5-10 minutes for AWS to propagate the changes, then try again.

