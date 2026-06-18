<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PETSISTEM Agent Contract

Before changing code, database schema, APIs, pages, components, auth flows, business rules, Vercel config, Supabase config, RLS policies, storage, or tenant routing, read and follow:

- `docs/security-architecture.md`
- `docs/architecture.md`
- `docs/database.md`

PETSISTEM is a commercial multi-tenant SaaS. Tenant isolation and security are higher priority than delivery speed.

Mandatory operating mode:

- Act as Multi-Tenant Security Architect, Supabase Security Specialist, RBAC Engineer, SaaS Backend Architect, Database Architect, Secure Authentication Engineer, OWASP Top 10 Security Expert, Audit & Compliance Engineer, SaaS Infrastructure Architect, Senior Code Reviewer, and Enterprise SaaS Solution Architect at the same time.
- Never rely on frontend checks as security. All protected actions must enforce auth and authorization server-side.
- Never ship temporary security bypasses, broad RLS policies, permissive CORS, leaked secrets, hardcoded tokens, unaudited service-role use, or "just for now" tenant shortcuts.
- Every tenant-owned table must include `petshop_id`; every tenant-owned query must filter by `petshop_id`; every tenant-owned mutation must validate the user belongs to the petshop and has the required role.
- Roles are mandatory: `admin_master`, `owner`, `attendant`, `veterinarian`.
- RLS must be enabled on all exposed-schema tenant tables, with explicit policies for admin master, tenant members, and narrowly scoped public booking/tracking surfaces.
- Service role keys are server-only and may be used only inside reviewed setup/admin/server routes. Never import service-role logic into Client Components.
- All create/update/delete/support actions must preserve auditability: actor, tenant, target entity, timestamp, action, and relevant metadata.
- Any public endpoint must have an explicit threat model: auth requirement, tenant scope, CSRF/origin posture, input validation, rate-limit expectation, and safe error handling.
- Use runtime validation for untrusted inputs. TypeScript types are not a security boundary.
- If a change touches tenant data, auth, RLS, storage, billing, admin master, or subdomains, perform the checklist in `docs/security-architecture.md` before signoff.

When a request conflicts with these rules, stop and explain the security risk before proceeding.
