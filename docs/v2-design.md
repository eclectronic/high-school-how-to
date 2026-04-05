# High School How To — v2.0 Design Document

**Status**: Draft
**Last updated**: 2026-03-31

## 1. Problem Statement

In v1.0, all site content (infographics, YouTube videos) is hardcoded in static TypeScript arrays (`infographics.ts`, `youtube-videos.ts`). Adding or editing content requires a code change, a build, and a deploy. There is no admin interface and no content API.

**v2.0 goal**: An admin user can author, edit, publish, and organize content cards — and control the site's navigation structure and homepage layout — through a management interface, without touching code or redeploying.

## 2. Current Content Model

Each content item today is a simple object in a frontend resource file:

```
InfographicResource: { slug, title, webImage, printableImage, description? }
YoutubeVideoResource: { slug, title, url, description? }
```

The homepage renders these in carousels (one featured item at a time with prev/next navigation). Dedicated viewer pages exist at `/videos/:slug` and `/infographics/:slug`.

**Current counts**: 4 infographics, 2 YouTube videos — all manually curated.

## 3. Requirements

### Must Have
- Admin can create, edit, reorder, and delete content cards
- Three card types: **Infographic**, **YouTube Video**, and **Article**
- Cards have: title, slug, description, type-specific media (image upload or YouTube URL)
- **Article** cards have: rich text body with embedded images and a background image/color
- Published vs. draft status (only published cards appear on the public site)
- Frontend fetches content from an API instead of static arrays
- Image upload and storage (S3) for infographic assets and article images
- Rich text editor in the admin UI for authoring articles (WYSIWYG)
- **Content tags**: Cards are taggable with topic tags (e.g. "Driver's License", "Tests for College", "Study Skills")
- **Content sections**: The site has navigable topic sections defined by tags — each section shows cards matching that tag
- **Homepage layout**: Admin can configure the homepage — featured card, which sections appear, section order
- **Featured card**: Admin can designate one card as the homepage hero/featured item

### Should Have
- Preview before publishing
- Card ordering control (manual sort order within sections)
- Ability to add new card types in the future without major rework
- Image upload within the rich text editor (inline images in articles)
- Section landing pages with filtered card grids (e.g. `/topics/drivers-license`)
- Search/filter by tag across all content

### Nice to Have
- Scheduled publishing (publish at a future date)
- Content versioning / edit history
- Bulk operations (publish/unpublish multiple cards)

---

## 4. Options Evaluated

### Option A: Built-in CMS (extend the existing Spring Boot backend)

Add content management directly to the existing API and build an Angular admin UI.

**How it works**:
- New `ContentCard` entity in PostgreSQL (via Liquibase migration)
- New REST endpoints under `/api/admin/content` (protected by admin role)
- Image uploads stored in S3 (same bucket as the site, under `/assets/uploads/`)
- New Angular admin pages under `/admin/content`
- Public read endpoint (`GET /api/content/cards`) consumed by the homepage

**New backend components**:

| Component | Purpose |
|---|---|
| `ContentCard` entity | slug, title, description, type, media fields, body, status, sortOrder, timestamps |
| `Tag` entity | slug, name, description, sortOrder |
| `PageLayout` / `PageLayoutSection` entities | Homepage layout config: featured card + ordered tag sections |
| `ContentCardRepository` | JPA repository with tag-based filtering |
| `TagRepository` | JPA repository |
| `PageLayoutRepository` | JPA repository |
| `ContentCardService` | Card CRUD + ordering + image upload to S3 |
| `TagService` | Tag CRUD |
| `PageLayoutService` | Layout config CRUD |
| `ContentCardController` | Public read endpoints (`/api/content/cards`, `/api/tags`, `/api/pages/home/layout`) |
| `AdminContentController` | Admin CRUD for cards (`/api/admin/content/**`) |
| `AdminTagController` | Admin CRUD for tags (`/api/admin/tags/**`) |
| `AdminPageLayoutController` | Admin layout editor endpoints (`/api/admin/pages/**`) |
| `AdminImageController` | Image upload endpoint (`/api/admin/images/upload`) |
| `Role` / admin check | Role-based access (ADMIN vs USER) on admin endpoints |
| `S3StorageService` | Upload/delete images in S3 |
| Liquibase migrations | `content_cards`, `tags`, `content_card_tags`, `page_layouts`, `page_layout_sections` tables + role column on `users` |

**New frontend components**:

