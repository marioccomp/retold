# Password Recovery Flow Documentation

## Overview

The Retold password recovery flow is built around one-time reset tokens whose plaintext value is never stored in the database.

The current hardened flow now includes:

- deterministic token hashing with SHA-256
- neutral responses on forgot-password requests
- rate limiting on the public reset request entrypoint
- invalidation of all active reset tokens after a successful password reset
- session revocation after password reset through `sessionVersion`

## Forgot Password Flow

1. The user submits the forgot-password form with an email.
2. The server action validates the payload.
3. A server-side rate limit is applied before any reset workflow continues.
4. The service looks up the user and keeps the external response neutral.
5. Any older active reset tokens for that user are invalidated.
6. A new random reset token is generated.
7. The token is hashed with SHA-256 before being stored.
8. The raw token is sent by email in the reset link.

If the email does not exist, the caller still receives the same neutral success response.

If the request is throttled, the caller also receives the same neutral success response.

That behavior is intentional to reduce account enumeration and abuse value.

## Reset Password Flow

1. The user opens the reset link containing the raw token.
2. The reset form submits the new password and token to the server.
3. The incoming token is hashed again with SHA-256.
4. The server validates that the token exists and is still valid.
5. The new password is hashed with bcrypt.
6. The user password hash is replaced.
7. All active reset tokens for that user are invalidated.
8. `sessionVersion` is incremented so old sessions stop being accepted.
9. The user is redirected back to login and must authenticate again.

## Security Properties

- Plaintext reset tokens are never stored in the database.
- Only the hash is indexed and queried.
- A successful password reset invalidates parallel reset links.
- A successful password reset also revokes older sessions.
- Public abuse is reduced with server-side throttling and neutral responses.

## Operational Notes

- The email provider still lives outside the repository and must be configured with a real `RESEND_API_KEY`.
- Delivery timing can still vary because the final email handoff depends on the provider.
- Password reset protection now depends on the same production secret hygiene documented in [docs/deploy-production.md](docs/deploy-production.md).

## Related Files

- `apps/web/src/app/(auth)/_actions/forgot-password.ts`
- `apps/web/src/domains/auth/services/forgot-password.service.ts`
- `apps/web/src/domains/auth/services/reset-password.service.ts`
- `apps/web/lib/mail.ts`
- `apps/web/src/domains/auth/auth.config.ts`
