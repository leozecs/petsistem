# PETSISTEM Security Architecture Contract

This document is the permanent operating contract for PETSISTEM development. It exists so Codex, Claude, and future contributors make the same security and architecture decisions.

## Core Rule

PETSISTEM is a multi-tenant SaaS. Security and petshop isolation have maximum priority. Never prioritize development speed over tenant isolation, authorization, auditability, data integrity, or production readiness.

The product must be built as if it will serve:

- 100 petshops
- 1,000 petshops
- 10,000 petshops

## Required Expert Roles

Before any implementation, refactor, API, migration, page, component, auth flow, storage rule, deployment change, or business rule change, assume these roles simultaneously:

1. Multi-Tenant Security Architect
2. Supabase Security Specialist
3. RBAC Engineer
4. SaaS Backend Architect
5. Database Architect
6. Secure Authentication Engineer
7. OWASP Top 10 Security Expert
8. Audit & Compliance Engineer
9. SaaS Infrastructure Architect
10. Senior Code Reviewer
11. Enterprise SaaS Solution Architect

## Mandatory Roles

The system must support these roles:

- `admin_master`: platform-level admin, manages tenants, plans, billing, support, and global governance.
- `owner`: petshop owner, manages tenant operations and tenant users.
- `attendant`: operational staff, manages agenda, clients, pets, and checklists within allowed scope.
- `veterinarian`: veterinary staff, manages veterinary agenda, clinical notes, and related records within allowed scope.

UI labels may be localized, but database/API role values must stay consistent and reviewable.

## Multi-Tenant Rules

Every tenant-owned table must include:

```sql
petshop_id
```

Every tenant-owned query must filter by:

```sql
petshop_id
```

Every API, Server Action, Route Handler, and page that reads or mutates tenant data must validate:

```txt
Does the authenticated user belong to this petshop?
Does the authenticated user have the required role for this action?
```

No petshop may:

- Read another petshop's data
- Edit another petshop's data
- Delete another petshop's data
- List another petshop's users, clients, pets, appointments, files, reports, payments, or settings
- Infer another petshop's operational volume through IDs, counts, public URLs, errors, or timing

Truly global platform tables, such as plan catalog or admin-only platform configuration, must not store tenant-owned operational data. If a table does not have `petshop_id`, the reason must be explicit in the migration, schema documentation, or PR notes.

## Supabase Security Rules

Supabase is not only a database client; it is part of the security boundary.

Mandatory:

- Enable RLS on every table in exposed schemas that can contain user or tenant data.
- Prefer private helper functions in an unexposed schema for privileged checks.
- Do not put `security definer` helpers in exposed schemas unless explicitly reviewed and justified.
- Do not use `user_metadata` or other user-editable metadata for authorization decisions.
- Do not expose `service_role` or secret keys to the browser.
- Treat all `NEXT_PUBLIC_*` values as public and browser-visible.
- Validate all public inserts and public tracking reads with narrow policies.
- Avoid broad policies such as "authenticated can select all" unless the table is truly global and safe.
- For updates, ensure matching SELECT policies exist; Postgres RLS requires SELECT visibility before UPDATE can affect rows.

Recommended:

- Keep JWT expiry and session behavior appropriate for admin-grade SaaS.
- Use advisors/security checks before merging schema work when MCP/CLI access is available.
- Use migrations for permanent schema changes, with deterministic order and reviewable SQL.

## Backend/API Rules

Every protected endpoint must enforce security server-side.

For each API, Server Action, or Route Handler, define:

- Required authentication state
- Required role
- Tenant source (`petshop_id`, active membership, subdomain, route param, or explicit admin selection)
- Input schema validation
- Authorization check
- Audit/log behavior for mutations
- Safe error messages
- Cache behavior
- CSRF/origin posture for cookie-authenticated state changes
- Rate-limit expectation for login, setup, billing, public booking, and expensive flows

Never use GET for state-changing operations.

Never return raw stack traces, SQL errors, secrets, tokens, session cookies, or internal policy details to users.

## RBAC Rules

RBAC must be enforced on the server, not only in menus.

Required:

- Menus may hide actions for UX, but hidden menus are not authorization.
- Server functions must check role and tenant membership before every protected read/write.
- Admin Master actions must be isolated from tenant member actions.
- Support/impersonation flows must be explicit, audited, and reversible.
- Role changes must be auditable and should invalidate or refresh stale authorization state where applicable.

## Database Architecture Rules

Tenant-owned tables must include:

- `id` as UUID or another non-guessable identifier
- `petshop_id`
- `created_at`
- `updated_at`
- `created_by` where applicable
- `updated_by` where applicable
- `deleted_at` and `deleted_by` where soft delete is required

Indexes must support tenant-scoped access patterns, for example:

```sql
(petshop_id, created_at)
(petshop_id, status)
(petshop_id, starts_at)
(petshop_id, deleted_at)
```

Constraints must protect integrity:

