# Configuração de DNS — multi-tenant via subdomínio

Cada loja cadastrada no Admin Master vira `slug.petsistem.com.br`. Pra isso funcionar em prod, precisa de **DNS wildcard** + **Vercel domain wildcard**. Tem que ser feito manualmente — o Admin Master cria o subdomínio no banco, mas o DNS depende do dono do domínio (você).

## Pré-requisitos
- Domínio `petsistem.com.br` comprado e com o painel do registrar disponível
- Projeto na Vercel já hospedando esta aplicação

## 1. DNS no registrar (Registro.br, Cloudflare, GoDaddy, etc)

Adicione **dois** registros:

| Tipo  | Nome (host) | Conteúdo / Destino           | TTL  |
|-------|-------------|------------------------------|------|
| A     | @           | `76.76.21.21` (Vercel)       | Auto |
| CNAME | `*`         | `cname.vercel-dns.com.`      | Auto |

- O `*` faz com que `qualquercoisa.petsistem.com.br` aponte pra Vercel.
- Se o registrar não aceitar wildcard junto com `A @`, use a alternativa: CNAME do `@` se permitido, senão verifique a doc do seu provedor.

## 2. Domain na Vercel

No painel do projeto → **Settings → Domains**:

1. Add `petsistem.com.br` — Vercel pede verificação por DNS (registro `TXT` automático).
2. Add `*.petsistem.com.br` — wildcard.
3. Aguardar status mudar para "Valid Configuration" (até 30 min após o DNS propagar).

## 3. Variável de ambiente

Adicione na Vercel (Settings → Environment Variables) e no `.env.local`:

```
NEXT_PUBLIC_ROOT_DOMAIN=petsistem.com.br
```

Múltiplos domínios funcionam — separe por vírgula:

```
NEXT_PUBLIC_ROOT_DOMAIN=petsistem.com.br,petsistem.vercel.app
```

O middleware (`src/middleware.ts`) detecta qualquer host que termine em um desses sufixos e reescreve a URL pra `/loja/<slug>`.

## 4. Subdomínios reservados

Esses NÃO podem ser usados como slug de loja (já são reservados pelo sistema):

`www, app, admin, api, auth, static, assets, cdn, mail, blog`

A action `createPetshopWithOwner` rejeita esses valores.

## 5. Testando localmente

Em dev:

```
http://petgres.localhost:3000
```

funciona sem configuração de DNS — o navegador resolve `*.localhost` no loopback automaticamente. Se quiser, adicione no `/etc/hosts` (Linux/Mac) ou `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 petgres.localhost
```

## 6. Troubleshooting

- **"DNS_PROBE_FINISHED_NXDOMAIN"**: DNS ainda propagando. Aguarde 5–30 min.
- **Vercel mostra "Invalid Configuration"**: verifique o registro `TXT` que a Vercel pediu; o CNAME wildcard sozinho não basta na primeira verificação.
- **Subdomínio resolve mas dá 404 da app**: confira `NEXT_PUBLIC_ROOT_DOMAIN` na Vercel. O middleware só reescreve hosts conhecidos.
