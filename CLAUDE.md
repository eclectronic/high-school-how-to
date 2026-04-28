# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Principles

- **Clarity over cleverness**: Prioritize straightforward, readable code and architecture. Avoid over-engineering or premature abstractions.
- **Consistency**: Follow established patterns and styles in the codebase. When in doubt,
- mirror existing conventions for file organization, naming, and structure.
- **Documentation**: Keep CLAUDE.md and any relevant docs up to date as the codebase evolves. When adding or changing architecture, workflows, or conventions, update the relevant section in this file. Use comments and README sections to explain non-obvious decisions, architectural rationale and how different pieces fit together. This is especially important for authentication flows, API contracts, and shared utilities.
- **Testability**: Write code that is easy to test with unit and integration tests.
- Design for testability by keeping functions pure where possible, minimizing side effects, and using dependency injection for external services.
- **Tests are required for new features**: Any new feature, service, controller, or component must ship with tests. This is non-negotiable — do not consider a feature complete without them. Specifically:
  - Backend: unit tests for services (happy path + edge cases/validation), integration tests for controller endpoints (auth, correct responses, error cases).
  - Frontend: unit tests for components (renders correctly, key interactions) and services (correct HTTP calls).
  - Follow existing test patterns in the codebase (Karma/Jasmine for frontend, JUnit/Spring Boot Test for backend).
- **Build must pass before release**: When preparing or wrapping up a release, the full build (`./gradlew build` for backend, `npm run build` for frontend) must succeed with zero errors and zero warnings before any release commit is made. Never commit or push release artifacts (changelog, version bump, tags) on a broken build — fix the build first.
- **Security best practices**: For authentication and sensitive operations, follow security best practices:
- Use parameterized queries or ORM features to prevent SQL injection.
- Hash passwords securely (e.g., bcrypt) and never log sensitive information.
- For JWTs, use asymmetric signing and keep token TTLs short with refresh tokens for better compromise mitigation.
- unit and integration tests should cover both happy paths and edge cases, especially for auth flows and error handling.

## Repository Overview

Full-stack monorepo for highschoolhowto.com — an educational platform with task management, event tracking, bookmarks, and content widgets (YouTube/infographics). Angular frontend + Spring Boot backend communicating via JWT-authenticated REST APIs.

- `frontend/` — Angular 20 SPA
- `api/` — Spring Boot 3.3 backend (Java 21, Gradle)

## Frontend Commands

Run from `frontend/`:

```bash
npm install         # Install dependencies
npm start           # Dev server at http://localhost:4200
npm run build       # Production build
npm test            # Run all unit tests (Karma/Jasmine)

# Run a single test file
ng test --include='**/login.component.spec.ts'
```

**Production deploy**: handled automatically by `deploy.yml` on push to `main`. To deploy manually, run `scripts/deploy-prod.sh` from `frontend/` (builds, syncs to S3, invalidates CloudFront). Requires AWS credentials with the permissions listed in the CI/CD section.

## Backend Commands

Run from `api/`:

```bash
./gradlew bootRun           # Start dev server at http://localhost:8080
./gradlew clean build       # Full build (compiles + tests)
./gradlew test              # Unit tests only
./gradlew integTest         # Integration tests (requires Postgres via TestContainers)
./gradlew check             # All checks (unit + integration)

# Run a specific test class or method
./gradlew test --tests "AuthControllerTest"
./gradlew test --tests "AuthControllerTest.testLoginEndpoint"

# Database migrations (Liquibase)
./gradlew liquibaseUpdateAll    # Create DB + apply all schema changesets
./gradlew liquibaseSchema       # Apply schema only (DB must exist)
./gradlew lbDropAll             # Drop all DB objects (destructive)
./gradlew lbRollbackCount -PliquibaseRollbackCount=3

# Docker image
./gradlew jibDockerBuild        # Build Docker image locally via Jib
```

## Docker

