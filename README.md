# Retold

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the safe template and replace the placeholders you actually need:

```bash
cp .env.example .env
```

Important:

- do not commit the real `.env`
- replace every `CHANGE_ME_*` value before using the app in any shared or production-like environment
- keep `APP_URL` aligned with the real public origin when testing auth flows

### 3. Start the full local stack

```bash
pnpm dev:full
```

This command:

1. starts PostgreSQL, Redis and MinIO with Docker
2. applies Prisma migrations
3. starts the Next.js app

## Common workflows

### Daily development

```bash
pnpm dev:full
```

### Stop the app

Press `Ctrl + C` in the terminal running Next.js.

### Stop local services

```bash
pnpm db:down
```

### Rebuild the local database

```bash
pnpm db:rebuild
```

This deletes local database volumes. Do not use it if you need to keep local data.

## Available commands

### Database

| Command | Description |
| --- | --- |
| `pnpm db:up` | Start the local Docker services |
| `pnpm db:down` | Stop the local Docker services |
| `pnpm db:reset` | Remove containers and volumes |
| `pnpm db:start` | Start services and apply migrations |
| `pnpm db:rebuild` | Reset everything and re-apply migrations |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:push` | Push schema changes without migrations |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:studio` | Open Prisma Studio |

### Application

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the web app |
| `pnpm dev:full` | Run services, migrations and web app |
| `pnpm build` | Production build |
| `pnpm lint` | Monorepo lint |

### Tests

The web app uses Vitest. Run it with `--filter web` inside the monorepo:

```bash
pnpm --filter web test
pnpm --filter web test:run
pnpm --filter web test:coverage
```

## Production docs

- Secure deploy runbook: [docs/deploy-production.md](docs/deploy-production.md)
- Authentication hardening: [docs/authentication.md](docs/authentication.md)
- Password reset flow: [docs/forgot-password.md](docs/forgot-password.md)
- Backup workflow: [docs/google-drive-backup.md](docs/google-drive-backup.md)
- Change history: [docs/change-log.md](docs/change-log.md)

## Stack

- Next.js
- Prisma
- PostgreSQL 18+ with pgvector
- Docker
- PNPM
- Turborepo
- Vitest
- TanStack Query
- Upstash Redis
