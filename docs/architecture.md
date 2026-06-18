# PETSISTEM V1 Architecture

## Product Boundary

PETSISTEM is a multi-tenant SaaS for petshops, grooming operations, and veterinary clinics. The commercial model is setup fee plus recurring subscription. The V1 prioritizes a sellable operational core: tenant isolation, scheduling, pet/client records, operational checklist, tutor tracking, manual Pix subscriptions, and Admin Master oversight.

## Stack

- Next.js 15 App Router, TypeScript, React 19
- Tailwind CSS v4, shadcn/ui, lucide-react, Motion
- Supabase Auth, PostgreSQL, Storage, Realtime, RLS
- Vercel deployment

## Tenant Model

The root domain `petsistem.com.br` hosts Admin Master and platform surfaces. Tenant storefronts run on `nomedaloja.petsistem.com.br`. Local development can emulate a tenant at `/loja/[slug]`.

Tenant ownership is explicit:

- `petshops` stores tenant identity, status, subdomain, plan, and settings.
- `users` mirrors `auth.users` profile data.
- `memberships` maps users to petshops and roles.
- Every tenant-owned table has `petshop_id`.
- RLS policies use `auth.uid()` plus membership checks.
- Admin Master access is modeled in `users.global_role = 'admin_master'`.

## Roles

- Admin Master: manages tenants, users, subscriptions, platform metrics, and support access.
- Dono: manages local operations, calendars, employees, veterinarians, clients, pets, reports, and subscription.
- Atendente: manages daily agenda, appointment status, and checklists.
- Veterinario: manages veterinary calendar, consultations, notes, and finalization.

## Application Areas

- Public tenant landing: service-specific CTA for grooming or veterinary booking, plus login.
- Booking flow: public service selection, available day/time, form, confirmation.
- Internal app: role-aware dashboard, calendars, clients, pets, employees, checklists, subscription.
- Tutor tracking: tokenized public realtime timeline without login.
- Admin Master: tenant metrics, subscription/payment oversight, tenant activation/blocking.

## Security Decisions

- No tenant access is trusted from the browser alone.
- Tenant subdomain resolution is advisory in middleware; database RLS remains authoritative.
- Service role keys must never be shipped to the browser.
- Protected routes validate the Supabase session server-side.
- Admin support impersonation must be audited with actor and target petshop.

## UI Direction

The visual system is premium but operational: restrained neutrals, high contrast, clear scanning, dense but calm dashboards, and polished state handling. Public tenant pages can use stronger editorial composition and motion; internal surfaces stay utilitarian and fast.
