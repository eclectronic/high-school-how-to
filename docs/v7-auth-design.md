# High School How To — v7.0 Design Document

**Status**: Design closed — in implementation
**Last updated**: 2026-04-19
**Scope**: Auth (Google Sign-In, Remember-Me, server-side logout) + Locker UI polish (timer, notes, todos, accessibility text-size, recommended pins)

## Table of Contents

1. [Overview](#1-overview)
2. [Problems](#2-problems)
3. [Design Goals](#3-design-goals)
4. [Google Sign-In](#4-google-sign-in)
5. [Remember Me & Session Lifetime](#5-remember-me--session-lifetime)
6. [Logout — Server-side Revocation](#6-logout--server-side-revocation)
7. [Database Changes](#7-database-changes)
8. [Backend Changes](#8-backend-changes)
9. [Frontend Changes](#9-frontend-changes)
10. [Account Linking Rules](#10-account-linking-rules)
11. [Security Considerations](#11-security-considerations)
12. [Implementation Phases](#12-implementation-phases)
13. [Testing Requirements](#13-testing-requirements)
14. [Operational Setup](#14-operational-setup)
15. [Locker UI Updates](#15-locker-ui-updates)

---

## 1. Overview

v7.0 focuses on **frictionless sign-in** for the auth flow. The current registration and login flow is functional but generic: every user must create and remember a password, verify their email, and — because high school students often log in from shared or school devices — re-enter credentials every week when the 7-day refresh token expires. v7 adds **Google Sign-In** (the dominant identity provider in US school environments via Google Workspace / Classroom) as a one-tap alternative, plus a **60-day "Remember me"** option so returning users on their personal device don't have to log in repeatedly.

Apple Sign-In is explicitly out of scope for v7 and will be revisited in a later release once Google Sign-In has proven out the integration pattern.

---

## 2. Problems

| Problem | Details |
|---|---|
| Password friction for students | Students frequently forget passwords, triggering the reset-password flow. Many drop off rather than complete reset. |
| No social sign-in | Every new user must choose a password and verify their email — even though ~90% of target users already have a verified Google account (school or personal). |
| Short session lifetime | Refresh tokens expire after 7 days regardless of device. A student who uses the site weekly from their own laptop is forced to log in every time. |
| Logout is client-only | `SessionStore.clearSession()` only clears `localStorage`. The refresh token remains valid server-side until its natural expiry. If a device is lost or someone leaves a shared computer, the refresh token cannot be revoked. |

---

## 3. Design Goals

- **Reduce time-to-first-value** — a brand-new user should be able to sign in and reach their locker in under 10 seconds using Google.
- **Preserve password flow** — password-based email signup continues to work unchanged for users who don't want to use Google (privacy, no Google account, etc.).
- **Explicit opt-in for long sessions** — "Remember me" is a deliberate user choice, not the default. When unchecked, the session ends with the browser.
- **Real logout** — clicking "Sign out" should revoke the refresh token server-side so the session cannot be resumed from another tab or a stolen cookie.
- **One user = one account** — a user who signs up with Google and later tries the password flow (or vice versa) should land back in the same account, not two separate ones.

---

## 4. Google Sign-In

### Provider choice

**Google Identity Services (GIS)** — Google's current web SDK (replaces the deprecated `gapi.auth2`). Frontend loads `https://accounts.google.com/gsi/client`, renders the "Sign in with Google" button (Google's branded button component), and receives a signed **ID token** (JWT) when the user picks an account.

### Flow

```
1. Frontend generates a random nonce, passes it to GIS when initializing the button.
2. User clicks "Sign in with Google" on /auth/login or /auth/signup.
3. GIS opens Google's account picker (popup or One Tap).
4. Google returns an ID token with our nonce echoed in its payload.
5. Frontend POSTs { idToken, nonce, rememberMe } to POST /api/auth/google.
6. Backend:
   a. Verifies ID token signature against Google's JWKS (cached, refreshed on unknown kid).
   b. Verifies iss ∈ {"accounts.google.com", "https://accounts.google.com"},
      aud == our client ID, exp not past, nonce matches the one we were sent.
   c. Rejects if email_verified is false.
   d. Extracts sub, email, given_name, family_name, picture.
   e. Looks up user by google_id → if found, sign in (update avatar_url if changed).
   f. Else looks up user by email:
      - If found AND email_verified_at IS NOT NULL: link google_id, persist
        firstName/lastName/avatarUrl if missing → sign in.
      - If found AND email_verified_at IS NULL (unverified password signup):
        treat as a dangling registration — delete the unverified row, then create fresh
        (prevents attacker-plants-unverified-row account-takeover).
   g. Else create new user (status=ACTIVE, email_verified_at=now,
      firstName=given_name, lastName=family_name, avatarUrl=picture, password_hash=null).
7. Backend returns AuthenticationResponse (access + refresh tokens per §5).
8. Frontend stores tokens per the "Remember me" rules below (see §5).
```

### New endpoint

```
POST /api/auth/google
Body: { "idToken": "...", "nonce": "...", "rememberMe": true|false }
Returns: AuthenticationResponse (same shape as /api/auth/login)
Errors:
  401 — signature invalid, wrong aud, expired, email_verified=false, nonce mismatch
  429 — rate-limited (same limiter as /api/auth/login)
```

### Config

- Google Client ID: stored as `auth.google.client-id` in `application.yml`, surfaced to the frontend via Angular environment file (public value, safe to ship).
- Client Secret: **not needed** — we only verify ID tokens (not the full OAuth code flow).
- Allowed audiences: the backend must reject ID tokens whose `aud` claim doesn't match our client ID.

### Library choice

Use the existing **`com.nimbusds:nimbus-jose-jwt:9.37.3`** (already a dependency, line 38 of `api/build.gradle.kts`) to verify Google ID tokens directly against Google's JWKS. This avoids pulling in the full `google-api-client` (~8MB with Guava transitive) just for signature verification. Cache JWKS for 1 hour; force refresh on unknown `kid`.

### Email verification for Google users

Google already verifies the email at the provider level (reflected in `email_verified: true` on the ID token). Users signing in via Google skip our email verification flow entirely — their `email_verified_at` is set to the sign-in timestamp. The backend **rejects** ID tokens where `email_verified` is `false`.

---

## 5. Remember Me & Session Lifetime

### Checkbox behavior

A "Remember me on this device" checkbox appears on both the password login form and the Google Sign-In context. Default state: **unchecked**. Position: between the password field and the submit button on the login form; passed as a query param or state flag for Google.

| State | Refresh token TTL | Storage location |
|---|---|---|
| Checked | 60 days | `localStorage` — survives browser restart |
| Unchecked | Access-token-lifetime only (1 hour) — no refresh token issued | `sessionStorage` — cleared when tab/browser closes |

**Rationale for no refresh token when unchecked**: the user explicitly said they don't want persistence. A short-lived access token with no refresh path is the cleanest way to honor that — no token lingers in storage or the DB after the tab closes.

### Backend token issuance

**Access token lifetime is bumped from 15 min → 1 hour** as part of v7. Rationale: with real server-side logout (§6) we can accept a slightly longer window of stateless validity in exchange for fewer refresh round-trips and a smoother experience for users who leave tabs open between classes.

`AuthenticationResponse` stays the same shape, but when `rememberMe=false`:
- Access token issued for 1 hour
- `refreshToken` field is `null`
- `expiresIn` reflects access token lifetime only

When `rememberMe=true`:
- Access token 1 hour
- Refresh token 60 days, persisted in `refresh_tokens` table with a new `remember_me` flag for auditability

### Refresh token rotation

`POST /api/auth/refresh` **rotates**: the incoming refresh token is revoked and a new one is issued (inheriting the `remember_me` flag + remaining lifetime is reset to full `remember-me-refresh-ttl`). This limits the blast radius of a leaked 60-day token: once the real user refreshes, the attacker's copy is dead.

If a refresh call arrives with an *already-revoked* token, treat it as token-theft: revoke **all** of that user's active refresh tokens and return 401. The user re-logs in on next request.

### `application.yml`

```yaml
auth:
  jwt:
    access-token-ttl: PT1H          # bumped from PT15M
    remember-me-refresh-ttl: P60D   # used when rememberMe=true
```

The old `refresh-token-ttl: P7D` property is **removed** in v7. All refresh tokens are either 60 days (Remember-Me checked) or absent (unchecked — access token only).

---

## 6. Logout — Server-side Revocation

### New endpoint

```
POST /api/auth/logout
Headers: Authorization: Bearer <accessToken>
Body: { "refreshToken": "..." }   (optional — if omitted, no refresh revocation)
Returns: 204 No Content
```

Behavior:
- Marks the matching `refresh_tokens` row `revoked=true` if the refresh token matches a valid row for the authenticated user.
- Returns 204 even if the refresh token is unknown/already revoked (no user enumeration leak).

### Frontend behavior

`SessionStore.clearSession()` calls `POST /api/auth/logout` before clearing local storage. If the call fails (network error, 401), the client still clears local state so the user isn't trapped in a broken state.

### Access token handling

Access tokens remain stateless (no DB lookup on every request) and expire in 1 hour. After logout, the previously-issued access token is still valid for up to 1 hour — this is the accepted tradeoff for stateless JWT performance. Only the refresh path is revocable in real time. If a tighter logout window is ever required (lost device, etc.), we can add a short-lived server-side denylist keyed on JWT `jti`; out of scope for v7.

---

## 7. Database Changes

### `app_users` — add Google fields

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `google_id` | `varchar(255)` | Yes | Google's `sub` claim. Unique. Nullable for password-only users. |
| `avatar_url` | `varchar(512)` | Yes | Google profile picture URL. Nullable. Populated on first Google sign-in; refreshed on subsequent sign-ins. |

- Add unique index on `google_id`.
- `password_hash` becomes nullable (a Google-only user has no password set).
- Existing `first_name` / `last_name` are populated from `given_name` / `family_name` on first Google sign-in **only if currently null** (don't overwrite user-edited values).
- `grade_level` stays null for Google signups; UI prompts on first locker visit (stretch — tolerate null for v7).

### `refresh_tokens` — flag remember-me sessions

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `remember_me` | `boolean` | No, default `true` | Set `true` for all v7 refresh tokens; exists for future auditing. |

### Rollback

Each Liquibase changeset ships with a matching `--rollback` directive per project convention — drop columns and indexes in reverse order.

---

## 8. Backend Changes

### New package: `com.highschoolhowto.auth.oauth`

- `GoogleIdTokenVerifier` — wraps the Google API client's verifier, caches Google's JWKS.
- `GoogleSignInService` — implements the lookup → link → create logic from §4.
- `GoogleAuthController` — exposes `POST /api/auth/google`.

### Changes to existing classes

- `AuthenticationRequest` — add `rememberMe: boolean` field (default `false`).
- `AuthenticationResponse` — `refreshToken` becomes nullable.
- `JwtService` / `TokenService` — split refresh-token TTL into the two configured values; `issueRefreshToken(user, rememberMe)` chooses TTL and sets the `remember_me` flag.
- `AuthController` — add `POST /api/auth/logout`.
- `User` — add `googleId`, `avatarUrl` fields; make `passwordHash` nullable.

### Dependency additions

**None.** Uses the existing `com.nimbusds:nimbus-jose-jwt` (already pinned in `api/build.gradle.kts`) for ID token signature verification against Google's JWKS. Avoids the `google-api-client` dependency entirely.

### Audit logging

Both `POST /api/auth/google` and `POST /api/auth/logout` write audit rows through the existing `audit/` package — same fields as `login`/`register` events (user_id, ip, user_agent, result, timestamp). New event types: `GOOGLE_SIGN_IN`, `GOOGLE_SIGN_IN_NEW_USER`, `LOGOUT`.

### Rate limiting

`POST /api/auth/google` shares the same rate limiter as `/api/auth/login` (per-IP). The ID token signature check is cheap but not free, and this is a public unauthenticated endpoint.

---

## 9. Frontend Changes

### New files

- `frontend/src/app/pages/auth/google-button/google-button.component.ts` — wraps the GIS button, emits `idToken` on success. Uses a 100ms polling retry (up to 3s) in `ngAfterViewInit` to handle the `async defer` race where Angular bootstraps before the GIS script loads.
- `frontend/src/app/core/auth/google-auth.service.ts` — exchanges the ID token for our session via `/api/auth/google`.

### Updates

- `LoginComponent` / `SignupComponent` — render `<app-google-button>` above the email form with an "or" divider below. Add the "Remember me on this device" checkbox. Pass `rememberMe` to all auth API calls.
- `AuthApiService` — add `googleSignIn(idToken, rememberMe)` and `logout()` methods; accept `rememberMe` on `login()`.
- `SessionStore` — two storage backends (`localStorage` vs `sessionStorage`) chosen based on whether a refresh token was returned. **On every `setSession()` call, clear the *other* backend** to prevent stale state when the user toggles Remember-Me between logins. `clearSession()` calls `POST /api/auth/logout` before clearing both backends.
- `AuthInterceptor` — unchanged, but refresh retry logic must handle the "no refresh token available" case gracefully (route to `/auth/login`).
- `index.html` — add `<script src="https://accounts.google.com/gsi/client" async defer></script>`.
- Angular `environment.ts` / `environment.prod.ts` — add `googleClientId`.

### UX placement

```
┌──────────────────────────────┐
│  Log in                      │
│                              │
│  [  Sign in with Google  ]   │  ← branded Google button
│                              │
│  ──────── or ────────        │
│                              │
│  Email       [____________]  │
│  Password    [____________]  │
│                              │
│  ☐ Remember me on this device│
│                              │
│        [   Log in    ]       │
│                              │
│  Forgot password? · Sign up  │
└──────────────────────────────┘
```

Signup mirrors this — Google button on top, email form below, "Remember me" checkbox above the Create Account button.

---

## 10. Account Linking Rules

| Scenario | Outcome |
|---|---|
| New Google user, email not in DB | Create user, set `google_id`, `email_verified_at=now`, no password. |
| Existing **verified** password user signs in with Google (same email) | Link `google_id` onto existing row. User now has both paths available. |
| Existing **unverified** password user signs in with Google (same email) | Treat as a dangling registration — delete the unverified row, create fresh Google-linked account. Prevents an attacker who plants an unverified password row from intercepting the real user's first Google sign-in. |
| Existing Google user enters password on `/auth/login` (no password set) | Return the **same generic** "invalid credentials" error as a wrong password. Do **not** disclose "use Google for this email" (would enable user enumeration). The Google-hint message is shown only inside the locker after a successful Google sign-in completes account linking. |
| Existing Google user clicks "Forgot password" | Reset flow succeeds (sets a password). Account now has both paths. |
| Google ID token's `email_verified: false` | Reject the sign-in. Tell user to verify email with Google first. |
| Google email differs from user-set email | Use Google `sub` for linking, not email — prevents account takeover via email change on Google. If no match by `sub` AND no match by email, create a new account. Do **not** auto-update our stored email from Google. |

---

## 11. Security Considerations

| Threat | Mitigation |
|---|---|
| **ID token replay** (attacker intercepts a valid ID token and reuses it) | Frontend generates a cryptographically random `nonce` per sign-in, GIS echoes it in the token; backend rejects mismatched nonces. `exp` claim further bounds reuse to 1 hour. |
| **Account takeover via planted unverified row** | New: only link Google to existing rows whose `email_verified_at IS NOT NULL`. Unverified rows are deleted on Google sign-in (see §10). |
| **User enumeration** via login error messages | Generic "invalid credentials" returned for both wrong-password and Google-only-account cases. The Google hint is only shown post-successful-sign-in. |
| **Refresh token theft** (60-day lifetime amplifies risk) | Rotation on every refresh + theft detection: re-use of an already-revoked token revokes ALL of that user's tokens. Logout actively revokes server-side. |
| **Wrong audience** (token issued for a different app) | Backend asserts `aud == auth.google.client-id`; rejects otherwise. |
| **Compromised Google client-side state** | We never trust frontend claims about who the user is — backend always re-verifies the ID token signature via JWKS on every `/api/auth/google` call. |
| **Stale browser storage when user toggles Remember-Me** | `SessionStore.setSession()` clears the *opposite* storage backend before writing. |
| **Stateless JWT — can't revoke access tokens in real time** | Accepted tradeoff. Access token TTL bounded to 1 hour. Refresh path is the revocable choke-point. A `jti` denylist could be added later if needed. |

---

## 12. Implementation Phases

### Phase 1: Backend — Google verification & endpoint

- Liquibase changeset: `google_id`, `avatar_url`, nullable `password_hash`, indexes
- `GoogleIdTokenVerifier`, `GoogleSignInService`, `GoogleAuthController`
- Unit tests: mock Google's JWKS, verify happy path + rejected audiences + unverified email
- Integration test: full `POST /api/auth/google` with a stub verifier

### Phase 2: Backend — Remember me & logout

- Split refresh-token TTL config; `remember_me` column on `refresh_tokens`
- `POST /api/auth/logout` with revocation
- `rememberMe` plumbed through `/api/auth/login` and `/api/auth/google`
- Tests: 60-day token when checked, no refresh token when unchecked, logout revokes

### Phase 3: Frontend — Google button & login flow

- GIS script in `index.html`, `GoogleButtonComponent`, `GoogleAuthService`
- "Remember me" checkbox + storage backend switching in `SessionStore`
- `logout()` call before clearing local session
- Tests: login/signup components render button + checkbox, storage backend selected correctly

### Phase 4: Account linking polish & edge cases

- Error messaging for "use Google to sign in" when password field is empty for a Google-only user
- "Connect Google" button on `/account/security` for existing password users (stretch goal)
- Tests cover all scenarios in §10

---

## 13. Testing Requirements

### Backend unit tests

- `GoogleIdTokenVerifier` accepts tokens signed by Google, rejects tokens with wrong `aud`, rejects expired tokens
- `GoogleSignInService` link logic for every row in the §10 table
- `TokenService.issueRefreshToken(user, rememberMe=true)` writes 60-day row with `remember_me=true`
- `TokenService.issueRefreshToken(user, rememberMe=false)` returns no refresh token (null)
- `AuthController.logout()` revokes the specific refresh token, returns 204

### Backend integration tests

- `POST /api/auth/google` happy path creates user, returns tokens
- `POST /api/auth/google` with existing email links `google_id`
- `POST /api/auth/google` with `email_verified=false` returns 401
- `POST /api/auth/login` with `rememberMe=false` returns null refresh token
- `POST /api/auth/refresh` with a revoked token returns 401
- `POST /api/auth/logout` revokes the token, subsequent refresh attempt returns 401

### Frontend unit tests

- `GoogleButtonComponent` emits `idToken` on GIS success callback
- `LoginComponent` passes `rememberMe` to `AuthApiService.login()`
- `SessionStore` uses `localStorage` when refresh token present, `sessionStorage` otherwise
- `SessionStore.clearSession()` calls `AuthApiService.logout()`
- `AuthInterceptor` routes to `/auth/login` on refresh failure when no refresh token exists

### Manual / visual testing

- Google button renders with Google's branding on login and signup pages
- Checkbox default state is unchecked; state is remembered within the session
- Log in with Google → locker loads in < 2s on a warm cache
- Check "Remember me", close browser, reopen → still logged in
- Uncheck "Remember me", close browser, reopen → logged out
- Sign out → refresh token immediately invalid (verify via network panel attempting `/api/auth/refresh`)
- Existing password user clicks Google, same email → same account (check user ID in locker)

---

## 14. Operational Setup

### Google Cloud Console — one-time, before Phase 3

The backend Client ID is provisioned in Google Cloud. A helper script automates the gcloud-scriptable parts and walks you through the console-only parts:

```bash
./api/scripts/google-signin-setup.sh
```

The script:

1. Verifies `gcloud` CLI + login (prompts `gcloud auth login` if needed).
2. Lets you pick or create a GCP project.
3. Opens the OAuth consent screen config page with exact field values to fill.
4. Opens the Credentials page; prints the three Authorized JavaScript origins to paste:
   - `http://localhost:4200` (npm start)
   - `http://localhost:4300` (Docker dev)
   - `https://highschoolhowto.com` (prod)
5. Prompts for the resulting Client ID and writes it into `application.yml`.

The Client ID is a public value (visible in browser network requests) and is committed to source. **No client secret is needed** for the ID-token verification flow used by v7.

### Test users (consent screen "Testing" mode)

If the OAuth consent screen is published in **Testing** status, only emails listed under "Test users" can sign in. Add at least one test Gmail before running Phase 3 manual tests. Promote to "In production" before public release.

---

## 15. Locker UI Updates

The locker is the main authenticated surface and has accumulated a few polish items that ship alongside v7. They are independent of the auth changes but bundled into the same release because they touch the same UserPreferences storage we're already extending.

**Subsections**:

- [15.1 Pane height-chain fix (already landed)](#151-pane-height-chain-fix-already-landed)
- [15.2 Timer — high-contrast active mode tab + numerals](#152-timer--high-contrast-active-mode-tab--numerals)
- [15.3 Timer — Pomodoro presets](#153-timer--pomodoro-presets)
- [15.4 Timer — replace settings gear with intuitive entry point](#154-timer--replace-settings-gear-with-intuitive-entry-point)
- [15.5 Timer — color picker](#155-timer--color-picker)
- [15.6 Notes — rich text editor](#156-notes--rich-text-editor)
- [15.7 Notes & Todos — colored detail toolbar](#157-notes--todos--colored-detail-toolbar)
- [15.8 Locker text-size accessibility](#158-locker-text-size-accessibility)
- [15.9 Database — UserPreferences additions](#159-database--userpreferences-additions)
- [15.10 Timer — minimum width to keep digits whole](#1510-timer--minimum-width-to-keep-digits-whole)
- [15.11 Implementation order](#1511-implementation-order)
- [15.12 Pins app — recommended pins browse](#1512-pins-app--recommended-pins-browse)

### 15.1 Pane height-chain fix (already landed)

**Problem**: The Notes / Timer / Bookmarks panes stopped at ~50% viewport height instead of filling the available space below the toolbar.

**Root cause** (two-part):
- `<app-app-pane-layout>` is an Angular custom element. Custom elements default to `display: inline`, which broke the flex-chain — the layout sized to its content rather than its container.
- `.locker-shell` used `min-height: 100vh` rather than a definite `height: 100vh`. Without a definite height on the parent, the `flex: 1` children below had nothing to resolve against.

**Fix** (already applied):

- `frontend/src/app/pages/locker/app-pane-layout.component.scss`:
  ```scss
  :host {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  ```
- `frontend/src/app/pages/locker/locker-shell.component.scss`: `min-height: 100vh` → `height: 100vh` with `overflow: hidden` to lock the chain.

**Convention going forward**: any standalone Angular component used as a flex child in the locker tree must declare `:host { display: flex; ... }` explicitly. Add a lint or component checklist note when reviewing future locker components.

### 15.2 Timer — high-contrast active mode tab + numerals

Two related contrast tweaks so the timer's most important elements pop against pastel pane tints:

**Active mode tab (Basic vs Pomodoro)**: today the active tab uses the per-pane palette color (`var(--tab-color, #0f9b8e)`) for both text and bottom-border. Against light pastel tints this washes out — the chosen mode is easy to miss.

- Change the active tab's text color to solid black (`#000`) and bump its font weight to 700.
- Keep the bottom-border indicator using `var(--tab-color)` so the palette tint still ties it to the pane.
- Inactive tab keeps the muted gray (`#888`) it already uses.

**Numerals**: the timer digits today use the muted brown (`#2d1a10`) that the rest of the locker chrome uses, which loses legibility when the timer is the focal element of the pane.

- Render the digits in solid black (`#000`) at a heavier font weight (700 → 800).
- Apply to both the running display (`.timer-app__display`) and the duration-edit spinners (`.spinner-input`, `.duration-sep`) so the editing state matches.
- Phase label, dots, and controls keep the existing brown palette — only the number and the chosen-mode tab change.

**Files**: `frontend/src/app/pages/locker/apps/timer-app.component.scss` (single file, three rules: `.timer-tab--active`, `.timer-app__display`, `.spinner-input` + `.duration-sep`).

### 15.3 Timer — Pomodoro presets

The current Pomodoro settings panel only exposes four raw number inputs (focus / short-break / long-break / sessions). Returning users have to remember the canonical Pomodoro durations every time. The v3 timer-card had three named presets that should be brought back.

**Presets** (restored from v3 `TIMER_PRESETS`):

| Name | Focus | Short break | Long break | Sessions |
|---|---|---|---|---|
| Classic Pomodoro | 25 min | 5 min | 15 min | 4 |
| Short Sprint | 15 min | 3 min | 10 min | 4 |
| Deep Work | 50 min | 10 min | 30 min | 3 |

**UI**: Add a row of three preset buttons at the top of the settings panel (above the four number inputs). Clicking a preset writes its values into the four input fields and persists immediately (same `savePomodoroSettings()` call the inputs use today). The currently-active preset gets a filled-tint treatment using the pane's palette color so it's visible at a glance; the user can still hand-tune the inputs after picking one (which deactivates the preset highlight).

**Persistence**: Reuse the existing `Timer.presetName` field that v3 already had on the entity. If absent on the v7 schema, add it as a nullable `varchar(32)` in the same Liquibase changeset as the other UserPreferences additions (§15.9).

**Files**: `frontend/src/app/pages/locker/apps/timer-app.component.html` (preset row markup), `.scss` (preset button styles — mirror the `.btn--save` pattern), `.ts` (`POMODORO_PRESETS` constant + `applyPreset()` method).

### 15.4 Timer — replace settings gear with intuitive entry point

The current Pomodoro settings panel is opened via a gear icon (⚙) pinned in the pane's top-right. The gear is a generic "settings" glyph that doesn't tell the user *what* it configures, and on a small pane it's easy to miss. With the presets being added (§15.3), the panel is now the primary way to switch between Pomodoro styles, so the entry point should advertise itself.

**Recommendation — match the Basic mode pattern**: Basic mode already lets the user click the digit display to edit the duration. Adopt the same pattern in Pomodoro: clicking the digits or phase label opens the settings panel inline. This is more discoverable (users naturally try to click the time they want to change), removes a piece of visual chrome (the floating gear button), and makes the two modes feel consistent.

Specifically:

- Make `.timer-app__display` and `.pomodoro-phase` clickable in Pomodoro mode. Add a subtle hover affordance (slight opacity bump or underline on the phase label) and a `title="Click to change durations"`.
- Remove the `.pomodoro-settings-btn` (gear) entirely.
- Inside the settings panel, add a small text "Done" link at the top-right (in addition to the existing Done button) so users know how to dismiss it without scrolling.

**Alternatives considered** (lower-ranked):
- **Text label "Customize"**: explicit but adds chrome that competes with the digits for attention.
- **Pencil icon (✎)**: more universally "edit" than gear, but still adds a button. Worth using if the click-the-display pattern proves to be untestable (e.g., conflicts with a future "tap-to-pause" gesture).
- **"Presets" label**: accurate to what most users will use the panel for, but understates that manual tuning is also available. Could combine with click-the-display: small `Presets ▾` text below the digits as a secondary nudge.

**Files**: `frontend/src/app/pages/locker/apps/timer-app.component.html` (move click handler, drop gear button), `.scss` (delete `.pomodoro-settings-btn` rules, add hover state on display).

### 15.5 Timer — color picker

**Goal**: Let the user tint the Timer pane independently of the global locker color, the same way Notes already supports per-note color selection.

**UI**: Reuse the existing `LockerColorOverlay` swatch-grid pattern. The Pomodoro/Basic mode tabs row gets a small color-circle button on the right; clicking it opens the same overlay used for the global locker color, scoped to the Timer pane. Picking a swatch sets `--pane-tint` on the Timer pane only and persists to UserPreferences. Choosing the "default" swatch clears the override and the pane reverts to the global locker color.

**Persistence**: new `timer_color` field on `UserPreferences` (varchar(16), hex). Defaults to null → uses the global locker color.

### 15.6 Notes — rich text editor

**Goal**: Replace the Notes plaintext textarea with the same Tiptap-based editor already used in the content admin (`frontend/src/app/admin/content-editor/...`), so users can format quick notes with bold/italic/headings/lists.

**Reuse strategy**: Extract the editor into a shared `RichTextEditorComponent` consumed by both the admin and the Notes app. Keep the admin's existing toolbar; the Notes variant uses a slimmer, hover/focus-revealed toolbar (see below).

**Sanitization**: Run note content through the same OWASP HTML sanitizer (`api/build.gradle.kts` already pins it) before persisting to the DB.

**Toolbar behavior — hover/focus reveal**: The formatting toolbar is hidden by default and fades in when the note's content area receives focus (or on hover for mouse users). When the note loses focus, the toolbar fades back out. This keeps the locker's calm reading aesthetic intact, surfaces controls only when the user is in "editing intent," and avoids adding a settings toggle the user has to manage.

**Slim toolbar set**: Bold, italic, underline, bullet list, numbered list, heading (H2/H3), link. No image/embed/table — those live in the admin-grade variant of the shared component.

### 15.7 Notes & Todos — colored detail toolbar

When a user opens a specific Note (or Todo list) that has a custom color, the detail view's title bar should adopt that color so the entire window reads as one unit. Today the detail toolbar (`.notes-app__detail-toolbar` and the equivalent in Todos) renders translucent white over the colored body, which visually splits the window into two zones and makes the color choice feel like an afterthought.

**Color choice — same hue, darker shade** (recommended over an exact match):

If the toolbar uses the **exact** body color, the two zones blur together and the toolbar's role as a control surface is lost — there's nothing to separate "controls live up here" from "content lives down there." If the toolbar uses an **unrelated** color (translucent white as today, or the global locker color), the window stops feeling like one unit. The middle ground — same hue as the note, ~10–15% darker — keeps the visual unity while preserving the affordance that the toolbar is a distinct band you interact with.

**Change**:

- **Notes**: `.notes-app__detail-toolbar` — replace `background: rgba(255, 255, 255, 0.35)` with `color-mix(in srgb, var(--note-color) 88%, #000)`. This blends the note's hue with 12% black to produce a tinted band of the same family. (If a CSS custom property isn't already in scope, set `--note-color` on the detail container alongside the existing `[style.background]` binding.)
- **Todos**: same treatment on the Todos detail-view toolbar (the bar that holds the back button + list title + actions). Source color is `todo.color` / `list.color` per the existing schema.
- **Text contrast**: keep the existing `textColor` logic (`note.textColor || '#2d1a10'`) — it already auto-selects readable foreground based on the picked color, and a 12% darker shade preserves the contrast bucket the helper computed against the lighter base, so no new computation is needed.
- **Border**: drop the white-on-white `border-bottom`; replace with a subtle `rgba(0, 0, 0, 0.12)` 1px line so the toolbar still reads as a discrete band when the color is light.

**Edge case — uncolored notes/todos**: when `color` is null/default cream, fall back to today's translucent-white treatment so the toolbar doesn't visually disappear into the same default cream as the body.

**Files**: `frontend/src/app/pages/locker/apps/notes-app.component.scss` (one rule on `.notes-app__detail-toolbar`); equivalent file in the Todos app.

### 15.8 Locker text-size accessibility

**Goal**: A user-controlled text-size setting that scales **all** text inside the locker apps (Notes, Timer, Bookmarks, Tasks, etc.) for users who find the default size cramped.

**Surface**: A segmented control in the locker toolbar (next to the existing font-family dropdown) with four discrete levels:

| Level | Scale | Approx body size |
|---|---|---|
| Small | 100% | 14px |
| Default | 115% | 16px |
| Large | 130% | 18px |
| X-Large | 150% | 21px |

**Why segmented control over a slider or numeric input**:
- Slider is tactile but invites fiddling and produces inconsistent screenshots between devices.
- Numeric input feels clinical and requires typing.
- Segmented control matches the existing font-family dropdown's pattern, requires one click, and keeps the toolbar compact.

**Implementation**: Set a `--locker-scale` CSS custom property on the `.locker-shell` root. All app components reference this in their `font-size` (and proportional `padding` / `gap` where appropriate) — `font-size: calc(1rem * var(--locker-scale, 1))`. One root-level change re-scales the entire locker without each component opting in.

**Persistence**: Save the chosen level (enum: `SMALL` | `DEFAULT` | `LARGE` | `XLARGE`) to `UserPreferences.locker_text_size`. Default is `DEFAULT`.

**Out of scope**: the homepage, auth pages, and admin do not respect this setting. It applies inside `/account/dashboard` (the locker) only.

### 15.9 Database — schema additions

A single Liquibase changeset covers all v7 locker-related schema additions, with a matching `--rollback` directive (project convention).

**`user_preferences`** — new columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `timer_color` | `varchar(16)` | Yes | null | Hex color, null = follow global locker color (§15.5) |
| `locker_text_size` | `varchar(16)` | No | `'DEFAULT'` | Enum: SMALL / DEFAULT / LARGE / XLARGE (§15.8) |

**`timers`** — new column (only if missing from current schema; v3 had it):

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `preset_name` | `varchar(32)` | Yes | null | Active Pomodoro preset name; null = manually tuned (§15.3) |

### 15.10 Timer — minimum width to keep digits whole

**Problem**: When the user shrinks the locker pane containing the timer (or sets `--locker-scale: XLARGE`), the digit display can be clipped or wrap mid-number — e.g. `1:23:45` becomes `1:23:` with `45` on the next line, or the rightmost digit is cut off by the pane edge.

**Constraint**: The timer's running display must always be wide enough to show the full largest-possible value for the current mode without wrapping or clipping.

- Basic mode: max display is `HH:MM:SS` (8 chars including colons) — needs ~6.5em at the current 3.5rem font-size.
- Pomodoro mode: max display is `MM:SS` (5 chars) — narrower minimum, but the phase label and dots above also need horizontal room.

**Approach**: Set a `min-width` on `.timer-app` (the pane content root) computed against the current scale level, and let the parent flex-resizer respect it. Two-part fix:

1. Add `min-width: max-content` (or an explicit `min-width: 14ch` × `--locker-scale`) on the `.timer-app__display` element so the digit string itself can never be narrower than its natural width. `tabular-nums` is already set, so `ch` is a stable unit.
2. Add `min-width` on `.timer-app` root that's the sum of its display + horizontal padding, so the column resizer in `app-pane-layout` honors it. This stops the user from dragging the pane narrower than the timer needs.

**Edge case — XLARGE text size**: with `--locker-scale: 1.5` the digits get ~50% wider, so the min-width must be expressed in `ch` or `em` units (which scale with font-size) rather than `px`. The `min-width: 14ch` form handles this automatically.

**Files**: `frontend/src/app/pages/locker/apps/timer-app.component.scss` (two `min-width` declarations).

### 15.11 Implementation order

These can ship independently of the auth work and in any order. Suggested batching:

1. **15.1** — already in main; no further work needed.
2. **15.2** + **15.3** + **15.4** + **15.10** — Timer polish bundle (contrast, presets, settings entry point, min-width). All touch only the timer-app component, single PR.
3. **15.7** — Notes & Todos colored detail toolbar (small CSS-only PR).
4. **15.8** — text-size scaler (touches every locker app's CSS, but mechanical).
5. **15.5** + **15.6** — Timer color picker + Notes rich text editor. Both land after the DB changeset (§15.9) is in; can ship together since they share the migration.
6. **15.12** — Recommended pins (DB migration + backend admin CRUD + user browse UI). Implemented.

### 15.12 Pins app — recommended pins browse

**Goal**: Let admins curate a list of suggested starting pins (e.g., Google Classroom, Khan Academy, College Board) that users can browse and add to their own Pins app with one click, rather than having to type URLs from scratch.

#### Database

New `recommended_shortcuts` table (changeset `v7-recommended-shortcuts-0072.sql`):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | varchar(255) NOT NULL | Display name |
| `url` | TEXT NOT NULL | Full URL |
| `emoji` | varchar(10) | Optional emoji icon |
| `favicon_url` | varchar(512) | Optional local or remote favicon path |
| `category` | varchar(100) | Grouping label (e.g., "Google", "Study Tools") |
| `sort_order` | INT NOT NULL DEFAULT 0 | Sort within category |
| `active` | BOOLEAN NOT NULL DEFAULT TRUE | Inactive pins are hidden from users |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

#### Backend

- `RecommendedShortcut` entity + `RecommendedShortcutRepository`
- `RecommendedShortcutService` — `listActive()` (user-facing, sorted category→sort_order), `listAll()` / `create()` / `update()` / `delete()` (admin)
- `AdminRecommendedShortcutController` — `GET/POST/PUT/DELETE /api/admin/recommended-shortcuts` (requires `ROLE_ADMIN`)
- `ShortcutController` — new `GET /api/shortcuts/recommended` endpoint (authenticated users, returns active pins only)

#### Frontend — admin

New "Recommended Pins" section at `/admin/recommended-pins` (`RecommendedPinsComponent`):
- List view grouped by category, with sort order and active/inactive badge
- Inline create/edit form with fields for name, url, emoji, favicon URL, category, sort order, active toggle
- Delete with `window.confirm`

#### Frontend — user (Pins app)

- **Browse button** added to the footer row alongside "+ New Pin" and "A–Z"
- Clicking Browse replaces the pin list with a scrollable browse panel showing recommended pins grouped by category
- Each row has a `+` button; already-added pins show `✓` (disabled). Adding a recommended pin calls `createShortcut()` with the pin's url/name/emoji/faviconUrl
- Closing the panel (✕ button or the panel going away when "+ New Pin" is clicked) returns to the normal list view
- Recommended pins are fetched lazily on first Browse open and cached for the session

#### Files changed

- `api/…/shortcut/RecommendedShortcut.java` (entity)
- `api/…/shortcut/RecommendedShortcutRepository.java`
- `api/…/shortcut/RecommendedShortcutService.java`
- `api/…/shortcut/AdminRecommendedShortcutController.java`
- `api/…/shortcut/dto/RecommendedShortcutResponse.java`
- `api/…/shortcut/dto/SaveRecommendedShortcutRequest.java`
- `api/…/shortcut/ShortcutController.java` — added `/recommended` endpoint
- `frontend/…/core/models/task.models.ts` — added `RecommendedPin` interface
- `frontend/…/core/services/recommended-pin-api.service.ts`
- `frontend/…/admin/recommended-pins/recommended-pins.component.{ts,html,scss}`
- `frontend/…/admin/admin.routes.ts` — added `recommended-pins` route
- `frontend/…/admin/shell/admin-shell.component.html` — added nav link
- `frontend/…/locker/apps/shortcuts-app.component.{ts,html,scss}` — browse feature
