# 🏠 Property CashFlow Dashboard

A full-stack web application enabling landlords to track property income and expenses.  
The app processes uploaded PDFs via **AWS Textract**, aggregates results via **FastAPI + MongoDB**, and visualizes monthly/yearly cash flow using **Next.js** frontend.

---

## ⚙️ Tech Stack

| Layer | Technology | Version | Purpose |
| :---- | :---- | :---- | :---- |
| Frontend | Next.js 15.x | React-based app using App Router |
| UI Components | shadcn/ui + TailwindCSS | UI styling and components |
| Backend | FastAPI (Python 3.12) | REST API and OCR integration |
| Database | MongoDB Atlas | Cloud data store for docs & cashflows |

---

## 📁 Directory Structure

```
/frontend   → Next.js + Tailwind + shadcn/ui app
/backend    → FastAPI application with MongoDB integration
```

---

## 🚀 Local Setup

### 1. Backend
```bash
cd backend
pip install fastapi uvicorn pymongo python-dotenv
uvicorn main:app --reload
```
Visit: **http://localhost:8000/health** → should return `{ "status": "ok" }`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Visit: **http://localhost:3000/** to see the Next.js app running.

---

## 🧠 Development Workflow

Each sprint follows the roadmap in `development-plan.md`:
- Sprint 0: Groundwork & Scaffolding ✅
- Sprint 1: User Authentication 🔜
- Sprint 2: Property Management
- Sprint 3: Document OCR Integration
- Sprint 4: Dashboard Visualization

---

## 🪣 Deployment Targets

- **Frontend:** Vercel  
- **Backend:** Render  
Deployment URLs will be confirmed after local testing.

---

## 🧾 Environment Configuration

Set up `.env` file (already created):
```
MONGODB_URI="mongodb+srv://..."
MONGODB_USERNAME="username"
MONGODB_PASSWORD="password"
MONGODB_API_VERSION="1"
```

---

## ✅ Health Check Verification

Once both apps are running locally:
- **Backend:** http://localhost:8000/health → “ok”  
- **Frontend:** http://localhost:3000/ → renders base page

---

**Next Steps:** Proceed to Sprint 1 – Authentication workflow (FastAPI + JWT + UI forms).