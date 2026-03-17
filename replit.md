# Property Management Application

## Overview

A full-featured, production-ready Property Management SaaS application for managing Sectional Title schemes, HOAs, and residential/commercial complexes.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod)
- **Routing**: Wouter
- **Forms**: react-hook-form + @hookform/resolvers
- **Charts**: Recharts
- **Date utilities**: date-fns
- **Animation**: framer-motion

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080, served at /api)
│   └── property-mgmt/      # React + Vite frontend (served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed script
└── ...
```

## Modules

1. **Portfolio Overview** — List all complexes with type badges, address, unit count
2. **Complex Dashboard** — Full immersive dashboard with left sidebar navigation
3. **Units** — Table of all units, edit, assign owners/tenants, track status
4. **Billing** — Invoice management, bulk levy billing runs, mark as paid
5. **Maintenance** — Ticket system, log requests, assign to staff/vendors, track status
6. **Communications** — Send newsletters/notices to all or selected units, history log
7. **Documents** — Upload and manage compliance docs, contracts, financial statements
8. **Reports** — Financial reports (charts, totals) + Occupancy reports
9. **Settings** — Edit complex details and managing agent info

## Database Schema

Tables:
- `complexes` — Complex/property records
- `units` — Individual units per complex
- `invoices` — Levy/billing invoices per unit
- `maintenance_requests` — Maintenance tickets per unit
- `communications` — Newsletters/notices per complex
- `documents` — Document records per complex/unit

## API Routes

All routes under `/api`:

- `GET/POST /complexes` — List/create complexes
- `GET/PUT/DELETE /complexes/:id` — Get/update/delete complex
- `GET /complexes/:id/stats` — Dashboard stats
- `GET/POST /complexes/:id/units` — List/create units
- `PUT /complexes/:id/units/:unitId` — Update unit
- `GET/POST /complexes/:id/invoices` — List/create invoices
- `PUT /complexes/:id/invoices/:invoiceId` — Update invoice (mark paid)
- `POST /complexes/:id/billing/bulk-run` — Bulk levy billing
- `GET/POST /complexes/:id/maintenance` — List/create maintenance requests
- `PUT /complexes/:id/maintenance/:requestId` — Update maintenance status
- `GET/POST /complexes/:id/communications` — List/send communications
- `GET/POST /complexes/:id/documents` — List/add documents
- `DELETE /complexes/:id/documents/:documentId` — Delete document
- `GET /complexes/:id/reports/financial` — Financial report
- `GET /complexes/:id/reports/occupancy` — Occupancy report

## Seed Data

Run to populate demo data:
```bash
pnpm --filter @workspace/scripts run seed
```

Creates:
- 3 complexes (Sectional Title, HOA, Commercial)
- 18 units across complexes
- 6 invoices (mix of Paid, Overdue, Pending)
- 4 maintenance requests
- 3 communications
- 5 documents

## Development

```bash
# Install dependencies
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Seed demo data
pnpm --filter @workspace/scripts run seed

# Run codegen (after OpenAPI spec changes)
pnpm --filter @workspace/api-spec run codegen
```