| Component | Purpose |
|---|---|
| **Admin: Content list page** | Table of all cards with status badges, tag pills, edit/delete actions |
| **Admin: Content editor** | Form for creating/editing a card (type picker, fields, tag selector, Tiptap editor for articles) |
| **Admin: Tag manager** | CRUD interface for managing tags |
| **Admin: Page layout editor** | Configure homepage: set featured card, add/reorder/remove tag sections |
| **Admin: Route guard** | Restrict `/admin/**` to admin users |
| **Public: Updated homepage** | Data-driven layout — fetches layout config, then renders featured card + tag sections |
| **Public: Topic page** | `/topics/:tag-slug` — grid of all cards matching a tag |
| **Public: Content viewer** | `/content/:slug` — renders card by type (video/infographic/article) |
| **Public: Nav bar** | Topic links derived from tags |
| **Shared: Content card component** | Reusable card rendering (thumbnail, title, description, type badge) |

**Pros**:
- Full control over the data model, API shape, and UI
- No new infrastructure or third-party dependencies
- Content lives in the same PostgreSQL database alongside users and tasks
- Consistent tech stack (Angular + Spring Boot) — one codebase to maintain
- No additional cost beyond S3 storage (already in use)
- Admin UI can match the site's existing look and feel exactly

**Cons**:
- Must build the entire admin UI from scratch (form, image upload, list/table, preview)
- Must implement image upload pipeline (resize, validate, store, serve)
- More code to maintain long-term
- No built-in rich text editor — would need to integrate one (e.g., ngx-quill, tiptap)
- WYSIWYG editing and content preview require additional frontend work

**Effort estimate**: Medium-large. The backend is straightforward (CRUD + S3). The admin UI is the bulk of the work.

---

### Option B: Headless CMS (third-party service)

Use a hosted headless CMS (Contentful, Sanity, Strapi Cloud, etc.) for content authoring. The frontend fetches content from the CMS API at build time or runtime.

**How it works**:
- Content model defined in the CMS dashboard (card types, fields, media)
- Admin authors content through the CMS's built-in editor UI
- Frontend calls the CMS API (REST or GraphQL) to fetch published cards
- Images hosted by the CMS CDN
- Existing Spring Boot backend is not involved in content at all

**Candidate services**:

| Service | Free Tier | Content API | Notes |
|---|---|---|---|
| **Contentful** | 5 users, 25K records | REST + GraphQL | Mature, excellent Angular SDKs. Free tier generous for this use case |
| **Sanity** | 3 users, 100K documents | GROQ + GraphQL | Real-time collaborative editing, flexible schema, generous free tier |
| **Strapi Cloud** | 1 seat, limited | REST + GraphQL | Open-source option; can self-host for free on existing infra |
| **Hygraph** | 3 users, 1M API calls/mo | GraphQL-native | Good if you prefer GraphQL-first |

**Pros**:
- Zero admin UI to build — CMS provides a polished authoring experience out of the box
- Rich text editing, image transformations, localization, versioning all included
- Media hosting and CDN included (no S3 upload pipeline to build)
- Content preview, scheduling, and workflows available on most platforms
- Much faster to ship — frontend just needs to swap static arrays for API calls
- Scales content operations without scaling your backend

**Cons**:
- Introduces a third-party dependency (availability, pricing changes, vendor lock-in)
- Content lives outside your database — no joins with user data, tasks, etc.
- Free tiers have limits; may eventually require a paid plan
- Two systems to manage (CMS dashboard + your app)
- CMS editor UI won't match your site's visual style
- Less control over the API shape and caching behavior
- Authentication is separate from your existing JWT auth — admin access managed in the CMS, not your app

**Effort estimate**: Small-medium. Mostly frontend integration work. No backend changes needed.

---

### Option C: Self-hosted Strapi (on your existing infrastructure)

Run Strapi as a separate service alongside the Spring Boot API, using the same PostgreSQL database (or a dedicated one).

**How it works**:
- Strapi deployed as a Docker container in the existing Docker Compose / ECS setup
- Content model defined via Strapi's admin panel
- Frontend fetches from Strapi's REST/GraphQL API
- Images stored in S3 via Strapi's S3 upload provider
- Admin panel served by Strapi at a subdomain (e.g., `cms.highschoolhowto.com`)

**Pros**:
- Full authoring UI without building one
- No vendor lock-in — Strapi is open source (MIT license)
- No usage-based pricing or tier limits
- Data stays on your infrastructure
- Can share the same PostgreSQL instance or S3 bucket
- Plugin ecosystem for additional features (SEO, previews, etc.)

**Cons**:
- Another service to deploy, monitor, and keep updated (Node.js runtime)
- Strapi upgrades can require migration effort
- More infrastructure complexity (separate container, domain, reverse proxy)
- Strapi's admin auth is separate from your app's auth
- Postgres schema managed by Strapi, not your Liquibase migrations — two migration systems
- Overkill if content needs remain simple

**Effort estimate**: Medium. Infrastructure setup + frontend integration. No custom admin UI needed.

