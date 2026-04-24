# Property Management Platform

A full-stack property management application for managing complexes, units, billing, maintenance, meetings, documents, communications, inbox items, and reporting.

The project is built as a TypeScript monorepo using pnpm workspaces. It includes a React/Vite frontend, an Express API server, PostgreSQL database access through Drizzle ORM, and generated API clients from an OpenAPI spec.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui, Wouter, TanStack Query
- **Backend:** Express 5, TypeScript
- **Database:** PostgreSQL, Drizzle ORM
- **API tooling:** OpenAPI, Orval, generated React Query client, generated Zod schemas
- **Package manager:** pnpm
- **Build tooling:** TypeScript, Vite, esbuild

## Project Structure

```text
.
├── artifacts/
│   ├── api-server/          # Express API server
│   ├── property-mgmt/       # React property management frontend
│   └── mockup-sandbox/      # UI/mockup sandbox
├── lib/
│   ├── api-spec/            # OpenAPI spec and Orval config
│   ├── api-client-react/    # Generated React Query API client
│   ├── api-zod/             # Generated Zod schemas
│   └── db/                  # Drizzle database schema and connection
├── drizzle/                 # Database migrations
├── scripts/                 # Utility scripts, including database seed
└── uploads/                 # Uploaded document storage
Main Features
Secure admin login with HTTP-only session cookies
Platform admin and tenant admin roles
Tenant-scoped access to complexes and related data
Complex portfolio dashboard
Unit management
Billing and invoice tracking
Bulk levy billing runs
Maintenance request tracking
Meetings and resolutions
Communications history
Document uploads and management
Inbox/email linking workflows
Financial and occupancy reports
Getting Started
Prerequisites
Node.js 24+
pnpm
PostgreSQL database
Install Dependencies
bash

pnpm install
Environment Variables
Create a .env file in the project root:

env

DATABASE_URL=postgresql://user:password@localhost:5432/property_management
AUTH_SECRET=replace-with-a-secure-secret

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password
ADMIN_NAME=Tenant Administrator

PLATFORM_ADMIN_EMAIL=platform-admin@example.com
PLATFORM_ADMIN_PASSWORD=change-this-password
PLATFORM_ADMIN_NAME=Platform Administrator

DEFAULT_TENANT_NAME=Default Portfolio
DEFAULT_TENANT_SLUG=default-portfolio
Database Setup
Push the Drizzle schema to the database:

bash

pnpm --filter @workspace/db run push
Seed demo data:

bash

pnpm --filter @workspace/scripts run seed
Running the App
Start the API server:

bash

pnpm --filter @workspace/api-server run dev
By default, the API runs on:

text

http://localhost:3000
Start the frontend:

bash

pnpm --filter @workspace/property-mgmt run dev
By default, the frontend runs on:

text

http://localhost:5173
The Vite dev server proxies /api requests to the API server.

Authentication
The app uses cookie-based authentication.

Available auth endpoints:

POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
Bootstrap users are created automatically from environment variables when auth endpoints are used.

Useful Scripts
Run full typecheck:

bash

pnpm run typecheck
Build all packages:

bash

pnpm run build
Generate API clients from the OpenAPI spec:

bash

pnpm --filter @workspace/api-spec run codegen
Run frontend typecheck:

bash

pnpm --filter @workspace/property-mgmt run typecheck
Run API typecheck:

bash

pnpm --filter @workspace/api-server run typecheck
API Overview
Most protected routes are available under /api and require an authenticated admin session.

Main route groups:

/api/admin
/api/complexes
/api/complexes/:complexId/units
/api/complexes/:complexId/invoices
/api/complexes/:complexId/billing
/api/complexes/:complexId/maintenance
/api/complexes/:complexId/meetings
/api/complexes/:complexId/communications
/api/complexes/:complexId/inbox
/api/complexes/:complexId/documents
/api/complexes/:complexId/reports
Notes for Production
Before deploying, update the default credentials and set a strong AUTH_SECRET.

The current session cookie is configured for local development. For production, enable secure cookies behind HTTPS and review CORS settings.