```bash
# Developer mode (live reload, source mounts) — the normal way to run locally
docker compose -f docker-compose.dev.yml up

# Dev mode URLs: frontend http://localhost:4300, API http://localhost:8080
# Mounts: ./api, ./frontend, ./media — changes are picked up without rebuilding images
# Requires $HOME/docker.env for env vars (notification credentials etc.)

# Recreate a single service after changing its docker-compose config (e.g. new volume)
docker compose -f docker-compose.dev.yml up -d api

# Teardown (keeps DB volume)
docker compose -f docker-compose.dev.yml down
# Teardown with data wipe
docker compose -f docker-compose.dev.yml down && docker volume rm high-school-how-to_pgdata
```

## CI/CD

### Workflows

Two GitHub Actions workflows run on push to `main`:

- **`ci.yml`** — runs on all pushes and PRs. Builds and tests both frontend and backend.
- **`deploy.yml`** — runs on push to `main` and via manual `workflow_dispatch`. Calls the existing deploy scripts to build and ship both services in parallel.

The deploy jobs call the scripts directly:
- `./api/scripts/deploy.sh` — builds the API Docker image via Jib, pushes to ECR, triggers App Runner redeployment
- `./frontend/scripts/deploy-prod.sh` — builds the Angular app, syncs to S3, invalidates CloudFront

The API image is tagged with the git commit SHA (`github.sha`) so every deployment is traceable.

### Required GitHub Secrets

Set these under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID |

The IAM user needs these permissions:
- ECR: `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`
- App Runner: `apprunner:StartDeployment`, `apprunner:ListServices`, `apprunner:DescribeService`, `apprunner:ResumeService`
- S3: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the frontend bucket
- CloudFront: `cloudfront:CreateInvalidation`

### Deploy Scripts

| Script | Purpose |
|---|---|
| `api/scripts/deploy.sh` | Jib build → ECR push → App Runner trigger. Reads `AWS_ACCOUNT_ID`, `AWS_REGION`, `AWS_ECR_REPO_NAME`, `AWS_IMAGE_TAG`, `SERVICE_NAME` from env. |
| `frontend/scripts/deploy-prod.sh` | Angular prod build → S3 sync → CloudFront invalidation. Reads `AWS_REGION`, `CLOUDFRONT_DISTRIBUTION_ID` from env. Accepts `--skip-build` flag to reuse an existing dist. |
| `api/scripts/aws-apprunner-setup.sh` | One-time setup: creates ECR repo, App Runner service, Secrets Manager secret, and Route 53 DNS records. Run manually when provisioning a new environment. |

### Infrastructure

- **API**: AWS App Runner service `highschoolhowto-api` (us-west-2), pulling from ECR repo `highschoolhowto/api`
- **Frontend**: S3 bucket `highschoolhowto`, path `prod/`, served via CloudFront distribution `E1S3AKUQUXDIGC`
- **Database**: Amazon Aurora PostgreSQL at `highschoolhowto.c388sauoez7e.us-west-2.rds.amazonaws.com`
- **Media**: S3 bucket `highschoolhowto`, path `media/`, served via same CloudFront distribution

## Release Process

Preparing and cutting a release is a manual, deliberate sequence. The actual deployment to S3 / ECR / App Runner happens automatically via `deploy.yml` when `main` advances — but the release itself (version bump, changelog, tag, GitHub release) is human-driven so every release is intentional and documented.

Run these steps **in order** when wrapping a version:

1. **Update `CHANGELOG.md`** — add a new `## [X.Y.Z] — YYYY-MM-DD` section at the top, summarizing user-facing changes grouped by theme (see existing entries for tone — prose paragraphs, not bullet-points-only). Copy wording from the PR descriptions that shipped during the cycle.
2. **Commit the changelog + any outstanding code changes** with a descriptive message. Good template: `X.Y.Z <one-line summary of the release theme>`. (e.g. "7.0.0 Google Sign-In + Remember-Me + locker polish"). Do **not** bump the version yet — that's the next commit.
3. **Bump the version in `api/build.gradle.kts`** — change the `version = "X.Y.Z"` line (around line 13). Commit with message `X.Y.Z bump version`. Keeping the version bump in its own commit makes the tag point at a clean "this is X.Y.Z" state, separate from the feature/changelog work.
4. **Push to `main`** — `deploy.yml` auto-deploys both API and frontend. Watch the Actions tab until both jobs are green.
5. **Tag the release**: `git tag -a vX.Y.Z -m "X.Y.Z"` then `git push origin vX.Y.Z`. Use the `v` prefix on tags (matches existing `v5.2.0`, `v4.0.0` etc.).
6. **Create the GitHub release**: `gh release create vX.Y.Z --title "vX.Y.Z" --notes "$(awk '/^## \[X.Y.Z\]/,/^## \[/' CHANGELOG.md | sed '$d')"` — this extracts the matching CHANGELOG section and posts it as the release body. Verify the rendered release page before moving on.

**Frontend version**: `frontend/package.json` also has a `version` field, but current practice is to keep it in sync with `api/build.gradle.kts`. Bump both in the same commit as step 3 if the value has drifted.

**Hotfixes**: same sequence, patch-level bump (e.g. 7.0.0 → 7.0.1). Still run the full 6 steps — skipping the CHANGELOG or tag means the release history can't be reconstructed later.

**Never**: tag before the deploy jobs succeed. A tag on a broken commit is hard to retract cleanly once released.

## Architecture

### Frontend

- **Framework**: Angular 20, esbuild, SCSS, Karma/Jasmine tests
- **Routing** (`app.routes.ts`): `/` home, `/auth/*` (login/signup/verify-email/reset-password/forgot-password), `/account/security` and `/account/dashboard` (guarded by `authGuard`), `/content/:slug` (unified viewer), `/topics/:slug` (topic page), `/admin/**` (lazy-loaded admin module, requires ADMIN role)
- **Auth flow**: JWT access token (15m TTL) + refresh token (7d TTL). `AuthInterceptor` attaches tokens to requests; `SessionStore` manages auth state with RxJS signals
- **Content**: All content (infographics, videos, articles) is data-driven via the API. `ContentApiService` fetches cards, tags, and home layout. The home page, topic pages, and content viewer all load from the API — there are no static content resource files.
- **Admin module**: Lazy-loaded at `/admin`. Includes tag manager, content list, content editor (Tiptap rich text for articles), and layout editor. Requires `isAdmin` signal from `SessionStore`.
- **Hidden help content**: The `help-stickers` content card is intentionally set to `status='DRAFT'` (see `v5-help-accuracy-0065.sql`) so it is excluded from the public help page by `findByTagSlugResponses(slug, true)`'s `publishedOnly` filter. The stickers feature itself is dead code (`AppLauncherComponent`, `EditModeComponent`, `DailyQuoteComponent`, `ShortcutsRowComponent` are defined but never imported). When the stickers feature is wired back into the locker UI, flip `help-stickers` back to `PUBLISHED` via a new changeset.
- **Static app assets**: UI images (logo, backgrounds, social cards) under `frontend/public/assets/images/`. These are checked into the repo and bundled with the app.
- **Navigation**: Router uses `withInMemoryScrolling`
- **Code style**: Prettier with 100-char print width, single quotes
- **Locker app "done" button**: When a locker app has a detail view (e.g. open note, open to-do list), the button that commits and exits back to the list view must be a green circle check button — not a "Back" or "Save" text button. Use a `<button>` with a `✓` character, `title="Done"`, `aria-label="Done"`, and these styles: `background: #22c55e; border: none; color: #fff; width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; opacity: 0.9; box-shadow: 0 2px 6px rgba(0,0,0,0.25);` with hover `opacity: 1; transform: scale(1.1); box-shadow: 0 3px 10px rgba(0,0,0,0.3)`.
- **Page title / header styling**: The app background is a corkboard texture, so any standalone page title (`<h1>` or similar) rendered directly against the background must use a card treatment to remain legible. Use: `background: rgba(255, 254, 249, 0.9); border: 2px solid rgba(#2d1a10, 0.12); border-radius: 1.25rem; padding: 0.75rem 1.5rem; box-shadow: 0 8px 24px rgba(#2d1a10, 0.12);`. Titles that sit inside an already-styled card (e.g. the about page article card) don't need this applied again.