---

### Option D: Hybrid — Backend content API + lightweight admin in Angular

Similar to Option A, but keep the admin UI minimal (a simple form-based interface, not a full CMS experience). Lean into simplicity.

**How it works**:
- Same backend additions as Option A (entity, endpoints, S3 upload)
- Admin UI is deliberately simple: a card list + a single create/edit form
- No rich text editor — descriptions are plain text (or basic markdown rendered with a library)
- Image upload is a single file input with drag-and-drop
- Content preview by opening the public URL in a new tab

**Pros**:
- Everything from Option A, but scoped down to reduce build effort
- Matches the current site's simplicity — the content model is cards, not articles
- Can always add richer editing later if needed
- No third-party dependencies

**Cons**:
- Still requires building an admin UI, even if simple
- Image upload pipeline still needed
- Less polished authoring experience than a dedicated CMS

**Effort estimate**: Medium. The deliberately limited scope reduces frontend work significantly compared to Option A.

---

## 5. Comparison Matrix

| Criteria | A: Built-in CMS | B: Headless CMS | C: Self-hosted Strapi | D: Hybrid (simple) |
|---|---|---|---|---|
| **Build effort** | Medium-large | Small-medium | Medium | Medium |
| **Ongoing maintenance** | Medium (your code) | Low (managed service) | Medium (infra + updates) | Low-medium (your code) |
| **Admin UX quality** | Custom (you build it) | Polished (out of box) | Polished (out of box) | Basic but functional |
| **New dependencies** | None | Third-party service | Strapi (Node.js) | None |
| **Data ownership** | Full (your DB) | External | Full (your infra) | Full (your DB) |
| **Cost** | $0 (existing infra) | Free tier → paid | $0 (existing infra) | $0 (existing infra) |
| **Flexibility** | Full control | Constrained by CMS | Moderate (plugins) | Full control |
| **Future extensibility** | High | Medium | Medium-high | High |
| **Infrastructure complexity** | None added | None added | Moderate (new service) | None added |
| **Matches existing stack** | Yes | No (new paradigm) | No (Node.js service) | Yes |

---

## 6. Decision

**Option A: Built-in CMS** — extend the existing Spring Boot backend with a full admin UI in Angular.

Rationale: The Article card type requires a rich text editor with embedded images, which pushes past Option D's "keep it simple" boundary. Building in-house keeps everything in one stack, avoids third-party dependencies, and gives full control over the authoring experience.

---

## 7. Content Card Data Model

### Card types

| Type | Card display | Viewer page | Type-specific fields |
|---|---|---|---|
| **VIDEO** | Thumbnail + title + description | Embedded YouTube player | `media_url` (YouTube URL) |
| **INFOGRAPHIC** | Image thumbnail + title + description | Full-size image with print option | `media_url` (S3 web image), `print_media_url` (S3 printable image) |
| **ARTICLE** | Background image + title + description | Full rich text page | `body_json`/`body_html` (rich text content) |

All card types share an optional `cover_image_url` field (S3 image). Used as:
- The hero image when the card is featured on the homepage
- The article page hero (for article cards)
- The thumbnail source (auto-generated from the cover image if present)

For cards without a cover image, thumbnails fall back to type-specific sources (YouTube image API for videos, `media_url` for infographics). If a card without a cover image is featured, the hero renders as title + description on a styled background (no image).

### Database schema

