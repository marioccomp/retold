# Password Recovery Flow Documentation

## Overview

The **Retold** password recovery system is built on a **One-Time Use Token** mechanism using deterministic hashing to ensure no plaintext secrets are stored in the database.

The flow is split into two main phases:

- **Request Phase (`forgotPassword`)**: Token generation, hashing, and email delivery.
- **Reset Phase (`resetPassword`)**: Token validation, password hashing, and state finalization.

---

## Forgot Password Flow (Request)

1. User submits the forgot password form with their `email`.
2. Server Action `/forgot-password.ts` is executed.
3. Input is validated using **Zod** (`forgot-password.schema.ts`).
4. `forgotPassword()` service is called to manage the token lifecycle:

- Verifies user existence via Prisma.
- Calls `invalidateAllActiveTokens()` to cancel any previous pending requests for that user.
- Generates a cryptographically strong random token using `crypto.randomBytes(32)`.
- Creates a **SHA-256 hash** of the token for secure storage and database lookups.
- Sets an expiration window of **30 minutes**.

5. The token hash and expiration are persisted in the `PasswordResetToken` table.
6. An email is sent via **Resend** containing a link with the **original raw token** (not the hash).

---

## Reset Password Flow (Execution)

1. User clicks the link `auth/reset-password?token=...` in their email.
2. User submits the new password via the reset form.
3. Server Action `/reset-password.ts` captures the token from the URL and the new password.
4. Input is validated using **Zod**.
5. `resetPassword()` service processes the update:

- Re-hashes the incoming token using SHA-256 to match database records.
- `findValidByTokenHash()` validates the token exists, has not been used (`usedAt === null`), and is not expired.
- If validation fails, a domain error is thrown.
- The new password is hashed using **bcrypt**.
- User credentials are updated via `userRepository.updatePassword()`.
- The token is consumed by calling `markAsUsed()`, setting the `usedAt` timestamp.

---

## Security Strategy

- **Deterministic Hashing (SHA-256)**: Allows for a `@unique` index on the `tokenHash` field, providing high-performance lookups while keeping the actual secret out of the database.
- **One-Time Use Enforcement**: The `usedAt` field acts as a circuit breaker, preventing replay attacks once a password has been successfully changed.
- **Bcrypt Hashing**: New passwords benefit from bcrypt's computational cost, protecting against brute-force attacks in the event of a data leak.
- **Referential Integrity**: `onDelete: Cascade` ensures that if a user is deleted, their sensitive pending reset tokens are automatically purged.

---

### Reset Level

- Enforced by token expiration and one-time use logic.

---

## Future Improvements

- **Cleanup Job**: Implement a recurring task to delete expired tokens older than 7 days to maintain database health.
- **Email Throttling**: Implement IP-based limits for email requests to prevent API abuse on Resend.
