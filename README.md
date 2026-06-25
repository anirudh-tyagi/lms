# Loan Management System

A full-stack lending platform with a Borrower Portal and an Operations Dashboard.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcrypt

---

## Prerequisites

- Node.js ≥ 18
- MongoDB running locally on `mongodb://localhost:27017`

---

## Setup

### 1. Install dependencies

```bash
# From the repo root
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start MongoDB

MongoDB must be running before seeding or starting the backend:

```bash
# Windows (if installed as a service)
net start MongoDB
# or just run: mongod

# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu / Linux
sudo systemctl start mongod
```

### 3. Configure environment

The backend `.env` file is pre-configured for local development:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/loan_management
JWT_SECRET=super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
```

Change `JWT_SECRET` before deploying to production.

### 3. Seed the database

```bash
cd backend
npm run seed
```

This creates one account per role:

| Role         | Email                    | Password          |
|--------------|--------------------------|-------------------|
| Admin        | admin@lms.com            | Admin@123         |
| Sales        | sales@lms.com            | Sales@123         |
| Sanction     | sanction@lms.com         | Sanction@123      |
| Disbursement | disbursement@lms.com     | Disbursement@123  |
| Collection   | collection@lms.com       | Collection@123    |
| Borrower     | borrower@lms.com         | Borrower@123      |

### 4. Start the servers

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — Frontend (http://localhost:3000)
cd frontend
npm run dev
```

---

## Architecture

### Loan Status Lifecycle

```
pending → sanctioned | rejected   (Sanction team)
sanctioned → disbursed            (Disbursement team)
disbursed → closed                (Collection — auto when fully paid)
```

### Business Rule Engine (BRE)

Runs server-side on `POST /api/borrower/personal-details`. Rejects if:

| Rule        | Condition                                        |
|-------------|--------------------------------------------------|
| Age         | Not between 23 and 50 years                      |
| Salary      | Monthly salary < ₹25,000                         |
| PAN         | Fails format `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`     |
| Employment  | Applicant is unemployed                          |

### Interest Calculation

```
SI = (P × R × T) / (365 × 100)   where R = 12% p.a., T = tenure in days
Total Repayment = P + SI
```

### Role-Based Access Control

| Role         | Access                          |
|--------------|---------------------------------|
| borrower     | Borrower portal only            |
| sales        | `/dashboard/sales` only         |
| sanction     | `/dashboard/sanction` only      |
| disbursement | `/dashboard/disbursement` only  |
| collection   | `/dashboard/collection` only    |
| admin        | All dashboard modules           |

RBAC is enforced at both the Next.js middleware level (route guards) and on every backend API route via `authorizeRoles()` middleware.

---

## API Reference

### Auth
| Method | Path               | Auth    | Description           |
|--------|--------------------|---------|-----------------------|
| POST   | /api/auth/register | None    | Borrower self-signup  |
| POST   | /api/auth/login    | None    | All roles             |
| GET    | /api/auth/me       | Any     | Current user info     |

### Borrower
| Method | Path                             | Description                        |
|--------|----------------------------------|------------------------------------|
| POST   | /api/borrower/personal-details   | Save details + run BRE             |
| GET    | /api/borrower/personal-details   | Fetch saved details                |
| POST   | /api/borrower/upload-salary-slip | Upload PDF/JPG/PNG ≤ 5MB           |
| POST   | /api/borrower/apply              | Submit loan application            |
| GET    | /api/borrower/application        | Get own loan status + calculations |

### Operations
| Method | Path                                             | Role             |
|--------|--------------------------------------------------|------------------|
| GET    | /api/operations/sales/leads                      | sales, admin     |
| GET    | /api/operations/sanction/applications            | sanction, admin  |
| PATCH  | /api/operations/sanction/applications/:id/approve| sanction, admin  |
| PATCH  | /api/operations/sanction/applications/:id/reject | sanction, admin  |
| GET    | /api/operations/disbursement/applications        | disbursement, admin |
| PATCH  | /api/operations/disbursement/applications/:id/disburse | disbursement, admin |
| GET    | /api/operations/collection/loans                 | collection, admin |
| GET    | /api/operations/collection/loans/:id/payments    | collection, admin |
| POST   | /api/operations/collection/loans/:id/payments    | collection, admin |

---

## Project Structure

```
loan-management-system/
├── backend/
│   ├── src/
│   │   ├── config/         db.ts, env.ts
│   │   ├── models/         User.ts, Applicant.ts, LoanApplication.ts, Payment.ts
│   │   ├── middleware/     auth.ts, rbac.ts, upload.ts
│   │   ├── routes/         auth.ts, borrower.ts, operations.ts
│   │   ├── controllers/    auth.controller.ts, borrower.controller.ts, operations.controller.ts
│   │   ├── services/       bre.service.ts, loan.service.ts
│   │   ├── types/          express.d.ts
│   │   └── app.ts
│   ├── seeds/              seed.ts
│   └── uploads/            (salary slips — gitignored)
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/         login/, register/
        │   ├── (borrower)/     personal-details/, upload/, loan-config/, status/
        │   └── (dashboard)/    dashboard/{sales,sanction,disbursement,collection}/
        ├── context/            AuthContext.tsx
        ├── lib/                api.ts, utils.ts
        ├── types/              index.ts
        └── middleware.ts
```
