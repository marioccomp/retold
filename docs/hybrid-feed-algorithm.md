# Algoritmo Híbrido do Feed (Hybrid Feed Algorithm)

Este documento descreve como o sistema de ranqueamento do feed funciona no Retold, tanto para projetos quanto para pessoas.

## Visão Geral

O feed utiliza algoritmos de pontuação (scoring) que combinam **engajamento** com **decaimento temporal** para projetos e **atividade recente** com **completude de perfil** para pessoas. Ambos usam SQL Raw com cache de 5 minutos via `unstable_cache`.

> **Inspiração**: A abordagem é similar ao Hacker News / Reddit — recência importa bastante, mas conteúdo com engajamento alto pode subir mesmo sendo mais antigo.

---

## Projetos — Sort "Recommended"

### Fórmula

```
score = engagement / (age_hours + 2) ^ 1.5
```

Onde:

- **`engagement`** = `(likes_7d × 5) + (views_7d × 0.5) + (total_likes × 2) + (total_views × 0.1)`
- **`age_hours`** = horas desde a criação do projeto
- **`+ 2`** = evita divisão por zero e dá um boost a projetos novíssimos
- **`^ 1.5`** = gravidade do decaimento (quanto maior, mais rápido projetos antigos caem)

### Comportamento

| Cenário                                    | Efeito                                                                |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Projeto novo, poucos likes                 | Aparece no topo pelo fator de recência                                |
| Projeto antigo, muitos likes recentes (7d) | Sobe no ranking pelo engagement recente                               |
| Projeto antigo, likes apenas antigos       | Cai graduamente pelo decaimento temporal                              |
| Busca ativa (query não vazia)              | **Cai para sort "newest"** — ranking + busca textual não combinam bem |

### Filtros

- Apenas projetos com `visibility = 'public'` e `status = 'DONE'`

### Pesos Configuráveis

| Parâmetro                   | Valor Atual | Localização                   |
| --------------------------- | ----------- | ----------------------------- |
| Peso de likes recentes (7d) | `5`         | `get-feed-projects.action.ts` |
| Peso de views recentes (7d) | `0.5`       | `get-feed-projects.action.ts` |
| Peso de likes totais        | `2`         | `get-feed-projects.action.ts` |
| Peso de views totais        | `0.1`       | `get-feed-projects.action.ts` |
| Gravidade (decay)           | `1.5`       | `get-feed-projects.action.ts` |
| Janela de recência          | `7 dias`    | `get-feed-projects.action.ts` |

---

## Pessoas — Sort "Most Active"

### Fórmula

```
activity_score = (projects_30d × 10)
              + (likes_30d × 1)
              + (followers × 2)
              + profile_completeness_bonus
```

### Bônus de Completude de Perfil

| Condição                         | Bônus |
| -------------------------------- | ----- |
| Tem foto de perfil (`image`)     | +5    |
| Tem bio                          | +3    |
| Tem skills cadastradas           | +2    |
| Tem pelo menos 1 projeto público | +5    |

### Comportamento

| Cenário                                | Efeito                                     |
| -------------------------------------- | ------------------------------------------ |
| Usuário criou projetos nos últimos 30d | Sobe bastante (+10 por projeto)            |
| Usuário tem muitos seguidores          | Boost moderado (+2 por seguidor)           |
| Perfil completo sem atividade recente  | Aparece com score base (~15 da completude) |
| Busca ativa (query não vazia)          | **Cai para sort "newest"**                 |

### Filtros

- Apenas usuários com `username IS NOT NULL`
- O usuário logado é excluído da lista

### Pesos Configuráveis

| Parâmetro                       | Valor Atual | Localização          |
| ------------------------------- | ----------- | -------------------- |
| Peso de projetos recentes (30d) | `10`        | `user.repository.ts` |
| Peso de likes dados (30d)       | `1`         | `user.repository.ts` |
| Peso de seguidores              | `2`         | `user.repository.ts` |
| Janela de recência              | `30 dias`   | `user.repository.ts` |

---

## Cache e Estabilidade do Ranking

Para evitar que o ranking mude em tempo real (ex: curtir um post e ele mudar de posição na hora), as queries de scoring são cacheadas com `unstable_cache` do Next.js:

| Feed     | Cache Key                   | TTL          | Arquivo                       |
| -------- | --------------------------- | ------------ | ----------------------------- |
| Projetos | `feed-recommended-scoring`  | 5 min (300s) | `get-feed-projects.action.ts` |
| Pessoas  | `feed-active-users-scoring` | 5 min (300s) | `search-users.action.ts`      |

