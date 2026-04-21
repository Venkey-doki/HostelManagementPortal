# Hostel Management Portal — Master System Design Document

> **Purpose:** This is the authoritative reference document for the Hostel Management Portal. Every architectural decision, database schema, business rule, algorithm, API route, and implementation guideline is contained here. Use this as the single source of truth when generating code.

---

## Project Snapshot

| Attribute             | Value                                            |
| --------------------- | ------------------------------------------------ |
| System type           | Single-college hostel + mess management platform |
| Students              | ~2,000 (2,000 active at peak)                    |
| Hostels               | 5 boys hostels + 3 girls hostels = **8 total**   |
| Messes                | 2 boys messes + 1 girls mess = **3 total**       |
| Peak concurrent users | ~500                                             |
| Architecture          | Modular Monolith                                 |
| Database              | PostgreSQL (Prisma ORM)                          |
| Cache + Queue         | Redis + BullMQ                                   |
| Frontend              | **React 18 (Vite + React Router v6)**            |
| Backend               | Node.js + Express                                |
| Language              | TypeScript end-to-end                            |
| File Storage          | Cloudinary                                       |
| Email                 | Resend                                           |

---

## Table of Contents

1. [Tech Stack Decisions & Justifications](#1-tech-stack-decisions--justifications)
2. [System Architecture](#2-system-architecture)
3. [Database Design — Full Schema](#3-database-design--full-schema)
4. [Backend Design](#4-backend-design)
5. [Frontend Design](#5-frontend-design)
6. [Billing Engine — Full Algorithm](#6-billing-engine--full-algorithm)
7. [Leave Engine — State Machine](#7-leave-engine--state-machine)
8. [Complaint System](#8-complaint-system)
9. [Background Jobs (BullMQ + Redis)](#9-background-jobs-bullmq--redis)
10. [Notification System](#10-notification-system)
11. [Security](#11-security)
12. [Caching Strategy (Redis)](#12-caching-strategy-redis)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Implementation Roadmap](#14-implementation-roadmap)

---

## 1. Tech Stack Decisions & Justifications

### Architecture Pattern: Modular Monolith ✓

**Why NOT microservices?**
At 2,000 students with a peak of ~500 concurrent users, microservices would add network latency, distributed transaction complexity, and operational overhead with zero benefit. A modular monolith gives you clean module boundaries (each domain is its own folder/service class) that can be extracted into separate services later if the system ever needs it. Start right, not over-engineered.

### Database: PostgreSQL ✓ (not MongoDB)

**Why PostgreSQL?**
This system is **fundamentally relational and transactional**. Billing calculations involve joining `students → mess_assignments → attendance → leaves → extras` — all with strict consistency requirements. MongoDB's flexible schema offers nothing here and costs you JOIN performance, ACID guarantees on multi-collection writes, and proper foreign key constraints. PostgreSQL with Prisma ORM is the correct tool.

### Cache + Queue: Redis ✓

Redis serves two roles:

- **Cache:** Dashboard stats, monthly bills once generated, student attendance calendars — all cacheable with TTLs.
- **Queue:** BullMQ runs on Redis for leave auto-approval, billing generation, and notification dispatch jobs. Redis is the only dependency you need to add beyond PostgreSQL.

### Frontend: React 18 + Vite + React Router v6 ✓

- **Vite** replaces the Next.js dev server — near-instant HMR and fast production builds
- **React Router v6** handles all client-side routing, replacing Next.js App Router. Route-level code splitting is done with `React.lazy()` + `Suspense`
- **No server-side rendering** — the app is a fully client-side SPA. The Express backend already handles all data. SSR is not needed at this scale (500 concurrent users on a local college network)
- **Per-role route guards** implemented with a `<ProtectedRoute>` wrapper component (replaces Next.js layout-level auth guards)
- **React Query** handles all server state; **Zustand** handles auth user + notification count
- All pages load via the browser; Vite bundles are served as static files (Nginx / Render static site / Vercel)

### ORM: Prisma ✓

Prisma generates TypeScript types from the schema — no runtime type mismatches in billing calculations. Migration system is battle-tested. The alternative (raw SQL via `pg`) adds risk when working with complex billing joins. Prisma's query builder is performant enough for this scale.

### Supporting Services

| Service      | Choice     | Reason                                                                                               |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| File Storage | Cloudinary | Generous free tier, accepts payment screenshots, returns stable CDN URLs. No infrastructure vs S3.   |
| Email        | Resend     | 3,000 free emails/month, excellent deliverability, simple API.                                       |
| Validation   | Zod        | Single schema definition on both frontend and backend. Shared validation logic, runtime type safety. |

---

## 2. System Architecture

### High-Level Component Map

```
┌─────────────────── Client Tier ──────────────────────┐
│                                                       │
│   React 18 SPA (Vite) — deployed as static files     │
│   ├── /student  (attendance, leaves, bills, complaints)│
│   ├── /incharge (mark attendance, add extras)         │
│   ├── /warden   (approvals, payments, reports)        │
│   └── /admin    (users, hostels, messes, billing cfg) │
│                                                       │
└───────────────────────┬───────────────────────────────┘
                        │ HTTPS / REST API (versioned /api/v1)
┌───────────────────────▼───────────────────────────────┐
│              Express API Server (Node.js)              │
│                                                       │
│   ┌───────────┐  ┌─────────────┐  ┌───────────────┐  │
│   │   Auth    │  │  Middleware │  │  Rate Limiter  │  │
│   │ JWT/RBAC  │  │ Audit + Log │  │  (express-rls) │  │
│   └───────────┘  └─────────────┘  └───────────────┘  │
│                                                       │
│   ┌─────────────────────────────────────────────────┐ │
│   │               Module Layer                      │ │
│   │  auth · students · attendance · leaves          │ │
│   │  billing · payments · complaints · reports      │ │
│   │  notifications · admin · messes · hostels       │ │
│   └─────────────────────────────────────────────────┘ │
│                                                       │
└───────┬─────────────────┬──────────────┬─────────────┘
        │                 │              │
┌───────▼──────┐  ┌───────▼────┐  ┌─────▼──────────────┐
│  PostgreSQL  │  │   Redis    │  │   BullMQ Workers    │
│  (primary)   │  │ (cache +   │  │ ├── leaveAutoApprove│
│              │  │  queues)   │  │ ├── billingGenerate  │
│  Prisma ORM  │  │            │  │ └── notificationSend │
└──────────────┘  └────────────┘  └────────────────────┘
        │                                    │
┌───────▼──────┐                   ┌────────▼──────────┐
│  Cloudinary  │                   │  Resend (Email)   │
│  (file store)│                   │  In-App notifs    │
└──────────────┘                   └───────────────────┘
```

### Request Lifecycle

```
Client Request
    │
    ▼
Rate Limiter (express-rate-limit)
    │
    ▼
Auth Middleware (verify JWT, attach req.user)
    │
    ▼
RBAC Middleware (check role permissions)
    │
    ▼
Zod Validation (validate request body/params/query)
    │
    ▼
Controller → Service → Repository (Prisma)
    │
    ├── Cache check (Redis) ──── hit → return cached
    │
    ▼ miss
Database Query (PostgreSQL)
    │
    ▼
Audit Logger (async, non-blocking)
    │
    ▼
Response
```

---

## 3. Database Design — Full Schema

### Design Principles

- All tables use **UUID primary keys** (avoids enumeration attacks)
- **Soft deletes** on all critical tables via `deleted_at` to preserve billing history
- All monetary values stored as **`DECIMAL(10,2)`** — never float
- Timestamps use **`TIMESTAMPTZ`** for timezone safety
- Every foreign key has an index
- **18 tables total**

### Entity Relationships

```
users ──────────────────────── students
                                  │
              ┌───────────────────┼───────────────────────┐
              │                   │                       │
       hostel_assignments   mess_assignments           leaves
              │                   │                       │
           hostels              messes               attendance
              │                   │
            rooms          incharge_assignments
              │                   │
       hostel_rent_config      mess_extra_items
                                   │
                              student_extras
                                   │
                                 bills
                                   │
                         ┌─────────┴──────────┐
                    bill_line_items         payments
                                                │
                                           technicians
                                                │
                                           complaints
                                                │
                                         notifications
                                                │
                                           audit_logs
```

---

### 3.1 Core Identity Tables

```sql
-- ═══════════════════════════════════════════
-- USERS  (all system users, single auth table)
-- ═══════════════════════════════════════════
users {
  id              UUID          PK  DEFAULT gen_random_uuid()
  email           VARCHAR(255)  UNIQUE NOT NULL
  password_hash   VARCHAR(255)  NOT NULL
  role            ENUM          NOT NULL
                  -- WARDEN | MESS_INCHARGE | STUDENT
  first_name      VARCHAR(100)  NOT NULL
  last_name       VARCHAR(100)  NOT NULL
  phone           VARCHAR(20)
  is_active       BOOLEAN       DEFAULT true
  must_change_pwd BOOLEAN       DEFAULT true   -- force change on first login
  last_login_at   TIMESTAMPTZ
  deleted_at      TIMESTAMPTZ                  -- soft delete
  created_at      TIMESTAMPTZ   DEFAULT now()
  updated_at      TIMESTAMPTZ   DEFAULT now()

  INDEX: (email), (role), (is_active)
}

-- ═══════════════════════════════════════════
-- STUDENTS  (extends users for student-specific fields)
-- ═══════════════════════════════════════════
students {
  id             UUID         PK
  user_id        UUID         FK → users  UNIQUE NOT NULL
  roll_number    VARCHAR(50)  UNIQUE NOT NULL
  gender         ENUM         NOT NULL  -- MALE | FEMALE
  department     VARCHAR(100)
  academic_year  SMALLINT               -- e.g., 2024
  batch          VARCHAR(20)            -- e.g., "2022-2026"
  is_active      BOOLEAN      DEFAULT true
  deleted_at     TIMESTAMPTZ
  created_at     TIMESTAMPTZ  DEFAULT now()

  INDEX: (roll_number), (user_id), (gender)
}
```

---

### 3.2 Hostel & Mess Structure Tables

```sql
-- ═══════════════════════════════════════════
-- HOSTELS
-- ═══════════════════════════════════════════
hostels {
  id         UUID          PK
  name       VARCHAR(100)  UNIQUE NOT NULL
  gender     ENUM          NOT NULL  -- MALE | FEMALE
  is_active  BOOLEAN       DEFAULT true
  created_at TIMESTAMPTZ
}

-- ═══════════════════════════════════════════
-- ROOMS
-- ═══════════════════════════════════════════
rooms {
  id          UUID          PK
  hostel_id   UUID          FK → hostels
  room_number VARCHAR(20)   NOT NULL
  capacity    SMALLINT      DEFAULT 2
  is_active   BOOLEAN       DEFAULT true

  UNIQUE(hostel_id, room_number)
  INDEX: (hostel_id)
}

-- ═══════════════════════════════════════════
-- HOSTEL_ASSIGNMENTS  (student ↔ room history)
-- ═══════════════════════════════════════════
hostel_assignments {
  id          UUID    PK
  student_id  UUID    FK → students
  hostel_id   UUID    FK → hostels
  room_id     UUID    FK → rooms
  start_date  DATE    NOT NULL
  end_date    DATE             -- NULL = current assignment
  is_current  BOOLEAN DEFAULT true
  created_by  UUID    FK → users
  created_at  TIMESTAMPTZ

  INDEX: (student_id, is_current)
  INDEX: (room_id, is_current)
  -- Enforce single current assignment:
  UNIQUE partial index: (student_id) WHERE is_current = true
}

-- ═══════════════════════════════════════════
-- MESSES
-- ═══════════════════════════════════════════
messes {
  id              UUID           PK
  name            VARCHAR(100)   UNIQUE NOT NULL
  gender          ENUM           NOT NULL  -- MALE | FEMALE
  per_day_charge  DECIMAL(10,2)  NOT NULL  -- configurable per mess
  is_active       BOOLEAN        DEFAULT true
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
}

-- ═══════════════════════════════════════════
-- MESS_ASSIGNMENTS  (student ↔ mess, no mid-semester switch)
-- ═══════════════════════════════════════════
mess_assignments {
  id          UUID    PK
  student_id  UUID    FK → students
  mess_id     UUID    FK → messes
  start_date  DATE    NOT NULL
  end_date    DATE             -- NULL = current
  is_current  BOOLEAN DEFAULT true
  created_by  UUID    FK → users
  created_at  TIMESTAMPTZ

  INDEX: (student_id, is_current)
  UNIQUE partial index: (student_id) WHERE is_current = true
}

-- ═══════════════════════════════════════════
-- INCHARGE_ASSIGNMENTS  (mess_incharge ↔ mess history)
-- ═══════════════════════════════════════════
incharge_assignments {
  id          UUID    PK
  user_id     UUID    FK → users  (role must be MESS_INCHARGE)
  mess_id     UUID    FK → messes
  start_date  DATE    NOT NULL
  end_date    DATE             -- NULL = current
  is_current  BOOLEAN DEFAULT true
  created_at  TIMESTAMPTZ

  UNIQUE partial index: (mess_id) WHERE is_current = true
}

-- ═══════════════════════════════════════════
-- HOSTEL_RENT_CONFIG
-- ═══════════════════════════════════════════
hostel_rent_config {
  id             UUID           PK
  hostel_id      UUID           FK → hostels
  academic_year  VARCHAR(10)    NOT NULL  -- e.g., "2024-25"
  semester       ENUM           NOT NULL  -- FIRST | SECOND
  amount         DECIMAL(10,2)  NOT NULL
  due_month      SMALLINT       NOT NULL  -- 1-12: which month this appears on bill
  created_by     UUID           FK → users
  created_at     TIMESTAMPTZ

  UNIQUE(hostel_id, academic_year, semester)
}
```

---

### 3.3 Attendance & Leave Tables

```sql
-- ═══════════════════════════════════════════
-- ATTENDANCE  (daily per student)
-- ═══════════════════════════════════════════
attendance {
  id          UUID     PK
  student_id  UUID     FK → students
  mess_id     UUID     FK → messes
  date        DATE     NOT NULL
  breakfast   BOOLEAN  DEFAULT false
  lunch       BOOLEAN  DEFAULT false
  dinner      BOOLEAN  DEFAULT false
  -- is_present is DERIVED: (breakfast OR lunch OR dinner)
  -- BILLING RULE: if present for ANY meal → charged full day
  marked_by   UUID     FK → users
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ

  UNIQUE(student_id, date)      -- one record per student per day
  INDEX: (student_id, date)
  INDEX: (mess_id, date)
}

-- ═══════════════════════════════════════════
-- MESS_DAY_WAIVERS  (incharge marks a whole day as free)
-- ═══════════════════════════════════════════
mess_day_waivers {
  id          UUID          PK
  mess_id     UUID          FK → messes
  date        DATE          NOT NULL
  reason      VARCHAR(255)
  created_by  UUID          FK → users
  created_at  TIMESTAMPTZ

  UNIQUE(mess_id, date)
  INDEX: (mess_id, date)
}

-- ═══════════════════════════════════════════
-- LEAVES
-- ═══════════════════════════════════════════
leaves {
  id               UUID          PK
  student_id       UUID          FK → students
  start_date       DATE          NOT NULL
  end_date         DATE          NOT NULL
  duration         SMALLINT      NOT NULL  -- end - start + 1 (precomputed)
  reason           TEXT
  status           ENUM          NOT NULL
                   -- PENDING | APPROVED | REJECTED | AUTO_APPROVED | CANCELLED
  applied_on       TIMESTAMPTZ   DEFAULT now()
  auto_approve_at  TIMESTAMPTZ   NOT NULL   -- applied_on + 2 days (SET AT CREATION)
  actioned_by      UUID          FK → users   NULL
  actioned_at      TIMESTAMPTZ              NULL
  return_date      DATE                     NULL  -- student returned early
  rejection_reason TEXT                     NULL
  created_at       TIMESTAMPTZ
  updated_at       TIMESTAMPTZ

  INDEX: (student_id, status)
  INDEX: (status, auto_approve_at)  -- for auto-approval job query
  INDEX: (start_date, end_date)     -- for billing overlap queries

  -- CONSTRAINT: end_date >= start_date
  -- CONSTRAINT: duration = end_date - start_date + 1
  -- APP-LAYER: start_date >= CURRENT_DATE + 2 (enforced in service, not DB)
}
```

---

### 3.4 Billing & Payment Tables

```sql
-- ═══════════════════════════════════════════
-- BILLS  (monthly per student, frozen on generation)
-- ═══════════════════════════════════════════
bills {
  id                UUID           PK
  student_id        UUID           FK → students
  billing_month     DATE           NOT NULL  -- first day of the month e.g. 2025-05-01
  hostel_rent       DECIMAL(10,2)  DEFAULT 0
  mess_charges      DECIMAL(10,2)  DEFAULT 0
  extras_total      DECIMAL(10,2)  DEFAULT 0
  total_amount      DECIMAL(10,2)  NOT NULL
  amount_paid       DECIMAL(10,2)  DEFAULT 0
  balance_due       DECIMAL(10,2)  -- GENERATED COLUMN: total_amount - amount_paid
  chargeable_days   SMALLINT
  waived_days       SMALLINT
  total_days        SMALLINT
  status            ENUM           -- GENERATED | PARTIALLY_PAID | PAID
  is_frozen         BOOLEAN        DEFAULT true
  generated_at      TIMESTAMPTZ
  created_at        TIMESTAMPTZ

  UNIQUE(student_id, billing_month)
  INDEX: (student_id, billing_month)
  INDEX: (status, billing_month)
}

-- ═══════════════════════════════════════════
-- BILL_LINE_ITEMS  (full audit trail of every charge)
-- ═══════════════════════════════════════════
bill_line_items {
  id            UUID           PK
  bill_id       UUID           FK → bills
  type          ENUM           NOT NULL
                -- HOSTEL_RENT | MESS_CHARGE | EXTRA | ADJUSTMENT
  description   VARCHAR(255)   NOT NULL
  date          DATE                          NULL
  quantity      DECIMAL(8,2)   DEFAULT 1
  unit_price    DECIMAL(10,2)  NOT NULL
  amount        DECIMAL(10,2)  NOT NULL  -- quantity × unit_price
  reference_id  UUID                     NULL  -- FK to extras or leave id

  INDEX: (bill_id)
}

-- ═══════════════════════════════════════════
-- MESS_EXTRA_ITEMS  (menu of chargeable extras per mess)
-- ═══════════════════════════════════════════
mess_extra_items {
  id          UUID          PK
  mess_id     UUID          FK → messes
  name        VARCHAR(100)  NOT NULL   -- e.g., "Chicken Curry"
  unit        VARCHAR(30)   NOT NULL   -- e.g., "cup"
  price       DECIMAL(10,2) NOT NULL
  is_active   BOOLEAN       DEFAULT true
  created_at  TIMESTAMPTZ

  INDEX: (mess_id, is_active)
}

-- ═══════════════════════════════════════════
-- STUDENT_EXTRAS  (extras charged to a specific student on a date)
-- ═══════════════════════════════════════════
student_extras {
  id             UUID          PK
  student_id     UUID          FK → students
  mess_id        UUID          FK → messes
  extra_item_id  UUID          FK → mess_extra_items
  date           DATE          NOT NULL
  quantity       DECIMAL(8,2)  NOT NULL
  unit_price     DECIMAL(10,2) NOT NULL  -- price snapshot at time of entry
  added_by       UUID          FK → users
  created_at     TIMESTAMPTZ

  INDEX: (student_id, date)
  INDEX: (mess_id, date)
}

-- ═══════════════════════════════════════════
-- PAYMENTS
-- ═══════════════════════════════════════════
payments {
  id                UUID           PK
  student_id        UUID           FK → students
  bill_id           UUID           FK → bills  NULL  -- NULL = advance payment
  amount            DECIMAL(10,2)  NOT NULL
  payment_date      DATE           NOT NULL
  reference_number  VARCHAR(100)   NOT NULL
  screenshot_url    VARCHAR(500)   NOT NULL       -- Cloudinary signed URL
  status            ENUM           NOT NULL  -- PENDING | VERIFIED | REJECTED
  verified_by       UUID           FK → users  NULL
  verified_at       TIMESTAMPTZ               NULL
  rejection_reason  TEXT                      NULL
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

  INDEX: (student_id, status)
  INDEX: (status, created_at)
}
```

---

### 3.5 Complaints, Technicians & Notifications

```sql
-- ═══════════════════════════════════════════
-- TECHNICIANS  (not system users — name + phone registry only)
-- ═══════════════════════════════════════════
technicians {
  id              UUID          PK
  name            VARCHAR(100)  NOT NULL
  mobile          VARCHAR(20)   NOT NULL
  specialization  VARCHAR(100)
  is_active       BOOLEAN       DEFAULT true
  created_at      TIMESTAMPTZ
}

-- ═══════════════════════════════════════════
-- COMPLAINTS
-- ═══════════════════════════════════════════
complaints {
  id                UUID          PK
  student_id        UUID          FK → students
  hostel_id         UUID          FK → hostels
  room_id           UUID          FK → rooms      NULL
  category          VARCHAR(100)  NOT NULL  -- free-text category from student
  description       TEXT          NOT NULL
  status            ENUM          NOT NULL  -- OPEN | ASSIGNED | RESOLVED
  assigned_to       UUID          FK → technicians  NULL
  assigned_by       UUID          FK → users          NULL
  assigned_at       TIMESTAMPTZ               NULL
  resolution_notes  TEXT                      NULL
  resolved_by       UUID          FK → users   NULL
  resolved_at       TIMESTAMPTZ               NULL
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

  INDEX: (student_id, status)
  INDEX: (status, created_at)
  INDEX: (assigned_to)
}

-- ═══════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════
notifications {
  id              UUID          PK
  user_id         UUID          FK → users
  type            ENUM          NOT NULL
                  -- LEAVE_APPROVED | LEAVE_REJECTED | LEAVE_AUTO_APPROVED
                  -- BILL_GENERATED | PAYMENT_VERIFIED | PAYMENT_REJECTED
                  -- COMPLAINT_ASSIGNED | COMPLAINT_RESOLVED
  title           VARCHAR(200)  NOT NULL
  body            TEXT          NOT NULL
  is_read         BOOLEAN       DEFAULT false
  reference_type  VARCHAR(50)               -- 'leave' | 'bill' | 'complaint'
  reference_id    UUID
  created_at      TIMESTAMPTZ

  INDEX: (user_id, is_read)
  INDEX: (user_id, created_at DESC)
}

-- ═══════════════════════════════════════════
-- AUDIT_LOGS  (immutable append-only event trail)
-- ═══════════════════════════════════════════
audit_logs {
  id           UUID          PK
  user_id      UUID          FK → users  NULL  -- NULL = system/scheduler action
  action       VARCHAR(100)  NOT NULL
               -- 'LEAVE_APPROVED' | 'BILL_GENERATED' | 'PAYMENT_VERIFIED'
               -- 'LEAVE_AUTO_APPROVED' | 'COMPLAINT_ASSIGNED' | etc.
  entity_type  VARCHAR(50)   NOT NULL  -- 'leave' | 'bill' | 'payment' | 'complaint'
  entity_id    UUID          NOT NULL
  old_value    JSONB                    NULL
  new_value    JSONB                    NULL
  ip_address   INET                     NULL
  user_agent   TEXT                     NULL
  created_at   TIMESTAMPTZ   DEFAULT now()

  -- APPEND ONLY: no UPDATE or DELETE on this table (enforced via Prisma + PG RLS)
  INDEX: (entity_type, entity_id)
  INDEX: (user_id, created_at DESC)
  INDEX: (action, created_at DESC)
}
```

---

### 3.6 Indexing Strategy

| Table           | Index                                | Reason                                             |
| --------------- | ------------------------------------ | -------------------------------------------------- |
| `attendance`    | `(student_id, date)`                 | Calendar view per student — most common query      |
| `attendance`    | `(mess_id, date)`                    | Incharge marks attendance for whole mess on a date |
| `leaves`        | `(status, auto_approve_at)`          | Auto-approval job scans PENDING leaves where due   |
| `leaves`        | `(student_id, start_date, end_date)` | Billing overlap calculation                        |
| `bills`         | `(student_id, billing_month)`        | Student's bill for a given month                   |
| `payments`      | `(status, created_at)`               | Warden's pending payments queue                    |
| `notifications` | `(user_id, is_read)`                 | Bell icon unread count — called on every page load |
| `audit_logs`    | `(entity_type, entity_id)`           | Fetch all events for a specific leave/bill/payment |

---

## 4. Backend Design

### 4.1 Folder Structure

```
backend/
├── src/
│   ├── modules/               ← each domain is self-contained
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schema.ts         ← Zod schemas for this module
│   │   ├── students/
│   │   ├── hostels/
│   │   ├── messes/
│   │   ├── attendance/
│   │   ├── leaves/
│   │   ├── billing/
│   │   │   ├── billing.controller.ts
│   │   │   ├── billing.service.ts     ← orchestrates the engine
│   │   │   ├── billing.engine.ts      ← pure calculation logic (unit-testable)
│   │   │   └── billing.routes.ts
│   │   ├── payments/
│   │   ├── complaints/
│   │   ├── notifications/
│   │   ├── reports/
│   │   └── admin/                     ← CSV import, hostel config
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts        ← verify JWT, attach req.user
│   │   │   ├── authorize.ts           ← RBAC: authorize(Role.WARDEN)
│   │   │   ├── rateLimiter.ts
│   │   │   ├── requestLogger.ts       ← structured logging (pino)
│   │   │   └── auditLogger.ts         ← async audit log writer
│   │   ├── errors/
│   │   │   ├── AppError.ts            ← base error class with HTTP code
│   │   │   └── globalErrorHandler.ts
│   │   └── types/
│   │       ├── roles.enum.ts
│   │       └── express.d.ts           ← extends Request with req.user
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── prisma.ts              ← singleton Prisma client
│   │   ├── cache/
│   │   │   └── redis.ts
│   │   ├── queue/
│   │   │   ├── queues.ts              ← BullMQ queue definitions
│   │   │   └── workers/
│   │   │       ├── leaveAutoApprove.worker.ts
│   │   │       ├── billingGenerate.worker.ts
│   │   │       └── notificationSend.worker.ts
│   │   ├── storage/
│   │   │   └── cloudinary.ts
│   │   └── email/
│   │       └── resend.ts
│   ├── config/
│   │   └── env.ts                     ← Zod-validated env vars
│   └── app.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
├── Dockerfile
└── package.json
```

---

### 4.2 Frontend Folder Structure (React 18 + Vite + React Router v6)

> **Key differences from Next.js:**
>
> - No `app/` directory or file-based routing — all routes are declared explicitly in `src/router.tsx` using React Router v6
> - No `layout.tsx` files — shared layouts are React components wrapping `<Outlet />`
> - No `page.tsx` convention — each page is a regular `.tsx` component in `src/pages/`
> - Dynamic routes (e.g. `/billing/:billId`) use React Router's `:param` syntax and `useParams()` hook
> - Auth guards are implemented as a `<ProtectedRoute>` component (not middleware)
> - Code splitting uses `React.lazy()` + `<Suspense>` instead of Next.js automatic splitting

```
frontend/
├── index.html                        ← Vite entry HTML
├── vite.config.ts
├── src/
│   ├── main.tsx                      ← ReactDOM.createRoot, wraps <App> with providers
│   ├── App.tsx                       ← renders <RouterProvider router={router} />
│   ├── router.tsx                    ← ALL routes defined here (replaces Next.js file-based routing)
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── ChangePasswordPage.tsx
│   │   ├── student/
│   │   │   ├── StudentDashboardPage.tsx
│   │   │   ├── AttendancePage.tsx        ← AttendanceCalendar + summary stats
│   │   │   ├── LeavesPage.tsx            ← leave history + new leave button
│   │   │   ├── NewLeavePage.tsx          ← date range picker + reason
│   │   │   ├── BillingPage.tsx           ← bill list with balance
│   │   │   ├── BillDetailPage.tsx        ← line item breakdown + payment form (:billId)
│   │   │   └── ComplaintsPage.tsx
│   │   ├── incharge/
│   │   │   ├── InchargeDashboardPage.tsx
│   │   │   └── AttendanceMarkingPage.tsx ← date picker + student grid with meal toggles
│   │   ├── warden/
│   │   │   ├── WardenDashboardPage.tsx   ← KPI cards + pending actions widget
│   │   │   ├── LeavesApprovalPage.tsx    ← pending leave approvals queue
│   │   │   ├── PaymentsVerificationPage.tsx
│   │   │   ├── ComplaintsManagementPage.tsx
│   │   │   ├── StudentsListPage.tsx      ← student list with search + filter
│   │   │   └── ReportsPage.tsx
│   │   └── admin/
│   │       ├── UsersPage.tsx
│   │       ├── HostelsPage.tsx
│   │       ├── MessesPage.tsx
│   │       └── ImportPage.tsx            ← CSV import + preview table
│   │
│   ├── layouts/
│   │   ├── AuthLayout.tsx             ← centered card layout for login/change-password
│   │   ├── StudentLayout.tsx          ← sidebar + header for student role; contains <Outlet />
│   │   ├── InchargeLayout.tsx         ← sidebar + header for incharge role
│   │   ├── WardenLayout.tsx           ← sidebar + header for warden role
│   │   └── AdminLayout.tsx            ← sidebar + header for admin role
│   │
│   ├── components/
│   │   ├── attendance/
│   │   │   ├── AttendanceCalendar.tsx
│   │   │   └── AttendanceMarkingGrid.tsx
│   │   ├── billing/
│   │   │   ├── BillCard.tsx
│   │   │   └── PaymentProofForm.tsx
│   │   ├── leaves/
│   │   │   └── LeaveForm.tsx
│   │   ├── complaints/
│   │   │   └── ComplaintForm.tsx
│   │   └── shared/
│   │       ├── NotificationBell.tsx
│   │       ├── DataTable.tsx
│   │       └── ProtectedRoute.tsx     ← wraps routes; redirects if role doesn't match
│   │
│   ├── lib/
│   │   ├── api.ts                     ← axios instance with interceptors
│   │   ├── queryClient.ts             ← React Query client config
│   │   └── store.ts                   ← Zustand store (auth user + notif count)
│   │
│   └── types/
│       └── index.ts                   ← shared TypeScript types
├── .env.example
└── package.json
```

---

### 4.3 Routing — React Router v6 (`src/router.tsx`)

This file replaces Next.js file-based routing entirely. All routes are declared here.

```tsx
// src/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import AuthLayout from "@/layouts/AuthLayout";
import StudentLayout from "@/layouts/StudentLayout";
import InchargeLayout from "@/layouts/InchargeLayout";
import WardenLayout from "@/layouts/WardenLayout";
import AdminLayout from "@/layouts/AdminLayout";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

// Lazy-loaded pages (replaces Next.js automatic code splitting)
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const ChangePasswordPage = lazy(
	() => import("@/pages/auth/ChangePasswordPage"),
);

const StudentDashboardPage = lazy(
	() => import("@/pages/student/StudentDashboardPage"),
);
const AttendancePage = lazy(() => import("@/pages/student/AttendancePage"));
const LeavesPage = lazy(() => import("@/pages/student/LeavesPage"));
const NewLeavePage = lazy(() => import("@/pages/student/NewLeavePage"));
const BillingPage = lazy(() => import("@/pages/student/BillingPage"));
const BillDetailPage = lazy(() => import("@/pages/student/BillDetailPage"));
const StudentComplaintsPage = lazy(
	() => import("@/pages/student/ComplaintsPage"),
);

const InchargeDashboardPage = lazy(
	() => import("@/pages/incharge/InchargeDashboardPage"),
);
const AttendanceMarkingPage = lazy(
	() => import("@/pages/incharge/AttendanceMarkingPage"),
);

const WardenDashboardPage = lazy(
	() => import("@/pages/warden/WardenDashboardPage"),
);
const LeavesApprovalPage = lazy(
	() => import("@/pages/warden/LeavesApprovalPage"),
);
const PaymentsVerificationPage = lazy(
	() => import("@/pages/warden/PaymentsVerificationPage"),
);
const WardenComplaintsPage = lazy(
	() => import("@/pages/warden/ComplaintsManagementPage"),
);
const StudentsListPage = lazy(() => import("@/pages/warden/StudentsListPage"));
const ReportsPage = lazy(() => import("@/pages/warden/ReportsPage"));

const UsersPage = lazy(() => import("@/pages/admin/UsersPage"));
const HostelsPage = lazy(() => import("@/pages/admin/HostelsPage"));
const MessesPage = lazy(() => import("@/pages/admin/MessesPage"));
const ImportPage = lazy(() => import("@/pages/admin/ImportPage"));

const wrap = (el: JSX.Element) => (
	<Suspense fallback={<div>Loading…</div>}>{el}</Suspense>
);

export const router = createBrowserRouter([
	// ── Auth routes ──────────────────────────────────────────
	{
		element: <AuthLayout />,
		children: [
			{ path: "/login", element: wrap(<LoginPage />) },
			{ path: "/change-password", element: wrap(<ChangePasswordPage />) },
		],
	},

	// ── Student routes ───────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["STUDENT"]} />, // guard
		children: [
			{
				element: <StudentLayout />,
				children: [
					{
						path: "/student/dashboard",
						element: wrap(<StudentDashboardPage />),
					},
					{
						path: "/student/attendance",
						element: wrap(<AttendancePage />),
					},
					{ path: "/student/leaves", element: wrap(<LeavesPage />) },
					{
						path: "/student/leaves/new",
						element: wrap(<NewLeavePage />),
					},
					{
						path: "/student/billing",
						element: wrap(<BillingPage />),
					},
					{
						path: "/student/billing/:billId",
						element: wrap(<BillDetailPage />),
					}, // replaces Next.js [billId]
					{
						path: "/student/complaints",
						element: wrap(<StudentComplaintsPage />),
					},
				],
			},
		],
	},

	// ── Incharge routes ──────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["MESS_INCHARGE"]} />,
		children: [
			{
				element: <InchargeLayout />,
				children: [
					{
						path: "/incharge/dashboard",
						element: wrap(<InchargeDashboardPage />),
					},
					{
						path: "/incharge/attendance",
						element: wrap(<AttendanceMarkingPage />),
					},
				],
			},
		],
	},

	// ── Warden routes ────────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["WARDEN"]} />,
		children: [
			{
				element: <WardenLayout />,
				children: [
					{
						path: "/warden/dashboard",
						element: wrap(<WardenDashboardPage />),
					},
					{
						path: "/warden/leaves",
						element: wrap(<LeavesApprovalPage />),
					},
					{
						path: "/warden/payments",
						element: wrap(<PaymentsVerificationPage />),
					},
					{
						path: "/warden/complaints",
						element: wrap(<WardenComplaintsPage />),
					},
					{
						path: "/warden/students",
						element: wrap(<StudentsListPage />),
					},
					{ path: "/warden/reports", element: wrap(<ReportsPage />) },
				],
			},
		],
	},

	// ── Admin routes ─────────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["WARDEN"]} />,
		children: [
			{
				element: <AdminLayout />,
				children: [
					{ path: "/admin/users", element: wrap(<UsersPage />) },
					{ path: "/admin/hostels", element: wrap(<HostelsPage />) },
					{ path: "/admin/messes", element: wrap(<MessesPage />) },
					{ path: "/admin/import", element: wrap(<ImportPage />) },
				],
			},
		],
	},

	// ── Fallback ─────────────────────────────────────────────
	{ path: "/", element: <Navigate to="/login" replace /> },
	{ path: "*", element: <Navigate to="/login" replace /> },
]);
```

---

### 4.4 Auth Guard — `ProtectedRoute.tsx`

Replaces Next.js layout-level auth guards. This is a standard React Router v6 pattern.

```tsx
// src/components/shared/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/lib/store";

interface Props {
	allowedRoles: string[];
}

export default function ProtectedRoute({ allowedRoles }: Props) {
	const { user } = useAuthStore();

	// Not logged in → go to login
	if (!user) return <Navigate to="/login" replace />;

	// Must change password first
	if (user.mustChangePwd) return <Navigate to="/change-password" replace />;

	// Wrong role for this section
	if (!allowedRoles.includes(user.role))
		return <Navigate to="/login" replace />;

	return <Outlet />;
}
```

---

### 4.5 Layout Components (replaces Next.js `layout.tsx`)

Each layout wraps role-specific pages and renders `<Outlet />` for child routes.

```tsx
// src/layouts/StudentLayout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/shared/Sidebar";
import NotificationBell from "@/components/shared/NotificationBell";

export default function StudentLayout() {
	return (
		<div className="flex h-screen">
			<Sidebar role="STUDENT" />
			<main className="flex-1 overflow-y-auto">
				<header className="flex justify-end p-4 border-b">
					<NotificationBell />
				</header>
				<div className="p-6">
					<Outlet /> {/* child page renders here */}
				</div>
			</main>
		</div>
	);
}

// Repeat the same pattern for InchargeLayout, WardenLayout, AdminLayout
// — only the <Sidebar role="..." /> prop and nav links change.
```

---

### 4.6 Dynamic Route Parameters (replaces Next.js `[billId]`)

Next.js uses folder names like `[billId]/page.tsx`. In React Router, dynamic segments are declared with `:billId` in the router and read with the `useParams()` hook.

```tsx
// src/pages/student/BillDetailPage.tsx
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function BillDetailPage() {
	const { billId } = useParams<{ billId: string }>(); // replaces Next.js params prop

	const { data: bill } = useQuery({
		queryKey: ["bill", billId],
		queryFn: () => api.get(`/bills/${billId}`).then((r) => r.data),
	});

	return <div>{/* line items breakdown + payment form */}</div>;
}
```

---

### 4.7 API Routes — Complete Reference

#### Auth

| Method | Route                          | Role | Description                       |
| ------ | ------------------------------ | ---- | --------------------------------- |
| POST   | `/api/v1/auth/login`           | All  | Returns access + refresh tokens   |
| POST   | `/api/v1/auth/refresh`         | All  | Rotate refresh token              |
| POST   | `/api/v1/auth/logout`          | All  | Invalidate refresh token in Redis |
| PATCH  | `/api/v1/auth/change-password` | All  | Force on first login              |

#### Attendance

| Method | Route                                 | Role     | Description                               |
| ------ | ------------------------------------- | -------- | ----------------------------------------- |
| GET    | `/api/v1/attendance/me?month=YYYY-MM` | Student  | Calendar data for student                 |
| GET    | `/api/v1/attendance/:studentId`       | Warden+  | View any student's attendance             |
| POST   | `/api/v1/attendance/bulk`             | Incharge | Mark attendance for whole mess for a date |
| PUT    | `/api/v1/attendance/:id`              | Incharge | Correct/backdate an attendance record     |
| POST   | `/api/v1/attendance/waive`            | Incharge | Mark a full day as waived for the mess    |

#### Leaves

| Method | Route                        | Role    | Description                                    |
| ------ | ---------------------------- | ------- | ---------------------------------------------- |
| GET    | `/api/v1/leaves/me`          | Student | Student's leave history                        |
| POST   | `/api/v1/leaves`             | Student | Apply for leave (validated: 2 days advance)    |
| DELETE | `/api/v1/leaves/:id`         | Student | Cancel if PENDING; set return_date if APPROVED |
| GET    | `/api/v1/leaves/pending`     | Warden  | All PENDING leaves for action                  |
| PATCH  | `/api/v1/leaves/:id/approve` | Warden  | Approve leave                                  |
| PATCH  | `/api/v1/leaves/:id/reject`  | Warden  | Reject with reason                             |
| PATCH  | `/api/v1/leaves/:id/return`  | Student | Mark early return (sets return_date)           |

#### Billing & Payments

| Method | Route                         | Role    | Description                                        |
| ------ | ----------------------------- | ------- | -------------------------------------------------- |
| GET    | `/api/v1/bills/me`            | Student | All bills with line items and ledger               |
| GET    | `/api/v1/bills/:studentId`    | Warden+ | View student's full billing history                |
| POST   | `/api/v1/payments`            | Student | Submit payment proof (multipart: ref + screenshot) |
| GET    | `/api/v1/payments/pending`    | Warden  | Queue of unverified payments                       |
| PATCH  | `/api/v1/payments/:id/verify` | Warden  | Verify and credit to student ledger                |
| PATCH  | `/api/v1/payments/:id/reject` | Warden  | Reject with reason, notify student                 |

#### Complaints

| Method | Route                            | Role    | Description                              |
| ------ | -------------------------------- | ------- | ---------------------------------------- |
| POST   | `/api/v1/complaints`             | Student | Raise a complaint                        |
| GET    | `/api/v1/complaints/me`          | Student | Student's own complaints                 |
| GET    | `/api/v1/complaints`             | Warden  | All complaints (filter by status/hostel) |
| PATCH  | `/api/v1/complaints/:id/assign`  | Warden  | Assign to technician                     |
| PATCH  | `/api/v1/complaints/:id/resolve` | Warden  | Mark resolved with notes                 |

#### Messes & Extras

| Method | Route                       | Role      | Description                   |
| ------ | --------------------------- | --------- | ----------------------------- |
| GET    | `/api/v1/messes`            | Incharge+ | List all active messes        |
| GET    | `/api/v1/messes/:id/extras` | Incharge+ | Extra items menu for a mess   |
| POST   | `/api/v1/messes/:id/extras` | Admin     | Add extra item to mess menu   |
| POST   | `/api/v1/student-extras`    | Incharge  | Add extra charge to a student |

#### Reports

| Method | Route                             | Role    | Description                                   |
| ------ | --------------------------------- | ------- | --------------------------------------------- |
| GET    | `/api/v1/reports/billing-summary` | Warden+ | Monthly billing totals, collection rate       |
| GET    | `/api/v1/reports/defaulters`      | Warden+ | Students with outstanding balances            |
| GET    | `/api/v1/reports/attendance`      | Warden+ | Attendance rates by mess/hostel/period        |
| GET    | `/api/v1/reports/complaints`      | Warden+ | Complaint stats, resolution times             |
| GET    | `/api/v1/reports/export`          | Warden+ | PDF/Excel export with `?type=&period=` params |

#### Admin

| Method | Route                              | Role  | Description                    |
| ------ | ---------------------------------- | ----- | ------------------------------ |
| POST   | `/api/v1/admin/students/import`    | Admin | CSV bulk import                |
| POST   | `/api/v1/admin/hostels`            | Admin | Create hostel                  |
| POST   | `/api/v1/admin/messes`             | Admin | Create mess                    |
| POST   | `/api/v1/admin/hostel-rent-config` | Admin | Set semester rent config       |
| POST   | `/api/v1/admin/users`              | Admin | Create warden/incharge account |
| GET    | `/api/v1/admin/audit-logs`         | Admin | View audit logs with filters   |
| POST   | `/api/v1/admin/technicians`        | Admin | Add technician to registry     |

---

### 4.8 RBAC Matrix

| Capability                            | Student | Incharge | Warden | Super Admin |
| ------------------------------------- | ------- | -------- | ------ | ----------- |
| View own attendance                   | ✓       | —        | —      | ✓           |
| Mark / backdate attendance            | —       | ✓        | ✓      | ✓           |
| Waive a mess day                      | —       | ✓        | ✓      | ✓           |
| Add extras to student                 | —       | ✓        | ✓      | ✓           |
| Apply for leave                       | ✓       | —        | —      | —           |
| Approve / reject leave                | —       | —        | ✓      | ✓           |
| View own bills + ledger               | ✓       | —        | —      | ✓           |
| View all student bills                | —       | —        | ✓      | ✓           |
| Submit payment proof                  | ✓       | —        | —      | —           |
| Verify / reject payments              | —       | —        | ✓      | ✓           |
| Raise complaint                       | ✓       | —        | —      | —           |
| Assign / resolve complaints           | —       | —        | ✓      | ✓           |
| Generate bills (manual trigger)       | —       | —        | —      | ✓           |
| Import students (CSV)                 | —       | —        | —      | ✓           |
| Manage hostels / messes / rent config | —       | —        | —      | ✓           |
| View / export reports                 | —       | —        | ✓      | ✓           |
| View audit logs                       | —       | —        | —      | ✓           |

---

### 4.9 Auth Strategy: JWT + Refresh Token Rotation

- **Access token:** 15 minutes, signed with `HS256`, payload: `{ userId, role, studentId? }`
- **Refresh token:** 7 days, stored in `httpOnly + Secure + SameSite=Strict` cookie. Also stored in Redis: `SET refresh:{userId} {token} EX 604800` — enables single-session invalidation on logout.
- **Rotation:** Every refresh call issues a new refresh token and invalidates the old one. Prevents replay attacks.
- **First login:** `must_change_pwd = true` → client redirects to `/change-password` via React Router `<Navigate>` before any other action is allowed.
- **Admin accounts:** Pre-created only by Super Admin. No public registration endpoint.
- **CSV import:** Creates student accounts with `password = bcrypt(rollNumber, rounds=12)` and `must_change_pwd = true`.

---

### 4.10 Error Handling Architecture

```typescript
// AppError.ts — all thrown errors extend this
class AppError extends Error {
	constructor(
		public message: string,
		public statusCode: number,
		public code: string, // e.g. 'LEAVE_TOO_EARLY', 'BILL_ALREADY_PAID'
		public isOperational = true, // false = programming error → 500 + alert
	) {
		super(message);
	}
}

// Usage in service layer
if (daysBefore < 2) {
	throw new AppError(
		"Leave must be applied at least 2 days in advance",
		422,
		"LEAVE_TOO_EARLY",
	);
}

// Global error handler:
// - Operational errors → send { error: { code, message } } to client
// - Non-operational → log full stack, send generic 500, trigger alert
```

---

## 5. Frontend Design

### 5.1 State Management

| Concern                 | Tool                         | Why                                                                                           |
| ----------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| Server state (API data) | React Query (TanStack Query) | Caching, background refetch, loading states, optimistic updates. No manual `useEffect/fetch`. |
| Client state            | Zustand                      | Auth user object + unread notification count only. Avoids Redux boilerplate.                  |
| Forms                   | React Hook Form + Zod        | Shared Zod schemas between backend and frontend. `zodResolver` bridges both.                  |
| UI Components           | shadcn/ui + Tailwind CSS     | Accessible components. Consistent design system.                                              |
| Routing                 | React Router v6              | Declarative routing with nested layouts and `<Outlet />`. Replaces Next.js App Router.        |

### 5.2 Entry Point — `main.tsx`

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { queryClient } from "./lib/queryClient";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</React.StrictMode>,
);
```

### 5.3 Key UI Components

**AttendanceCalendar** (Student view)

- Month view calendar
- Day cell colors: green = present (shows meals), red = absent (charged), yellow = on leave (waived), grey = waived by incharge, blue = leave without waiver (charged)
- Click day to see meal breakdown (B/L/D toggles)
- Header stats: Present days / Chargeable days / Waived days

**AttendanceMarkingGrid** (Incharge view)

- Shows all students assigned to the mess for a selected date
- Date selector at top with backdate support
- 3 toggles per student row: B / L / D (breakfast/lunch/dinner)
- Bulk "All present" button
- Save all button submits via bulk attendance API
- Visual diff if editing an existing record

**BillCard + Ledger** (Student view)

- Expandable card per billing month
- Header: total amount + balance due + status badge (GENERATED / PARTIALLY_PAID / PAID)
- Expanded: line items table (hostel rent, mess charges × days, each extra item, adjustments)
- Below: payment history timeline
- Shows exactly how every rupee is computed

**LeaveForm** (Student)

- Date range picker with minimum start = today + 2
- Duration display updates live
- Shows: "Leave qualifies for waiver (>2 days)" or "No waiver for ≤2 days"
- Max date = today + 60 days (2 month maximum)
- Running total leave days used this year shown below form

**PaymentProofForm** (Student)

- Select bill(s) to pay against
- Enter amount and transaction reference number
- Upload screenshot (drag-and-drop, max 5MB, JPEG/PNG/PDF only)
- Preview screenshot before submit
- Disabled if bill is already PAID

**NotificationBell** (All users)

- Polls every 30 seconds via React Query `refetchInterval`
- Shows unread count badge
- Click opens popover with paginated notification list
- Click notification uses `useNavigate()` to deep-link to relevant entity via `reference_type` + `reference_id`
- "Mark all read" button

### 5.4 Navigation — `useNavigate()` (replaces Next.js `router.push`)

```tsx
// In Next.js you would write:
//   import { useRouter } from 'next/navigation';
//   const router = useRouter();
//   router.push('/student/billing/abc-123');

// In React Router v6:
import { useNavigate } from "react-router-dom";

function NotificationBell() {
	const navigate = useNavigate();

	function handleNotificationClick(notif: Notification) {
		if (notif.reference_type === "bill") {
			navigate(`/student/billing/${notif.reference_id}`);
		} else if (notif.reference_type === "leave") {
			navigate("/student/leaves");
		} else if (notif.reference_type === "complaint") {
			navigate("/student/complaints");
		}
	}
	// ...
}
```

### 5.5 Link Navigation (replaces Next.js `<Link>`)

```tsx
// In Next.js:
//   import Link from 'next/link';
//   <Link href="/student/leaves/new">Apply Leave</Link>

// In React Router v6:
import { Link } from "react-router-dom";
<Link to="/student/leaves/new">Apply Leave</Link>;
```

### 5.6 Performance Considerations

- React Query caches frozen bill data — does not re-fetch bills that haven't changed
- Attendance calendar virtualized for >3 months via `@tanstack/react-virtual`
- Reports page uses React `Suspense` boundaries so heavy charts don't block the page
- Payment screenshots served directly from Cloudinary CDN with lazy loading
- All data tables use **server-side pagination** (default 20 rows per page)
- Route-level code splitting via `React.lazy()` — student bundle doesn't include warden components

---

## 6. Billing Engine — Full Algorithm

### Critical Design Note

> Bills are **frozen** once generated. Any retroactive change (e.g. a leave approved after billing ran) creates an **adjustment line item** on the **next month's bill** — it never edits the original frozen bill. This is standard financial system design and provides a clean, immutable audit trail.

### Billing Timing

- Billing cron job runs on **1st of every month at 2:00 AM** for the previous month
- Leave auto-approval sweep runs at **11:45 PM on the last day of the month**, ensuring all PENDING leaves are resolved before billing calculates
- If a leave slips through (applied on the very last day of month), it creates an **adjustment line item** on next month's bill

### Day Priority Rules

For every day in the billing period, the engine checks in this order:

1. **Mess-day waiver?** → Not charged (highest priority, skips all other checks)
2. **Approved leave covers this day?** → Check effective duration
    - If effective duration > 2 days AND day is within effective leave range → **Waived (not charged)**
    - If effective duration ≤ 2 days → Falls through to Rule 3
3. **Everything else** → **Charged** (present, absent without leave, 1-2 day leave, day after return_date)

### Full Calculation Pseudocode

```
function generateMonthlyBill(studentId, year, month):

  // ─── 1. Resolve context ───────────────────────────────
  periodStart  = firstDayOf(year, month)
  periodEnd    = lastDayOf(year, month)
  student      = getStudent(studentId)
  messAssign   = getCurrentMess(studentId)        // FK to mess
  perDayCharge = messAssign.mess.per_day_charge

  // ─── 2. Hostel rent (semester-based) ─────────────────
  hostelConfig = getHostelRentConfig(student.hostel_id, year, semester)
  hostelRent   = (hostelConfig.due_month == month) ? hostelConfig.amount : 0

  // ─── 3. Load data for the billing period ─────────────
  waivedDays     = getMessDayWaivers(messAssign.mess_id, periodStart, periodEnd)
  approvedLeaves = getApprovedLeaves(studentId, periodStart, periodEnd)
                   // status IN (APPROVED, AUTO_APPROVED) AND NOT cancelled

  // ─── 4. Day-by-day calculation ────────────────────────
  chargeableDays = 0
  waivedLeafDays = 0

  for day in eachDayIn(periodStart, periodEnd):

    // Rule A: Mess-day waiver takes highest priority
    if day in waivedDays:
      continue   // not charged regardless of attendance or leave

    // Rule B: Check if an approved leave covers this day
    leave = findLeaveForDay(approvedLeaves, day)

    if leave != null:
      // Calculate EFFECTIVE leave duration (handles early return)
      effectiveEnd      = leave.return_date != null
                          ? min(leave.end_date, leave.return_date - 1)
                          : leave.end_date
      effectiveDuration = effectiveEnd - leave.start_date + 1

      if effectiveDuration > 2 AND day <= effectiveEnd:
        waivedLeafDays++   // waiver applies → not charged
        continue

    // Rule C: No waiver → student is charged
    // (present, absent-no-leave, 1-2 day leave, or after return_date)
    chargeableDays++

  // ─── 5. Compute totals ───────────────────────────────
  messCharges  = chargeableDays × perDayCharge
  extras       = getExtrasForPeriod(studentId, periodStart, periodEnd)
  extrasTotal  = sum(e.quantity × e.unit_price for e in extras)
  totalAmount  = hostelRent + messCharges + extrasTotal

  // ─── 6. Create frozen bill with line items ───────────
  bill = createBill({
    student_id, billing_month: periodStart,
    hostel_rent: hostelRent, mess_charges: messCharges,
    extras_total: extrasTotal, total_amount: totalAmount,
    chargeable_days: chargeableDays,
    waived_days: waivedLeafDays + waivedMessDays,
    total_days: daysInMonth, is_frozen: true
  })
  createLineItems(bill, extras)
  dispatchNotification(studentId, 'BILL_GENERATED', bill)
```

### Billing Edge Cases

| Scenario                                        | Handling                                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leave spans two billing months                  | Duration checked on full leave object. Each month's billing loop checks days in its own period independently. A 9-day cross-month leave qualifies for waiver in both months.                |
| Student returns early from leave                | `return_date` stored on leave. Effective duration = `min(end_date, return_date-1) - start_date + 1`. Charged from `return_date` onwards.                                                    |
| Leave auto-approved AFTER billing runs          | Auto-approval sweep at 11:45 PM on last day handles most cases. If a leave slips through, create a negative adjustment on next month's bill via `bill_line_items` with `type = ADJUSTMENT`. |
| Mess day waived + student on leave same day     | Mess waiver takes priority (first check in loop). Day not charged.                                                                                                                          |
| Student transferred to new hostel mid-semester  | Hostel rent config uses current assignment at time of billing month. Historical records preserved via `hostel_assignments` history.                                                         |
| No attendance record (student absent, no leave) | Still charged. Absence without approved leave is not waived. Billing engine charges all chargeable days regardless of attendance record existence.                                          |
| 1-2 day leave (no waiver)                       | Detected by `effectiveDuration <= 2` check. Days fall through to `chargeableDays++`.                                                                                                        |

---

## 7. Leave Engine — State Machine

### Leave States

```
PENDING ──[warden approves]────────► APPROVED
        │
        ├──[warden rejects]─────────► REJECTED
        │
        └──[48h elapsed, no action]─► AUTO_APPROVED

APPROVED ──[student cancels / returns early]──► CANCELLED (or return_date set)
AUTO_APPROVED ──[same as above]───────────────► CANCELLED

REJECTED is terminal (student must apply new leave)
CANCELLED is terminal
```

### Validation Rules (enforced at service layer)

- **Advance requirement:** `start_date >= CURRENT_DATE + 2`. Error code: `LEAVE_TOO_EARLY`.
- **No retroactive applications:** System calculates min allowed start date at request time. No override.
- **Maximum duration:** Total approved leave days in current academic year must not exceed **60 days**. Checked at application time by summing all non-rejected/cancelled leaves for the student.
- **No overlap:** A new leave cannot overlap with an existing PENDING or APPROVED leave for the same student.
- **End date ≥ Start date:** Schema constraint + app-layer check.

### Auto-Approval Job

```typescript
// BullMQ worker — runs every 30 minutes
// Also: a cron job triggers a forced sweep at 11:45 PM daily

async function leaveAutoApproveWorker() {
	const overdueLeaves = await prisma.leave.findMany({
		where: {
			status: "PENDING",
			auto_approve_at: { lte: new Date() },
		},
	});

	for (const leave of overdueLeaves) {
		await prisma.$transaction([
			prisma.leave.update({
				where: { id: leave.id },
				data: { status: "AUTO_APPROVED", actioned_at: new Date() },
			}),
			prisma.auditLog.create({
				data: {
					user_id: null, // system action
					action: "LEAVE_AUTO_APPROVED",
					entity_type: "leave",
					entity_id: leave.id,
					new_value: {
						status: "AUTO_APPROVED",
						trigger: "scheduler",
					},
				},
			}),
		]);
		// Enqueue notification (non-blocking)
		await notificationQueue.add("send", {
			userId: leave.student.user_id,
			type: "LEAVE_AUTO_APPROVED",
			referenceId: leave.id,
		});
	}
}
```

### Early Return Flow

When a student marks early return on an APPROVED leave:

1. Frontend shows: "I returned on" date picker with `max = leave.end_date`
2. `PATCH /api/v1/leaves/:id/return` with `{ return_date: "2025-05-09" }`
3. Service sets `return_date` on the leave (leave `status` stays `APPROVED` — not cancelled)
4. Billing engine uses `min(end_date, return_date - 1)` as effective end
5. Audit log records the change with `old_value` and `new_value`
6. If the bill for this period is already generated and frozen → create adjustment line item on next month's bill

---

## 8. Complaint System

### Flow

```
Student submits complaint (category + description + room)
    │
    ▼
status = OPEN
    │
    ▼ Warden assigns to technician
status = ASSIGNED (technician name + phone shown to student)
    │
    ▼ Warden marks resolved (after technician confirms completion)
status = RESOLVED (resolution notes visible to student)
```

### Business Rules

- Student cannot mark their own complaint as resolved
- Technicians have no system login — they are a name + phone registry only
- Complaint photos are not supported
- Warden can reassign to a different technician (status stays ASSIGNED)
- All complaint state changes are audit-logged

---

## 9. Background Jobs (BullMQ + Redis)

| Queue                | Trigger                                   | Job                                                                                              | Retry Policy                                                  |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `leave-auto-approve` | Cron every 30 min + forced 11:45 PM daily | Find PENDING leaves where `auto_approve_at <= now()`, update to AUTO_APPROVED, emit notification | 3 retries with exponential backoff                            |
| `billing-generate`   | Cron: 2:00 AM on 1st of each month        | Generate bills for all active students for previous month                                        | 1 retry. Distributed lock prevents double-run.                |
| `notification-send`  | Triggered by other jobs/controllers       | Write in-app notification to DB + send email via Resend                                          | 5 retries. Email failures don't fail the in-app notification. |
| `report-export`      | On-demand (user triggers)                 | Generate PDF/Excel report, upload to Cloudinary, email download link                             | 2 retries. Runs async to avoid blocking HTTP request.         |

> **Concurrency safety:** The billing job uses a **distributed lock** (Redis SETNX) to prevent two billing job instances running simultaneously (e.g. on server restart). Lock key: `lock:billing-generate:{year}-{month}`. Lock TTL: 30 minutes.

---

## 10. Notification System

### Architecture: Two-Layer

**In-App Notifications**

- Written to `notifications` table in PostgreSQL
- Frontend polls every 30 seconds via React Query `refetchInterval: 30_000`
- Unread count shown on bell icon in header
- Click opens popover with paginated notification list
- Each notification has `reference_type` + `reference_id` for deep-linking via `useNavigate()`
- "Mark all read" button

**Email Notifications**

- Sent via Resend API
- Each notification type has its own HTML email template
- Email failures are retried 5 times via BullMQ
- Email sending never blocks the main API response — always enqueued async

### Notification Event Map

| Event                                    | Recipient | In-App | Email            |
| ---------------------------------------- | --------- | ------ | ---------------- |
| Leave approved by warden                 | Student   | ✓      | ✓                |
| Leave rejected by warden                 | Student   | ✓      | ✓ (with reason)  |
| Leave auto-approved                      | Student   | ✓      | ✓                |
| Monthly bill generated                   | Student   | ✓      | ✓ (with summary) |
| Payment proof verified                   | Student   | ✓      | ✓                |
| Payment proof rejected                   | Student   | ✓      | ✓ (with reason)  |
| Complaint assigned to technician         | Student   | ✓      | ✓                |
| Complaint resolved                       | Student   | ✓      | ✓ (with notes)   |
| New leave pending (warden action needed) | Warden    | ✓      | —                |
| New payment pending verification         | Warden    | ✓      | —                |

---

## 11. Security

### OWASP Top 10 Coverage

| Threat                    | Mitigation                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Broken Access Control     | RBAC middleware on every route. Students can only access their own `userId` — checked in service layer (`req.user.studentId === params.studentId`), not just at controller level.    |
| SQL Injection             | Prisma ORM — all queries parameterized. `$queryRaw` uses tagged template literals (also parameterized).                                                                              |
| Broken Authentication     | bcrypt (rounds=12) for passwords. JWT short-lived (15 min). Refresh tokens in httpOnly cookie. Forced password change on first login. Rate limit: 5 failed logins per IP per 15 min. |
| Security Misconfiguration | Helmet.js sets all security headers. CORS locked to frontend origin. Environment variables validated with Zod on startup — server refuses to start with missing config.              |
| Sensitive Data Exposure   | Password hashes never in API responses. Payment screenshot URLs are signed Cloudinary URLs (expire after 1 hour). Student data strictly role-gated.                                  |
| XSS                       | React JSX escapes by default. Content-Security-Policy header via Helmet. No `dangerouslySetInnerHTML`.                                                                               |
| CSRF                      | `SameSite=Strict` on refresh token cookie. API endpoints require Bearer token in Authorization header — cookie-only requests are rejected.                                           |
| Insecure File Upload      | Cloudinary handles upload directly from frontend (signed upload preset). MIME type validated on client and by Cloudinary. Max 5MB. Only JPEG/PNG/PDF accepted.                       |
| Enumeration               | UUID primary keys — no sequential IDs. Login error message is generic: "Invalid credentials" — does not reveal whether the email exists.                                             |
| Rate Limiting             | Global: 100 req/min per IP. Login: 5 attempts/15 min per IP. Report export: 3 requests/hour per user.                                                                                |

### Audit Log Access

- Super Admin can view audit logs in the UI with filters: entity type, date range, acting user
- Raw `audit_logs` table also accessible via PostgreSQL directly for forensic analysis
- Audit log records are **append-only** — no UPDATE or DELETE permitted (enforced by removing those operations in the repository class AND via PostgreSQL row-level security policy)

---

## 12. Caching Strategy (Redis)

| Cache Key                        | TTL        | Content                             | Invalidated When                                           |
| -------------------------------- | ---------- | ----------------------------------- | ---------------------------------------------------------- |
| `bill:{studentId}:{month}`       | 24 hours   | Frozen monthly bill + line items    | Payment verified (updates `amount_paid`); adjustment added |
| `attendance:{studentId}:{month}` | 1 hour     | Calendar data for student month     | Any attendance record in that month is modified            |
| `notif-count:{userId}`           | 30 seconds | Unread notification count (integer) | New notification created for this user                     |
| `refresh:{userId}`               | 7 days     | Current valid refresh token         | Logout or token rotation                                   |
| `students:mess:{messId}`         | 1 hour     | List of students assigned to a mess | New mess assignment, or student deactivated                |
| `lock:billing:{year}-{month}`    | 30 min     | Distributed billing job lock flag   | Billing job completes or TTL expires                       |

**Pattern:** Cache-aside throughout. Check Redis → miss → query PostgreSQL → write to Redis → return. Cache writes are non-blocking (fire-and-forget). Cache misses are always safe — they just hit the DB.

---

## 13. Deployment Architecture

### Phase 1 — Free Tier (Render + Vercel + Upstash)

```
┌─────────────────────────────────────────────┐
│              Render.com                     │
│                                             │
│  ┌──────────────┐   ┌─────────────────────┐ │
│  │  API Server  │   │  Frontend (React)   │ │
│  │  (Express)   │   │  Static on Vercel   │ │
│  └──────┬───────┘   └─────────────────────┘ │
│         │                                   │
│  ┌──────▼───────┐   ┌─────────────────────┐ │
│  │  PostgreSQL  │   │  Redis (Upstash)    │ │
│  │  (Render DB) │   │  free tier          │ │
│  └──────────────┘   └─────────────────────┘ │
└─────────────────────────────────────────────┘

External services (all free tier):
  Cloudinary: 25GB storage, 25GB bandwidth
  Resend:     3,000 emails/month
```

> **Deploying the React SPA:** Run `vite build` — this produces a `dist/` folder of static HTML/JS/CSS files. Deploy this folder to Vercel (drag and drop) or Render Static Site. Configure a single catch-all redirect: all paths → `index.html` so React Router can handle client-side navigation. On Vercel, add a `vercel.json`:
>
> ```json
> { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
> ```

### Phase 2 — Cloud Production (AWS / GCP)

```
┌─────────────────────────────────────────────────────────┐
│                    VPC                                  │
│                                                         │
│  ┌─────────────┐     ┌──────────────────────────────┐  │
│  │  Nginx      │────►│  App Server (Docker)         │  │
│  │  reverse    │     │  2x containers (horizontal   │  │
│  │  proxy +TLS │     │  scale on demand)            │  │
│  └─────────────┘     └───────────────┬──────────────┘  │
│                                      │                  │
│                             ┌────────▼────────┐         │
│                             │  Private Subnet │         │
│                             │  ┌──────────┐  │         │
│                             │  │ Postgres │  │         │
│                             │  │ primary +│  │         │
│                             │  │ 1 read   │  │         │
│                             │  │ replica  │  │         │
│                             │  └──────────┘  │         │
│                             │  ┌──────────┐  │         │
│                             │  │  Redis   │  │         │
│                             │  │ managed  │  │         │
│                             │  └──────────┘  │         │
│                             └────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### Docker Compose (Development)

```yaml
services:
    api:
        build: ./backend
        env_file: .env
        depends_on: [db, redis]
        ports: ["4000:4000"]

    worker:
        build: ./backend
        command: node dist/worker.js # same image, different entry point
        env_file: .env
        depends_on: [db, redis]

    db:
        image: postgres:16
        environment:
            POSTGRES_DB: hostel_mgmt
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: ${DB_PASSWORD}
        volumes: ["pg_data:/var/lib/postgresql/data"]

    redis:
        image: redis:7-alpine
        volumes: ["redis_data:/data"]

    frontend:
        build: ./frontend
        ports: ["3000:80"] # Vite preview / Nginx serves static dist/
        env_file: .env.local

volumes:
    pg_data:
    redis_data:
```

### CI/CD Pipeline (GitHub Actions)

```
on: push to main
  ↓
lint + type-check (tsc --noEmit)
  ↓
unit tests (Jest — billing engine, leave validation)
  ↓
integration tests (Prisma test DB in Docker)
  ↓
Docker build
  ↓
Deploy to Render/Railway (auto-deploy on main)
  ↓
Prisma migrate deploy (runs before server starts in entrypoint)
```

---

## 14. Implementation Roadmap

### MVP Definition

The MVP delivers core operational value: wardens can manage attendance, leaves, and payments; students can view their status and apply for leave.

---

### Phase 1 — Foundation (Weeks 1–3)

**Step 1: Project setup + database**
Monorepo setup (backend + frontend), Prisma schema with all 18 tables, migrations, seed scripts for development data. Docker Compose running locally.

**Step 2: Auth system**
Login, JWT access + refresh token rotation, forced password change flow, RBAC middleware. CSV student import with bcrypt seeding. All four roles working.

**Step 3: Hostel / Mess / Student management**
CRUD for hostels, messes, rooms, all assignment tables. Admin UI for managing the college structure.

---

### Phase 2 — Core Operations (Weeks 4–7)

**Step 4: Attendance system**
Incharge attendance marking (bulk + per-meal toggles per student). Backdate support. Mess-day waiver. Student calendar view with color coding.

**Step 5: Leave system**
Student leave application with advance validation. Warden approval/rejection. Auto-approval BullMQ job. Early return (`return_date`) handling.

**Step 6: Extras tracking**
Mess extra items configuration (admin). Incharge adds extras per student per day. Extras display in billing preview.

---

### Phase 3 — Billing & Payments (Weeks 8–11)

**Step 7: Billing engine**
Full day-by-day algorithm implementation. Unit tested against all edge cases. Monthly cron job. Bill generation with line items. Student ledger view. Frozen bill + adjustment mechanism.

**Step 8: Payment proof system**
Student upload to Cloudinary. Warden verification queue with screenshot viewer. Partial payment support. Balance calculation. Full ledger transparency for students.

---

### Phase 4 — Complaints & Notifications (Weeks 12–14)

**Step 9: Complaint system**
Student complaint form. Warden assignment queue. Technician registry management. Status tracking. Resolution with notes.

**Step 10: Notifications**
In-app notification polling via React Query `refetchInterval` (30s). Email via Resend. All 10 notification event types wired. BullMQ `notification-send` queue.

---

### Phase 5 — Reports & Polish (Weeks 15–17)

**Step 11: Reports + exports**
Billing summary, defaulter list, attendance rates, complaint metrics. PDF via `puppeteer`, Excel via `exceljs`. Async export via `report-export` BullMQ queue.

**Step 12: Warden dashboard analytics**
KPI cards: total students, collection rate, occupancy rate, open complaints, pending approvals. Charts using Chart.js.

**Step 13: Security audit + performance**
OWASP checklist walkthrough. Rate limiting tuning. Redis caching on all hot paths. `EXPLAIN ANALYZE` on slow queries. Playwright E2E tests for critical student flows.

---

### Team & Testing Notes

- **Recommended team:** 1 backend engineer + 1 frontend engineer + 1 part-time QA/PM
- **Solo developer:** Can hit MVP (Phases 1–3) in ~10 weeks working full-time
- **Testing priorities:**
    - Billing engine: unit tests for every edge case in `billing.engine.ts`
    - Leave validation: unit tests for all business rules
    - Auth/RBAC: integration tests covering all role combinations
    - UI: Playwright E2E for critical student flows (apply leave, submit payment)

---

## Appendix A — Business Rules Quick Reference

| Rule                      | Detail                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Leave advance requirement | Must be applied at least **2 calendar days** before start date                                                                        |
| Leave auto-approval       | If warden takes no action within **48 hours** of application, leave is AUTO_APPROVED                                                  |
| Leave waiver threshold    | Only leaves with **effective duration > 2 days** qualify for mess fee waiver                                                          |
| Leave waiver scope        | Waiver applies to **all days** of the leave including the first 2                                                                     |
| Maximum leave per year    | **60 days** total (2 months) per academic year per student                                                                            |
| No retroactive leave      | Students cannot apply leave for past or current day                                                                                   |
| Mess charge rule          | If student is present for **any one meal** in a day → charged **full day rate**                                                       |
| Mess day waiver           | If incharge marks a day as waived → **no student is charged** for that day, overrides all other rules                                 |
| Hostel rent billing       | Charged in the **specific month** configured per semester (not monthly). Only appears on bill when `due_month` matches billing month. |
| Bill generation           | Auto-generated at **2:00 AM on 1st** of each month for previous month                                                                 |
| Bill freeze               | Bills are **frozen immediately on generation**. Corrections via adjustment line items on next bill.                                   |
| Partial payments          | Allowed. Student can pay any amount against any bill. Balance tracked in real time.                                                   |
| Payment verification      | Manual — warden or accountant reviews reference number + screenshot                                                                   |
| Incharge per mess         | Each mess has exactly one current incharge at a time                                                                                  |
| Student per mess          | No mid-semester mess switch. Assigned at semester start.                                                                              |
| Complaint resolution      | Warden marks resolved (after technician reports completion). Student cannot mark resolved.                                            |
| Complaint photo           | Not supported                                                                                                                         |
| Technician login          | Technicians have no system login. Name + phone only.                                                                                  |
| Soft deletes              | All critical tables use `deleted_at` for soft delete to preserve billing history                                                      |
| Audit logs                | Append-only. No updates or deletes. Both user actions and system actions are logged.                                                  |

---

## Appendix B — Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hostel_mgmt"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_ACCESS_SECRET="your-access-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Resend
RESEND_API_KEY="re_xxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# App
NODE_ENV="development"
PORT=4000

# Frontend (Vite — prefix with VITE_ so Vite exposes them to the browser)
VITE_API_BASE_URL="http://localhost:4000/api/v1"
```

> **Note on environment variables:** In Next.js you prefix browser-exposed variables with `NEXT_PUBLIC_`. In Vite, the prefix is `VITE_`. Access them in your React code as `import.meta.env.VITE_API_BASE_URL`.

---

## Appendix C — Prisma Schema Enums

```prisma
enum Role {
  WARDEN
  WARDEN
  MESS_INCHARGE
  STUDENT
}

enum Gender {
  MALE
  FEMALE
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  AUTO_APPROVED
  CANCELLED
}

enum BillStatus {
  GENERATED
  PARTIALLY_PAID
  PAID
}

enum PaymentStatus {
  PENDING
  VERIFIED
  REJECTED
}

enum ComplaintStatus {
  OPEN
  ASSIGNED
  RESOLVED
}

enum NotificationType {
  LEAVE_APPROVED
  LEAVE_REJECTED
  LEAVE_AUTO_APPROVED
  BILL_GENERATED
  PAYMENT_VERIFIED
  PAYMENT_REJECTED
  COMPLAINT_ASSIGNED
  COMPLAINT_RESOLVED
}

enum Semester {
  FIRST
  SECOND
}

enum BillLineItemType {
  HOSTEL_RENT
  MESS_CHARGE
  EXTRA
  ADJUSTMENT
}
```

---

## Appendix D — Next.js → React Conversion Cheat Sheet

This appendix is a quick reference for every Next.js concept used in the original design and its React equivalent in this project.

| Next.js Concept                               | React Equivalent                                              |
| --------------------------------------------- | ------------------------------------------------------------- |
| `app/` directory + file-based routing         | `src/router.tsx` with `createBrowserRouter` (React Router v6) |
| `page.tsx` file                               | Any `.tsx` component in `src/pages/`                          |
| `layout.tsx` with `{children}`                | Layout component with `<Outlet />` (React Router v6)          |
| Route group `(student)/layout.tsx`            | `<ProtectedRoute>` wrapper + `<StudentLayout>` in router      |
| Dynamic route `[billId]/page.tsx`             | Route path `/billing/:billId` + `useParams()` hook            |
| `import { useRouter } from 'next/navigation'` | `import { useNavigate } from 'react-router-dom'`              |
| `router.push('/path')`                        | `navigate('/path')`                                           |
| `import Link from 'next/link'`                | `import { Link } from 'react-router-dom'`                     |
| `<Link href="/path">`                         | `<Link to="/path">`                                           |
| `NEXT_PUBLIC_` env prefix                     | `VITE_` env prefix; accessed via `import.meta.env.VITE_*`     |
| Next.js automatic code splitting              | `React.lazy()` + `<Suspense>`                                 |
| `next build`                                  | `vite build` → outputs `dist/`                                |
| `next start`                                  | Serve `dist/` with Nginx or `vite preview`                    |
| App Router loading.tsx                        | `<Suspense fallback={<Loading />}>`                           |
| Server Components                             | Not applicable — this app is a pure client-side SPA           |
| API routes (`app/api/`)                       | Not used — all API is in the Express backend                  |

---

_End of Master System Design Document_