```sql
-- Content cards (all types)
CREATE TABLE content_cards (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(255)  NOT NULL UNIQUE,
    title           VARCHAR(500)  NOT NULL,
    description     TEXT,
    card_type       VARCHAR(50)   NOT NULL,  -- 'VIDEO', 'INFOGRAPHIC', 'ARTICLE'
    media_url       VARCHAR(2000),           -- YouTube URL (VIDEO) or web image (INFOGRAPHIC)
    print_media_url VARCHAR(2000),           -- Printable image (INFOGRAPHIC only)
    thumbnail_url   VARCHAR(2000),           -- Card thumbnail override (all types)
    cover_image_url VARCHAR(2000),           -- Optional cover image (all types; used for featured hero + article page hero)
    body_json       JSONB,                  -- ProseMirror JSON (ARTICLE) — source of truth for editor
    body_html       TEXT,                   -- Pre-rendered HTML (ARTICLE) — used by public site
    status          VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',  -- 'DRAFT', 'PUBLISHED'
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Tags (admin-managed topic labels)
CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,         -- Display name, e.g. "Driver's License"
    description TEXT,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Many-to-many: cards ↔ tags (sort_order is per-tag, allowing different card order per section)
CREATE TABLE content_card_tags (
    card_id    BIGINT NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
    tag_id     BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    sort_order INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (card_id, tag_id)
);

-- Homepage layout configuration (singleton-ish — one active layout)
CREATE TABLE page_layouts (
    id              BIGSERIAL PRIMARY KEY,
    page_key        VARCHAR(100) NOT NULL UNIQUE,  -- 'HOME' (extensible to other pages later)
    featured_card_id BIGINT REFERENCES content_cards(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      BIGINT REFERENCES users(id)
);

-- Ordered list of sections displayed on a page layout
CREATE TABLE page_layout_sections (
    id          BIGSERIAL PRIMARY KEY,
    layout_id   BIGINT       NOT NULL REFERENCES page_layouts(id) ON DELETE CASCADE,
    tag_id      BIGINT       NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    heading     VARCHAR(500),  -- Override display heading (defaults to tag name if null)
    sort_order  INT          NOT NULL DEFAULT 0,
    max_cards   INT          NOT NULL DEFAULT 6,  -- How many cards to show in this section
    UNIQUE (layout_id, tag_id)
);

CREATE INDEX idx_content_cards_status_type ON content_cards (status, card_type);
CREATE INDEX idx_content_card_tags_tag ON content_card_tags (tag_id);
CREATE INDEX idx_content_card_tags_sort ON content_card_tags (tag_id, sort_order);
CREATE INDEX idx_page_layout_sections_layout ON page_layout_sections (layout_id, sort_order);
```

### Thumbnail generation

Every card needs a small thumbnail for homepage sections and topic page grids. Thumbnails are generated server-side on upload using `thumbnailator` (lightweight Java library).

**Per card type:**

| Type | Thumbnail behavior |
|---|---|
| **VIDEO** | Auto-populated from YouTube's image API (`img.youtube.com/vi/{id}/hqdefault.jpg`) when `media_url` is set |
| **INFOGRAPHIC** | Generated on upload — 400px-wide resize of the web image |
| **ARTICLE** | Generated on upload — 400px-wide resize of the background image. Falls back to a default placeholder if no background set |

**Upload flow:**
1. Admin uploads an image (infographic or article background)
2. Backend generates a 400px-wide JPEG thumbnail via `thumbnailator`
3. Both original and thumbnail are stored in S3 (`uploads/images/{uuid}.jpeg`, `uploads/thumbs/{uuid}.jpeg`)
4. `thumbnail_url` on the card is set to the generated thumbnail
5. Admin can optionally override by uploading a custom thumbnail

**Validation on all image uploads:**
- Max file size: 10MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`

Images are served via CloudFront with `Cache-Control` headers. No CDN-layer resizing — thumbnails are pre-generated.

### Article body storage

Articles store both formats:
- **`body_json`** (JSONB) — ProseMirror document JSON, source of truth. The admin editor loads this for lossless round-trip editing.
- **`body_html`** (TEXT) — Pre-rendered HTML, generated client-side via `editor.getHTML()` at save time. The public site renders this directly — no Tiptap rendering code shipped to visitors.

Both are written together on every save. If Tiptap extensions change in the future, a migration script can re-render `body_html` from `body_json`.

### Article image storage

Images embedded in article bodies are uploaded independently to S3 and referenced by URL in the HTML. This requires a general-purpose image upload endpoint:

```
POST /api/admin/images/upload  →  { "url": "https://cdn.highschoolhowto.com/uploads/..." }
```

The rich text editor inserts the returned URL as an `<img>` tag in the article body. This keeps the body as self-contained HTML that renders without any special resolution logic.

### Rich text editor evaluation

The admin article editor needs a WYSIWYG editor component. Candidates for Angular:

| Library | Format | Image embed support | Angular integration | Notes |
|---|---|---|---|---|
| **Tiptap** | HTML (ProseMirror) | Yes — custom node for uploads | `ngx-tiptap` wrapper | Modern, extensible, headless (you style it). Active development |
| **Quill** | Delta JSON → HTML | Yes — via image handler | `ngx-quill` | Mature, widely used. Stores Delta internally, exports HTML |
| **CKEditor 5** | HTML | Yes — built-in upload adapters | Official Angular package | Feature-rich, but heavier. Free for open source |
| **TinyMCE** | HTML | Yes — built-in | Official Angular component | Requires API key for cloud; self-hosted is free |

**Decision**: **Tiptap** (MIT core, via `ngx-tiptap` for Angular integration).

Rationale:
- Headless approach — toolbar and UI are custom-built, so the editor matches the site's design language rather than looking like an embedded third-party widget
- ProseMirror foundation is battle-tested and extensible
- Custom image upload node wires directly to the S3 upload endpoint
- Stores native HTML — no intermediate format conversion needed
- MIT license, no commercial concerns
- Tradeoff accepted: more upfront setup to build the toolbar UI, but full control over the admin authoring experience

Key extensions to use:
- `@tiptap/starter-kit` — headings, bold, italic, lists, blockquote, code, horizontal rule
- `@tiptap/extension-image` — image nodes (customized for S3 upload)
- `@tiptap/extension-link` — hyperlinks
- `@tiptap/extension-placeholder` — empty-state placeholder text
- `@tiptap/extension-text-align` — text alignment
- `@tiptap/extension-underline` — underline formatting
- `ngx-tiptap` — Angular directive/component wrapper

---

## 8. Site Navigation & Page Architecture

### How the public site works in v2.0

```
Homepage (/)
├── Hero: Featured card (admin-selected)
├── Section: "Driver's License"     ← shows up to N cards tagged "drivers-license"
├── Section: "Tests for College"    ← shows up to N cards tagged "tests-for-college"
├── Section: "Study Skills"         ← etc.
└── (sections, order, and card count are all admin-configured)

