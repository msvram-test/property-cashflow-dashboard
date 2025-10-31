# **🧭 Development Plan – Property CashFlow Dashboard**

## **1\. PRD Analysis Summary**

Based on the refined PRD, the Property CashFlow Dashboard is a web app enabling landlords to track property income and expenses using document uploads (PDFs) analyzed through AWS Textract OCR, visualizing monthly and yearly cash flow.

---

## **2\. Technology Stack (Latest Stable Versions)**

| Layer | Technology | Version | Justification |
| :---- | :---- | :---- | :---- |
| Frontend | Next.js | \~15.x | Modern React framework with App Router |
| UI Components | shadcn/ui | \~0.9.x | Accessible unstyled components |
| Backend Runtime | Python | \~3.12 LTS | Mature, readable, high-performance |
| Backend Framework | FastAPI | \~0.116.x | Fast, async-friendly, auto-doc generation |
| Database | MongoDB Atlas | Latest | Document-based flexible store |

---

## **3\. Architecture Pattern**

Pattern: **Modular Monolith**

### **Justification**

* Single developer scope with moderate feature set.  
* Quicker iteration cycle and easy local dev with shared context.  
* Integration simplicity for OCR (AWS Textract) within one domain context.

---

## **4\. Domain-Driven Module Structure**

### **Frontend Modules**

* **AuthModule**: Login, registration, session management.  
* **PropertyModule**: CRUD for properties.  
* **OCRModule**: File upload, OCR status display, data correction UI.  
* **DashboardModule**: CashFlow charts and analytics.  
* **SharedModule**: Common layouts, UI components, hooks.

### **Backend Modules**

* **AuthRouter**: JWT authentication, user CRUD.  
* **PropertyRouter**: Property CRUD operations.  
* **OCRRouter**: Document upload, AWS Textract integration.  
* **CashFlowRouter**: Net flow compute and data aggregation.  
* **Models**: Pydantic models for Users, Properties, Documents, CashflowRecords.

---

## **5\. Sprint-by-Sprint Roadmap**

### **Sprint 0: Groundwork & Scaffolding**

**Goal**: Build fully configured runnable project.

**Tasks**

