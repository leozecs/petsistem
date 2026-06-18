# PETSISTEM

PETSISTEM is a multi-tenant SaaS platform for petshops, grooming operations, and veterinary clinics. The V1 focuses on the sellable operational core: tenant isolation, scheduling, client and pet records, operational checklists, tutor tracking, manual Pix subscriptions, and Admin Master oversight.

## Stack

- Next.js 15 App Router
- React 19 and TypeScript
- Tailwind CSS v4
- shadcn/ui-style components
- Supabase Auth, PostgreSQL, RLS, Storage, and Realtime-ready structure
- Motion, lucide-react, TanStack Table, React Hook Form, Zod, Recharts

## Main Areas

- `/` and `/login`: shared authentication surface.
- `/loja/[slug]`: local tenant storefront emulator.
- `/app`: tenant internal dashboard.
- `/app/calendarios`: agenda and scheduling operations.
- `/app/clientes` and `/app/pets`: tutor and pet records.
- `/app/checklist`: operational bath/grooming checklist flow.
- `/app/assinatura`: subscription and payment oversight.
- `/admin-master`: platform admin console.
- `/acompanhamento/[code]`: public tutor tracking page.

## Project Structure

```txt
src/
  app/                  App Router routes and route handlers
  components/
    app/                Operational SaaS components
    auth/               Login experience
    booking/            Public booking flow
    marketing/          Public tenant storefront
    shared/             Reusable app states and UI helpers
    ui/                 UI primitives
  lib/
    data/               Demo data and typed contracts
    supabase/           Browser, server, admin, and middleware clients
    env.ts              Environment configuration
    tenant.ts           Host and tenant helpers
supabase/
  migrations/           Database schema, policies, and RLS helpers
docs/                   Architecture, database, backlog, and roadmap notes
```

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=petsistem.com.br
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_MASTER_EMAIL=
ADMIN_MASTER_PASSWORD=
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase

The initial schema lives at:

```txt
supabase/migrations/20260618014500_initial_schema.sql
```

The database model is tenant-first. Every tenant-owned table uses `petshop_id`, and RLS policies rely on membership checks plus the Admin Master role. See `docs/database.md` and `docs/architecture.md` before changing schema or policies.

## Scripts

```bash
npm run dev        # Start local Next.js development server
npm run build      # Create production build
npm run start      # Run production build locally
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript checks without incremental cache
```

## Notes

- Keep secrets on the server only. `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to client components.
- Tenant resolution is handled by host/subdomain helpers, but database RLS is the source of truth for authorization.
- Business-facing copy and feature components should stay in Portuguese.
- Generated UI primitives live in `src/components/ui`; avoid mixing business rules into those files.
