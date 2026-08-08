# CI/CD Plan

## What CI/CD means (short version)

**CI (Continuous Integration)** is automation that runs every time code changes (typically on every pull request): install dependencies, lint, type-check, run tests, and build. The goal is to catch broken code *before* it merges, instead of finding out on the server.

**CD (Continuous Delivery/Deployment)** is automation that takes code that already passed CI and gets it into an environment (staging/production) without a human manually running commands on a server. "Delivery" usually means a human clicks a button to release; "Deployment" means it goes out automatically once checks pass.

Together, CI/CD replaces "SSH into the server and run a script" with "push code → robots verify it → robots ship it," with a paper trail (logs, statuses) at every step.

## Where Retold stands today

There is currently **no CI/CD** in this repository — no `.github/workflows`, no automated pipeline. Everything is manual:

- Local dev is `pnpm dev:full`.
- Tests exist (Vitest unit/integration, Playwright e2e) but nothing forces them to run before merge.
- Production deploy is a hardened but manual script run **on the VPS itself** (`pnpm run deploy:preflight` → `pnpm run deploy`), described in [`docs/deploy-production.md`](deploy-production.md). That doc explicitly lists "no CI/CD gate yet" as a known limitation.

This plan proposes closing that gap in phases, without discarding the deploy hardening work already done (env validation, preflight checks, deploy-state tracking) — CI/CD should *call* that existing tooling, not replace it.

## Goals

1. No code reaches `main` without passing lint, type-check, and automated tests.
2. Deploys stop depending on someone remembering to run the right commands in the right order on the VPS.
3. Every deploy is traceable: which commit, who/what triggered it, pass/fail status, easy rollback.
4. Secrets stay out of the repo and out of CI logs.
5. Keep it incremental — each phase is independently useful even if later phases are delayed.

## Proposed pipeline

### Phase 1 — CI on every pull request (highest value, lowest risk)

New workflow: `.github/workflows/ci.yml`, triggered on `pull_request` (and `push` to `main` for a safety net).

Jobs, mirroring what already exists in `package.json` / `turbo.json`:

| Step | Command | Notes |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | fails if lockfile is out of sync |
| Generate Prisma client | `pnpm db:generate` | required before typecheck/build (`turbo.json` already models this dependency) |
| Lint | `pnpm lint` | `turbo run lint` across the monorepo |
| Type check | `pnpm typecheck` (added — `tsc --noEmit`, wired into `turbo.json`) | catches type errors CI-wide, faster than a full build |
| Unit tests | `pnpm test:web:unit` | no external services needed |
| Integration tests | `pnpm test:web:integration` | needs a real Postgres + Redis — see below |
| Build | `pnpm build` | proves the app actually compiles for production |
| E2E | `pnpm test:web:e2e` | needs Postgres + a **password-protected** Redis + Playwright's browser binary — see below |

This is implemented in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Everything below was validated by actually running all four suites locally, not just written from the scripts — two real, previously-unnoticed bugs turned up in the process (see [`docs/change-log.md`](change-log.md) for the GitHub OAuth callback fix).

**Integration tests need services.** GitHub Actions supports spinning up ephemeral service containers for the job:

```yaml
services:
  postgres:
    image: pgvector/pgvector:0.8.1-pg18
    env:
      POSTGRES_USER: retold_ci
      POSTGRES_PASSWORD: retold_ci
      POSTGRES_DB: retold_ci
    ports: ["5432:5432"]
    options: >-
      --health-cmd "pg_isready -U retold_ci" --health-interval 5s --health-timeout 5s --health-retries 5
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

Then run `pnpm --filter @repo/database exec prisma migrate deploy` against that ephemeral database before the integration tests, using a `DATABASE_URL` pointing at `localhost:5432`.

**Branch protection**: once this workflow is green and stable, require it to pass before merge (GitHub → Settings → Branches → require status checks). This is the actual enforcement mechanism — the workflow alone doesn't block anything until this is turned on.

**E2E is included in the required gate, not deferred to nightly.** The original version of this plan recommended keeping Playwright out of the PR gate because "it's heavier." In practice that turned out to be solvable rather than a reason to defer it:

- `apps/web/playwright.config.ts`'s `webServer` used to always run `pnpm dev` (Turbopack). Running the full suite against a long-lived Turbopack dev server surfaced a real internal Turbopack panic (`inner_of_uppers_lost_follower`, in `aggregation_update.rs`) after enough incremental route compilations piled up in one process — nondeterministic, sometimes 12/12 passed, sometimes 3 tests randomly timed out on `page.goto` with `ERR_ABORTED`. This is a Turbopack dev-mode stability bug, not an app or test bug.
- Fix: in CI (`process.env.CI` is set automatically by GitHub Actions), `webServer.command` now runs `pnpm build && pnpm start` instead of `pnpm dev`. A production build has no incremental compilation, so it can't hit that class of bug — and it's also faster once built (~1 minute for the full 12-test suite vs. 2–5 minutes against `dev`, since routes aren't compiled on first hit).
- That change surfaced a second, unrelated real behavior: `next start` always forces `NODE_ENV=production` (Next.js does this internally, it can't be overridden), and `packages/queue/redis.ts` intentionally refuses to build a Redis connection without a password when `NODE_ENV=production` — the same guard that protects real production Redis. The plain `redis:7-alpine` image used for `integration-tests` has no way to set a password via an env var, so the `e2e` job in `ci.yml` uses `bitnami/redis` instead (which supports `REDIS_PASSWORD`) purely for this job.

Net result: e2e is a normal required job like the others, running against the same kind of build that ships to production, in about a minute.

### Phase 2 — Migration safety check

Prisma migrations are one of the riskiest parts of shipping. Add to CI:

- `prisma migrate diff` (or `prisma migrate status`) against the CI database to catch schema drift — i.e., someone edited `schema.prisma` without generating a migration, or a migration file was hand-edited after being applied elsewhere.
- Optionally, a lightweight check that flags destructive operations (`DROP COLUMN`, `DROP TABLE`) in new migration files for manual review, since those can't be safely automated for a single-instance Postgres without a maintenance window.

### Phase 3 — Automated deployment

The VPS/PM2 model doesn't require throwing away the current deploy scripts — it means triggering them automatically and reproducibly instead of by hand. Two realistic options:

**Option A — Self-hosted GitHub Actions runner on the VPS (recommended given the current setup)**

- Register the VPS as a self-hosted runner.
- `.github/workflows/deploy.yml` triggers on push to `main` (after CI passes) and simply runs the existing scripts on the runner: `pnpm run deploy:preflight && pnpm run deploy`.
- Pros: no SSH keys stored in GitHub, no network exposure changes, reuses 100% of the hardening already in `docs/deploy-production.md`.
- Cons: the runner process itself becomes something to keep alive and patched on the VPS.

**Option B — SSH-based deploy action**

- GitHub Actions connects out to the VPS over SSH (`appleboy/ssh-action` or similar) and runs the same two commands remotely.
- Requires storing a deploy SSH private key in GitHub Encrypted Secrets and opening/limiting SSH access appropriately.
- Slightly more "standard" GitHub Actions pattern, marginally more secrets to manage.

Either way:

- Add a **manual approval gate** using a GitHub Environment (`production`) with required reviewers, so merging to `main` doesn't *have* to mean an instant production push — someone clicks "approve" in the Actions UI. This is a good middle ground between full manual deploys and fully automatic ones while confidence is still being built.
- Deploy job should fail loudly (and not proceed) if `deploy:preflight` fails — this is already how the script is designed, CI just needs to respect its exit code.
- Post-deploy: add a basic smoke test (`curl` the health/home route and check for HTTP 200) as the final CI step, so a broken deploy is caught immediately instead of by a user report. This directly addresses a gap already called out in `docs/deploy-production.md` ("no health-checked application-level smoke test after PM2 restart").

### Phase 4 — Further hardening (later, optional)

Only worth doing once Phases 1–3 are stable:

- **Containerize the Next.js app and workers** (currently only Postgres/Redis are containerized). This enables immutable, versioned build artifacts (build once, deploy the same image everywhere) instead of `git pull` + rebuild in place.
- **Blue/green or rolling releases** using release directories (e.g. `releases/<sha>` + a `current` symlink) so rollback is "repoint the symlink + `pm2 reload`" instead of `git checkout <old-sha>` + rebuild.
- **Dependency & secret scanning**: `pnpm audit` / Dependabot for vulnerable packages, and a secret-scanning step (e.g. `gitleaks`) in CI to catch accidentally committed credentials before they hit `main`.
- **Automated rollback**: script that reads `.deploy-state/last-success.env` and re-runs the deploy flow against that SHA, wired to a manual "rollback" workflow trigger (`workflow_dispatch`).

## Concrete file layout to add

```
.github/
  workflows/
    ci.yml        # implemented — lint, typecheck, unit+integration+e2e tests, build
    deploy.yml     # Phase 3: runs after ci.yml succeeds on main, gated by an environment approval
```

## Secrets / configuration to prepare in GitHub

| Secret | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` (CI) | `ci.yml` | points at the ephemeral service-container Postgres, not production |
| Self-hosted runner registration token, **or** `DEPLOY_SSH_KEY` + `DEPLOY_HOST` + `DEPLOY_USER` | `deploy.yml` | depends on Option A vs B above |
| Any secret currently only in the VPS `.env` (`AUTH_SECRET`, `GITHUB_*`, `GROQ_API_KEY`, `RESEND_API_KEY`, `MINIO_*`) | deploy job, only if Option B | with a self-hosted runner (Option A) these stay only on the VPS, which is simpler and safer |

## Suggested order of implementation

1. `ci.yml` with lint + typecheck + unit tests + build (no services yet). Fast win, no infra changes.
2. Turn on required status checks on `main` for that workflow.
3. Add the Postgres/Redis service containers and wire up integration tests.
4. Add the migration-drift check.
5. Stand up the deploy workflow against a **staging** target first, if one exists, or against production behind a manual approval gate if not.
6. Add the post-deploy smoke test.
7. Revisit Phase 4 items opportunistically.

This order front-loads the changes that reduce risk the most (catching bad code before merge) and defers the changes that touch production release mechanics until the earlier phases have built confidence.