Topic page (/topics/:tag-slug)
├── Tag name + description as header
└── Full grid of all published cards with that tag

Card viewer (/content/:slug)
├── Renders based on card_type:
│   ├── VIDEO → embedded YouTube player
│   ├── INFOGRAPHIC → full-size image + print button
│   └── ARTICLE → rendered rich text body with background
└── Sidebar or footer: related cards (same tags)

Navigation bar
├── Home
├── Topic links (derived from page_layout_sections for HOME, or all tags)
├── Dashboard (auth'd users)
└── Admin (admin users)
```

### How the admin configures the homepage

The admin UI has a **Page Layout Editor** for the homepage:

1. **Set featured card** — pick any published card to appear as the hero
2. **Add/remove/reorder sections** — each section is tied to a tag
3. **Per-section settings** — optional heading override, max cards to display
4. **Preview** — see the homepage as it will appear to visitors

This means the homepage is fully data-driven: the frontend fetches the layout config, then fetches cards for each section. No code change needed to add a new topic or rearrange the page.

### Tags as the organizing primitive

Tags serve multiple purposes:
- **Content organization**: a card can have multiple tags (e.g. an SAT article is tagged both "Tests for College" and "Study Skills")
- **Navigation**: tags define the topic sections on the homepage and in the nav
- **Topic pages**: each tag gets a dedicated page showing all its cards
- **Search/filter**: users can filter content by tag

Tags are admin-managed (not user-generated). The admin creates tags like "Driver's License", "Tests for College", "Study Skills", "Daily Life", etc. through the admin UI.

### Tag deletion safety

Since every card must have at least one tag, deleting a tag could orphan cards. The application enforces this:

1. Before deleting a tag, `TagService` queries for cards where that tag is their **only** tag
2. If any such cards exist, the deletion is rejected with a `409 Conflict` response listing the affected cards (e.g. "Cannot delete — 3 cards would have no tags: [card titles]. Reassign them first.")
3. The admin UI shows this error and links to the affected cards for easy reassignment
4. If no cards would be orphaned, the tag is deleted — the `ON DELETE CASCADE` on `content_card_tags` handles the join table cleanup, and any `page_layout_sections` referencing the tag are also cascade-deleted

The DB schema uses `ON DELETE CASCADE` as a safety net, but the application layer is the primary enforcement point. This keeps the constraint logic visible and testable in Java rather than hidden in DB triggers.

### API endpoints for navigation and layout

```
Public:
  GET /api/tags                              → all tags (for nav menu)
  GET /api/tags/:slug/cards                  → published cards for a tag
  GET /api/content/cards?tag=:slug&status=PUBLISHED  → filtered card list
  GET /api/content/cards/:slug               → single card by slug
  GET /api/pages/home/layout                 → homepage layout config (featured card + sections)

Admin:
  POST/PUT/DELETE /api/admin/tags            → manage tags
  PUT /api/admin/pages/home/layout           → update homepage layout
  PUT /api/admin/pages/home/featured         → set featured card
  POST/PUT/DELETE /api/admin/pages/home/sections  → manage homepage sections
```

---

## 9. Admin Role Model

Add a `role` column to the existing `users` table:

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';
-- Values: 'USER', 'ADMIN'
```

Admin endpoints protected by a Spring Security role check. The Angular frontend adds an `adminGuard` and lazy-loaded admin module.

### Bootstrapping admin users

A Liquibase changeset seeds admin access for specific users by email. This runs as part of the normal migration on startup.

```yaml
- changeSet:
    id: seed-admin-users
    author: system
    comment: Grant admin role to initial admin users
    changes:
      - update:
          tableName: users
          columns:
            - column:
                name: role
                value: ADMIN
          where: email IN ('ron@blert.com', 'mira@blert.com')
```

Future admin grants are handled by adding new changesets — no direct DB access or admin UI needed.

---

## 10. Implementation Phases

Each phase is a self-contained unit of work that can be built, tested, and merged independently. Phases are ordered by dependency — each phase builds on the previous one.

### Phase 1: Foundation (backend)

Lays the groundwork that all subsequent phases depend on.

**Database migrations (Liquibase):**
- Add `role` column to `users` table (`VARCHAR(20) NOT NULL DEFAULT 'USER'`)
- Create `tags` table
- Create `content_cards` table (including `body_json`, `body_html`, `thumbnail_url`, etc.)
- Create `content_card_tags` join table
- Create `page_layouts` and `page_layout_sections` tables
- Seed admin role on the designated admin user

**Backend:**
- `Role` enum and update `User` entity with role field
- `UserDetailsServiceImpl` updated to include role as a granted authority
- `SecurityConfig` updated: `/api/admin/**` endpoints require `ROLE_ADMIN`
- `S3StorageService`: upload, delete, generate presigned URLs
- Image upload endpoint (`POST /api/admin/images/upload`) with validation (10MB max, MIME type whitelist)
- Thumbnail generation on upload via `thumbnailator` (400px-wide JPEG)

**Tests:**
- Admin role enforcement (admin-only endpoints reject non-admin users)
- Image upload validation (size, MIME type)
- Thumbnail generation

**Deliverable:** Admin role system working, images can be uploaded to S3 with thumbnails generated.

---

### Phase 2: Tags & Content Cards (backend)

CRUD APIs for the two core entities.

**Backend:**
- `Tag` entity, repository, service, controller
  - `AdminTagController`: `POST/PUT/DELETE /api/admin/tags`
  - `TagController`: `GET /api/tags` (public, for nav)
- `ContentCard` entity, repository, service, controller
  - `AdminContentController`: full CRUD at `/api/admin/content`
    - Create card (with tag IDs, type-specific fields)
    - Update card
    - Delete card
    - Reorder cards
  - `ContentCardController`: public read endpoints
    - `GET /api/content/cards?tag=:slug&type=:type` — filtered list (published only)
    - `GET /api/content/cards/:slug` — single card by slug
    - `GET /api/tags/:slug/cards` — published cards for a tag
- Card validation: at least one tag required, slug uniqueness, type-specific field requirements
- For VIDEO cards: auto-populate `thumbnail_url` from YouTube image API when `media_url` is set
- For INFOGRAPHIC/ARTICLE cards: `thumbnail_url` set from generated thumbnail on image upload

**Tests:**
- Card CRUD operations
- Tag assignment and filtering
- Slug uniqueness enforcement
- Tag-required validation
- Video thumbnail auto-population

**Deliverable:** Full content and tag management via API. Can create, tag, and query cards.

---

### Phase 3: Page Layout (backend)

Admin control over homepage structure.

**Backend:**
- `PageLayout` and `PageLayoutSection` entities, repositories, service
- `AdminPageLayoutController`:
  - `GET /api/admin/pages/home/layout` — current layout config
  - `PUT /api/admin/pages/home/featured` — set featured card ID
  - `POST/PUT/DELETE /api/admin/pages/home/sections` — manage ordered tag sections (tag ID, heading override, max cards, sort order)
- `PageLayoutController` (public):
  - `GET /api/pages/home/layout` — returns featured card + sections with their cards (published only)
- Seed a default HOME layout on migration

**Tests:**
- Layout CRUD
- Public layout endpoint returns only published cards
- Featured card set/clear
- Section ordering

**Deliverable:** Homepage layout fully configurable via API.

---

### Phase 4: Admin UI (frontend)

The Angular admin module — all admin-facing pages.

**Scaffolding:**
- Lazy-loaded admin module at `/admin` route
- `adminGuard` (checks `ROLE_ADMIN` from JWT claims)
- Admin layout component (sidebar nav: Content, Tags, Page Layout)
- Admin content service (HTTP client for admin API endpoints)

**Tag manager (`/admin/tags`):**
- List all tags with edit/delete
- Create/edit tag form (name, slug auto-generated from name, description)
- Delete confirmation

**Content list (`/admin/content`):**
- Table of all cards: title, type badge, tag pills, status badge, updated date
- Filter by type, tag, status
- Edit / delete actions
- "New card" button

**Content editor (`/admin/content/new`, `/admin/content/:id/edit`):**
- Card type picker (Video, Infographic, Article) — sets which fields are shown
- Common fields: title, slug (auto-generated, editable), description, tag selector (multi-select, at least one required), status toggle (Draft/Published)
- **Video fields**: YouTube URL input, thumbnail auto-preview
- **Infographic fields**: Web image upload, printable image upload, thumbnail preview
- **Article fields**: Background image upload, Tiptap rich text editor for body
  - Tiptap toolbar: headings, bold, italic, underline, lists, blockquote, link, image upload, text alignment
  - Image upload button triggers `POST /api/admin/images/upload`, inserts returned URL
  - Editor saves both `getJSON()` and `getHTML()` on form submit

**Page layout editor (`/admin/layout`):**
- Featured card picker (search/select from published cards), preview of the hero
- Section list: ordered rows, each tied to a tag, with heading override and max cards fields
- Add section (pick a tag), reorder via drag-and-drop or up/down buttons, remove section

**Deliverable:** Admin can manage tags, create/edit all card types including rich text articles, and configure the homepage layout.

---

### Phase 5: Public Site Redesign (frontend)

Replace the static homepage with the data-driven layout. Add topic pages and update content viewers.

**Navigation bar:**
- Fetch all tags from `GET /api/tags`
- Render as topic section links (taxonomy-style)
- Mobile-responsive nav (hamburger or expandable)

**Homepage (`/`):**
- Fetch layout from `GET /api/pages/home/layout`
- **Featured card hero**: Full-width section at top — background image, overlaid title + description, CTA button linking to `/content/:slug`
- **Tag sections**: For each section in layout, render heading + grid of card thumbnails (up to `max_cards`). "See all" link to `/topics/:tag-slug`
- Remove static `infographics` and `youtubeVideos` array imports

**Topic page (`/topics/:tag-slug`):**
- Fetch tag info + cards from `GET /api/tags/:slug/cards`
- Tag name + description as page header
- Grid of all published card thumbnails for that tag
- No pagination (load all)

**Content viewer (`/content/:slug`):**
- Fetch card from `GET /api/content/cards/:slug`
- Render based on `card_type`:
  - **VIDEO**: YouTube embed + title + description (similar to current viewer)
  - **INFOGRAPHIC**: Full-size image + print button (similar to current viewer)
  - **ARTICLE**: Background image as hero, `body_html` rendered via `[innerHTML]` with sanitization
- Related cards footer: other cards sharing the same tags

**Shared card thumbnail component:**
- Reusable across homepage sections, topic pages, and related cards
- Thumbnail image, title, description, type icon/badge
- Links to `/content/:slug`

**Cleanup:**
- Delete `frontend/src/app/resources/infographics.ts`
- Delete `frontend/src/app/resources/youtube-videos.ts`
- Remove old `infographic-card` and `youtube-video` card components (replaced by shared card component)
- Remove old viewer components (replaced by unified content viewer)

**Deliverable:** Public site is fully data-driven. Homepage, topic pages, and content viewers all powered by the API.

---

### Phase 6: Content Migration & Polish

Migrate existing content into the new system and finalize.

**Content migration:**
- Seed the 4 existing infographics as INFOGRAPHIC cards via Liquibase or a migration script
- Seed the 2 existing YouTube videos as VIDEO cards
- Upload infographic images from `frontend/public/assets/infographics/` to S3
- Create initial tags (based on existing content topics)
- Tag the seeded cards
- Configure initial homepage layout (pick a featured card, set up sections)

**Polish:**
- Loading states for API-driven pages
- Error handling (card not found, API unavailable)
- SEO: meta tags, Open Graph tags derived from card data
- Remove `frontend/public/assets/infographics/` directory (images now in S3)

**Deliverable:** Existing content migrated, site fully operational on the new CMS.

---

### Phase dependency graph

```
Phase 1: Foundation
  ↓
Phase 2: Tags & Content Cards ──→ Phase 3: Page Layout
  ↓                                   ↓
Phase 4: Admin UI (depends on 2 + 3)
  ↓
Phase 5: Public Site Redesign (depends on 2 + 3, can start in parallel with 4)
  ↓
Phase 6: Content Migration & Polish (depends on all above)
```

Note: Phases 4 and 5 can be worked on in parallel once Phases 2 and 3 are complete — the admin UI and public site consume the same APIs independently.

---

## 11. Content Migration Plan

1. **Seed existing content**: Migrate the 4 infographics and 2 videos into `content_cards` table
2. **Upload images to S3**: Move infographic assets from `frontend/public/assets/infographics/` to S3, generate thumbnails
3. **Create initial tags**: Based on existing content topics
4. **Tag seeded cards**: Assign tags to migrated content
5. **Configure homepage layout**: Set featured card, create initial tag sections
6. **Remove static resources**: Delete `infographics.ts`, `youtube-videos.ts`, and `public/assets/infographics/`

---

## 12. Security & Data Integrity

### XSS protection for article body HTML

Article `body_html` is rendered on public pages. To prevent XSS:
- **Server-side sanitization on save**: Use OWASP Java HTML Sanitizer to allowlist only tags/attributes that Tiptap produces (headings, paragraphs, bold, italic, underline, images, links, lists, blockquotes, text alignment). Malicious content is stripped before it reaches the database.
- **Frontend**: Can safely use `bypassSecurityTrustHtml()` since HTML is pre-sanitized server-side. Angular's default sanitizer would be too aggressive for rich content (strips valid formatting).

### Slug generation

Slugs are auto-generated from the card title on creation:
- Lowercase, replace spaces with hyphens, strip non-alphanumeric characters
- On collision, append `-2`, `-3`, etc.
- Slug is editable by the admin but must remain unique (enforced by DB unique constraint)

---

## 13. Implementation Notes for Sonnet

### JWT role claim
The current `JwtService` must be updated in Phase 1 to include the user's `role` as a claim in the JWT payload. The frontend `adminGuard` reads this claim from the decoded token to gate `/admin` routes without an extra API call.

### sort_order is per-tag
Card ordering is per-tag, not global. The `content_card_tags` join table should include a `sort_order` column:
```sql
CREATE TABLE content_card_tags (
    card_id    BIGINT NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
    tag_id     BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    sort_order INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (card_id, tag_id)
);
```
Drop `sort_order` from the `content_cards` table. This allows a card to appear in different positions within different tag sections.

### New Gradle dependencies (Phase 1)
```groovy
implementation 'net.coobird:thumbnailator:0.4.20'
implementation 'software.amazon.awssdk:s3:2.25+'
implementation 'com.googlecode.owasp-java-html-sanitizer:java-html-sanitizer:20240325.1'
```

### S3 configuration
Add to `application.yml`:
```yaml
storage:
  s3:
    bucket: highschoolhowto-site
    region: us-west-2
    upload-prefix: uploads/
```
AWS credentials: IAM role in prod, environment variables in Docker (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

### Existing features preserved
Focus Board (tasks), account security, and auth flows are **unchanged** in v2.0. The public site redesign in Phase 5 replaces the homepage and adds new pages but must not alter or remove the existing `/account/dashboard`, `/account/security`, or `/auth/*` routes and components.

### Orphaned S3 images
When article edits remove images from the body, old images remain in S3. Accepted tradeoff for launch — storage cost is negligible at this scale. Future cleanup: diff `body_json` before/after save, delete removed image URLs.

### `updated_at` auto-update
Use JPA `@PreUpdate` lifecycle callback on `ContentCard` entity to set `updated_at` automatically. No DB trigger needed.

---

## 14. Open Questions

### Resolved
- [x] ~~Which option to proceed with?~~ → **Option A: Built-in CMS**
- [x] ~~Are there content types beyond infographics and videos?~~ → **Yes: Article (rich text with images)**
- [x] ~~Should content cards support rich text?~~ → **Yes, for Article card type body**
- [x] ~~Categories/tags for content?~~ → **Yes: admin-managed tags as the core organizing primitive**
- [x] ~~Homepage layout?~~ → **Admin-configurable: featured card + ordered tag-based sections**

### Open
- [x] ~~Rich text editor choice~~ → **Tiptap** (MIT, via `ngx-tiptap`)
- [x] ~~Article body storage~~ → **Store both**: `body_json` (JSONB, editor source of truth) + `body_html` (TEXT, pre-rendered for public site)
- [x] ~~Should article images be resized/optimized on upload, or stored as-is?~~ → **Store originals as-is with validation (10MB max, MIME type check). Generate 400px-wide thumbnails server-side via `thumbnailator`. No full-image resizing.**
- [x] ~~Content scheduling?~~ → **No. Two statuses only: DRAFT and PUBLISHED.**
- [ ] Should the public content API be cached at the CDN layer?
- [x] ~~Featured card rendering?~~ → **Full-width hero**. Background image spans full page width, title and description overlaid, CTA button to view the content. Visually dominant at the top of the homepage above topic sections.
- [x] ~~Nav bar tags?~~ → **All tags displayed as a taxonomy of sections.** Clicking a tag navigates to `/topics/:tag-slug`, which shows a grid of card thumbnails for that tag.
- [x] ~~Can a card exist without any tags?~~ → **No. At least one tag required. Admin editor validates this before save.**
- [x] ~~Topic page pagination?~~ → **No pagination for now.** Load all published cards for the tag. Can add pagination later if a tag grows to 50+ cards.
- [x] ~~Admin UI structure?~~ → **Lazy-loaded Angular module behind `/admin`.** Shares auth, services, and styles with the public site. Admin code only downloaded when an admin navigates to `/admin`.
