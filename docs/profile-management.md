# Profile & Authentication Subsystem

This project ships a conventional JWT-based auth stack with refresh tokens, email verification, password flows, and profile management. This page documents how it works end-to-end.

## Tokens and lifetimes
- **Access token**: JWT issued on login; expires after 15 minutes (`auth.jwt.access-token-ttl: PT15M`). Sent on every `/api/**` call via `Authorization: Bearer <token>`.
- **Refresh token**: Opaque UUID stored server-side; expires after 7 days (`auth.jwt.refresh-token-ttl: P7D`). One-time use and rotated on every refresh.
- **Storage (frontend)**: Both tokens + access expiry are kept in `localStorage` (`hsht.session`) via `SessionStore`. When the access token expires, the refresh token is retained for silent renewal.

## Public endpoints
- `POST /api/auth/register` — create account; requires email verification.
- `POST /api/auth/login` — returns `{ accessToken, refreshToken, expiresIn }`.
- `POST /api/auth/refresh` — exchange refresh token for new access + refresh (rotation).
- `GET  /api/auth/verify-email?token=...` — verifies email; HTML redirect supported.
- `POST /api/auth/forgot-password` — sends reset email if the account exists and is active.
- `POST /api/auth/reset-password` — completes reset using the token from email.

All other API routes are protected by the JWT filter. Spring Security is stateless.

## Login flow
1. User submits email/password to `POST /api/auth/login`.
2. Server validates credentials, issues access + refresh tokens, and records audit events.
3. Frontend stores tokens and expiry in `SessionStore`; app routes are guarded by `authGuard`.

## Session + refresh flow (frontend)
- Outgoing `/api/**` requests pass through `authInterceptor`. The access token is attached if present.
- On a `401` response:
  - If a refresh token exists and the request is not already an auth/refresh call, the interceptor calls `POST /api/auth/refresh`.
  - On success, it rotates tokens in `SessionStore` and retries the original request with the new access token.
  - On refresh failure, the session is cleared and the user is redirected to `/auth/login?reason=expired&returnUrl=<original>`.
- If no refresh token is available, the session is cleared and the user is redirected to login.

## Registration + email verification
- `POST /api/auth/register` stores the user in `PENDING_VERIFICATION` and sends a verification email with a JWT link.
- `GET /api/auth/verify-email` validates the token; on success, the user is marked `ACTIVE` and `emailVerifiedAt` is set.
- The frontend shows status via `verified` query param (`success`/`error`) on the login page.

## Password management
- **Change password (authenticated):** `PUT /api/users/me/password` with current/new password. On success, all active refresh tokens are revoked.
- **Forgot password:** `POST /api/auth/forgot-password` sends a reset link with a reset JWT.
- **Reset password:** `POST /api/auth/reset-password` validates the reset token, sets the new password, and revokes active refresh tokens.

## Profile management
- **Get profile:** `GET /api/users/me` returns the current user.
- **Update profile:** `PUT /api/users/me` updates profile fields (name, grade level, bio, interests). Requires a valid access token.

## Data model highlights
- `app_users` — users table.
- `refresh_tokens` — opaque tokens with `revoked` flag and `expires_at`; rotated on refresh.
- `email_verification_tokens`, `password_reset_tokens` — hold metadata for verification/reset flows (actual JWT sent in email).

## Frontend UX notes
- Login page surfaces a “session timed out” info message when redirected with `reason=expired`.
- Protected pages use `authGuard`; unauthenticated access sends users to `/auth/login` with `returnUrl`.
- The dashboard shows “Could not load your lists” on fetch failure; with refresh enabled, it should only occur if both access and refresh are invalid/expired.

## Operational considerations
- Extend access token TTL for longer-lived sessions or rely on refresh (currently 15 minutes).
- Refresh rotation is one-time-use; on suspected compromise, revoke active refresh tokens (e.g., on password change/reset) — already implemented.
- Ensure email delivery settings (`AuthLinkProperties`) are correct in env for verification/reset links.
