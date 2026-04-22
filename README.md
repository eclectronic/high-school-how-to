# high-school-how-to monorepo

This repo will host both the Angular frontend and the Spring Boot backend for highschoolhowto.com. Use a single repo to keep the UI and API contracts in sync and ship cross-cutting changes together.

## Repo layout (proposed)
- `frontend/` — Angular app (Angular CLI project; Node 18+; npm or pnpm).
- `api/` — Spring Boot service (Java 21; Gradle wrapper).
- `api-contract/` (optional) — OpenAPI spec and generated clients if you want typed contracts between frontend and backend.

## Local development
1. Install prerequisites: Node 18+, npm (or pnpm), Java 21+, and Gradle (wrapper inside `backend/`).
2. Frontend: from `frontend/`, install deps (`npm install` or `pnpm install`), run dev server (`npm start` or `ng serve`).
3. Backend: from `backend/`, run `./gradlew bootRun` once the service is scaffolded.
4. Contracts: if you keep OpenAPI in `api-contract/`, update the spec first, then regenerate clients for both sides.

### Backend build (Spring Boot + Gradle)
- Use Java 21 and the Gradle wrapper.
- Target the latest Spring Boot 3.x release (e.g., 3.3.x at time of writing).
- Scaffold example (generates a Gradle project with Java 21):
  ```bash
  # from backend/
  spring init \
    --boot-version 3.3.4 \
    --dependencies=web,actuator \
    --build=gradle \
    --java-version=21 \
    --name=highschoolhowto-backend \
    .
  ./gradlew bootRun
  ```

### Database and migrations
- Database: Amazon Aurora PostgreSQL.
- Migrations: Liquibase (latest) managed by the Spring Boot app (run on startup in non-prod; CI can run `./gradlew update` or integration tests can spin up a Postgres container and apply changelogs).
- Keep Liquibase changelogs under `backend/src/main/resources/db/changelog/` with a master changelog aggregating versioned files. Align the schema with Aurora PG compatibility level.

### Backend API scope (user management)
- User profiles: CRUD endpoints for user profile data tied to authenticated users.
- Authentication: login endpoint issuing tokens/sessions; Google Sign-In via `POST /api/auth/google` (v7+).
- Registration: sign-up endpoint (email-based), plus email confirmation flow.
- Password reset: forgot-password endpoint to issue reset link/token; reset endpoint to set new password.
- Consider adding rate limiting, email verification tokens with expiry, and audit logs for auth events.

### Google Sign-In setup (one-time)

The Google Sign-In flow (v7+) needs an OAuth Web Application Client ID provisioned in Google Cloud. A helper script automates everything that's automatable and walks you through the rest:

```bash
./api/scripts/google-signin-setup.sh
```

The script verifies your `gcloud` CLI login, lets you pick or create a GCP project, opens the OAuth consent screen and Credentials pages with prefilled values, and writes the resulting Client ID into `api/src/main/resources/application.yml` under `auth.google.client-id`.

The Client ID is a **public value** (visible in browser network requests) and is committed to source — no secret is required because the v7 flow uses ID-token verification, not the OAuth authorization-code flow.

The script registers these Authorized JavaScript origins for you:
- `http://localhost:4200` — `npm start` (Angular dev server)
- `http://localhost:4300` — `docker compose -f docker-compose.dev.yml up`
- `https://highschoolhowto.com` — production

While the OAuth consent screen is in **Testing** status, only emails listed under "Test users" in the consent screen config can sign in. Promote to "In production" before public release.

See `docs/v7-auth-design.md` for the full design.

### Frontend scope (Angular)
- Task Management: todo checklist with reminders.
- Event Management: track important dates.
- Bookmark Manager: store frequently accessed sites.
- Content widgets: library that can embed YouTube videos inline in dedicated widgets.
- Frontend persists state through the backend APIs (auth, profiles, tasks/events/bookmarks, content metadata); shared contracts should be defined (e.g., OpenAPI) to keep UI and API aligned.

