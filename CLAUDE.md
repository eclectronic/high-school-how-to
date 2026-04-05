# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Principles

- **Clarity over cleverness**: Prioritize straightforward, readable code and architecture. Avoid over-engineering or premature abstractions.
- **Consistency**: Follow established patterns and styles in the codebase. When in doubt,
- mirror existing conventions for file organization, naming, and structure.
- **Documentation**: Keep CLAUDE.md and any relevant docs up to date as the codebase evolves. When adding or changing architecture, workflows, or conventions, update the relevant section in this file. Use comments and README sections to explain non-obvious decisions, architectural rationale and how different pieces fit together. This is especially important for authentication flows, API contracts, and shared utilities.
- **Testability**: Write code that is easy to test with unit and integration tests.
- Design for testability by keeping functions pure where possible, minimizing side effects, and using dependency injection for external services.
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
- App Runner: `apprunner:StartDeployment`, `apprunner:ListServices`, `apprunner:DescribeService`
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
- **Frontend**: S3 bucket `highschoolhowto-site`, path `prod/`, served via CloudFront distribution `E1S3AKUQUXDIGC`
- **Database**: Amazon Aurora PostgreSQL at `highschoolhowto.c388sauoez7e.us-west-2.rds.amazonaws.com`
- **Media**: S3 bucket `highschoolhowto-site`, path `media/`, served via same CloudFront distribution

## Architecture

### Frontend

- **Framework**: Angular 20, esbuild, SCSS, Karma/Jasmine tests
- **Routing** (`app.routes.ts`): `/` home, `/auth/*` (login/signup/verify-email/reset-password/forgot-password), `/account/security` and `/account/dashboard` (guarded by `authGuard`), `/content/:slug` (unified viewer), `/topics/:slug` (topic page), `/admin/**` (lazy-loaded admin module, requires ADMIN role)
- **Auth flow**: JWT access token (15m TTL) + refresh token (7d TTL). `AuthInterceptor` attaches tokens to requests; `SessionStore` manages auth state with RxJS signals
- **Content**: All content (infographics, videos, articles) is data-driven via the API. `ContentApiService` fetches cards, tags, and home layout. The home page, topic pages, and content viewer all load from the API — there are no static content resource files.
- **Admin module**: Lazy-loaded at `/admin`. Includes tag manager, content list, content editor (Tiptap rich text for articles), and layout editor. Requires `isAdmin` signal from `SessionStore`.
- **Static app assets**: UI images (logo, backgrounds, social cards) under `frontend/public/assets/images/`. These are checked into the repo and bundled with the app.
- **Navigation**: Router uses `withInMemoryScrolling`
- **Code style**: Prettier with 100-char print width, single quotes

### Media Assets

Content images (infographics, thumbnails, cover images) live in the top-level `media/` directory, checked into the repo. They are **not** bundled with the frontend app.

- **Local dev (Docker)**: `./media` is mounted into the frontend container at `/workspace/frontend/public/media`, so the Angular dev server serves them at `/media/**`. The API knows nothing about media files.
- **Production**: Media files are served by CloudFront backed by S3. Content card URLs in the database should be absolute CloudFront/S3 URLs. After adding or changing files in `media/`, sync to S3:
  ```bash
  # Push local to S3
  aws s3 sync ./media s3://highschoolhowto-site/media --delete

  # Pull S3 to local
  aws s3 sync s3://highschoolhowto-site/media ./media
  ```
- **Adding new media**: Drop files into `media/` (commit them), then use the admin content editor to set the card's media URL to `/media/path/to/file.jpg` (local) or the absolute CloudFront URL (prod).

### Backend

- **Framework**: Spring Boot 3.3, Java 21, Gradle
- **Package root**: `com.highschoolhowto`
- **Key packages**:
  - `auth/` — REST endpoints (login, register, verify-email, forgot-password, reset-password, refresh token), JWT creation/validation, token logic
  - `config/` — Spring Security config (JWT filter, CORS, public vs. protected endpoints), `AuthLinkProperties`
  - `security/` — `JwtAuthenticationFilter`, `UserDetailsServiceImpl`
  - `notification/` — Email via Microsoft Graph (`GraphNotificationService`); `LoggingNotificationService` for local dev
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

1. Registration: `POST /api/auth/register` → creates user + sends verification email via Microsoft Graph
2. Email verification: `GET /api/auth/verify-email?token=...` → redirects to frontend login
3. Login: `POST /api/auth/login` → returns `{ accessToken, refreshToken }`
4. Token refresh: `POST /api/auth/refresh` with `RefreshRequest` body
5. Password reset: `POST /api/auth/forgot-password` → sends email; `POST /api/auth/reset-password?token=...`

### Configuration

Key `application.yml` properties:
- `auth.jwt.key-paths`: RSA key pair at `classpath:keys/dev-{private,public}.pem`
- `auth.links.verification-redirect`: Frontend URL after email verification
- `auth.links.reset`: Frontend reset-password URL
- `notifications.test.enabled`: Set `true` to log emails instead of sending (useful for local dev without Microsoft Graph credentials)
- `notifications.graph.enabled`: Set `false` when Graph credentials unavailable

The `docker` Spring profile (`application-docker.yml`) is activated when running in Docker. The `prod` profile (`application-prod.yml`) is for production.
