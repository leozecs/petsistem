---
name: update
description: Releitura de contexto pra retomar trabalho no PETSISTEM. Roda quando o usuário digita /update, "update", "pega o contexto", "pega contexto", "atualiza contexto", "veja contexto" ou pede pra recapitular onde parou.
---

# Update — recarrega contexto pra continuar de onde parou

Quando essa skill é invocada, releia o contexto do projeto na ordem abaixo e
produza um resumo CURTO (≤ 25 linhas) cobrindo:

1. **Em que branch e commit estamos** + sincronia com origin
2. **Últimos 10 commits** (one-liner cada)
3. **Pendências abertas** (tasks pending/in_progress relevantes; ignora tasks
   completed antigas)
4. **Memórias de feedback ativas** que afetam o estilo de trabalho com o user
5. **O que provavelmente vem a seguir** (1-2 sugestões)

NÃO leia código a fundo nesse passo. NÃO regenere planos. Objetivo é PURO
contexto, em ≤ 30 segundos de reading-time.

## Passos exatos (faça em paralelo quando der)

1. `git status` + `git log -10 --oneline` + `git rev-parse HEAD origin/main`
   (confirma sincronia)
2. Read `C:\Users\dev\Desktop\claude-petsistem\AGENTS.md` (contrato de segurança)
3. Read `C:\Users\dev\.claude\projects\C--Users-dev-Desktop-claude-petsistem\memory\MEMORY.md`
   (índice de memórias) — só as linhas, não cada arquivo individual
4. TaskList → filtra status `pending` ou `in_progress`
5. `git diff HEAD~3 HEAD --stat` pra ver os arquivos mexidos recentemente

## Formato do resumo

```
**Branch:** main · sincronizado com origin (HEAD <hash-curto>)

**Últimos commits (10):**
- <hash> <subject>
- ...

**Pendências:**
- Task #N: <subject>
- ...

**Memórias ativas relevantes:**
- <linha 1 do MEMORY.md>
- ...

**Próximos passos prováveis:**
- <1 sugestão concreta>
- <2 sugestão concreta>
```

## Regras

- NÃO faça assumptions sobre o que o user quer fazer. Apenas resuma o estado.
- Se houver mudanças não-commitadas (working tree dirty), destaque no topo.
- Se origin estiver à frente, destaque também.
- Se NÃO houver pendência clara nas tasks, sugira releitura do último plano
  proposto pelo modelo na conversa anterior.
- Mantenha tom direto. Sem floreios.