### Media Assets

Content images (infographics, thumbnails, cover images) live in the top-level `media/` directory, checked into the repo. They are **not** bundled with the frontend app.

- **Local dev (Docker)**: `./media` is mounted into the frontend container at `/workspace/frontend/public/media`, so the Angular dev server serves them at `/media/**`. The API knows nothing about media files.
- **Production**: Media files are served by CloudFront backed by S3. The S3 origin has `OriginPath: /prod`, so media must be synced under `s3://highschoolhowto/prod/media/`. The deploy script handles this automatically. Manual commands:
  ```bash
  # Push local to S3
  aws s3 sync ./media s3://highschoolhowto/prod/media --delete

  # Pull S3 to local
  aws s3 sync s3://highschoolhowto/prod/media ./media
  ```
  Helper scripts are also available: `frontend/scripts/deploy-prod.sh` (push) and `frontend/scripts/pull-media.sh` (pull).
- **Adding new media**: Drop files into `media/` (commit them), then use the admin content editor to set the card's media URL to `/media/path/to/file.jpg` (local) or the absolute CloudFront URL (prod).

### Content Sync

Production DB and S3 are the source of truth for admin-authored content. A pair of scripts in `scripts/` turn the repo into a versioned snapshot that enables local dev against realistic data and disaster recovery.

```
Prod DB + S3  ──export-content.sh──►  ./data/*.json + ./media/*  ──import-content.sh──►  Local or fresh prod DB
```

**Typical flow**: author via prod admin UI → run `scripts/export-content.sh` → review JSON diff → commit `data/` + any new media → others run `scripts/import-content.sh --target local`.

**Disaster recovery**: run `scripts/import-content.sh --target prod` against a freshly-provisioned RDS + empty S3 to restore the full content library from the most recent commit.

#### Scripts

| Script | Purpose |
|---|---|
| `scripts/export-content.sh` | Reads prod DB (via `PROD_EXPORT_DB_URL` in `~/docker.env`) and both S3 buckets, writes `./data/` JSON files and syncs `./media/`. |
| `scripts/import-content.sh --target local\|prod` | Reads `./data/` + `./media/`, truncates and re-inserts in a single transaction. `--target prod` also syncs media to S3 and requires typed confirmation twice. |

The `hshowto_export` Postgres role is provisioned automatically by Liquibase changeset `v8-export-db-role-0079.sql` when the app starts in the `prod` profile. It reads the password from the `HIGHSCHOOLHOWTO_DB_EXPORT_PROD_PASSWORD` environment variable (set in Secrets Manager). Add `PROD_EXPORT_DB_URL=postgresql://hshowto_export:<password>@<host>:5432/highschoolhowto` to `~/docker.env` to enable export scripts.

#### Data layout

```
data/
  content-cards/    # one JSON file per card (filename = slug)
  tags/             # one JSON file per tag (filename = slug)
  page-layouts/     # one JSON file per layout (filename = name-as-slug)
  quotes/           # quotes.json (all rows)
  badges/           # one JSON file per badge (filename = code)
  recommended-shortcuts/  # shortcuts.json (all rows)
```

Child rows (tags, links, template tasks) are denormalized into the parent card file. Tag references use slug strings so a rename only touches one file.

#### Tables in scope (synced)

`content_cards`, `content_card_links`, `content_card_tags`, `content_card_tasks`, `tags`, `page_layouts`, `page_layout_sections`, `quotes`, `badges`, `recommended_shortcuts`

