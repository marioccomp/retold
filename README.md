# Retold

**Retold** is a social portfolio platform for developers. Instead of a static resume, developers connect their GitHub account and Retold automatically turns their repositories into rich, analyzed project pages — then surfaces them in a public feed where other developers (and recruiters) can discover, follow, like and comment on real work.

The core idea: **let the code tell the story**. A background worker clones each linked repository, inspects its structure and stack, asks an LLM to summarize what it actually does, and tracks each contributor's real commit activity on it — so a profile reflects what someone has actually built, not just what they claim to have built.

## Table of contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Monorepo layout](#monorepo-layout)
- [Data model highlights](#data-model-highlights)
- [Documentation index](#documentation-index)
- [Getting started](#getting-started)

## What it does

### Developer profiles & portfolio

- Public profile per user (`/[username]`) with bio, skills, socials, education, certifications and past participations (hackathons, etc.).
- Projects are linked to GitHub repositories and go through automatic analysis rather than manual write-ups.
- GitHub stats (stars, repo count, PRs, top languages, last commit across all linked repos) are pulled via the GitHub API and kept fresh with a stale-while-revalidate strategy (refreshed on project create/delete, or after 24h).

### GitHub integration & automated project analysis

- Users install a GitHub App and/or sign in with GitHub OAuth to link repositories.
- A GitHub webhook (`push` events, HMAC-signature verified) keeps commit/line-count stats in sync in near real time without polling.
- When a project is created, a queued worker (BullMQ + Redis):
  1. clones the repository in an isolated, path-safe temp directory,
  2. extracts structure, stack and per-user commit metrics (commits, lines added/removed, active days, impact score) straight from `git log`,
  3. sends a sanitized/redacted summary (README + code samples, with stricter rules for private repos) to an LLM to generate a plain-language project overview,
  4. persists structured signals and marks the project `DONE`, `ERROR`, or `RATE_LIMITED` (with automatic retry once the rate-limit window resets).
- See [`docs/workers.md`](docs/workers.md) and [`docs/github-webhooks.md`](docs/github-webhooks.md) for the full flow and the security hardening applied to it (no tokens in argv/URLs, symlink/path-escape protection, secret redaction before any LLM call, data-minimization rules for private projects, etc.).

### Social feed & discovery

- A public feed lists projects and people with a **hybrid ranking algorithm** inspired by Hacker News/Reddit: recent engagement (likes/views in the last 7 days) combined with time decay, so good new work can outrank older popular work without stale content dominating forever. See [`docs/hybrid-feed-algorithm.md`](docs/hybrid-feed-algorithm.md).
- A "most active" ranking for people combines recent project activity, likes given, followers and profile completeness.
- A featured/"highlighted" project is chosen each hour by a relevance score (`likes × 5 + views`) and shown at the top of the feed — see [`docs/highlighted-project.md`](docs/highlighted-project.md).
- Follow/like/comment system with a notification center for social activity.
- Rankings are cached for a few minutes (`unstable_cache` + tag-based revalidation) while like/view counts and per-user like state always stay live, so counters update instantly but list order doesn't jitter on every interaction.

### Accounts, roles & plans

- Email/password accounts and GitHub OAuth, backed by NextAuth v5 with JWT sessions.
- Roles: `USER`, `RECRUITER`, `ADMIN`. Plans: `FREE`, `PREMIUM` — the data model already supports recruiter-facing and paid-tier use cases as the product grows.
- Hardened auth flow: brute-force/rate-limited login, session revocation via `sessionVersion` on password change/reset, reauthentication required before destructive actions (e.g. account deletion), no dangerous automatic OAuth email-linking, minimal data exposed to the client session. Full detail in [`docs/authentication.md`](docs/authentication.md), [`docs/forgot-password.md`](docs/forgot-password.md) and [`docs/rate-limiting.md`](docs/rate-limiting.md).

### Internationalization

- UI is translated (English/Portuguese) via a lightweight dictionary-based i18n layer (`apps/web/src/i18n`, `apps/web/src/locales`).

## How it works

```
                        ┌─────────────────────────┐
                        │        Next.js app       │  apps/web
                        │  (UI, server actions,    │
                        │   auth, feed, API routes)│
                        └──────────┬───────────────┘
                                   │
                 enqueues jobs     │      reads/writes
                                   ▼
                        ┌─────────────────────────┐
                        │      Redis (BullMQ)      │  packages/queue
                        └──────────┬───────────────┘
                                   │ processed by
                                   ▼
                        ┌─────────────────────────┐
                        │   Background workers     │  services/worker
                        │ (repo clone, git log,    │
                        │  LLM analysis, GitHub    │
                        │  API polling)            │
                        └──────────┬───────────────┘
                                   │
                                   ▼
        ┌───────────────────┐  ┌─────────────────────┐  ┌────────────────────┐
        │ PostgreSQL +       │  │  MinIO / S3-compat   │  │  External services  │
        │ pgvector (Prisma)  │  │  object storage       │  │  (Groq LLM, Resend, │
        │ packages/database  │  │  packages/storage     │  │  GitHub API, Sentry)│
        └───────────────────┘  └─────────────────────┘  └────────────────────┘
```

- **Web app**: Next.js App Router, React Server Components + server actions, domain-oriented folders (`apps/web/src/domains/*`) for auth, projects, users, profile, notifications, GitHub and storage.
- **Workers**: standalone Node processes (`services/worker`) consuming BullMQ queues — kept separate from the web app so heavy I/O (git clone, LLM calls, GitHub API pagination) never blocks request handling.
- **Database**: PostgreSQL with the `pgvector` extension, accessed through Prisma, with a mix of typed queries and raw SQL for scoring/ranking queries that need cross-table aggregation Prisma can't express efficiently.
- **Cache/queues**: Redis, shared between the web app (rate limiting, `unstable_cache`-backed scoring) and the workers (BullMQ job queues).
- **Storage**: S3-compatible object storage (MinIO locally, swappable for Cloudflare R2 or similar in production) for avatars, covers and project images.
- **Observability**: Sentry for error tracking (`packages/observability`), plus structured logging with redaction of secrets/PII (see [`docs/logging-hardening.md`](docs/logging-hardening.md)).

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling/UI | Tailwind CSS 4, Radix UI, GSAP (animations) |
| Auth | NextAuth v5 (Credentials + GitHub OAuth), Prisma Adapter |
| Database | PostgreSQL + pgvector, Prisma ORM |
| Queues/cache | Redis, BullMQ, Upstash rate limiting |
| Storage | MinIO / S3-compatible (`@aws-sdk` under the hood via `packages/storage`) |
| GitHub integration | GitHub App + OAuth via Octokit, HMAC-verified webhooks |
| LLM | Groq API (project analysis/summarization) |
| Email | Resend |
| Testing | Vitest (unit/integration), Playwright (e2e) |
| Monorepo tooling | pnpm workspaces, Turborepo |
| Deployment | Docker Compose (Postgres/Redis), PM2 on a VPS — see [`docs/deploy-production.md`](docs/deploy-production.md) |

## Monorepo layout

```
apps/
  web/                # Next.js application (UI, server actions, API routes)
services/
  worker/             # BullMQ workers: repo analysis, GitHub stats polling
packages/
  database/           # Prisma schema, client, repositories
  queue/               # BullMQ/Redis queue setup shared by app + workers
  storage/             # S3/MinIO client wrapper
  observability/       # Sentry + logging setup
scripts/
  backup/              # Postgres/Redis backup & restore to Google Drive
docs/                  # Feature docs, security hardening notes, runbooks
```

## Data model highlights

Defined in [`packages/database/prisma/schema.prisma`](packages/database/prisma/schema.prisma):

- `User` — profile fields, skills, role/plan, GitHub links, follows, onboarding state.
- `Project` — title/description, images, visibility (`public`/`private`), lifecycle `status` (`PENDING → ANALYZING → DONE`, or `ERROR`/`RATE_LIMITED`), likes/views.
- `RepositoryAnalysis` — structured output of the worker analysis (stack, structure, signals, LLM overview) for a project.
- `Repository` / `GithubAppInstallation` — link between a `User` and their installed GitHub App / repositories.
- `UserProjectStats` — per-user, per-project commit metrics (commits, lines added/deleted, active days, impact score).
- `GithubStats` — per-user aggregate GitHub stats (stars, repos, PRs, last commit across projects).
- `Follows`, `Like`, `Comment`, `Notification` — the social graph and activity layer.

## Documentation index

| Doc | Covers |
| --- | --- |
| [SETUP.md](SETUP.md) | Local environment setup and day-to-day dev commands |
| [docs/deploy-production.md](docs/deploy-production.md) | Manual VPS deploy runbook, current limits, recommended baseline |
| [docs/authentication.md](docs/authentication.md) | Auth flow, session revocation, hardening decisions |
| [docs/forgot-password.md](docs/forgot-password.md) | Password recovery flow |
| [docs/rate-limiting.md](docs/rate-limiting.md) | Rate limiting architecture (Upstash) |
| [docs/github-webhooks.md](docs/github-webhooks.md) | GitHub webhook processing pipeline |
| [docs/workers.md](docs/workers.md) | Background workers, security hardening, LLM data policy |
| [docs/hybrid-feed-algorithm.md](docs/hybrid-feed-algorithm.md) | Feed ranking formulas for projects and people |
| [docs/highlighted-project.md](docs/highlighted-project.md) | Featured project selection logic |
| [docs/logging-hardening.md](docs/logging-hardening.md) | Log redaction policy |
| [docs/google-drive-backup.md](docs/google-drive-backup.md) | Free Postgres/Redis backup flow via rclone + Google Drive |
| [docs/change-log.md](docs/change-log.md) | Running technical change log, especially security fixes |
| [docs/ci-cd-plan.md](docs/ci-cd-plan.md) | Proposed CI/CD pipeline (not yet implemented) |

## Getting started

Local setup, environment variables and available `pnpm` commands are documented in **[SETUP.md](SETUP.md)**.
