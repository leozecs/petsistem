# Folder Structure

```txt
src/
  app/
    page.tsx                    Root platform page
    login/page.tsx              Shared login surface
    loja/[slug]/page.tsx        Local tenant landing emulator
    app/                        Tenant internal app
    admin-master/page.tsx       Platform admin console
    acompanhamento/[code]/page.tsx
  components/
    app/                        Operational SaaS components
    marketing/                  Public tenant storefront components
    shared/                     Empty/loading/error and shell helpers
    ui/                         shadcn/ui components
  lib/
    data/                       Typed demo data and navigation contracts
    supabase/                   Browser/server/middleware clients
    tenant.ts                   Host and tenant helpers
supabase/
  migrations/                   SQL schema, RLS, policies
docs/
  architecture.md
  database.md
  backlog.md
  roadmap.md
```

## Conventions

- Route segments under `src/app/app` are tenant-scoped internal screens.
- `src/components/ui` remains generated shadcn code.
- Feature components keep business language in Portuguese.
- Database access that needs secrets stays in Server Components, Server Actions, or route handlers.
- Client Components are reserved for interactive tabs, calendars, dialogs, and motion.
