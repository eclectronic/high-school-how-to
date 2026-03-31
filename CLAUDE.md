# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Production deploy**: `npm run build -- --configuration production`, then `scripts/deploy-prod.sh` syncs to S3 (`s3://highschoolhowto-site/prod/`, region `us-west-2`).

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
# Full stack (production-style images)
docker compose up --build

# Developer mode (live reload, source mounts)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Dev mode: frontend at http://localhost:4300, API at http://localhost:8080
# Requires $HOME/docker.env for env vars in production mode

# Teardown (keeps DB volume)
docker compose down
# Teardown with data wipe
docker compose down && docker volume rm high-school-how-to_pgdata
```

## Architecture

### Frontend

- **Framework**: Angular 20, esbuild, SCSS, Karma/Jasmine tests
- **Routing** (`app.routes.ts`): `/` home, `/auth/*` (login/signup/verify-email/reset-password/forgot-password), `/account/security` and `/account/dashboard` (guarded by `authGuard`), `/infographics/:slug`, `/videos/:slug`
- **Auth flow**: JWT access token (15m TTL) + refresh token (7d TTL). `AuthInterceptor` attaches tokens to requests; `SessionStore` manages auth state with RxJS
- **Content resources**: Infographics defined in `frontend/src/app/resources/infographics.ts`; YouTube videos in `frontend/src/app/resources/youtube-videos.ts`. Update these files to surface new content without touching templates
- **Assets**: Infographic images under `frontend/public/assets/infographics/`. Video thumbnails derived dynamically from YouTube image endpoint
- **Navigation**: Router uses `withInMemoryScrolling`; viewer pages navigate back via fragment identifiers (`#video-<slug>`, `#infographic-<slug>`)
- **Code style**: Prettier with 100-char print width, single quotes

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
