# Loan Management System — Complete Technical Deep-Dive

This document teaches you **everything** about how this application is built, why each decision was made, and how every piece connects. It is written as a learning guide — you do not need prior experience with any of these technologies to follow along.

---

## Table of Contents

1. [The Big Picture — What Are We Building?](#1-the-big-picture)
2. [Monorepo Structure — Why One Repo?](#2-monorepo-structure)
3. [Technology Stack — Every Tool Explained](#3-technology-stack)
4. [Database Design — MongoDB Collections](#4-database-design)
5. [Backend Deep-Dive — Node.js + Express](#5-backend-deep-dive)
   - [Environment & Config](#51-environment--config)
   - [Express App Setup](#52-express-app-setup)
   - [Mongoose Models](#53-mongoose-models)
   - [Authentication — JWT + bcrypt](#54-authentication--jwt--bcrypt)
   - [Middleware Chain — How Every Request Flows](#55-middleware-chain)
   - [Business Rule Engine (BRE)](#56-business-rule-engine-bre)
   - [Borrower API Routes](#57-borrower-api-routes)
   - [Operations API Routes](#58-operations-api-routes)
   - [File Upload with Multer](#59-file-upload-with-multer)
   - [Seed Script](#510-seed-script)
6. [Frontend Deep-Dive — Next.js App Router](#6-frontend-deep-dive)
   - [App Router — What Changed from Pages Router](#61-app-router--what-changed-from-pages-router)
   - [AuthContext — Global Auth State](#62-authcontext--global-auth-state)
   - [Axios Instance & Interceptors](#63-axios-instance--interceptors)
   - [Next.js Middleware — Route Guard](#64-nextjs-middleware--route-guard)
   - [Borrower Portal — Step by Step](#65-borrower-portal--step-by-step)
   - [Operations Dashboard — All 4 Modules](#66-operations-dashboard--all-4-modules)
7. [Role-Based Access Control (RBAC) — Full Picture](#7-role-based-access-control-rbac)
8. [Loan Lifecycle — Every Status Transition Explained](#8-loan-lifecycle)
9. [Interest Calculation — The Math](#9-interest-calculation)
10. [Complete Request-Response Flows](#10-complete-request-response-flows)
11. [TypeScript — How We Use It](#11-typescript--how-we-use-it)
12. [Common Concepts Explained for Beginners](#12-common-concepts-explained-for-beginners)

---

## 1. The Big Picture

### What is this application?

This is a **Loan Management System** — a platform where:

- **Borrowers** (regular users) apply for personal loans through a guided multi-step form.
- **Internal executives** (company employees) manage those loan applications through a lifecycle involving review, approval, fund disbursement, and repayment collection.

### Who are the users?

| Role         | What they do |
|---|---|
| **Borrower** | Registers, fills personal details, uploads salary slip, applies for a loan |
| **Sales**    | Views borrowers who registered but haven't applied yet (lead tracking) |
| **Sanction** | Reviews pending loan applications and approves or rejects them |
| **Disbursement** | Marks approved/sanctioned loans as disbursed (funds released to borrower) |
| **Collection** | Records repayment payments from borrowers |
| **Admin**    | Has access to all dashboard modules |

### The two main parts

```
┌─────────────────────────────────────────────────────┐
│                 BORROWER PORTAL                     │
│  /register → /personal-details → /upload →         │
│  /loan-config → /status                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              OPERATIONS DASHBOARD                   │
│  /dashboard/sales                                   │
│  /dashboard/sanction                                │
│  /dashboard/disbursement                            │
│  /dashboard/collection                              │
└─────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

### What is a monorepo?

A **monorepo** (monolithic repository) means both the frontend and backend code live in the same git repository, under separate folders. This is the opposite of having two separate repos.

### Why use a monorepo here?

- Shared TypeScript types — you define `LoanStatus` once and use it in both `frontend/` and `backend/`.
- Single `npm install` from the root installs everything.
- One `.gitignore`, one `README.md`, one place to look.

### npm Workspaces

```json
// package.json (root)
{
  "workspaces": ["backend", "frontend"]
}
```

When you run `npm install` at the root, npm reads this `workspaces` field and installs dependencies for both `backend/` and `frontend/`. It **hoists** (lifts) shared packages to `node_modules/` at the root to avoid duplication.

```
temp/
├── node_modules/        ← ALL packages live here (hoisted from both projects)
├── package.json         ← workspaces root
├── backend/
│   ├── package.json     ← defines backend's own deps
│   └── src/
└── frontend/
    ├── package.json     ← defines frontend's own deps
    └── src/
```

### Folder structure at a glance

```
temp/
├── package.json                  Root workspace config
├── README.md                     Setup guide
├── explanation.md                This file
├── backend/
│   ├── .env                      Secret environment variables (never commit!)
│   ├── .env.example              Safe template to share
│   ├── tsconfig.json             TypeScript config for backend
│   ├── package.json              Backend scripts + dependencies
│   ├── seeds/
│   │   └── seed.ts               Creates one test account per role
│   ├── uploads/                  Salary slip files stored here (gitignored)
│   └── src/
│       ├── app.ts                Express app entry point
│       ├── config/
│       │   ├── db.ts             MongoDB connection
│       │   └── env.ts            Reads + validates .env variables
│       ├── models/
│       │   ├── User.ts           Users collection schema
│       │   ├── Applicant.ts      Personal details collection schema
│       │   ├── LoanApplication.ts Loan applications schema
│       │   └── Payment.ts        Repayment payments schema
│       ├── middleware/
│       │   ├── auth.ts           JWT verification middleware
│       │   ├── rbac.ts           Role-based access control middleware
│       │   └── upload.ts         Multer file upload middleware
│       ├── routes/
│       │   ├── auth.ts           POST /login, POST /register, GET /me
│       │   ├── borrower.ts       Borrower-only routes
│       │   └── operations.ts     Dashboard routes (sales/sanction/etc.)
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── borrower.controller.ts
│       │   └── operations.controller.ts
│       ├── services/
│       │   ├── bre.service.ts    Business Rule Engine logic
│       │   └── loan.service.ts   Interest calculation logic
│       └── types/
│           └── express.d.ts      Adds req.user to Express types
└── frontend/
    ├── .env.local                API URL config for Next.js
    ├── next.config.js
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── next-env.d.ts             Auto-generated Next.js types
    └── src/
        ├── middleware.ts         Next.js edge middleware (route guard)
        ├── app/
        │   ├── layout.tsx        Root layout (wraps AuthProvider)
        │   ├── page.tsx          Root redirect (/ → role-based destination)
        │   ├── globals.css       Tailwind base styles
        │   ├── login/page.tsx
        │   ├── register/page.tsx
        │   ├── (borrower)/       Route group — borrower portal pages
        │   │   ├── layout.tsx    Step indicator header
        │   │   ├── personal-details/page.tsx
        │   │   ├── upload/page.tsx
        │   │   ├── loan-config/page.tsx
        │   │   └── status/page.tsx
        │   └── (dashboard)/      Route group — operations dashboard
        │       ├── layout.tsx    Sidebar navigation
        │       └── dashboard/
        │           ├── page.tsx  Admin landing / role redirect
        │           ├── sales/page.tsx
        │           ├── sanction/page.tsx
        │           ├── disbursement/page.tsx
        │           └── collection/page.tsx
        ├── context/
        │   └── AuthContext.tsx   Global auth state (React Context)
        ├── lib/
        │   ├── api.ts            Axios instance with JWT interceptor
        │   └── utils.ts          SI calculator + formatters
        └── types/
            └── index.ts          Shared TypeScript interfaces
```

---

## 3. Technology Stack

### Node.js

Node.js is a **JavaScript runtime** that lets you run JavaScript code on a server (outside of a browser). It is built on Chrome's V8 engine and is especially good at handling many simultaneous network connections because it uses an **event loop** (non-blocking I/O) instead of creating a new thread per request.

```
Client Request → Node.js Event Loop → Handler → Response
                     ↑
               Single thread, but
               never "waits" — uses
               callbacks/promises
```

### Express.js

Express is a **minimal web framework** for Node.js. It adds:
- **Routing** — `app.get('/path', handler)` maps HTTP verbs + paths to functions.
- **Middleware** — functions that run before your handler to do things like parse JSON, verify tokens, check roles.
- **Request/Response abstraction** — `req.body`, `req.params`, `res.json()`, `res.status()`.

```typescript
// The simplest possible Express app
import express from 'express';
const app = express();

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(3000);
```

### TypeScript

TypeScript is a **superset of JavaScript** that adds static types. It compiles down to plain JavaScript (`tsc` = TypeScript Compiler). The benefits:

- **Catch bugs before running** — if you call `loan.santioned` (typo), TypeScript errors at compile time.
- **Autocomplete** — your editor knows what properties exist on every object.
- **Self-documenting** — reading types tells you what a function expects and returns.

```typescript
// Without TypeScript — JavaScript
function calcSI(p, r, t) {
  return (p * r * t) / (365 * 100);
}

// With TypeScript — explicit, safe
function calcSI(principal: number, rate: number, tenureDays: number): number {
  return (principal * rate * tenureDays) / (365 * 100);
}
// calcSI("hello", 12, 90) → TypeScript ERROR before you even run it
```

### MongoDB

MongoDB is a **NoSQL document database**. Instead of tables with rigid rows and columns (like SQL), it stores **documents** — JSON-like objects that can have nested fields.

```
SQL (PostgreSQL):               MongoDB:
┌──────┬───────┬────────┐       { _id: "abc123",
│  id  │ email │  role  │         email: "alice@lms.com",
├──────┼───────┼────────┤         role: "borrower",
│  1   │ alice │borrower│         createdAt: ISODate("2026-01-01")
└──────┴───────┴────────┘       }
```

MongoDB advantages for this project:
- **Flexible schema** — a LoanApplication document can have an optional `rejectionReason` field without changing a schema.
- **Native JSON** — data flows as JSON from DB → Node → browser with no transformation.
- **References** — `applicantId: ObjectId` is a reference to another document (like a foreign key).

### Mongoose

Mongoose is an **ODM (Object Document Mapper)** for MongoDB in Node.js. It gives you:
- **Schema definitions** — enforce structure on your documents.
- **Validation** — `required: true`, `min: 50000`, `enum: [...]`.
- **Model methods** — `User.findOne({ email })`, `loan.save()`.
- **TypeScript integration** — `model<IUser>('User', schema)` gives you typed documents.

### Next.js (App Router)

Next.js is a **React framework** that adds:
- **File-system routing** — a file at `src/app/login/page.tsx` automatically becomes the `/login` route.
- **Server Components** — React components that run on the server (no JS sent to client).
- **Client Components** — `'use client'` directive → runs in the browser, can use hooks.
- **Middleware** — `src/middleware.ts` runs at the Edge (before any page renders) to redirect unauthenticated users.
- **Built-in optimizations** — image optimization, font loading, code splitting.

### Tailwind CSS

Tailwind is a **utility-first CSS framework**. Instead of writing custom CSS classes, you compose small utility classes directly in your HTML/JSX:

```tsx
// Traditional CSS approach:
// .submit-btn { background: blue; color: white; padding: 8px 16px; border-radius: 8px; }
// <button className="submit-btn">Submit</button>

// Tailwind approach:
<button className="bg-blue-600 text-white px-4 py-2 rounded-lg">Submit</button>
```

Classes like `bg-blue-600` (background color), `text-white`, `px-4` (padding x-axis), `py-2` (padding y-axis), `rounded-lg` (border radius).

### JWT (JSON Web Tokens)

A JWT is a **self-contained token** that proves who you are. It has 3 parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9   .   eyJpZCI6IjEyMyIsInJvbGUiOiJib3Jyb3dlciJ9   .   signature
      HEADER                              PAYLOAD                              SIGNATURE
   (algorithm)                    (your user data, base64)              (proves it wasn't tampered)
```

The **payload** contains: `{ id, email, role, iat (issued at), exp (expires) }`.

Anyone can decode the payload (it's just base64). The **signature** is what makes it secure — only the server (which knows the `JWT_SECRET`) can produce a valid signature. If someone tampers with the payload, the signature won't match and the server rejects it.

### bcrypt

bcrypt is a **password hashing library**. It converts a plain password into a one-way hash:

```
"MyPassword123" → "$2b$12$saltsaltsaltsalt...longhashedstring"
```

- **One-way** — you cannot reverse the hash to get the original password.
- **Salted** — a random string is mixed in before hashing, so two users with the same password get different hashes.
- **Work factor (12)** — controls how slow the hash is to compute. Slow = harder for attackers to brute force.

---

## 4. Database Design

We have **4 MongoDB collections**. Understanding how they relate to each other is the foundation of the whole system.

### Collection 1: `users`

Stores login credentials for every person using the system.

```typescript
{
  _id: ObjectId,         // MongoDB auto-generated unique ID
  email: string,         // unique, lowercase, e.g. "alice@example.com"
  password: string,      // bcrypt hash, NEVER plain text
  role: string,          // "borrower" | "sales" | "sanction" | "disbursement" | "collection" | "admin"
  createdAt: Date,       // auto-set by Mongoose timestamps: true
  updatedAt: Date,
}
```

**Why is `role` stored here?** Because every API request needs to know the caller's role instantly — by just decoding the JWT (which embeds the role from this document at login time).

### Collection 2: `applicants`

Stores the personal details a borrower fills in on Step 2. Separate from `users` because:
- A `user` is about authentication (who you are).
- An `applicant` is about eligibility (your financial profile).

```typescript
{
  _id: ObjectId,
  userId: ObjectId,         // reference to users._id (one-to-one with borrower)
  fullName: string,
  pan: string,              // uppercase, e.g. "ABCDE1234F"
  dateOfBirth: Date,
  monthlySalary: number,    // in rupees
  employmentMode: string,   // "salaried" | "self-employed" | "unemployed"
  breStatus: string,        // "pending" | "passed" | "failed"
  breErrors: string[],      // array of error messages if BRE failed
  createdAt: Date,
  updatedAt: Date,
}
```

**`unique: true` on `userId`** — a borrower can only have one applicant profile.

**`breStatus`** — once it's `"passed"`, the profile is **locked** (the backend rejects any attempt to update it). This prevents someone from changing their salary to ₹50,000 just to pass BRE, then changing it back.

### Collection 3: `loanapplications`

Created when a borrower clicks "Apply" on Step 4.

```typescript
{
  _id: ObjectId,
  userId: ObjectId,           // which borrower owns this loan
  applicantId: ObjectId,      // their personal details at time of application
  salarySlipPath: string,     // filename on disk, e.g. "1719300000000-123456789.pdf"
  salarySlipOriginalName: string, // "my_salary_slip_june.pdf" (for display)
  loanAmount: number,         // 50000 to 500000
  tenure: number,             // 30 to 365 (days)
  interestRate: number,       // always 12 (fixed)
  simpleInterest: number,     // calculated at apply time: (P×R×T)/(365×100)
  totalRepayment: number,     // loanAmount + simpleInterest
  status: string,             // "pending"|"sanctioned"|"rejected"|"disbursed"|"closed"
  rejectionReason?: string,   // only set when status = "rejected"
  disbursedAt?: Date,         // only set when status = "disbursed"
  createdAt: Date,
  updatedAt: Date,
}
```

**Why store `simpleInterest` and `totalRepayment`?** Even though we could recalculate them, storing them at apply time **freezes** the agreed amount. If the formula ever changes, old loans aren't affected.

### Collection 4: `payments`

Records each repayment a borrower makes (entered by the Collection team).

```typescript
{
  _id: ObjectId,
  loanApplicationId: ObjectId,  // which loan this payment is for
  utrNumber: string,             // UNIQUE — bank transaction reference
  amount: number,                // how much was paid (in rupees)
  paymentDate: Date,             // when the payment was made
  recordedBy: ObjectId,          // which collection executive entered it
  createdAt: Date,
  updatedAt: Date,
}
```

**`utrNumber` has a unique index** — a UTR (Unique Transaction Reference) is the bank-assigned ID for a transaction. If a collection agent accidentally enters the same UTR twice, the database rejects the duplicate.

### Entity Relationship Diagram

```
users (1) ──────────── (1) applicants
  │                          │
  │                          │
  └─── (1) ────── (many) loanapplications
                              │
                              └─── (1) ────── (many) payments
```

- One user → one applicant profile.
- One user → potentially many loans (but only one non-rejected active loan at a time).
- One loan → many payments over its lifetime.

---

## 5. Backend Deep-Dive

### 5.1 Environment & Config

**The problem**: You don't want to hardcode secrets (database passwords, JWT keys) in your source code. If you push that to GitHub, everyone can see them.

**The solution**: Store secrets in a `.env` file (which is gitignored) and read them at runtime.

```
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/loan_management
JWT_SECRET=super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
```

**`src/config/env.ts`** — loads and validates these variables:

```typescript
import dotenv from 'dotenv';
dotenv.config(); // reads .env file into process.env

const required = ['MONGODB_URI', 'JWT_SECRET'] as const;
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
};
```

**Why validate on startup?** If `JWT_SECRET` is missing and you discover it only when someone tries to log in at 2am, you'll have a much harder time debugging. Fail fast and loud at startup instead.

**`src/config/db.ts`** — connects Mongoose to MongoDB:

```typescript
import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected');
}
```

`mongoose.connect()` returns a Promise. Using `await` means the server only starts listening for HTTP traffic **after** the database connection is established. You never want to accept requests when the DB isn't ready.

### 5.2 Express App Setup

**`src/app.ts`** is the entry point. Here's what happens line by line:

```typescript
import './config/env';  // ← Step 1: Validate env vars FIRST (before anything else)
import express from 'express';
import cors from 'cors';

const app = express();  // ← Create the Express application

// Step 2: Add global middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
// CORS = Cross-Origin Resource Sharing
// The browser blocks requests from http://localhost:3000 (frontend)
// to http://localhost:5000 (backend) by default as a security measure.
// This tells Express to send the right headers to allow it.

app.use(express.json());
// Without this, req.body would be undefined.
// This middleware reads the raw request body and parses it as JSON.

// Step 3: Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Now http://localhost:5000/uploads/filename.pdf streams the file.
// This lets the browser preview/download salary slips.

// Step 4: Mount route handlers
app.use('/api/auth', authRoutes);
app.use('/api/borrower', borrowerRoutes);
app.use('/api/operations', operationsRoutes);

// Step 5: Start the server (only after DB connects)
async function bootstrap() {
  await connectDB();
  app.listen(env.PORT, () => console.log(`Running on port ${env.PORT}`));
}
bootstrap();
```

**What is middleware?** A middleware is a function with the signature `(req, res, next)`. When Express processes a request, it runs middleware functions **in order**. Each one either:
- Calls `next()` to pass control to the next middleware.
- Sends a response (`res.json(...)`) to end the chain.

```
Request → cors() → express.json() → verifyToken() → authorizeRoles() → controller → Response
```

### 5.3 Mongoose Models

Each model file defines:
1. A **TypeScript interface** (`IUser`) describing the shape of a document.
2. A **Mongoose Schema** (the validation rules).
3. A **Model** (the class you call `.find()`, `.create()`, etc. on).

**Example: User model**

```typescript
// Interface — TypeScript knows the shape
export interface IUser extends Document {
  email: string;
  password: string;
  role: Role;
}

// Schema — MongoDB knows the validation rules
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,    // must exist
    unique: true,      // creates a database index, prevents duplicates
    lowercase: true,   // auto-converts to lowercase on save
    trim: true,        // removes leading/trailing whitespace
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'sales', 'sanction', 'disbursement', 'collection', 'borrower'],
    required: true,
  },
}, { timestamps: true }); // auto-adds createdAt and updatedAt

// Model — the class you use to query the collection
export const User = model<IUser>('User', UserSchema);
```

**`Document` extension** — Mongoose documents have extra properties like `._id`, `.save()`, `.toObject()`. Extending `Document` tells TypeScript that `IUser` has all of those plus our custom fields.

**`{ timestamps: true }`** — Mongoose automatically adds `createdAt` (when first saved) and `updatedAt` (updated on every `.save()`) to every document. You never have to set these manually.

### 5.4 Authentication — JWT + bcrypt

**Registration flow** (`POST /api/auth/register`):

```typescript
// 1. Check if email already exists
const existing = await User.findOne({ email: email.toLowerCase() });
if (existing) {
  res.status(409).json({ message: 'Email already registered' });
  return;
}

// 2. Hash the password
// bcrypt.hash(plainPassword, saltRounds)
// saltRounds = 12 → computation takes ~250ms (intentionally slow for security)
const hashed = await bcrypt.hash(password, 12);

// 3. Create the user (role is always 'borrower' for self-registration)
const user = await User.create({ email, password: hashed, role: 'borrower' });

// 4. Sign a JWT
const token = jwt.sign(
  { id: user._id.toString(), email: user.email, role: user.role }, // PAYLOAD
  env.JWT_SECRET,    // SECRET — used to sign the token
  { expiresIn: 7 * 24 * 60 * 60 }  // 7 days in seconds
);

// 5. Return token + user info (never return the password hash)
res.status(201).json({ token, user: { id, email, role } });
```

**Login flow** (`POST /api/auth/login`):

```typescript
// 1. Find user
const user = await User.findOne({ email });
if (!user) {
  res.status(401).json({ message: 'Invalid credentials' });
  // We say "invalid credentials" rather than "email not found"
  // to prevent user enumeration attacks
  return;
}

// 2. Compare password
// bcrypt.compare(plainPassword, storedHash)
// → re-hashes the plain password and compares the result
const match = await bcrypt.compare(password, user.password);
if (!match) {
  res.status(401).json({ message: 'Invalid credentials' });
  return;
}

// 3. Sign and return token (same as registration)
```

**Why 401 for "invalid credentials"?** HTTP status 401 means "unauthenticated" — the request lacks valid authentication. 403 would mean "authenticated but not allowed" (wrong role). Never return different messages for "wrong email" vs "wrong password" — that leaks information to attackers trying to enumerate valid accounts.

### 5.5 Middleware Chain

**How a protected request flows through the system:**

```
POST /api/borrower/personal-details
         │
         ▼
    verifyToken()
    ─────────────
    • Reads Authorization header
    • Expects: "Bearer eyJhbGciOiJIUzI1NiJ9..."
    • Calls jwt.verify(token, JWT_SECRET)
    • If valid: sets req.user = { id, email, role }
    • If invalid/missing: returns 401 immediately
         │
         ▼ (if token is valid)
    authorizeRoles('borrower')
    ──────────────────────────
    • Checks req.user.role against allowed roles
    • If role matches: calls next()
    • If role doesn't match: returns 403
         │
         ▼ (if role matches)
    savePersonalDetails()
    ─────────────────────
    • The actual business logic
    • req.user.id is safely available here
```

**`src/middleware/auth.ts`** — the `verifyToken` function:

```typescript
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Check header format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication token missing' });
    return; // Must return to stop execution — don't call next()
  }

  // Extract just the token part (after "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify throws if the token is expired or tampered with
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next(); // Pass to the next middleware/handler
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
```

**`src/middleware/rbac.ts`** — the `authorizeRoles` factory function:

```typescript
// A "factory function" — it takes roles and RETURNS a middleware function
export function authorizeRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied: insufficient permissions' });
      return;
    }
    next();
  };
}

// Usage in routes:
router.get('/sales/leads', authorizeRoles('sales', 'admin'), getLeads);
// → only requests from users with role 'sales' or 'admin' get through
```

**Why a factory function?** Each route needs a different set of allowed roles. By calling `authorizeRoles('sales', 'admin')`, we create a unique middleware for that route. The `...roles` spread syntax lets you pass any number of role arguments.

**`src/types/express.d.ts`** — extending Express types:

```typescript
// By default, Express's Request type has no 'user' property.
// This file adds it so TypeScript doesn't complain when we set req.user.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}
```

This is called **declaration merging** — TypeScript lets you add properties to existing types from third-party libraries.

### 5.6 Business Rule Engine (BRE)

The BRE is a **pure function** — it takes inputs and returns a result, with no side effects (no database calls, no HTTP requests).

**Why keep BRE pure?**
- **Testable** — you can test it without a server or database.
- **Reusable** — if you add a CLI tool or a batch job, you can reuse the same function.
- **Predictable** — same inputs always produce the same outputs.

**Why is BRE server-side only?**
- The assignment specification requires server-side validation.
- Client-side validation (in the browser) can always be bypassed by a technically savvy user — they could open the browser console and call the API directly.
- The server is the **authoritative source of truth** for business rules.
- A frontend hint (showing errors as the user types) is a UX improvement, but the actual rejection **must** happen on the server.

```typescript
// src/services/bre.service.ts
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// Explanation of the PAN regex:
// ^          → start of string
// [A-Z]{5}   → exactly 5 uppercase letters (first 3 = category, next 2 = PAN holder type)
// [0-9]{4}   → exactly 4 digits
// [A-Z]{1}   → exactly 1 uppercase letter (check character)
// $          → end of string
// Example valid PAN: ABCDE1234F

export function runBRE(input: BreInput): BreResult {
  const errors: string[] = [];

  // Rule 1: Age 23-50
  const age = calculateAge(input.dateOfBirth);
  if (age < 23 || age > 50) {
    errors.push(`Age must be between 23 and 50 years. Your age: ${age}`);
  }

  // Rule 2: Salary >= 25,000
  if (input.monthlySalary < 25000) {
    errors.push(`Monthly salary must be at least ₹25,000`);
  }

  // Rule 3: Valid PAN
  if (!PAN_REGEX.test(input.pan.trim().toUpperCase())) {
    errors.push('PAN must be in the format AAAAA9999A');
  }

  // Rule 4: Not unemployed
  if (input.employmentMode === 'unemployed') {
    errors.push('Unemployed applicants are not eligible');
  }

  // ALL rules are checked (not short-circuited)
  // This means we return ALL errors at once, not just the first one.
  return { passed: errors.length === 0, errors };
}
```

**Important design choice**: We check **all 4 rules** even if the first one fails. This is better UX — the user sees all their problems at once instead of fixing one at a time.

**Age calculation:**

```typescript
function calculateAge(dob: Date | string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  // If we haven't reached the birthday month yet this year,
  // or we're in the birthday month but haven't reached the day,
  // subtract 1 because the birthday hasn't happened yet
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
```

### 5.7 Borrower API Routes

**`POST /api/borrower/personal-details`** — saves details and runs BRE:

```typescript
export async function savePersonalDetails(req, res) {
  const userId = req.user!.id;  // ! = we're sure this exists (verifyToken ran first)

  // Check if already locked
  const existing = await Applicant.findOne({ userId });
  if (existing && existing.breStatus === 'passed') {
    res.status(409).json({ message: 'Personal details are locked after BRE passes' });
    return;
    // 409 Conflict = the request conflicts with the current state of the resource
  }

  // Run BRE
  const breResult = runBRE({ dateOfBirth, monthlySalary, pan, employmentMode });

  // Save to DB regardless of pass/fail (so user can see their errors later)
  const applicantData = {
    userId, fullName, pan: pan.toUpperCase(), dateOfBirth,
    monthlySalary: Number(monthlySalary), employmentMode,
    breStatus: breResult.passed ? 'passed' : 'failed',
    breErrors: breResult.errors,
  };

  // Upsert: update if exists, create if not
  if (existing) {
    Object.assign(existing, applicantData);
    await existing.save();
  } else {
    await Applicant.create(applicantData);
  }

  if (!breResult.passed) {
    // 422 Unprocessable Entity = server understood the request but cannot process it
    // (different from 400 Bad Request = malformed syntax)
    res.status(422).json({ errors: breResult.errors, breStatus: 'failed' });
    return;
  }

  res.status(200).json({ message: 'Eligibility check passed', applicant });
}
```

**`POST /api/borrower/apply`** — creates the loan:

```typescript
export async function applyForLoan(req, res) {
  // Guard 1: BRE must have passed
  const applicant = await Applicant.findOne({ userId });
  if (!applicant || applicant.breStatus !== 'passed') {
    res.status(403).json({ message: 'Eligibility check must pass before applying' });
    return;
  }

  // Guard 2: No active loan already exists
  const existingLoan = await LoanApplication.findOne({
    userId,
    status: { $ne: 'rejected' }  // $ne = "not equal"
    // A rejected loan doesn't block re-application
  });
  if (existingLoan) {
    res.status(409).json({ message: 'You already have an active loan application' });
    return;
  }

  // Calculate interest at time of application (frozen forever)
  const si = calculateSI(amount, days);
  const totalRepayment = amount + si;

  await LoanApplication.create({
    userId, applicantId: applicant._id,
    salarySlipPath, salarySlipOriginalName,
    loanAmount: amount, tenure: days,
    interestRate: 12, simpleInterest: si, totalRepayment,
    status: 'pending',  // Always starts as pending
  });
}
```

### 5.8 Operations API Routes

**Sales leads** — borrowers with no loan application:

```typescript
export async function getLeads(req, res) {
  // Get all borrowers
  const borrowers = await User.find({ role: 'borrower' }).select('-password').lean();
  // .lean() returns plain JS objects instead of Mongoose Documents (faster for reads)

  // Get IDs of borrowers who have applied
  const appliedIds = await LoanApplication.distinct('userId', {
    userId: { $in: borrowers.map(b => b._id) }
  });
  // distinct('userId', query) → returns unique userId values matching query

  // Filter out borrowers who have applied
  const appliedSet = new Set(appliedIds.map(String));
  const leads = borrowers.filter(b => !appliedSet.has(String(b._id)));

  res.json({ leads });
}
```

**Collection payment recording** — the most complex handler:

```typescript
export async function recordPayment(req, res) {
  const loan = await LoanApplication.findById(req.params.id);

  // Guard: loan must be in disbursed state
  if (loan.status !== 'disbursed') {
    res.status(409).json({ message: `Cannot record payment for status: ${loan.status}` });
    return;
  }

  // Calculate outstanding balance
  const existingPayments = await Payment.find({ loanApplicationId: loan._id });
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = loan.totalRepayment - totalPaid;

  // Guard: payment can't exceed outstanding
  if (parsedAmount > outstanding) {
    res.status(400).json({ message: `Amount exceeds outstanding balance` });
    return;
  }

  // Guard: UTR must be unique (enforced by DB index too, but check first for better error)
  const duplicate = await Payment.findOne({ utrNumber: utr });
  if (duplicate) {
    res.status(409).json({ message: `UTR ${utr} already exists` });
    return;
  }

  // Create payment
  await Payment.create({ loanApplicationId, utrNumber, amount, paymentDate, recordedBy });

  // Auto-close: check if fully paid
  const newTotalPaid = totalPaid + parsedAmount;
  if (newTotalPaid >= loan.totalRepayment) {
    loan.status = 'closed';
    await loan.save();
  }
}
```

### 5.9 File Upload with Multer

Multer is Express middleware for handling `multipart/form-data` — the encoding type used when uploading files.

```typescript
// src/middleware/upload.ts

// Configure where files go and what they're named
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);  // cb(error, path) — null = no error
  },
  filename: (_req, file, cb) => {
    // Create a unique filename to prevent collisions
    // e.g. "1719300000000-123456789.pdf"
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
    // path.extname("salary.pdf") → ".pdf"
  },
});

// File type filter
function fileFilter(_req, file, cb) {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);   // Accept the file
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed'));
  }
}

export const uploadSalarySlip = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB in bytes
}).single('salarySlip');
// .single('salarySlip') → expect one file with the form field name "salarySlip"
```

**How it's used in the route:**

```typescript
router.post('/upload-salary-slip',
  (req, res, next) => {
    // Wrap multer to handle its errors gracefully
    uploadSalarySlip(req, res, (err) => {
      if (err) {
        res.status(400).json({ message: err.message });
        return;
      }
      next();
    });
  },
  handleUpload  // after multer runs, req.file is available
);
```

After multer runs, `req.file` contains:
```typescript
{
  fieldname: 'salarySlip',
  originalname: 'my_salary.pdf',
  mimetype: 'application/pdf',
  filename: '1719300000000-987654321.pdf',  // generated name on disk
  path: '/path/to/uploads/1719300000000-987654321.pdf',
  size: 204800
}
```

### 5.10 Seed Script

The seed script runs **outside the Express app** — it's a standalone script that connects to MongoDB directly and creates test accounts.

```typescript
// seeds/seed.ts
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });
// Note the explicit path — seeds/ is not under src/, so we need to tell dotenv where .env is

const seeds = [
  { email: 'admin@lms.com', password: 'Admin@123', role: 'admin' },
  // ...
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const s of seeds) {
    const existing = await User.findOne({ email: s.email });
    if (existing) {
      console.log(`skipping ${s.email} (already exists)`);
      continue;  // Idempotent: safe to run multiple times
    }
    const hashed = await bcrypt.hash(s.password, 12);
    await User.create({ email, password: hashed, role });
  }

  await mongoose.disconnect();
}
```

**Idempotent**: Running the seed script twice doesn't create duplicate accounts — it skips emails that already exist. This is a good practice for seed scripts.

---

## 6. Frontend Deep-Dive

### 6.1 App Router — What Changed from Pages Router

Next.js 13+ introduced the **App Router**. The key differences from the older Pages Router:

| Feature | Pages Router (`/pages`) | App Router (`/app`) |
|---|---|---|
| Routing | `pages/login.tsx` | `app/login/page.tsx` |
| Layouts | Custom `_app.tsx` | Nested `layout.tsx` files |
| Data fetching | `getServerSideProps` | `async` Server Components |
| Client state | All components client-side by default | Server Components by default, `'use client'` for interactive ones |

**Route Groups** — folders wrapped in parentheses `(name)` create organizational groups WITHOUT affecting the URL:

```
app/
├── (borrower)/
│   ├── layout.tsx           ← shared layout for borrower pages
│   ├── personal-details/
│   │   └── page.tsx         → URL: /personal-details (not /borrower/personal-details)
│   └── upload/
│       └── page.tsx         → URL: /upload
└── (dashboard)/
    └── dashboard/
        └── sales/
            └── page.tsx     → URL: /dashboard/sales
```

The `(borrower)` folder groups borrower pages under a shared layout (the step indicator) without adding `/borrower/` to the URL.

### 6.2 AuthContext — Global Auth State

**The problem**: Many different pages (login, personal-details, status, dashboard) all need to know who the current user is. Without a global solution, you'd have to pass user data through props across many components.

**The solution**: React Context — a way to share state across the entire component tree without prop drilling.

```typescript
// src/context/AuthContext.tsx

// 1. Create the context
const AuthContext = createContext<AuthContextValue | null>(null);

// 2. Create the Provider component (wraps the entire app)
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 3. On mount: restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Also sync to cookie so Next.js middleware (server-side) can read it
      document.cookie = `token=${storedToken}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    }
    setIsLoading(false);  // Loading is done — render the page
  }, []);  // [] = run once on mount

  // 4. Login function
  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    // Store everywhere
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    document.cookie = `token=${res.data.token}; ...`;
    setToken(res.data.token);
    setUser(res.data.user);
  }

  // 5. Provide the value to all children
  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 6. Custom hook for consuming the context
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

**Why both localStorage AND a cookie?**

| Storage | Who reads it | When it's read |
|---|---|---|
| `localStorage` | JavaScript (browser only) | After the page loads |
| `cookie` | Next.js `middleware.ts` | Before the page loads (server-side) |

Next.js Middleware runs **before** the browser renders anything. At that point, JavaScript hasn't run yet, so `localStorage` is inaccessible. Cookies are sent with every HTTP request, so the middleware can read the token from there.

**`isLoading` state** — on the first render, `user` is `null` (not yet read from localStorage). Without `isLoading`, the root page would redirect to `/login` for a split second even if the user IS logged in. By waiting until `isLoading = false`, we avoid this flash.

### 6.3 Axios Instance & Interceptors

Rather than using `fetch` directly, we create a configured Axios instance:

```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  // All requests start with this base URL
  // api.get('/auth/me') → http://localhost:5000/api/auth/me
});

// REQUEST interceptor — runs before every outgoing request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {  // only in browser (not SSR)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Automatically attaches JWT to every request
      // Instead of manually adding headers to every api.get()/api.post() call
    }
  }
  return config;
});

// RESPONSE interceptor — runs on every incoming response
api.interceptors.response.use(
  (response) => response,  // success: pass through unchanged
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired or invalid → clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);  // re-throw so component can catch it
  }
);

export default api;
```

**Why `typeof window !== 'undefined'`?** Next.js renders some components on the server during SSR (Server-Side Rendering). On the server, `window` and `localStorage` don't exist. This check ensures we only touch them in the browser.

### 6.4 Next.js Middleware — Route Guard

`src/middleware.ts` runs at the **Edge** — before any page, layout, or component renders. It intercepts every navigation and decides whether to allow or redirect it.

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

function parseJwtPayload(token: string) {
  try {
    // JWT = header.payload.signature
    // payload is base64-encoded JSON
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public paths — no auth needed
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 2. Read JWT from cookie (not localStorage — middleware runs on server)
  const token = request.cookies.get('token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);  // remember where they were going
    return NextResponse.redirect(loginUrl);
  }

  // 3. Decode payload (we don't need to verify signature here — backend does that)
  // We only need the role to decide the redirect
  const payload = parseJwtPayload(token);
  if (!payload) return NextResponse.redirect(new URL('/login', request.url));

  const role = payload.role;

  // 4. Borrowers can't access /dashboard
  if (pathname.startsWith('/dashboard') && role === 'borrower') {
    return NextResponse.redirect(new URL('/personal-details', request.url));
  }

  // 5. Executives can't access the borrower portal
  if (pathname.startsWith('/personal-details') || pathname.startsWith('/upload') /* ... */) {
    if (role !== 'borrower') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD[role], request.url));
    }
  }

  return NextResponse.next();  // Allow the request
}

// Tell Next.js which paths to run middleware on (don't run on static files)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**Why not verify the JWT signature in middleware?** The Edge runtime has limitations — it doesn't support all Node.js APIs. The `jsonwebtoken` library requires Node.js crypto APIs not available at the Edge. Since the backend verifies the signature on every API call anyway, the middleware only needs the role from the payload to make routing decisions — which doesn't require signature verification.

### 6.5 Borrower Portal — Step by Step

#### Step 1: `/register` or `/login`

The login page calls `useAuth().login()`, which calls the API, stores the token, and then reads the role from localStorage to redirect:

```typescript
await login(email, password);
// After login(), AuthContext has updated state.
// Read the user to know where to redirect.
const stored = localStorage.getItem('user');
const u = JSON.parse(stored);
router.replace(ROLE_REDIRECT[u.role]);
// borrower → /personal-details
// sanction → /dashboard/sanction
```

#### Step 2: `/personal-details` — Personal Details + BRE

On page load, we **check if details already exist** (in case the user refreshes):

```typescript
useEffect(() => {
  api.get('/borrower/personal-details')
    .then((res) => {
      // Pre-fill the form with existing data
      setForm({ fullName: res.data.applicant.fullName, ... });
      if (res.data.applicant.breStatus === 'passed') {
        setLocked(true);  // Show "locked" state instead of the form
      }
    })
    .catch(() => {/* 404 = no record yet, that's fine */});
}, []);
```

On submit, the component sends data to the backend and handles the response:

```typescript
try {
  await api.post('/borrower/personal-details', formData);
  router.push('/upload');  // BRE passed → move to next step
} catch (err) {
  // 422 response contains errors[]
  const res = err?.response?.data;
  if (res?.errors?.length) {
    setServerErrors(res.errors);  // Show BRE errors in the UI
  }
}
```

#### Step 3: `/upload` — Salary Slip Upload

The upload uses a `FormData` object (not JSON), because files can't be JSON-encoded:

```typescript
async function handleUpload(e) {
  const formData = new FormData();
  formData.append('salarySlip', file);
  // Note: no Content-Type header — axios automatically sets multipart/form-data

  const res = await api.post('/borrower/upload-salary-slip', formData);
  setUploaded({ filePath: res.data.filePath, originalName: res.data.originalName });
}

function handleContinue() {
  // Store the file info in sessionStorage to pass to the next step
  // sessionStorage = cleared when the browser tab is closed (unlike localStorage)
  sessionStorage.setItem('salarySlip', JSON.stringify(uploaded));
  router.push('/loan-config');
}
```

**Client-side file validation** (before sending to server):

```typescript
function handleFileChange(f) {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowed.includes(f.type)) {
    setClientError('Only PDF, JPG, and PNG files are accepted');
    return;
  }
  if (f.size > 5 * 1024 * 1024) {
    setClientError('File size must not exceed 5 MB');
    return;
  }
  setFile(f);
}
```

Client validation gives **instant feedback** without a round trip to the server. But the server still validates too — defense in depth.

#### Step 4: `/loan-config` — Sliders + Live Calculation

```typescript
const [loanAmount, setLoanAmount] = useState(150000);
const [tenure, setTenure] = useState(90);

// These recalculate on every render (every time a slider moves)
const si = calculateSI(loanAmount, tenure);
const total = loanAmount + si;

// SI formula: (P × R × T) / (365 × 100)
// P = principal (loanAmount), R = 12 (fixed), T = tenure in days
```

The HTML range input:

```tsx
<input
  type="range"
  min={50000}
  max={500000}
  step={5000}          // moves in ₹5,000 increments
  value={loanAmount}
  onChange={(e) => setLoanAmount(Number(e.target.value))}
  className="w-full accent-brand-600"
/>
```

React's **controlled input** — `value={loanAmount}` makes React own the value. Every time the slider moves, `onChange` fires → state updates → component re-renders → new calculation displayed. This is why the panel updates live.

On "Apply":

```typescript
async function handleApply() {
  await api.post('/borrower/apply', {
    loanAmount,
    tenure,
    salarySlipPath: salarySlip.filePath,      // from sessionStorage
    salarySlipOriginalName: salarySlip.originalName,
  });
  sessionStorage.removeItem('salarySlip');    // clean up
  router.push('/status');
}
```

### 6.6 Operations Dashboard — All 4 Modules

#### Dashboard Layout with Role-Aware Sidebar

```typescript
// src/app/(dashboard)/layout.tsx
const ALL_MODULES = [
  { href: '/dashboard/sales', label: 'Sales', role: 'sales', icon: '👥' },
  { href: '/dashboard/sanction', label: 'Sanction', role: 'sanction', icon: '📋' },
  { href: '/dashboard/disbursement', label: 'Disbursement', role: 'disbursement', icon: '💸' },
  { href: '/dashboard/collection', label: 'Collection', role: 'collection', icon: '💰' },
];

// Filter modules based on the logged-in user's role
const visibleModules = ALL_MODULES.filter(
  (m) => user?.role === 'admin' || user?.role === m.role
  // Admin sees all 4, each executive sees only their own
);
```

Note: **Hiding a menu item is not enough** — a malicious user could navigate directly to `/dashboard/sanction` even if the sidebar doesn't show it. That's why the API routes also have `authorizeRoles()` middleware. The sidebar is just UX.

#### Sanction Module — Reject Modal

The rejection flow uses local state to control a modal:

```typescript
const [rejectTarget, setRejectTarget] = useState<string | null>(null);
// null = modal closed, "loanId" = modal open for that loan

// When the user clicks "Reject" for a loan:
onClick={() => setRejectTarget(app._id)}

// The modal is conditionally rendered:
{rejectTarget && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <textarea
      value={rejectReason}
      onChange={(e) => setRejectReason(e.target.value)}
      placeholder="Reason for rejection..."
    />
    <button onClick={submitReject} disabled={!rejectReason.trim()}>
      Confirm Rejection
    </button>
  </div>
)}
```

`fixed inset-0` = `position: fixed; top: 0; right: 0; bottom: 0; left: 0` → covers the entire viewport. `z-50` = high z-index, appears on top of everything. `bg-black/40` = semi-transparent black backdrop.

#### Collection Module — Two-Panel Layout

```typescript
// Left: loan list (flex-1 = takes remaining space)
// Right: payment panel (w-96 = fixed width, sticky = stays in view while scrolling)
<div className="flex gap-6">
  <div className="flex-1">   {/* Loans table */} </div>
  {selectedLoan && (
    <div className="w-96 sticky top-0">   {/* Payment history + form */} </div>
  )}
</div>
```

When a loan is selected, the right panel shows:
1. Running totals (total repayment, paid, outstanding).
2. "Record Payment" button → expands an inline form.
3. Payment history list.

After recording a payment, the component refreshes BOTH the loans list (to update outstanding column) and the payment history:

```typescript
async function recordPayment() {
  await api.post(`/operations/collection/loans/${selectedLoan._id}/payments`, paymentForm);
  fetchLoans();       // Refresh left panel
  const res = await api.get(`/operations/collection/loans/${selectedLoan._id}/payments`);
  setPayments(res.data.payments);  // Refresh right panel
  // Update selectedLoan's totals
  setSelectedLoan(prev => ({
    ...prev,
    totalPaid: res.data.totalPaid,
    outstanding: res.data.outstanding,
  }));
}
```

---

## 7. Role-Based Access Control (RBAC)

RBAC is enforced at **three layers**:

### Layer 1: Next.js Middleware (Client → Server: before page renders)

```
Browser navigates to /dashboard/sanction
            │
            ▼
    Next.js middleware.ts runs
    • Reads cookie 'token'
    • Decodes JWT payload
    • Checks role
    • If role = 'disbursement' → redirects to /dashboard/disbursement
    • If role = 'borrower' → redirects to /personal-details
    • If role = 'sanction' → allows the page to load
```

### Layer 2: Frontend — Sidebar filtering (UX only)

```typescript
const visibleModules = ALL_MODULES.filter(
  m => user?.role === 'admin' || user?.role === m.role
);
// A sanction executive only sees the "Sanction" link in the sidebar.
// But this is ONLY for visual clarity — it doesn't enforce security.
```

### Layer 3: Backend — API middleware (request → handler)

```
GET /api/operations/sanction/applications
            │
            ▼
    verifyToken()
    • Validates JWT signature
    • Sets req.user.role
            │
            ▼
    authorizeRoles('sanction', 'admin')
    • Checks req.user.role against ['sanction', 'admin']
    • If 'disbursement': 403 Forbidden
    • If 'sanction': next() → handler runs
```

**Why all three layers?**

| Layer | Protects against |
|---|---|
| Middleware | Casual navigation, expired sessions |
| Sidebar hiding | Confusing UX (seeing options you can't use) |
| API middleware | Malicious requests (bypassing the frontend entirely) |

An attacker can ignore the frontend and send HTTP requests directly to the API with a valid JWT of the wrong role. Only Layer 3 stops them.

### HTTP Status Codes used

| Code | Meaning | When we use it |
|---|---|---|
| 200 | OK | Successful GET / update |
| 201 | Created | New resource created (user, loan, payment) |
| 400 | Bad Request | Missing required fields, invalid amount |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but wrong role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, duplicate UTR, locked BRE |
| 422 | Unprocessable Entity | BRE failed (valid request, business logic rejection) |
| 500 | Internal Server Error | Unexpected server crash |

---

## 8. Loan Lifecycle

### Status State Machine

```
                    ┌──────────┐
                    │ PENDING  │  ← Created when borrower applies
                    └────┬─────┘
                         │ Sanction executive reviews
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
    ┌────────────┐             ┌──────────┐
    │ SANCTIONED │             │ REJECTED │  ← Terminal state (with reason)
    └─────┬──────┘             └──────────┘
          │ Disbursement executive acts
          ▼
    ┌──────────────┐
    │  DISBURSED   │  ← Funds released to borrower
    └──────┬───────┘
           │ Collection records payments until fully paid
           ▼
    ┌──────────┐
    │  CLOSED  │  ← Auto-triggered when totalPaid >= totalRepayment
    └──────────┘
```

### Valid transitions by role

| From | To | Who | API Endpoint |
|---|---|---|---|
| `pending` | `sanctioned` | sanction, admin | `PATCH /sanction/applications/:id/approve` |
| `pending` | `rejected` | sanction, admin | `PATCH /sanction/applications/:id/reject` |
| `sanctioned` | `disbursed` | disbursement, admin | `PATCH /disbursement/applications/:id/disburse` |
| `disbursed` | `closed` | collection, admin (auto) | `POST /collection/loans/:id/payments` |

### Invalid transitions (guarded by backend)

```typescript
// Trying to disburse a pending loan:
if (loan.status !== 'sanctioned') {
  res.status(409).json({ message: `Cannot disburse a loan with status: ${loan.status}` });
}

// Trying to record payment on a closed loan:
if (loan.status !== 'disbursed') {
  res.status(409).json({ message: `Cannot record payment for loan with status: ${loan.status}` });
}
```

---

## 9. Interest Calculation

### Simple Interest Formula

$$SI = \frac{P \times R \times T}{365 \times 100}$$

Where:
- **P** = Principal amount (loan amount in rupees)
- **R** = Annual interest rate = **12** (fixed)
- **T** = Tenure in **days** (30–365)
- **365** = Days in a year (day-count convention for daily interest)
- **100** = Converts R from percentage to decimal

```typescript
// src/services/loan.service.ts
export function calculateSI(principal: number, tenureDays: number, ratePercent = 12): number {
  return (principal * ratePercent * tenureDays) / (365 * 100);
}

export function calculateTotalRepayment(principal: number, tenureDays: number): number {
  return principal + calculateSI(principal, tenureDays);
}
```

### Example calculation

```
P = ₹1,00,000  R = 12%  T = 90 days

SI = (1,00,000 × 12 × 90) / (365 × 100)
   = 1,08,00,00,000 / 36,500
   = ₹2,958.90

Total Repayment = ₹1,00,000 + ₹2,958.90 = ₹1,02,958.90
```

The same function is used in **both** `frontend/src/lib/utils.ts` (for live preview) and `backend/src/services/loan.service.ts` (for the stored value). This is a monorepo benefit — you could even share the code directly if needed, but having it in two places lets each project own its own implementation.

### Outstanding balance calculation

There is no `outstandingBalance` field stored on the loan. It's calculated on the fly:

```typescript
const payments = await Payment.find({ loanApplicationId: loan._id });
const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
const outstanding = loan.totalRepayment - totalPaid;
```

**Why not store it?** Storing derived data creates the risk of it going out of sync. The `totalRepayment` is fixed at apply time. The payment records are the source of truth. Outstanding is always derivable from those two facts.

---

## 10. Complete Request-Response Flows

### Flow 1: Borrower Registration

```
Browser                    Frontend              Backend              MongoDB
   │                          │                     │                    │
   │─── type email/password ──▶│                     │                    │
   │                          │                     │                    │
   │─── click Register ───────▶│                     │                    │
   │                          │─── POST /auth/register ──────────────────▶│
   │                          │    { email, password }                    │
   │                          │                     │                    │
   │                          │                     │─── findOne ────────▶│
   │                          │                     │◀── null (no user) ──│
   │                          │                     │                    │
   │                          │                     │─── bcrypt.hash ─── │ (CPU work, ~250ms)
   │                          │                     │                    │
   │                          │                     │─── User.create ────▶│
   │                          │                     │◀── { _id, email } ──│
   │                          │                     │                    │
   │                          │                     │─── jwt.sign ───────│ (sync)
   │                          │                     │                    │
   │                          │◀─── 201 { token, user } ─────────────────│
   │                          │                     │                    │
   │                          │── localStorage.setItem('token') ──────────│
   │                          │── document.cookie = 'token=...' ─────────│
   │                          │── router.replace('/personal-details') ────│
   │                          │                     │                    │
   │◀── page: /personal-details ──────────────────────────────────────────│
```

### Flow 2: BRE Check + Pass

```
Browser              Frontend             Backend            MongoDB
   │                    │                    │                  │
   │─── fill form ──────▶│                    │                  │
   │─── submit ──────────▶│                   │                  │
   │                    │─── POST /borrower/personal-details ──▶│
   │                    │    Authorization: Bearer <token>       │
   │                    │    { fullName, pan, dob, salary, emp } │
   │                    │                    │                  │
   │                    │                    │── jwt.verify ─── │ (validates token)
   │                    │                    │── runBRE() ───── │ (pure function)
   │                    │                    │                  │
   │                    │                    │── Applicant.create ──────────▶│
   │                    │                    │◀─── saved doc ────────────────│
   │                    │                    │                  │
   │                    │◀── 200 { breStatus: 'passed' } ───────│
   │                    │                    │                  │
   │                    │── router.push('/upload') ─────────────│
   │◀── page: /upload ──────────────────────────────────────────│
```

### Flow 3: Payment + Auto-Close

```
Browser           Frontend         Backend                       MongoDB
   │                 │                │                             │
   │─── fill UTR/amt/date ──────────▶│                             │
   │─── click Save ──────────────────▶│                            │
   │                 │─── POST /collection/loans/:id/payments ────▶│
   │                 │                │                             │
   │                 │                │── findById(loan) ──────────▶│
   │                 │                │◀── loan (disbursed) ─────────│
   │                 │                │                             │
   │                 │                │── find all payments ────────▶│
   │                 │                │◀── [p1, p2, p3] ─────────────│
   │                 │                │                             │
   │                 │                │── totalPaid = sum([p1,p2,p3])│
   │                 │                │── outstanding = total - paid │
   │                 │                │── validate: amount <= outstanding │
   │                 │                │── findOne UTR (unique check) ▶│
   │                 │                │                             │
   │                 │                │── Payment.create ───────────▶│
   │                 │                │◀── saved payment ────────────│
   │                 │                │                             │
   │                 │                │── newTotal >= totalRepayment?│
   │                 │                │   YES: loan.status = 'closed'│
   │                 │                │── loan.save() ──────────────▶│
   │                 │                │                             │
   │                 │◀── 201 { loanStatus: 'closed', outstanding: 0 } │
   │                 │                │                             │
   │                 │── update UI: loan is CLOSED ─────────────────│
   │◀── UI shows "closed" badge ──────────────────────────────────────│
```

---

## 11. TypeScript — How We Use It

### Interfaces vs Types

We use `interface` for object shapes and `type` for unions:

```typescript
// Union type — one of these exact string values
export type Role = 'admin' | 'sales' | 'sanction' | 'disbursement' | 'collection' | 'borrower';
export type LoanStatus = 'pending' | 'sanctioned' | 'rejected' | 'disbursed' | 'closed';

// Interface — shape of an object
export interface User {
  id: string;
  email: string;
  role: Role;  // Using the Role type here!
}
```

### Generic Mongoose Models

```typescript
// model<IUser>('User', UserSchema)
//     ↑
//     TypeScript generic — tells TypeScript that documents
//     returned from this model conform to the IUser interface.
//
// So when you write:
const user = await User.findById(id);
// TypeScript knows user is IUser | null
// user.email is a string (not any)
// user.invalidProperty → TypeScript ERROR
```

### The Non-Null Assertion Operator (`!`)

```typescript
req.user!.id
//      ↑
// "I (the developer) promise this is not null/undefined"
// Used after verifyToken middleware, where we KNOW req.user has been set
```

### Optional Properties (`?`)

```typescript
interface ILoanApplication {
  rejectionReason?: string;  // May or may not exist
  disbursedAt?: Date;        // May or may not exist
}

// When accessing optional properties:
if (loan.rejectionReason) {
  console.log(loan.rejectionReason);  // TypeScript knows it's a string here
}
```

### Type Assertions (`as`)

```typescript
const decoded = jwt.verify(token, secret) as JwtPayload;
// jwt.verify returns 'string | JwtPayload' (the library's generic type)
// We KNOW in this context it's our specific JwtPayload shape
// 'as' is a cast — "trust me, it's this type"
```

---

## 12. Common Concepts Explained for Beginners

### What is async/await?

JavaScript is single-threaded. Without async/await, code waiting for I/O (database query, HTTP request) would block everything:

```javascript
// Old callback style (JavaScript "callback hell")
User.findOne({ email }, (err, user) => {
  if (err) { /* handle error */ }
  bcrypt.compare(password, user.password, (err, match) => {
    if (err) { /* handle error */ }
    jwt.sign({ id: user.id }, secret, (err, token) => {
      res.json({ token });
    });
  });
});

// Modern async/await style (same logic, much more readable)
try {
  const user = await User.findOne({ email });
  const match = await bcrypt.compare(password, user.password);
  const token = await jwt.sign({ id: user.id }, secret);
  res.json({ token });
} catch (err) {
  res.status(500).json({ error: err.message });
}
```

`await` pauses execution of the **current function** (not the whole program) until the Promise resolves. The event loop can handle other requests while waiting.

### What is a Promise?

A Promise represents a value that will be available in the future:

```javascript
// Creating a Promise
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 1000);
});

// Consuming a Promise
promise.then(value => console.log(value));   // 'done' after 1 second
// or with await:
const value = await promise;   // 'done'
```

Most async operations in Node.js (database queries, file system, HTTP requests) return Promises.

### What is React State?

State is data that, when changed, causes a component to re-render:

```typescript
const [loanAmount, setLoanAmount] = useState(150000);
//        ↑             ↑               ↑
//   current value  setter function  initial value

// When the slider moves:
setLoanAmount(200000);
// → React re-renders the component
// → New value of loanAmount is 200000
// → SI calculation updates
// → New DOM is generated and displayed
```

### What is useEffect?

`useEffect` runs code **after** a component renders:

```typescript
useEffect(() => {
  // This runs after the component first appears on screen
  api.get('/borrower/personal-details').then(res => {
    setForm(res.data.applicant);
  });
}, []);   // [] = run only once (on mount)
```

The second argument is the **dependency array**. If you put a value in it, the effect re-runs whenever that value changes:

```typescript
useEffect(() => {
  console.log('loan amount changed:', loanAmount);
}, [loanAmount]);   // runs every time loanAmount changes
```

### What is a REST API?

REST (Representational State Transfer) is a convention for HTTP APIs:

```
CRUD operation → HTTP method + URL

Create → POST   /api/loans
Read   → GET    /api/loans/:id
Update → PATCH  /api/loans/:id
Delete → DELETE /api/loans/:id
```

- **POST** creates resources and sends data in the request body.
- **GET** retrieves resources — no body, data goes in URL params or query string.
- **PATCH** partially updates a resource (vs PUT which replaces entirely).
- **DELETE** removes a resource.

Status codes signal the outcome: 2xx = success, 4xx = client error, 5xx = server error.

### What is CORS?

Browsers enforce the **Same-Origin Policy** — JavaScript on `http://localhost:3000` cannot make requests to `http://localhost:5000` by default (different port = different origin).

The server opts in to allow specific origins by sending CORS headers:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

Our backend sets these via the `cors` middleware:

```typescript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,   // Allows cookies to be sent cross-origin
}));
```

### What is an Index in MongoDB?

An index is a data structure that makes queries faster — instead of scanning every document, MongoDB can jump directly to matching ones.

```typescript
// In our Payment model:
utrNumber: { type: String, unique: true }
// 'unique: true' automatically creates a unique index.
// MongoDB will reject any document where utrNumber already exists.

// Also:
email: { type: String, unique: true }
// Two users cannot have the same email.
```

Without an index on `email`, a login query `User.findOne({ email })` would scan every user document. With an index, it's a direct lookup — O(log n) instead of O(n).

---

## Summary: How Everything Connects

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           BROWSER                                        │
│                                                                          │
│  React Components  →  useAuth() hook  →  api.ts (axios)                 │
│       │                   │                   │                          │
│  UI renders from    reads from           adds JWT to                     │
│  React state        AuthContext          every request                   │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │  HTTP request with
                                       │  Authorization: Bearer <token>
                                       │
┌──────────────────────────────────────▼───────────────────────────────────┐
│                        EXPRESS BACKEND                                   │
│                                                                          │
│  CORS → JSON parser → verifyToken → authorizeRoles → Controller         │
│                             │              │              │              │
│                       validates JWT   checks role    business logic      │
│                       sets req.user  returns 403     calls Mongoose      │
│                                       if wrong       calls BRE/loan      │
│                                       role           service             │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │  Mongoose queries
                                       │
┌──────────────────────────────────────▼───────────────────────────────────┐
│                           MONGODB                                        │
│                                                                          │
│  users ←──── applicants ←──── loanapplications ←──── payments           │
│                                                                          │
│  Indexes: users.email (unique), payments.utrNumber (unique)              │
└──────────────────────────────────────────────────────────────────────────┘
```

Every borrower action flows:
1. React component → calls `api.post()`
2. Axios interceptor adds JWT header
3. Express middleware validates token and role
4. Controller runs business logic (BRE, loan math)
5. Mongoose saves/queries MongoDB
6. Response flows back and React state updates

Every dashboard action follows the same path, but with stricter role guards — a sanction executive's token passes `authorizeRoles('sanction', 'admin')` and fails `authorizeRoles('disbursement', 'admin')`, making it physically impossible (not just visually hidden) to cross module boundaries.
