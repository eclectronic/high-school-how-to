# Frontend design workflow (Canva + Codex)

Use this doc to keep the Canva mockup and design tokens close to the Angular codebase.

## Canva setup
1. Create/maintain the homepage mockup in Canva.
2. Share it with a view link that does not require login (Ideally: "Anyone with the link can view"). Paste that link below.
3. Export design tokens from Canva (colors, fonts, spacing) and note them below. Export any static assets (logos/icons) and place them in `frontend/src/assets/`.
4. For component specs, keep brief notes/screenshots: layout grid, padding, breakpoints, and reusable components/atoms.

### Canva link
- Homepage mockup: https://www.canva.com/design/DAG0UAuZQyY/-NNAoiA_u7Yjj0mKq4gTrw/view?utm_content=DAG0UAuZQyY&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hfd0e7a95e6

### Design tokens
- Colors: _list hex/rgba values_
- Fonts: _font families, weights, sizes/line-heights_
- Spacing: _scale for margins/padding/gaps_
- Components: _buttons, cards, nav, widget shells, etc._

## Using Codex with the mockup
1. Provide the Canva link (above) when asking Codex for UI implementation help or when invoking the Codex Canva plug-in.
2. Mention key components/sections you want generated (e.g., hero, nav, task list, event timeline, bookmark grid, video widget) plus any asset slices needed.
3. Codex can map the mockup to Angular components and SCSS: expect suggestions for component hierarchy, shared styles, responsive behavior, and a checklist of assets to export (images/icons/backgrounds).
4. When using the Canva plug-in, specify which frames/pages correspond to the home page. Ask for an asset manifest (e.g., hero background, widget thumbnails, icons) and reference placements (pixel dimensions, spacing, typography). Update the table below after exporting assets.

### Asset manifest (fill as you export from Canva via Codex plug-in)
| Asset | Canva Frame/Layer | Export format | Target path |
|-------|-------------------|---------------|-------------|
| Hero background | | PNG @2x | `src/assets/images/hero-bg.png` |
| Logo | | SVG | `src/assets/images/logo.svg` |
| Task icon | | SVG | `src/assets/icons/task.svg` |
| Event icon | | SVG | `src/assets/icons/event.svg` |
| Bookmark icon | | SVG | `src/assets/icons/bookmark.svg` |
| Video widget thumbnail | | PNG | `src/assets/images/video-thumb.png` |

## Implementation notes
- Keep shared styles (colors/fonts/spacing) in a theme SCSS file and import where needed.
- Place images/icons from Canva exports under `src/assets/` and reference them via Angular assets pipeline.
- When the design changes, update the Canva link/tokens here so future work stays aligned.

## Authentication UX + API plan

### Goals & constraints
- Turn the existing "Log in / Sign Up" CTA into a complete auth journey (login, signup, forgot/reset password, password update while signed in, email verification status).
- Mirror backend flows documented in `api/README.md` so the UI can call live endpoints without mock data.
- Keep the experience mobile-first (CTA reachable from hero), keep error copy generic to avoid account enumeration, and respect the password policy (min 12 chars, upper/lower/number/symbol).
- Make it obvious when an action succeeds even if the API returns `202 Accepted` (register + forgot password).

### Backend endpoint mapping
| Flow | Method + path | Request payload | Response | Notes |
|------|---------------|-----------------|----------|-------|
| Login | `POST /api/auth/login` | `{ email, password }` | `{ accessToken, refreshToken, expiresIn }` | Requires verified email + active status. |
| Signup | `POST /api/auth/register` | `{ email, password, firstName, lastName }` | `202 Accepted` no body | Triggers verification email. |
| Email verification | `GET /api/auth/verify-email?token=` | query token | `200 OK` JSON or HTML | Token provided via email link. |
| Forgot password | `POST /api/auth/forgot-password` | `{ email }` | `202 Accepted` | Always succeeds to avoid enumeration. |
| Reset password | `POST /api/auth/reset-password` | `{ token, newPassword }` | `200 OK` | Token arrives via email link. |
| Password update (signed-in) | `PUT /api/users/me/password` | `{ currentPassword, newPassword }` | `200 OK` | Reuses password policy, verifies current password, revokes refresh tokens. |

### UI architecture
- Dedicated `/auth` routes with an `AuthShellComponent`.  
  - Pros: clear URLs for deep links (`/auth/login`, `/auth/signup`, `/reset-password?token=...`), easier for verification/reset tokens in emails, page-level theming, accessible focus management.  
  - Cons: navigation away from marketing hero (CTA jumps to new route), slightly more boilerplate to keep hero imagery consistent.

Add a minimalist auth layout (logo + card) with child routes for each form. Use the same layout for verification + reset pages so links from backend emails resolve cleanly.

