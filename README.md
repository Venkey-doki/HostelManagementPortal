# Hostel Management Portal

Monorepo for the Hostel Management Portal:

- backend: Node.js + Express + Prisma + PostgreSQL + Redis
- frontend: React + Vite SPA

## Prerequisites

- Node.js 20+
- Docker + Docker Compose

## Quick Start

1. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

2. Start local infrastructure and services:

```bash
docker compose up --build -d
```

3. View logs:

```bash
docker compose logs -f
```

4. Stop services:

```bash
docker compose down
```

## Manual Development (without Docker)

1. Start PostgreSQL and Redis locally.
2. Copy backend env:

```bash
cp backend/.env.example backend/.env
```

3. Run migration and seed:

```bash
cd backend
npm run prisma:migrate
npm run prisma:seed
```

4. Start both apps:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```