1. Repository Synchronization (**USER INPUT REQUIRED**)  
   * **WHY**: Version control setup.  
   * **FORMAT**: GitHub repo URL (https://github.com/user/project.git)  
   * **ACTION**: Initialize repo and configure CI/CD hooks.  
2. Environment Configuration (**USER INPUT REQUIRED**)  
   * **WHY**: Database and theme colors setup.  
   * **FORMAT**: mongodb+srv://..., Hex colors (\#3B82F6)  
   * **ACTION**: Create .env and .env.example  
3. Project Structure  
   * Create /frontend and /backend directories with .gitignore.  
4. Backend Setup  
   * Setup FastAPI, pydantic, and env configs.  
5. Frontend Setup  
   * Scaffold Next.js \+ shadcn/ui \+ Tailwind with theme colors.  
6. Documentation  
   * Root README.md with setup and tech stack.  
7. Health Check Verification (**USER INPUT REQUIRED**)  
   * **WHY**: Verify API connection.  
   * **FORMAT**: Confirm “Status: ok” in browser and terminal.  
8. Commit & Deployment  
   * Commit with format:

```
chore(sprint-0): initial project setup
...
```

* Deploy Frontend: Vercel  
* Deploy Backend: Render  
* Confirm URLs from user.

### **Sprint 1: User Identity & Authentication**

**Goal:** Enable user registration and login.

**Tasks**

1. Database Model: User model.  
2. Registration Logic (**USER INPUT REQUIRED**) — confirm hashed password in MongoDB.  
3. Login Logic (**USER INPUT REQUIRED**) — confirm valid/invalid credential flow.  
4. Protected Route (**USER INPUT REQUIRED**) — test access via JWT token.  
5. Frontend UI & State (**USER INPUT REQUIRED**) — review Register/Login UIs.  
6. End-to-End Flow (**USER INPUT REQUIRED**) — confirm register-login-profile workflow.  
7. Commit & Deployment

```
feat(sprint-1): implement user auth
```

8. Deploy via Vercel/Render.

### **Sprint 2: Property Management**

**Goal:** CRUD operations for properties.

* Define PropertyModel.  
* Implement POST, GET, PATCH, DELETE.  
* Build frontend property management page.

### **Sprint 3: Document Upload & OCR Integration**

**Goal:** Upload PDF → Parse → Validate → Store.

* Integrate AWS Textract.  
* Validate OCR response and correction UI.

### **Sprint 4: CashFlow Dashboard Visualization**

**Goal:** KPI and charts visualization.

* Build Chart.JS/Recharts dashboards.  
* Implement summary metrics and trends.

---

## **6\. Deployment & User Input Plan**

* **Frontend:** Vercel auto-deploys from feature branches.  
* **Backend:** Render auto-deploys FastAPI branch.  
* **USER INPUT REQUIRED:**  
  * Repo URLs  
  * MongoDB connection string  
  * Health check & sprint testing confirmations  
* User confirms every major task works pre-merge.

---

## **7\. Commit & Deployment Validation**

* Each sprint includes:  
  * Explicit commit format (feat(sprint-x): summary)  
  * Clear accomplishments list in PR description.  
  * Preview deployment URLs for both Vercel and Render.

---

## **8\. Final Validation Checklist**

✅ All sprint structures (0–1) correctly formatted  
✅ USER INPUT Protocols (Why, Format, Action) included  
✅ Commit messages standardized  
✅ Vercel & Render deployments clearly integrated  
✅ Testing confirmations embedded per sprint

---

### **✅ Deliverables**

1. development-plan.md – this document  
2. Technology stack, architecture, domain structure  
3. Sprint-by-sprint executable roadmap  
4. Deployment configuration (Vercel/Render)  
5. User input & testing protocol definition

# **🧭 Development Plan – Property CashFlow Dashboard**

## **1\. PRD Analysis Summary**

Based on the refined PRD, the Property CashFlow Dashboard is a web app enabling landlords to track property income and expenses using document uploads (PDFs) analyzed through AWS Textract OCR, visualizing monthly and yearly cash flow.

---

## **2\. Technology Stack (Latest Stable Versions)**

| Layer | Technology | Version | Justification |
| :---- | :---- | :---- | :---- |
| Frontend | Next.js | \~15.x | Modern React framework with App Router |
| UI Components | shadcn/ui | \~0.9.x | Accessible unstyled components |
| Backend Runtime | Python | \~3.12 LTS | Mature, readable, high-performance |
| Backend Framework | FastAPI | \~0.116.x | Fast, async-friendly, auto-doc generation |
| Database | MongoDB Atlas | Latest | Document-based flexible store |

---

## **3\. Architecture Pattern**

Pattern: **Modular Monolith**

### **Justification**

* Single developer scope with moderate feature set.  
* Quicker iteration cycle and easy local dev with shared context.  
* Integration simplicity for OCR (AWS Textract) within one domain context.

---

## **3.1 System Architecture Overview**

The system architecture aligns directly with the **Cash Flow Dashboard System Architecture Diagram**, incorporating all major components: **Frontend, Backend, OCR Extraction, Cash Flow Computation, and Database** as shown in the diagram.

### **Component Interactions**

1. **Frontend (Next.js):**  
   * Provides user interface for login, property management, document uploads, and dashboard visualization.  
   * Communicates with FastAPI backend via RESTful API calls.  
   * Uploads PDF files which are passed to backend OCR handling routes.  
2. **Backend (FastAPI API Server):**  
   * Receives user actions from the Frontend.  
   * Handles CRUD operations for user, property, documents, and cashflow computation.  
   * Coordinates with the OCR service for data extraction and persists results in MongoDB.  
3. **OCR Extraction (AWS Textract):**  
   * Invoked by backend upon document upload to extract structured financial data.  
   * Returns extracted values (income, expense, property ID linkage) to the Backend for processing.  
4. **Cash Flow Computation Layer:**  
   * Operates as a backend computation module aggregating incomes and expenses per property.  
   * Updates MongoDB collections with computed metrics like net cash flow, ROI, and trends.  
5. **Database (MongoDB Atlas):**  
   * Stores users, properties, uploaded documents, and computed cashflow records.  
   * Supports quick data retrieval for dashboard visualization.  
   * Mirrors diagram: “Statements” and “Documents” collections.

### **Data Flow Summary (matching the diagram)**

```
Frontend → Backend → OCR Extraction → Cash Flow Computation → Database → Backend → Frontend
```

This ensures that uploaded documents seamlessly translate to visualized insights in the dashboard, ensuring complete end-to-end traceability as illustrated.

---

## **4\. Domain-Driven Module Structure**

### **Frontend Modules**

* **AuthModule**: Login, registration, session management.  
* **PropertyModule**: CRUD for properties.  
* **OCRModule**: File upload, OCR status display, data correction UI.  
* **DashboardModule**: CashFlow charts and analytics.  
* **SharedModule**: Common layouts, UI components, hooks.

### **Backend Modules**

* **AuthRouter**: JWT authentication, user CRUD.  
* **PropertyRouter**: Property CRUD operations.  
* **OCRRouter**: Document upload, AWS Textract integration.  
* **CashFlowRouter**: Net flow compute and data aggregation.  
* **Models**: Pydantic models for Users, Properties, Documents, CashflowRecords.

---

## **5\. Sprint-by-Sprint Roadmap**

### **Sprint 0: Groundwork & Scaffolding**

**Goal**: Build fully configured runnable project.

**Tasks**

1. Repository Synchronization (**USER INPUT REQUIRED**)  
   * **WHY**: Version control setup.  
   * **FORMAT**: GitHub repo URL (https://github.com/user/project.git)  
   * **ACTION**: Initialize repo and configure CI/CD hooks.  
2. Environment Configuration (**USER INPUT REQUIRED**)  
   * **WHY**: Database and theme colors setup.  
   * **FORMAT**: mongodb+srv://..., Hex colors (\#3B82F6)  
   * **ACTION**: Create .env and .env.example  
3. Project Structure  
   * Create /frontend and /backend directories with .gitignore.  
4. Backend Setup  
   * Setup FastAPI, pydantic, and env configs.  
5. Frontend Setup  
   * Scaffold Next.js \+ shadcn/ui \+ Tailwind with theme colors.  
6. Documentation  
   * Root README.md with setup and tech stack.  
7. Health Check Verification (**USER INPUT REQUIRED**)  
   * **WHY**: Verify API connection.  
   * **FORMAT**: Confirm “Status: ok” in browser and terminal.  
8. Commit & Deployment  
   * Commit with format:

```
chore(sprint-0): initial project setup
...
```

* Deploy Frontend: Vercel  
* Deploy Backend: Render  
* Confirm URLs from user.

### **Sprint 1: User Identity & Authentication**

**Goal:** Enable user registration and login.

**Tasks**

1. Database Model: User model.  
2. Registration Logic (**USER INPUT REQUIRED**) — confirm hashed password in MongoDB.  
3. Login Logic (**USER INPUT REQUIRED**) — confirm valid/invalid credential flow.  
4. Protected Route (**USER INPUT REQUIRED**) — test access via JWT token.  
5. Frontend UI & State (**USER INPUT REQUIRED**) — review Register/Login UIs.  
6. End-to-End Flow (**USER INPUT REQUIRED**) — confirm register-login-profile workflow.  
7. Commit & Deployment

```
feat(sprint-1): implement user auth
```

8. Deploy via Vercel/Render.

### **Sprint 2: Property Management**

**Goal:** CRUD operations for properties.

* Define PropertyModel.  
* Implement POST, GET, PATCH, DELETE.  
* Build frontend property management page.

### **Sprint 3: Document Upload & OCR Integration**

**Goal:** Upload PDF → Parse → Validate → Store.

* Integrate AWS Textract.  
* Validate OCR response and correction UI.

### **Sprint 4: CashFlow Dashboard Visualization**

**Goal:** KPI and charts visualization.

* Build Chart.JS/Recharts dashboards.  
* Implement summary metrics and trends.

---

## **6\. Deployment & User Input Plan**

* **Frontend:** Vercel auto-deploys from feature branches.  
* **Backend:** Render auto-deploys FastAPI branch.  
* **USER INPUT REQUIRED:**  
  * Repo URLs  
  * MongoDB connection string  
  * Health check & sprint testing confirmations  
* User confirms every major task works pre-merge.

---

## **7\. Commit & Deployment Validation**

* Each sprint includes:  
  * Explicit commit format (feat(sprint-x): summary)  
  * Clear accomplishments list in PR description.  
  * Preview deployment URLs for both Vercel and Render.

---

## **8\. Final Validation Checklist**

✅ All sprint structures (0–1) correctly formatted  
✅ USER INPUT Protocols (Why, Format, Action) included  
✅ Commit messages standardized  
✅ Vercel & Render deployments clearly integrated  
✅ Testing confirmations embedded per sprint

---

### **✅ Deliverables**

1. development-plan.md – this document  
2. Technology stack, architecture, domain structure  
3. Sprint-by-sprint executable roadmap  
4. Deployment configuration (Vercel/Render)  
5. User input & testing protocol definition

