# Retold

## Como rodar o projeto localmente

### 1️⃣ Instale as dependências

```bash
pnpm install
```

---

### 2️⃣ Configure as variáveis de ambiente

Crie um arquivo `.env` na **raiz do projeto**, usando como base o `.env.example`.

Exemplo:

```env
POSTGRES_USER=local_db
POSTGRES_PASSWORD=123
POSTGRES_DB=local_db
POSTGRES_PORT=5432

DATABASE_URL="postgresql://local_db:123@localhost:5432/local_db"
```

---

### 3️⃣ Subir tudo (fluxo recomendado)

```bash
pnpm dev:full
```

Esse comando:

1. Sobe o banco de dados via Docker
2. Aplica as migrations do Prisma
3. Sobe o servidor web (Next.js)

---

## Fluxos de uso

### ▶️ Desenvolvimento diário

```bash
pnpm dev:full
```

---

### ⏹ Parar o servidor web

No terminal:

```text
Ctrl + C
```

---

### ⏹ Parar o banco de dados

```bash
pnpm db:down
```

---

### 🔄 Resetar o banco (CUIDADO)

```bash
pnpm db:rebuild
```

> ⚠️ Esse comando remove todos os dados locais do banco.

---

## Comandos disponíveis

### Banco de dados (Docker + Prisma)

| Comando            | Descrição                                      |
| ------------------ | ---------------------------------------------- |
| `pnpm db:up`       | Sobe o Postgres via Docker                     |
| `pnpm db:down`     | Para e remove os containers                    |
| `pnpm db:reset`    | Remove containers **e volumes**                |
| `pnpm db:start`    | Sobe o banco e aplica migrations               |
| `pnpm db:rebuild`  | Reset total + migrations                       |
| `pnpm db:migrate`  | Aplica migrations do Prisma                    |
| `pnpm db:push`     | Sincroniza schema sem migrations (uso pontual) |
| `pnpm db:generate` | Gera o Prisma Client                           |
| `pnpm db:studio`   | Abre o Prisma Studio                           |

---

### Aplicação

| Comando         | Descrição                |
| --------------- | ------------------------ |
| `pnpm dev`      | Sobe o servidor web      |
| `pnpm dev:full` | Banco + migrations + web |
| `pnpm build`    | Build de produção        |
| `pnpm lint`     | Lint do monorepo         |

---

### Testes com Vitest

O projeto usa **Vitest** para testes unitários na aplicação web.
Como o monorepo contém múltiplos pacotes, use **`--filter web`** para rodar apenas os testes do app Next.js:

```bash
# Rodar testes em modo interativo
pnpm --filter web test

# Rodar todos os testes (sem interação)
pnpm --filter web test:run

# Rodar testes com cobertura
pnpm --filter web test:coverage
```

> Exemplo de teste com Vitest: `web/src/services/auth/register.service.test.ts`
> Ele testa a função `registerUser` e usa mocks do repositório de usuários.

---

## Observações importantes

- O banco de dados usa **PostgreSQL 18+ com pgvector**
- Os dados do banco são persistidos
- Os testes do web precisam sempre rodar com `--filter web` por conta do monorepo

---

## Stack

- **Next.js**
- **Prisma**
- **PostgreSQL 18+ (pgvector)**
- **Docker**
- **PNPM**
- **Turborepo**
- **Vitest**