### O que é cacheado vs. o que é fresco

- ✅ **Cacheado**: A _ordem_ dos IDs (ranking/scoring)
- 🔄 **Sempre fresco**: Os dados detalhados dos projetos/pessoas (likes, views, se o usuário curtiu, etc.)

Isso garante que o contador de likes atualiza imediatamente na UI, mas a posição do card no feed só muda a cada 5 minutos.

### Forçar atualização do ranking

```typescript
import { revalidateTag } from "next/cache";

// Para projetos
revalidateTag("feed-recommended-scoring");

// Para pessoas
revalidateTag("feed-active-users-scoring");
```

---

## Arquitetura Técnica

```
┌─────────────────────┐     ┌──────────────────────┐
│   FeedContent.tsx    │     │  FeedPeopleGrid.tsx   │
│ (sort: recommended) │     │   (sort: active)      │
└────────┬────────────┘     └────────┬─────────────┘
         │                           │
         ▼                           ▼
┌────────────────────────┐  ┌───────────────────────┐
│ getFeedProjects()      │  │ searchUsersAction()   │
│ get-feed-projects.ts   │  │ search-users.action.ts│
└────────┬───────────────┘  └────────┬──────────────┘
         │                           │
         ▼                           ▼
┌────────────────────────┐  ┌───────────────────────┐
│ getCachedScoredIds()   │  │ getCachedActiveUsers() │
│ unstable_cache (5 min) │  │ unstable_cache (5 min) │
└────────┬───────────────┘  └────────┬──────────────┘
         │                           │
         ▼                           ▼
┌────────────────────────────────────────────────────┐
│              PostgreSQL — Raw SQL Scoring           │
│  (aggregações, JOINs, POWER, EXTRACT, COALESCE)    │
└────────────────────────────────────────────────────┘
```

### Por que SQL Raw?

1. **Performance**: O PostgreSQL calcula agregações (COUNT, JOIN) muito mais rápido que o Node.js
2. **Limitação do Prisma**: Não suporta `ORDER BY` com cálculos cross-table complexos
3. **Flexibilidade**: Ajustar pesos e fórmulas é trivial alterando constantes no SQL

### Fragmentos SQL Dinâmicos

Para condições opcionais (ex: excluir o usuário logado), usamos `Prisma.sql` e `Prisma.empty`:

```typescript
import { Prisma } from "@prisma/client";

// ✅ Correto — fragmento SQL composível
const excludeClause = currentUserId ? Prisma.sql`AND u.id != ${currentUserId}` : Prisma.empty;

// ❌ Errado — prisma.$queryRaw retorna uma Promise, não um fragmento
const excludeClause = currentUserId
  ? prisma.$queryRaw`AND u.id != ${currentUserId}`
  : prisma.$queryRaw``;
```

---

## Arquivos Envolvidos

| Arquivo                                                                | Responsabilidade                 |
| ---------------------------------------------------------------------- | -------------------------------- |
| `apps/web/src/app/(public)/(feed)/actions/get-feed-projects.action.ts` | Scoring de projetos + cache      |
| `apps/web/src/domains/user/actions/search-users.action.ts`             | Cache do scoring de pessoas      |
| `packages/database/repositories/user.repository.ts`                    | Query SQL de activity score      |
| `apps/web/src/app/(public)/(feed)/FeedContent.tsx`                     | UI — dropdown de sort (projetos) |
| `apps/web/src/app/(public)/(feed)/FeedPeopleGrid.tsx`                  | UI — dropdown de sort (pessoas)  |
| `apps/web/src/locales/en.json` / `pt.json`                             | Traduções dos novos sorts        |

---

## Ajuste Fino (Tuning)

Se o feed não parecer equilibrado, ajuste os pesos diretamente nas queries SQL:

- **Projetos muito antigos dominando?** → Aumente a gravidade (ex: `1.5` → `2.0`)
- **Projetos novos não aparecem?** → Diminua a gravidade (ex: `1.5` → `1.2`)
- **Likes recentes não impactam o suficiente?** → Aumente o peso de `recent_likes` (ex: `5` → `8`)
- **Pessoas sem atividade aparecem alto demais?** → Reduza os bônus de completude de perfil
- **Ranking muda muito rápido?** → Aumente o TTL do cache (ex: `300` → `600`)
- **Ranking não reflete mudanças?** → Diminua o TTL do cache (ex: `300` → `120`)

---

_Última atualização: 10 de Fevereiro de 2026_