#### Current homepage implementation
- **Hero + socials**: Canva-inspired collage with taped logo, torn-paper hero board, and a taped socials card linking to Instagram, TikTok, and YouTube.
- **Video embeds**: `frontend/src/app/resources/youtube-videos.ts` stores curated @HighSchool-HowTo videos (slug, URL, description). Each entry renders through `app-youtube-video`, which shows a thumbnail + play icon. Clicking (or pressing Enter/Space when focused) opens the dedicated viewer route `/videos/:slug`, loads the YouTube iframe, and provides a tape-styled “Back to videos” button. Pressing `Esc` also returns to the originating video card using anchor fragments.
- **Infographics**: `frontend/src/app/resources/infographics.ts` lists local asset paths. Cards mimic bulletin-board labels with thumbnails and pinned title tags. Clicking opens `/infographics/:slug`, and the viewer page mirrors the YouTube experience (full-size asset, back button, `Esc` handler). Update either resource file to surface new assets without touching templates.
- **Anchored navigation**: The router is configured with `withInMemoryScrolling` so viewer pages can navigate back (via fragment identifiers like `#video-<slug>` / `#infographic-<slug>`), restoring scroll position to the exact card that launched the view.
- **Assets**: Infographic images live under `frontend/public/assets/infographics/`. Video thumbnails are derived dynamically via the YouTube image endpoint, so no manual asset export is required.

#### Deployment helper
- Use `scripts/deploy-prod.sh` after running `npm run build -- --configuration production`. The script syncs `frontend/dist/highschoolhowto/browser` to `s3://highschoolhowto-site/prod/` (default region `us-west-2`). Set `AWS_REGION` if you deploy elsewhere.

### Design workflow (Canva + Codex)
- Use Canva to mock up the homepage and export referenced assets (colors, typography, spacing, component screenshots/specs).
- Share the Canva design link/specs with Codex; Codex can translate mockups into Angular component structure/styles and point out reusable components and layout hierarchy.
- Keep a lightweight design handoff doc in `frontend/DESIGN.md` capturing tokens (colors, fonts, spacings) and component guidelines derived from the Canva mockup. Add the Canva share link there so Codex can reference it directly.

## Workflow notes
- Single PRs can touch UI + API when the contract changes; versioning stays unified.
- Keep CI with separate jobs for `frontend` and `backend`, plus an optional integration test stage that spins up the API and hits it with the UI (or a contract test).
- For deployment, build the Angular static assets and deploy to your CDN/S3 path; deploy the Spring Boot service to your chosen runtime (e.g., ECS/Fargate, EKS, or Elastic Beanstalk).
- Frontend builds should stay in the Node/Angular toolchain (`npm install && npm run build`). If you want one Gradle entry point, add Gradle tasks that call the Node build in `frontend/` and copy the `dist/` output into `src/main/resources/static` before packaging. This keeps Angular tooling intact while letting Gradle orchestrate end-to-end builds when needed.

## CI (GitHub Actions)
- Workflow: `.github/workflows/ci.yml`.
- Triggers on `push`/`pull_request` to `main`.
- Backend job (Gradle, Java 21) runs if a Gradle project exists in `backend/`; uses `./gradlew clean build`.
- Frontend job (Node 18) runs if `frontend/package.json` exists; uses `npm ci`, optional `npm run test` and `npm run build` if scripts are present.

## Containerization
- Build a Docker image for the backend (`hsh2-backend`) from the Spring Boot app. Use a multi-stage build or `bootBuildImage` with Pack. Plan to publish to your registry (ECR/GHCR) as part of CI/CD.

### API Docker image
`api/Dockerfile` is a multi-stage build that compiles the Spring Boot service with the Gradle wrapper and produces a slim Temurin JRE runtime image.

```bash
# Build locally
docker build -t highschoolhowto/api:local .

# Run just the API container (uses the docker profile; requires a Postgres instance)
docker run --rm -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=docker \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/highschoolhowto \
  -e SPRING_DATASOURCE_USERNAME=postgres \
  -e SPRING_DATASOURCE_PASSWORD=postgres \
  highschoolhowto/api:local
```

### Publish to Amazon ECR
```bash
AWS_REGION=us-west-2
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO=highschoolhowto-api

aws ecr create-repository --repository-name $REPO --region $AWS_REGION 2>/dev/null || true
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t $REPO:latest .
docker tag $REPO:latest $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
```

### Local stack with Docker Compose
`docker-compose.yml` builds and runs Postgres 16, the API image, and an Nginx-served Angular bundle.

```bash
# Build images and start the full stack (production-style images)
docker compose up --build

# Tear everything down (removes containers but keeps the pgdata volume)
docker compose down
```

To run in developer mode (live reload, source mounts), layer the dev override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The Angular site is served at http://localhost:4200 (API remains on http://localhost:8080). The Postgres volume is stored under the `pgdata` named volume; remove it with `docker volume rm high-school-how-to_pgdata` if you need a clean schema.
