# Production Deploy Runbook

This document describes the hardened manual deploy flow currently implemented in the repository.

It is intentionally pragmatic:

- it reduces avoidable production mistakes in the current VPS-based setup
- it adds minimum preflight checks before restarting the app
- it records deploy state for rollback preparation
- it does not pretend to be a full CI/CD pipeline or blue/green release system

## What changed

The old deploy command had these problems:

- pulled `main` directly on the server with no branch hygiene checks
- stopped Docker services before confirming that the new code could build
- ran `pnpm install` without `--frozen-lockfile`
- had no production env validation
- had no recorded rollback base SHA

The new flow now:

- requires a clean `main` branch checkout on the server
- fetches `origin/main` before deploy
- refuses deploy if the server has local commits ahead of `origin/main`
- validates the production `.env` against placeholder and unsafe defaults
- validates `compose.prod.yaml` before touching services
- installs dependencies with `pnpm install --frozen-lockfile`
- keeps PostgreSQL and Redis up instead of tearing them down blindly
- builds before running migrations and before restarting PM2
- stores `.deploy-state/last-attempt.env`
- stores `.deploy-state/last-success.env`

## Scripts

The repository now includes these scripts:

- `pnpm run deploy:verify-env`
- `pnpm run deploy:preflight`
- `pnpm run deploy`
- `pnpm run deploy:status`

They are implemented for the Linux VPS flow and should be run from the project root on the server.

## Expected deploy flow on the VPS

### 1. Make sure the server checkout is clean

The deploy script now enforces this automatically, but operationally you should still avoid:

- editing production code directly on the VPS
- leaving local commits on the server
- using the production checkout as a scratch workspace

### 2. Review and validate the production `.env`

Run:

```bash
pnpm run deploy:verify-env
```

This validation now fails closed if sensitive values are missing or still look like placeholders.

Examples of what it checks:

- weak or placeholder `AUTH_SECRET`
- placeholder OAuth or GitHub App credentials
- placeholder webhook secrets
- unsafe storage secrets
- `APP_URL` still pointing to localhost
- invalid `ADDITIONAL_ALLOWED_ORIGINS`

### 3. Run preflight

```bash
pnpm run deploy:preflight
```

Preflight currently checks:

- required commands available
- `.env` exists
- checkout is on `main`
- working tree is clean
- server is not ahead of `origin/main`
- production env is sane
- `compose.prod.yaml` is valid

### 4. Run the deploy

```bash
pnpm run deploy
```

The deploy script now:

1. fetches `origin/main`
2. fast-forwards the local checkout
3. installs dependencies with `--frozen-lockfile`
4. ensures `database` and `redis` are running
5. waits for service health
6. runs the production build
7. applies Prisma migrations
8. restarts PM2 with `--update-env`
9. records deploy state for later inspection

## Rollback preparation

This repository still does not implement automated database rollback or release directories.

What it does provide now:

- `.deploy-state/last-attempt.env`
- `.deploy-state/last-success.env`

You can inspect the latest successful state with:

```bash
pnpm run deploy:status
```

The file includes:

- previous successful SHA
- currently deployed SHA
- deploy timestamp

### Current rollback model

Rollback is still manual and should be treated carefully:

1. inspect `.deploy-state/last-success.env`
2. confirm whether any migration in the failed/current release is backward-compatible
3. check out the known-good commit on the VPS
4. rebuild and restart using the same guarded flow

This is a deliberate limitation of the current architecture.
Without release directories, artifact promotion and reversible database migrations, rollback cannot be fully automated safely.

## Secrets and configuration policy

### Versioned files

The repository now ships only safe placeholders in `.env.example`.

If any real secret ever appeared in git history, treat it as compromised and rotate it outside the repository.

### Local `.env`

The root `.env` is intentionally ignored by git.

This repository does not overwrite or sanitize a developer's real `.env` automatically because doing so would risk breaking the local environment.

Operational expectation:

- keep the local `.env` out of version control
- rotate any secret that may already have been exposed elsewhere
- avoid weak local defaults on shared machines

## Required production controls outside the repository

These controls still depend on the VPS, reverse proxy or cloud setup:

- TLS certificate issuance and renewal
- HTTP to HTTPS redirect at the edge
- reverse proxy configuration preserving `Host`, `Origin`, `x-forwarded-for` and `x-real-ip`
- firewall rules restricting public exposure to only the intended ports
- PM2 process boot persistence after reboot
- system user separation and filesystem permissions on the VPS
- backup scheduling and restore testing
- secret rotation and secure secret storage outside git

## Recommended VPS / DigitalOcean baseline

At minimum, production should have:

- Ubuntu or Debian fully updated
- a non-root deploy user
- SSH key auth only, with password auth disabled
- UFW or cloud firewall allowing only `22`, `80` and `443`
- Nginx or another reverse proxy terminating TLS
- automatic certificate renewal
- PM2 configured with startup persistence
- Docker and Docker Compose installed from trusted sources
- backups scheduled and restore-tested

## Known limits of the current deploy model

- no CI/CD gate yet
- no immutable build artifact promotion yet
- no blue/green or canary rollout yet
- no automated migration rollback
- no health-checked application-level smoke test after PM2 restart

Those are still worth pursuing, but the current repository is now materially safer than the previous one-command deploy chain.
