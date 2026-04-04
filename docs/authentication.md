# Authentication Flow Documentation

## Overview

This application uses:

- `next-auth@5` with Prisma Adapter
- JWT-based sessions stored in httpOnly cookies
- Credentials login for local accounts
- GitHub OAuth for explicit account linking and sign-in

The authentication flow is intentionally split into two layers:

- Service layer: security rules, rate limiting and domain validation
- Auth.js / NextAuth: session issuance, JWT synchronization and route authorization

This document reflects the current hardened behavior after the P1 security fixes applied on `2026-04-03`.

---

## Login Flow

1. The user submits `identifier` and `password`.
2. The login server action validates the payload with Zod.
3. `loginUser()` applies security checks before any session is created:
   - IP-based protection
   - identifier-based protection
   - brute-force throttling
   - user lookup by email or username
   - bcrypt password verification
4. If validation fails, the server action maps the domain error to a safe UI message.
5. If validation succeeds, `signIn("credentials")` is called.
6. The Credentials provider `authorize()` fetches the user again and re-checks the password.
7. A minimal authenticated user payload is returned to Auth.js, including `sessionVersion`.
8. The `jwt` callback rehydrates the token from the database and keeps security-sensitive fields synchronized.
9. The `session` callback exposes only the minimum data needed by the client.

---

## Session Strategy

The project uses JWT sessions with a rolling expiration window:

- session max age: 7 days
- jwt max age: 7 days
- cookies are httpOnly

The important security detail is that JWT sessions are no longer treated as fully self-contained.

On token refresh, the app now:

1. reads the current user snapshot from the database
2. compares the JWT `sessionVersion` with the current database value
3. rejects the token if the versions differ
4. synchronizes role, plan, username, onboarding state and password presence from the database

This means session validity is now tied to live server state, not only to cookie lifetime.

---

## Session Revocation

### Why it was added

Before the P1 hardening, a stolen JWT cookie could remain valid even after:

- password reset
- password change in settings

That gap is now closed.

### How it works

The `User` model now contains `sessionVersion`.

Whenever the password changes, the server:

1. updates the password hash
2. increments `sessionVersion`
3. deletes persisted adapter sessions for that user
4. invalidates all active password reset tokens for that user

As soon as a request is made with an old JWT, the token version no longer matches the database version, so the session is rejected.

### Security tradeoff

JWT validation now depends on a database read during token synchronization.

This is a deliberate fail-closed choice:

- if the database is unavailable, the app prefers refusing to trust the session
- this reduces the chance of keeping a revoked session alive during degraded states

---

## Password Reset Flow

1. The user requests a reset link.
2. A reset token is generated, hashed and stored.
3. The raw token is sent by email.
4. On reset, the token is hashed again and compared against the stored hash.
5. If valid, the password is replaced.
6. All active reset tokens for that user are invalidated.
7. `sessionVersion` is incremented so previous sessions are revoked.
8. The user is redirected to login and must authenticate again.

This removes the old behavior where one successful reset could leave other active reset links or session cookies alive.

---

## Password Change in Settings

The authenticated settings flow now follows the same revocation model as reset:

- it verifies the current password, or email confirmation when creating a password for an OAuth-only account
- it updates the password hash
- it increments `sessionVersion`
- it forces reauthentication after success

From the user's point of view, a successful password change now ends the current session and redirects back to login.

---

## Public Auth Abuse Controls

The public-facing auth endpoints now use server-side throttling and less revealing responses.

### Covered flows

- `register`
- `forgot-password`
- `check-email`
- `check-username`

### What changed

- registration now applies rate limiting before attempting account creation
- duplicate registration attempts no longer tell the caller whether the email or username already exists
- forgot-password keeps the same neutral success message even when the email does not exist
- forgot-password also keeps the same neutral success message when the throttle blocks the request
- availability checks still validate format, but no longer expose whether a username or email is already present in the database

### UX tradeoff

