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
npm install
```

2. Start local infrastructure and services:

```bash
npm run compose:up
```

3. View logs:

```bash
npm run compose:logs
```

4. Stop services:

```bash
npm run compose:down
```

## Manual Development (without Docker)

1. Start PostgreSQL and Redis locally.
2. Copy backend env:

```bash
cp backend/.env.example backend/.env
```

3. Run migration and seed:

```bash
npm run prisma:migrate -w backend
npm run prisma:seed -w backend
```

4. Start both apps:

```bash
npm run dev
```
