# Backend (Spring Boot + Gradle)

## Prerequisites
- Java 21+
- Gradle wrapper (generated with project). Target Gradle 9.x+ for full Java 21 support once released; in the meantime use the latest 8.x if 9 GA is not yet available and update the wrapper when 9 ships.
- Postgres/Aurora connection details for local/dev
- Spring Boot version: use the latest 3.3.x; at the time of writing this doc, 3.3.4 is current.

## Scaffold (example)
```bash
# from backend/
spring init \
  --boot-version 3.3.4 \
  --dependencies=web,actuator,liquibase,postgresql \
  --build=gradle \
  --java-version=21 \
  --name=highschoolhowto-backend \
  .
```

## Run
```bash
./gradlew bootRun
```

## Migrations
- Liquibase changelogs under `src/main/resources/db/changelog/` with a master file.
- For local dev, run on app startup or via `./gradlew update` as needed.

## Design decisions

### Authentication + session handling
- Use Spring Security 6 with stateless JWTs (signed with an asymmetric key so tokens can be validated independently across instances).
- Keep token TTL short (15m) and issue refresh tokens stored in Postgres so compromised access tokens have limited blast radius.
- Multi-factor is out-of-scope for v1, but design the DB schema so an `mfa_enrolled` flag and secret columns can be added without remodels.

### Email (verification + reset)
- Microsoft Graph sender: set `notifications.graph.enabled=true` plus `notifications.graph.tenant-id`, `client-id`, `client-secret`, and `from-address` (the mailbox to send from).
- When Graph is disabled, fall back to `LoggingNotificationService` for local/dev.
- To smoke-test delivery without real flows, enable `notifications.test.enabled=true` and POST to `/api/dev/test-email` with a `{"to": "...", "type": "verification|reset", "link": "..."}` payload.

### Endpoints

#### `POST /api/auth/login`
- Body contains `email` + `password`. On success returns `{ accessToken, refreshToken, expiresIn }`.
- Return 401 with a generic "Invalid credentials" message to avoid leaking which field failed.
- Record audit events (`LOGIN_SUCCESS`, `LOGIN_FAILURE`) in a dedicated table for later SIEM export.

#### `POST /api/auth/register`
- Body contains `email`, `password`, `firstName`, `lastName`. Password policies: min 12 chars, must include upper/lowercase, number, symbol.
- Create the user in a pending state and send an email-confirmation token (signed JWT + stored row for revocation).
- Endpoint responds immediately with 202 (“Check your email”) so the experience matches both prod and local dev (where mail might be skipped).

#### `GET /api/auth/verify-email`
- Link embedded in the registration email hits `/api/auth/verify-email?token=<jwt>`.
- Token lookup flips the user from pending to active, persists `emailVerifiedAt`, and invalidates any outstanding registration tokens.
- Return an HTML “verification complete” page for browsers plus a JSON version for API consumers; both should avoid leaking whether the token was previously used (always respond 200 and show a generic success copy).

#### `GET /api/users/me` + `PUT /api/users/me`
- `GET` returns the authenticated user profile (`id`, name fields, `gradeLevel`, `bio`, `interests`).
- `PUT` accepts partial updates; leverage `@JsonMerge` or explicit DTO merge logic so missing fields stay untouched.
- Keep a server-generated `updatedAt` timestamp so the UI can show “last edited” metadata; guard updates with optimistic locking (`@Version`) to prevent lost writes in multi-tab sessions.

#### `PUT /api/users/me/password`
- Body contains `currentPassword`, `newPassword`. Require the current password to match and run the new password through the shared policy validator (min 12 chars, upper/lower/digit/symbol).
- On success, return 204 and revoke all refresh tokens so other sessions must re-authenticate.
- Emit an audit event for the change and consider rate-limiting per user to mitigate brute-force attempts.

#### Forgot-password flow
- `POST /api/auth/forgot-password` accepts `{ email }`, generates a one-time token (15m expiry), and emails a link to `/reset-password?token=...`. Always return 202 even if the email is not on file.
- `POST /api/auth/reset-password` accepts `{ token, newPassword }`, validates/invalidates the token, updates the hashed password, and revokes refresh tokens so sessions are forced to re-authenticate.
- Log both token issuance and completion events to the audit table; rate-limit the forgot endpoint per IP/email to avoid enumeration.

### Error model
- Use RFC 9457 (`application/problem+json`) with `type`, `title`, `status`, and `detail`. Include a `traceId` that maps to the server logs.
- Validation errors return HTTP 400 with a `violations` array containing `field` + `message`.