The app intentionally gives up some "live availability" convenience:

- registration no longer depends on a server-side "available" signal to enable submit
- choosing a username no longer treats the public availability check as proof that the value is free

This reduces the amount of enumeration value exposed to unauthenticated callers.

---

## Destructive Reauthentication

Account deletion is no longer allowed from a mere authenticated session.

### Current behavior

- accounts with a local password must confirm the current password before deletion
- accounts without a local password must have a recent authentication context
- OAuth-only accounts are required to reauthenticate with GitHub before deletion if the session is no longer fresh
- destructive confirmation attempts are rate-limited server-side

### How freshness is tracked

The JWT now carries `authenticatedAt`, which is refreshed on real sign-in.

The server uses that timestamp to decide whether an OAuth-only session is fresh enough for irreversible actions.

### Security outcome

- a stale session alone is no longer enough to delete the account
- a stolen cookie without password knowledge cannot delete a local-password account
- OAuth-only users must present recent proof of possession before the destructive action completes

---

## GitHub OAuth and Linking

### Current stance

GitHub account linking is now explicit and hardened.

The app no longer allows dangerous automatic email-based linking.

### What changed

- `allowDangerousEmailAccountLinking` was removed from the GitHub provider
- OAuth sessions no longer expose provider `accessToken` or `scope` to the client session object
- login now handles `OAuthAccountNotLinked` explicitly, so the UX matches the hardened security policy

### Expected behavior

If a local account already exists and a GitHub account is not linked yet:

- the user must authenticate with the existing account
- the user must link GitHub explicitly through the application flow

This is a safer default than silently merging identities based only on email overlap.

---

## Data Exposed to the Client Session

The client session now exposes only:

- `id`
- `email`
- `name`
- `image`
- `role`
- `plan`
- `username`
- `hasPassword`
- `hasCompletedOnboarding`

It does not expose:

- OAuth provider access tokens
- OAuth scopes
- password metadata beyond simple presence
- session revocation internals

This reduces client-side blast radius if the browser environment is compromised.

---

## Route Authorization

The `authorized` callback currently enforces:

- redirect to `/choose-username` when logged in without username
- redirect to `/onboarding` when onboarding is incomplete
- role and plan checks for restricted route prefixes

This is route-level protection only.

Business authorization for server actions and domain mutations must still be enforced in the server action or service layer itself.

---

## Operational Notes

- The Prisma migration that adds `sessionVersion` must be applied in every environment.
- Production rollout should assume users may be asked to reauthenticate after password changes.
- Support and product teams should be aware that GitHub auto-linking by email is intentionally disabled.
- `APP_URL` and `ADDITIONAL_ALLOWED_ORIGINS` should reflect the real public hosts used by the app and its reverse proxy chain.
- Account deletion for OAuth-only users now depends on a fresh GitHub reauthentication path remaining available.
- The project still uses `next-auth@5.0.0-beta.30`, so release notes should continue to be monitored during future upgrades.
- Production env hygiene and manual deploy controls are documented in [docs/deploy-production.md](docs/deploy-production.md).

---

## Known Gaps

- There is no dedicated automated test suite yet for `sessionVersion`-based revocation.
- There is no dedicated automated test suite yet for throttling and destructive reauthentication flows.
- Forgot-password can still have observable timing differences because real email delivery depends on an external provider.
- Edge protection still depends on correct reverse-proxy and origin/header forwarding in production.

---

## Related Files

- `apps/web/src/domains/auth/auth.ts`
- `apps/web/src/domains/auth/auth.config.ts`
- `apps/web/src/domains/auth/next-auth.d.ts`
- `apps/web/src/domains/auth/services/reset-password.service.ts`
- `apps/web/src/actions/settings.ts`
- `apps/web/src/app/(private)/settings/SettingsClient.tsx`
- `packages/database/repositories/user.repository.ts`
- `packages/database/prisma/schema.prisma`