### Proposed components & routes
- `AuthShellComponent` – shared layout (logo, headline, supporting copy, slot for `<router-outlet>`).  
  Routes under `/auth`:
  - `/auth/login` → `LoginComponent`
  - `/auth/signup` → `SignupComponent`
  - `/auth/forgot-password` → `ForgotPasswordComponent`
  - `/auth/reset-password` → `ResetPasswordComponent` (token from query or state)
  - `/auth/verify-email` → `VerifyEmailComponent` (handles token + states)
- `/account/security` → `AccountSecurityComponent` (inside a future `AccountShellComponent` once profile editing ships) for logged-in password updates.
- Shared building blocks:
  - `AuthFormHeaderComponent` (title, subtitle, optional back link)
  - `AuthPasswordFieldComponent` (shows policy helper text + strength meter)
  - `AuthAlertComponent` (success/error banners)

### Services, state, and guards
- `AuthApiService` wraps the backend endpoints (`login`, `register`, `forgotPassword`, `resetPassword`, `verifyEmail`, `updatePassword`). Inject Angular `HttpClient`.
- `SessionStore` (signal/store or Akita-style service) keeps `{ user, accessToken, refreshToken, expiresAt }`, persists tokens to `localStorage` (keys: `hsht.access`, `hsht.refresh`), and exposes derived `isAuthenticated`.
- `AuthInterceptor` adds `Authorization: Bearer <accessToken>` when a token exists and the request matches `/api/**`. It should also watch for 401 responses, attempt a refresh (needs backend refresh endpoint once exposed), and fall back to logout.
- `AuthGuard` protects `/account/**` routes by checking `SessionStore.isAuthenticated`; redirect to `/auth/login` with `returnUrl`.
- `VerificationResolver` optional helper that reads `token` query param, calls `/api/auth/verify-email`, and feeds `VerifyEmailComponent` with `status: 'success' | 'expired' | 'invalid'`.

### Flow specs
- **Login**  
  - Fields: email, password.  
  - Validate email format before POST. Disable button while request in-flight.  
  - On success: store tokens via `SessionStore.setSession`, navigate to `returnUrl ?? '/account'`.  
  - Errors: show generic copy "We couldn't match that email/password" on 401; log unknown errors to console + show toast.  
  - Link to `Forgot password?`, `Need an account? Sign up`.
- **Signup**  
  - Inputs: first name, last name, email, password (policy helper).  
  - On `202` success show a confirmation state inside the same route (card with "Check your email" + CTA to open inbox).  
  - Provide link to `Already have an account? Log in`.
- **Forgot password**  
  - Single email field. On submit show success state regardless of API response. Provide CTA to return to login.  
  - Include mini copy explaining email arrives with a 15-minute link.
- **Reset password**  
  - Accessed from `/auth/reset-password?token=<jwt>` (token appended by backend email via `AuthLinkProperties.reset`).  
  - Form: new password + confirm. Validate token presence before showing form; otherwise, display error card with link to start over.  
  - POST token + password; on success display "Password updated – log in" CTA which routes to login and clears sensitive state.
- **Email verification**  
  - `/auth/verify-email?token=` route auto-calls the API on init.  
  - Three visual states: verifying (spinner), verified (success icon + login button), invalid/expired (warning + link to resend [once backend exposes resend endpoint] or to contact support).  
  - Accept header needs to stay JSON, so keep the Angular request default (browser UI version is separate from backend HTML response).
- **Password update (signed-in)**  
  - Lives under `/account/security`. Form fields: current password, new password, confirm.  
  - Calls `PUT /api/users/me/password`, which verifies the current password, enforces the password policy, updates the hash, and revokes refresh tokens so other sessions log out.  
  - Keep behind `featureAccountSecurity` flag until the rest of the account shell ships.

### CTA + navigation updates
- Update the hero button to navigate to `/auth/login` (or to `/auth/signup` if we track referral from marketing).  
- Add footer links for Terms/Privacy + "Verify email" to reduce friction when users copy/paste links.
- When a user is authenticated, replace the CTA with `Go to your dashboard` and include a kebab/profile menu with `Account`, `Sign out`.

### Implementation checklist
1. Scaffold `AuthShellComponent` and child routes; wire router links from the home hero.  
2. Create `AuthApiService` + DTOs typed against backend responses.  
3. Build forms for login/signup/forgot/reset with `ReactiveFormsModule`, add shared password helper + validation messages.  
4. Implement `SessionStore`, persisting tokens and emitting login/logout events; wire login form to store + navigation.  
5. Add `AuthInterceptor` + `AuthGuard` skeletons (even before `/account` routes exist) to keep code coherent.  
6. Build verification + reset pages that parse the `token` query param and drive optimistic/success/error UI states.  
7. Define `/account/security` placeholders gated behind `featureAccountSecurity` flag, noting dependency on backend password-update endpoint.