- Unique subdomains
- Unique tenant-scoped slugs/names where relevant
- Foreign keys with explicit delete behavior
- Check constraints for status/state machines where useful

Avoid schema shortcuts that will break at scale, such as cross-tenant joins without tenant predicates, unbounded scans, public sequential IDs, or tenant data stored in JSON when relational constraints are needed.

## Audit And Compliance Rules

Mutations must be traceable.

Register:

- Who created
- Who edited
- Who deleted
- Who changed status
- Who accessed support/admin surfaces
- Date and time
- Tenant
- Entity type
- Entity id
- Relevant before/after metadata when safe and useful

Audit logs must not store secrets, full passwords, session tokens, service keys, or sensitive authorization headers.

## OWASP Top 10 Rules

Prevent by default:

- Broken access control
- Authentication bypass
- Privilege escalation
- SQL injection
- XSS
- CSRF
- SSRF
- Data exposure
- Session hijacking
- Insecure design
- Security misconfiguration
- Vulnerable dependencies

High-signal checks:

- No string-built SQL with untrusted input
- No `dangerouslySetInnerHTML` for untrusted content
- No `innerHTML`, `eval`, `new Function`, or string-based timers
- No open redirects from untrusted `next`, `returnTo`, or `redirect`
- No broad CORS with credentials
- No public storage bucket for tenant-private files
- No cached/shared response for user-specific or tenant-specific data

## Frontend Rules

Frontend is UX, not the security boundary.

Required:

- Do not store secrets or long-lived auth tokens in localStorage/sessionStorage.
- Treat API data as untrusted when rendering.
- Validate URLs before navigation or external links.
- Use `rel="noopener noreferrer"` for external target blank links.
- Do not depend on hidden buttons or client-side redirects for security.
- Keep dashboards dense, legible, and operational, but never leak data across tenants in client state.

## Storage Rules

If Supabase Storage is used:

- Bucket names and paths must include or derive from tenant scope.
- Tenant-private files must not be public.
- Policies must verify membership and role.
- Uploads must validate file type, size, and ownership.
- Do not store uploads under Next.js `public/`.
- Public assets must be intentionally public and contain no tenant-private data.

## Infrastructure Rules

Subdomains and production routing are security-relevant.

Required:

- `petsistem.com.br` is the platform/root domain.
- Tenant subdomains follow `<tenant>.petsistem.com.br`.
- Subdomain resolution is advisory; database membership/RLS remains authoritative.
- Host header usage must be allowlisted when used for security-sensitive URL construction.
- Vercel environment variables must be configured per environment.
- `.env*` files must not be committed.
- DNS/SSL/Cloudflare/Vercel changes must not weaken tenant isolation.

## Implementation Checklist

Before signoff on any change, answer:

### Tenant Isolation

- Is there any cross-tenant access risk?
- Does every tenant-owned query filter by `petshop_id`?
- Does every protected route validate tenant access?
- Are public booking/tracking surfaces narrowly scoped?

### Permissions

- Is access enforced server-side?
- Is the role check correct?
- Is privilege escalation possible?
- Is Admin Master separated from tenant roles?

### Database

- Does every tenant-owned table have RLS?
- Does every tenant-owned table have policy coverage?
- Are indexes tenant-aware?
- Are constraints strong enough?

### API

- Is the endpoint authenticated when needed?
- Is input validated at runtime?
- Is CSRF/origin handled for cookie-authenticated mutations?
- Are errors safe?
- Is caching disabled for sensitive data?

### Frontend

- Is every protected page server-validated?
- Are menus role-aware but not relied on for security?
- Is sensitive data absent from client storage and public env vars?

### Storage

- Are buckets and paths tenant-scoped?
- Can one tenant access another tenant's files?
- Are uploads validated?

### Audit

- Does the action record actor, tenant, entity, action, and timestamp?
- Are support/admin actions logged?
- Are secrets excluded from logs?

### Performance And Scale

- Will this work for 100, 1,000, and 10,000 petshops?
- Are queries indexed by tenant?
- Are expensive operations bounded or queued?
- Are list endpoints paginated?

## Definition Of Done

A feature is not done until it includes:

1. Architecture rationale
2. Database design
3. Security model
4. Permission model
5. Audit behavior
6. Scalability considerations
7. UX/UI behavior
8. Error handling
9. Logs/observability
10. Performance expectations
11. Tests or verification appropriate to risk
12. Senior review against this document

## Hard Stops

Stop and escalate before proceeding if a task requires:

- Disabling RLS
- Bypassing auth for protected data
- Shipping service-role keys to the browser
- Adding broad tenant policies to save time
- Committing secrets
- Using frontend-only authorization
- Making tenant data public
- Creating a table with tenant-owned data but no `petshop_id`
- Applying production migrations without knowing the target Supabase project
- Deploying without required environment variables

Production readiness is mandatory. No hacks, no fragile shortcuts, no undocumented security exceptions.
