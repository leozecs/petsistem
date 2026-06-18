# Database Model

## Core Tables

- `petshops`: tenants, subdomains, commercial status, plan settings.
- `users`: Supabase user profile mirror with optional global admin role.
- `roles`, `permissions`, `role_permissions`: role catalog for policy and UI visibility.
- `memberships`: user to tenant relationship and role assignment.

## Operations

- `clients`: tutor records.
- `pets`: pet records with optional photo path.
- `employees`: staff records for local operations.
- `veterinarians`: veterinary professionals and CRM data.
- `services`: grooming and veterinary service catalog.
- `calendars`: grooming and veterinary calendars.
- `schedules`: recurring working hours by professional/calendar.
- `appointments`: booking records and operational statuses.
- `checklist_steps`: tenant-configurable workflow steps.
- `checklists`: appointment-linked progress.

## Commercial

- `subscriptions`: tenant plan, amount, due date, and status.
- `payments`: manual Pix payment records and confirmation workflow.

## Governance

- `audit_logs`: create/update/delete/support events.
- `status_history`: appointment, checklist, subscription, and payment status transitions.

## RLS Contract

Every tenant-owned table has `petshop_id`. Policies allow:

- Admin Master: all rows.
- Tenant members: rows with matching `petshop_id`.
- Public booking/tracking: only explicit insert/read policies for safe surfaces.

The initial migration defines helper functions:

- `public.is_admin_master()`
- `public.is_petshop_member(target_petshop_id uuid)`
- `public.has_petshop_role(target_petshop_id uuid, allowed_roles text[])`