User-owned tables (`app_users`, `tasks`, `bookmarks`, etc.) are **not** synced — they remain isolated per environment.

#### Image buckets

| S3 location | Local mirror | Notes |
|---|---|---|
| `s3://highschoolhowto/prod/media/` | `./media/` (excluding `uploads/`) | Curated infographic images. |
| `s3://highschoolhowto-site/uploads/` | `./media/uploads/` | Admin-uploaded images (thumbnails, content images). |

Both are under `./media/` so the Docker dev-server mount (`./media` → `/workspace/frontend/public/media`) serves them without extra wiring.

### Backend

- **Framework**: Spring Boot 3.3, Java 21, Gradle
- **Package root**: `com.highschoolhowto`
- **Key packages**:
  - `auth/` — REST endpoints (login, register, verify-email, forgot-password, reset-password, refresh token), JWT creation/validation, token logic
  - `config/` — Spring Security config (JWT filter, CORS, public vs. protected endpoints), `AuthLinkProperties`
  - `security/` — `JwtAuthenticationFilter`, `UserDetailsServiceImpl`
  - `notification/` — Email via AWS SES (`SesNotificationService`); `LoggingNotificationService` for local dev
  - `user/` — User entity and repository
  - `tasks/` — Task/todo management
  - `audit/` — Auth event audit logging
- **API prefix**: All endpoints under `/api/`
- **Auth endpoints** (public): `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`, `GET /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

### Database

- **Engine**: PostgreSQL 16 (local Docker) / Amazon Aurora PostgreSQL (production)
- **Migrations**: Liquibase, changelogs under `api/src/main/resources/db/changelog/`. Master file: `db.changelog-master.yaml`. Migrations auto-run on startup (non-prod)
- **Schema management**: `spring.jpa.hibernate.ddl-auto=validate` — Hibernate never auto-creates or modifies schema; all schema changes must go through Liquibase changesets

When liquibase changesets are generated, rollback scripts should also be created to allow reverting if needed. 
For example, if you add a new table in a changeset, the rollback should drop that table.


### Auth Flow

1. Registration: `POST /api/auth/register` → creates user + sends verification email via SES
2. Email verification: `GET /api/auth/verify-email?token=...` → redirects to frontend login
3. Login: `POST /api/auth/login` → returns `{ accessToken, refreshToken }`
4. Google Sign-In (v7+): `POST /api/auth/google` with `{ idToken, nonce, rememberMe }` → returns `AuthenticationResponse`
5. Logout (v7+): `POST /api/auth/logout` → revokes the refresh token server-side
6. Token refresh: `POST /api/auth/refresh` with `RefreshRequest` body (rotates the token in v7+)
7. Password reset: `POST /api/auth/forgot-password` → sends email; `POST /api/auth/reset-password?token=...`

### Google Sign-In setup

The Google OAuth Web Client ID is provisioned via `./api/scripts/google-signin-setup.sh` (one-time, interactive). It writes `auth.google.client-id` into `api/src/main/resources/application.yml`. The Client ID is a public value and is committed to source — no secret is required because the flow uses ID-token verification, not the OAuth authorization-code flow.

Full design: `docs/v7-auth-design.md`.

### Configuration

Key `application.yml` properties:
- `auth.jwt.key-paths`: RSA key pair at `classpath:keys/dev-{private,public}.pem`
- `auth.links.verification-redirect`: Frontend URL after email verification
- `auth.links.reset`: Frontend reset-password URL
- `notifications.ses.enabled`: Set `true` in prod to send via SES; `false` falls back to `LoggingNotificationService` (logs links to console)
- `notifications.ses.region`: AWS region for SES (default `us-west-2`)
- `notifications.ses.from-address`: Sender address (default `admin@highschoolhowto.com`)

The `docker` Spring profile (`application-docker.yml`) is activated when running in Docker. The `prod` profile (`application-prod.yml`) is for production.
