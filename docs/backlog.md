# PETSISTEM V1 Backlog

## Foundation

- Scaffold Next.js 15 with App Router, TypeScript, Tailwind v4, shadcn/ui.
- Configure Supabase browser, server, and middleware clients.
- Implement tenant host parsing and route headers.
- Create migration with schema, RLS helpers, and initial policies.
- Add design system tokens, app shell, loading, empty, and error states.

## Public Tenant

- Build premium landing for tenant subdomain.
- Add booking CTAs for Banho e Tosa and Veterinaria.
- Implement booking flow: service, date/time, tutor/pet form, confirmation.
- Restrict public visibility to availability only.

## Internal App

- Dono dashboard with KPIs, upcoming appointments, operational health.
- Atendente dashboard with agenda and checklist pending items.
- Veterinario dashboard with consultations, returns, and notes.
- Calendars with grooming/veterinary tabs and day/week/month views.
- Clients CRUD.
- Pets CRUD with photo upload.
- Employees and veterinarians CRUD.
- Checklist workflow with timestamped events.

## Tutor Tracking

- Generate unique tracking token per appointment/checklist.
- Public `/acompanhamento/[code]` timeline.
- Supabase Realtime subscription for status updates.

## Subscriptions

- Minha Assinatura screen.
- Manual Pix copy action and "Pago!" workflow.
- Admin Master payment confirmation and blocking/reactivation.

## Admin Master

- Global dashboard and revenue metrics.
- Tenant management, blocking, reactivation, and support access.
- User and subscription oversight.
- Audit log search.

## Hardening

- Full RLS review.
- Route-level role middleware.
- Form validation with zod.
- Server-side authorization tests.
- Browser verification for desktop and mobile.
