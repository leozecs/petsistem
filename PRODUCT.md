# PETSISTEM

SaaS multi-tenant pra petshop e clínica veterinária brasileira. Cada loja vira um subdomínio (`<slug>.petsistem.com.br`) com agenda online pública, painel pra equipe (dono, atendente, veterinário) e financeiro.

## Register

**brand** — design IS the product na landing `petsistem.com.br/`. Quem chega aqui não tá comprando enterprise, tá comprando "ferramenta pro meu petshop não perder mais hora".

## Audience

- Donos de petshop / pet center / clínica vet de pequeno e médio porte
- Brasil, predominantemente Sudeste e Sul
- Operam no celular tanto quanto no desktop
- Não são early adopters tech, mas resolvem o WhatsApp do dia-a-dia
- Já experimentaram planilha, agenda de papel, sistema antigo com cara de 2010

## Brand voice

Três palavras concretas:

- **Mão na massa** (não corporativo, não "enterprise")
- **Caprichoso** (cuida de cada detalhe igual o dono cuida do pet)
- **Pé no chão** (R$ 49 não R$ 4.900; mensalidade fixa; sem letra miúda)

NOT: "AI-powered", "enterprise-grade", "revolutionary", "10x your business".

## Visual direction

- **Light theme.** Dark é reflex SaaS; o público é petshop brasileiro, não dev TS Linear-clone.
- **Cor:** emerald-600 (`oklch(0.6 0.13 162)`) como primária, identity preservada. Body em zinc-50 quente.
- **Tipografia:** Bricolage Grotesque (headlines) + Hanken Grotesk (body). Fora da reflex-reject list.
- **Imagery:** hero com mockup real da agenda (não bloco abstrato), seções com fotos Unsplash de pet escolhidas (não floating ícones).
- **Layout:** quebra de grid intencional. Hero alinhado à esquerda, mockup grande à direita. Features em mosaico (1 grande + 3 pequenos). Pricing com plano destacado em altura diferente.

## What we are NOT

- Não é Stripe-minimal (somos calorosos, somos próximos)
- Não é Mailchimp-maximalismo (somos sérios sobre operação)
- Não é Notion-marketing (não somos editorial)
- Não é Linear-dark (somos brasileiros, gente de loja)

Mais próximo: **Cal.com (light variant)** + **Toggl Track** + um toque de **Notion** no tom de copy. Mas sem copiar.

## Surfaces

- `petsistem.com.br/` — landing pública (esse refactor)
- `<slug>.petsistem.com.br/` — agendamento público do tenant
- `petsistem.com.br/app/*` — painel interno autenticado
- `petsistem.com.br/admin-master/*` — admin da plataforma

## Constraints

- Next.js 15 App Router
- Tailwind v4
- Stack já tem Hanken Grotesk + Bricolage acessíveis via Google Fonts (vou adicionar)
- Sem libs de animação pesadas (motion já tá, mas usar com parcimônia)
