# High School How To — v8.0 Design Document

**Status**: Design open — collecting scope
**Last updated**: 2026-04-25
**Scope**: Upgrades to admin functionality

## Table of Contents

1. [Overview](#1-overview)
2. [Problems](#2-problems)
3. [Design Goals](#3-design-goals)
4. [Infographic image upload](#4-infographic-image-upload)
5. [Admin role idempotency](#5-admin-role-idempotency)
6. [Content sync facility](#6-content-sync-facility)
7. [Template task editor (locker-style)](#7-template-task-editor-locker-style)
8. [Multi-image infographics](#8-multi-image-infographics)
9. [Database Changes](#9-database-changes)
10. [Backend Changes](#10-backend-changes)
11. [Frontend Changes](#11-frontend-changes)
12. [Testing Requirements](#12-testing-requirements)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Overview

v8.0 focuses on **upgrades to admin functionality** — making it faster and less error-prone to author content and manage the site. The v7 release closed out the auth and locker-UI initiatives; the admin tools have not had a focused pass since v5, and several rough edges have accumulated as the content library has grown.

This release is a quality bundle: each change is small, but together they shorten the loop for adding content, reduce the number of places that need to know an admin email, and remove dead/manual steps.

---

## 2. Problems

| Problem | Details |
|---|---|
| Infographics require pre-hosted URLs | The admin content editor only accepts text URLs for `mediaUrl` and `printMediaUrl` on INFOGRAPHIC cards. Authors must upload images out-of-band (S3 sync, manual URL composition) before they can save a card. Thumbnail and cover image already have inline upload — this is an oversight, not a design choice. |
| Admin role promotion is fragile | The Liquibase changeset that promotes admin emails (`v2-admin-upsert-0019.sql`) used `runOnChange:true`, meaning it only re-runs when the file content changes. New admin sign-ups after the changeset's last execution are not promoted automatically. Caught locally on 2026-04-25 — `ron@blert.com` signed up and remained `USER` until manually updated. |
| No way to mirror prod content locally | Admin-authored content (cards, tags, page layouts, quotes, badges, recommended shortcuts) lives only in the prod RDS database. Local environments start from a sparse Liquibase seed, so admin tooling cannot be exercised against realistic data. There is also no checked-in backup — losing the prod DB would lose every admin-authored row. The existing `frontend/scripts/pull-media.sh` covers the curated `./media/` directory but stops at the database boundary. |

---

## 3. Design Goals

- **One-click media authoring** — adding an infographic should not require any tool outside the admin editor.
- **Idempotent operational state** — site-level invariants (admin emails, default tags, etc.) should be expressed in code that converges on every deploy rather than as one-shot migrations.
- **Mirror existing patterns** — extend the existing image-upload plumbing rather than introducing parallel mechanisms.

---

## 4. Infographic image upload

### Current state

`content-editor.component` exposes upload buttons for `thumbnailUrl` and `coverImageUrl` (both call `api.adminUploadImage(file)` against `POST /api/admin/images/upload`). For INFOGRAPHIC cards, the `mediaUrl` and `printMediaUrl` fields are **text input only** — no upload UI.

### Proposed change

Extend the existing `uploadFile(event, field)` method on the editor component to accept `'mediaUrl' | 'printMediaUrl'` in addition to the two thumbnail/cover fields. Add Upload buttons next to the two infographic URL inputs that fire the same handler. Reuse the existing `/api/admin/images/upload` endpoint and the existing `uploadingImage` signal for loading state.

### Out of scope

- Media library / browser for already-uploaded images. Keeping the editor a one-shot upload tool, not a CMS asset manager.
- Image cropping or transforms. Authors continue to provide their own crops.
- Drag-and-drop into the URL field. Click-to-upload is sufficient and matches the thumbnail/cover pattern.

### Files touched

- `frontend/src/app/admin/content/content-editor.component.html` — two new Upload buttons in the INFOGRAPHIC media section
- `frontend/src/app/admin/content/content-editor.component.ts` — widen the `uploadFile` field type union; no new method needed

### Tests

- Frontend unit test on the editor: simulate a file change event with `field='mediaUrl'`, assert `adminUploadImage` is called and `form.mediaUrl` is set from the response.
- Same for `printMediaUrl`.

---

## 5. Admin role idempotency

### Current state

`v2-admin-upsert-0019.sql` uses `runOnChange:true`. Liquibase only re-runs the changeset when the file's checksum changes. Admins who sign up after the most recent file edit are not promoted on subsequent deploys.

### Proposed change (already applied locally, not yet committed)

Switch the directive to `runAlways:true`. The UPDATE is conditional on `role != 'ADMIN'`, so re-running on every startup is a no-op for already-promoted accounts and immediately corrects any new sign-ups.

This was applied locally on 2026-04-25 alongside a one-shot UPDATE to promote `ron@blert.com` against the running container. The committed change deploys the same fix to prod.

### Files touched

- `api/src/main/resources/db/changelog/v2-admin-upsert-0019.sql` — directive only

### Tests

No new tests — the change is a Liquibase directive; integration tests already exercise app startup against a fresh DB.

---

## 6. Content sync facility

### Current state

There is no facility to mirror production content into a local environment, and no checked-in backup of admin-authored rows. Curated infographic media in `./media/` is already mirrored from `s3://highschoolhowto/prod/media/` via `frontend/scripts/pull-media.sh`, but the database side and the admin-uploads bucket are not covered.

### Source-of-truth model

Production DB and S3 remain the source of truth. Admin authors directly against prod through the admin UI. A pair of scripts turn the repo into a versioned snapshot of that source of truth:

```
┌─────────┐  export-content.sh    ┌────────────────┐  import-content.sh   ┌──────────────┐
│ Prod DB │ ────────────────────► │  ./data/*.json │ ───────────────────► │  Local DB    │
│  + S3   │                       │  ./media/*     │  --target local      │  (or fresh   │
└─────────┘                       └────────────────┘  --target prod       │   prod DB    │
                                                                          │   for DR)    │
                                  (committed to git)                      └──────────────┘
```

**Typical flow**: admin authors via prod admin UI → run `export-content.sh` → review the JSON diff → commit `data/` and any new image files → other devs pull and run `import-content.sh --target local` to refresh.

**Disaster recovery**: against a freshly-provisioned prod DB and empty S3 buckets, run `import-content.sh --target prod` to restore the entire content library from the most recent commit. The repo *is* the backup.

### Data layout

A new top-level `data/` directory mirrors the placement of `media/` at the repo root:

```
data/
  content-cards/
    how-to-study.json              # filename = card slug
    infographic-time-management.json
  tags/
    study-skills.json              # filename = tag slug
  page-layouts/
    home.json                      # filename = layout name
    about.json
  quotes/
    quotes.json                    # single file (rows have no slug)
  badges/
    first-task.json                # filename = badge code
  recommended-shortcuts/
    shortcuts.json                 # single file
```

**Granularity rule**: one file per row when the row has a stable human-readable key (`slug`, `name`, `code`); one file per table otherwise.

### File contents

UUIDs on every row are preserved verbatim. FK references — page-layout sections pointing at cards, `content_card_links` source/target, bookmarks, earned-badge references — depend on stable IDs across export/import cycles. Stripping UUIDs would make the disaster-recovery path useless.

Child join rows are denormalized into the parent file so a reviewer sees the full change in one diff. Tag refs use slug strings (not UUIDs) inside the embedded list, so a tag rename only touches the tag's own file plus a string-search across cards. Example:

```json
{
  "id": "f7a1c3e0-...",
  "slug": "how-to-study",
  "title": "How to Study Effectively",
  "type": "ARTICLE",
  "status": "PUBLISHED",
  "mediaUrl": "https://highschoolhowto.com/media/articles/study-cover.jpg",
  "tags": ["study-skills", "freshman-survival"],
  "links": [
    { "targetSlug": "time-management", "label": "Pair with..." }
  ],
  "tasks": []
}
```

Import resolves slug refs back to the corresponding tag UUIDs.

### Tables in scope

| Direction | Tables |
|---|---|
| Synced (admin-authored) | `content_cards`, `content_card_links`, `content_card_tags`, `content_card_tasks`, `tags`, `page_layouts`, `page_layout_sections`, `quotes`, `badges`, `recommended_shortcuts` |
| Skipped (user-owned) | `app_users`, `audit_events`, `email_verification_tokens`, `password_reset_tokens`, `refresh_tokens`, `bookmarks`, `bookmark_lists`, `tasks`, `task_lists`, `notes`, `timers`, `locker_layout`, `stickers`, `shortcuts`, `color_palette_entry`, `user_app_preferences`, `earned_badges` |

### Image buckets

There are two S3 locations holding referenced images, and the sync facility must handle both:

| Source | Local mirror | Notes |
|---|---|---|
| `s3://highschoolhowto/prod/media/` (curated) | `./media/` (excluding `uploads/`) | Already mirrored by `pull-media.sh`. |
| `s3://highschoolhowto-site/uploads/` (admin-uploaded via `S3StorageService`) | `./media/uploads/` | New mirror. Holds the four upload subfolders: `images/`, `thumbs/`, `content/`, `badges/`. |

Keeping both under the existing `./media/` tree means the frontend dev server's existing `/media/**` mount continues to serve everything without additional wiring. Bucket consolidation (moving admin uploads under `s3://highschoolhowto/prod/media/uploads/`) would simplify this further but is deferred — out of scope for v8.

### Scripts

| Script | Reads | Writes |
|---|---|---|
| `scripts/export-content.sh` | Prod DB + both S3 buckets | `./data/*.json` + `./media/*` (curated and `uploads/`) |
| `scripts/import-content.sh --target local` | `./data/*.json` + `./media/*` | Local Docker Postgres only — media URLs in JSON resolve to prod CDN/S3 directly |
| `scripts/import-content.sh --target prod` | `./data/*.json` + `./media/*` | Fresh prod RDS + `aws s3 sync` to both prod buckets |

**Safety rails on import**:

- `--target` is required (no default) — eliminates accidental writes from a typo.
- Each invocation prints the resolved DB host and S3 buckets and prompts for typed confirmation (`type 'local' to continue` / `type 'prod' to continue`). The `prod` prompt additionally requires re-typing the host name.
- Truncate + insert wrapped in a single transaction.

**Insert order** is fixed by FK dependency:
`tags` → `content_cards` → `content_card_tags` → `content_card_links` → `content_card_tasks` → `badges` → `recommended_shortcuts` → `quotes` → `page_layouts` → `page_layout_sections`.

**Credentials**:
- Export uses a read-only Postgres role on the prod RDS instance — provisioned one-time (captured in a new helper alongside `api/scripts/aws-apprunner-setup.sh`). Connection string lives in `~/docker.env`, not in the repo.
- `--target prod` import uses the standard prod write credentials and is gated by the typed prompt.

### Out of scope

- Admin UI button to trigger sync. Shell-script-only is sufficient and avoids exposing dump capabilities through the web tier.
- Incremental / delta sync. Full snapshot is small enough that the complexity isn't justified.
- Syncing user-owned tables — local users, tasks, and bookmarks remain isolated.
- Automatic commit. The author reviews the JSON diff before committing.
- Bucket consolidation between curated media and admin uploads. Logged as a follow-up.

### Files touched

- `scripts/export-content.sh` — new
- `scripts/import-content.sh` — new
- `data/` — new directory tree, populated by the first export
- `api/scripts/provision-readonly-db-user.sh` — new one-time helper for the prod read-only role
- `CLAUDE.md` — add a "Content sync" subsection under Architecture documenting the two scripts, the source-of-truth model, and when to commit `data/`

---

## 7. Template task editor (locker-style)

### Current state

The TODO_LIST branch of `content-editor.component` (lines 133–194) edits a card's template tasks with a numbered `<ul>` of bare text inputs, `↑ ↓ 🗑` buttons per row, two raw `<input type="color">` controls for background and text, and a separate "Title" field at the top of the editor. It works but it looks nothing like the locker to-do app that the template eventually becomes — authors have to mentally translate between the two while editing.

### Proposed change

Rebuild the TODO_LIST branch of the editor to visually and behaviorally mirror the locker detail view (`pages/locker/apps/todo-app.component`), reusing the small shared widgets the locker already exposes (`app-inline-title-edit`, `app-swatch-picker`, `app-confirm-dialog`) but keeping the editor's own state binding to `templateTasks()`. No shared parent component — that's deferred to a future release; the lighter rebuild is enough to give authors a true preview while keeping the v7 locker code path untouched.

| Locker feature | Carry to admin | How |
|---|---|---|
| Colored card with `backgroundColor` / `textColor` driving the surface | Yes | Wrap the template-task list in a colored card; preview updates as colors change |
| `app-inline-title-edit` for the list title | Yes | Inline-edit the card's `title` at the top of the colored card when `cardType === 'TODO_LIST'`. The standalone "Title" field at the top of the editor is hidden for this card type to avoid two title controls |
| `cdkDrag` rows with `⋮⋮` handle | Yes | Replaces `↑ ↓` buttons. Reuses `cdkDragLockAxis="y"` and the locker's drag-handle styles |
| `app-inline-title-edit` per task | Yes | Replaces the bare `<input>` per row |
| `app-swatch-picker` color overlay | Yes | Replaces the two raw `<input type="color">` controls. Two swatch buttons in the card header — one for background, one for text — open the same overlay component the locker uses |
| `app-confirm-dialog` on delete | Yes | Replaces the immediate-delete `🗑` |
| `+` add-task row at the bottom | Yes | Restyled to match the locker's `todo-app__add-task` |
| Per-task checkbox | **No** | Templates have no completion state |
| Due-date badge / popover | **No** | Templates have no due dates in the schema |
| Green ✓ "done" header button | **No** | Admin save lives outside the card, on the editor's existing Save button |
| Sort mode toggle (Name / Custom) | **No** | Templates only have a single canonical order — the one the author defines |

### Constraints

- The locker app's "done" button styling rule (CLAUDE.md → Locker app "done" button) does not apply here — the admin Save button is not exiting a detail view back to a list; it's saving a draft.
- Title is authoritative on `content_card.title`. Hiding the standalone Title field for TODO_LIST cards must keep `form.title` in sync with the inline edit so the existing save path still posts the right value.
- The 50-task max already enforced in the editor stays. The `+` add row should disable / hide once the limit is reached and surface the existing inline error.

### Files touched

- `frontend/src/app/admin/content/content-editor.component.html` — replace the TODO_LIST branch (lines 133–194) with the locker-style markup
- `frontend/src/app/admin/content/content-editor.component.ts` — add the small handlers needed (drag-drop reorder, inline-title-edit binding, swatch-picker open/close state). No service or API changes
- `frontend/src/app/admin/content/content-editor.component.scss` — pull in the locker SCSS tokens (or import the relevant partial) so the visual treatment matches; remove the now-unused `.template-task-list` and `.template-task-add` rules

### Out of scope

- Extracting a shared presentational `TodoListView` component used by both locker and admin. Logged as a follow-up.
- Adding due-date or per-task completion to the template schema.
- Restyling other admin editors (article, infographic, video) — only the TODO_LIST branch changes.

---

## 8. Multi-image infographics

### Current state

`content_cards.media_url` and `print_media_url` are scalar `VARCHAR(2000)` columns — one image per infographic. The viewer (`content-viewer.component.html` lines 99–123) renders a single `<img [src]="card.mediaUrl">` inside `.infographic-panel`, and the lightbox (lines 247–272) shows that same single image with zoom and pan. Authors who want to publish a multi-step infographic have to combine the images into one tall composite externally.

### Proposed change

Allow an infographic to hold an ordered list of images. The viewer renders them as a horizontal carousel with native swipe on mobile and prev/next chevrons on desktop. Single-image infographics keep their current chrome — no carousel UI appears unless there are 2+ images.

### Schema

Add a new `media_urls jsonb` column on `content_cards`. Each entry is a `{ url, printUrl, alt }` object:

```jsonc
[
  { "url": "https://.../img-1.jpg", "printUrl": "https://.../img-1-print.pdf", "alt": "Step 1" },
  { "url": "https://.../img-2.jpg", "printUrl": null, "alt": "Step 2" }
]
```

A single Liquibase changeset adds the column and back-fills it from the existing scalar columns: any row with a non-null `media_url` becomes a one-element array `[{ url: media_url, printUrl: print_media_url, alt: null }]`. The `--rollback` drops the column.

The legacy `media_url` and `print_media_url` columns stay populated as a mirror of the **first** entry on every save. This keeps thumbnails, share-card scrapers, and any future readers that haven't migrated working unchanged. A follow-up release can drop the columns once everything reads `media_urls`.

### Backwards compatibility

Every reader of the legacy scalar fields continues to work because the `mediaUrls[0]` ↔ `mediaUrl` mirror is maintained on save:

| Reader | Field used | Survives via |
|---|---|---|
| Admin content list thumbnail | `card.thumbnailUrl \|\| card.mediaUrl` | First-entry mirror |
| Topic page preview (`topic-page.component.ts`) | `card.mediaUrl` | First-entry mirror |
| How-to page preview (`how-to-page.component.ts`) | `card.mediaUrl` | First-entry mirror |
| VIDEO branch of viewer | `card.mediaUrl` | Untouched — VIDEO never uses `mediaUrls` |
| Standalone `infographic-viewer.component` | `graphic.webImage` / `printableImage` | Reads a hardcoded static array, not the DB — unaffected |

Two rolling-deploy windows need explicit defensive handling on top of the mirror:

- **Old admin client → new API**: a browser running an older admin bundle posts only `mediaUrl` / `printMediaUrl`, with no `mediaUrls`. Without a server-side rule, the JSONB column would silently stop updating for that card. **Fix**: in `ContentCardService` save, when the request has no `mediaUrls` but has `mediaUrl`, synthesize `mediaUrls = [{url: mediaUrl, printUrl: printMediaUrl, alt: null}]` server-side. Symmetric to the inverse mirror.
- **Old API → new frontend**: a cached API response (or a brief rolling-deploy window) returns no `mediaUrls`. Without a fallback, the new viewer renders an empty carousel. **Fix**: in the frontend response handler, treat missing/empty `mediaUrls` as `[{url: mediaUrl, printUrl: printMediaUrl, alt: null}]` when the legacy field is present. Single-entry path then takes over and renders identically to today.

Together with the Liquibase back-fill, this gives a fully forward / backward compatible deploy: existing rows continue to render unchanged, and every combination of old-vs-new admin client + old-vs-new API + old-vs-new viewer produces a usable result.

### Per-image print URLs

Each entry has its own optional `printUrl`. The current viewer's single "Download / Print" button moves into the lightbox toolbar and reflects the **currently-shown** image — disabled when that image has no `printUrl`. This matches the existing per-image pattern rather than collapsing into a "download all" action.

### Admin UI

Replace the two single-URL fields in the INFOGRAPHIC branch of the editor with a list editor that follows the same pattern as the template-task editor from section 7:

- One row per image: image preview thumbnail, Upload button (image), Upload button (print version), alt-text input, drag handle (`⋮⋮`) for `cdkDrag` reorder, delete with `app-confirm-dialog`
- "+ Add image" row at the bottom
- On save, the editor sets the legacy `mediaUrl` / `printMediaUrl` fields from `mediaUrls[0]` automatically — authors don't see the legacy fields at all

### Viewer carousel

A small inline carousel built on native CSS — no third-party library. The existing `.infographic-panel` becomes a horizontal scroll track; each image is one snap-aligned slide that fills 100% of the panel width. When `mediaUrls.length === 1` the panel renders identically to today — no chrome appears.

**Mobile (no-hover input)**

- Native horizontal scroll with `scroll-snap-type: x mandatory` and `scroll-snap-align: center` per slide. Swipe with momentum lands cleanly on a single slide every time.
- No chevron buttons — wasted thumb space; swipe is the obvious gesture.
- Below the image: a compact dot strip `●○○○` for ≤8 images, a numeric `2 / 17` for more. Tapping a dot jumps to that slide.
- Image stays inside the panel — no full-bleed escape — so vertical scroll on the page is unaffected.

**Desktop (hover-capable input)**

- Same scroll-snap track, plus prev / next chevron buttons absolute-positioned over the left and right edges of the panel.
- Chevrons fade to ~30% opacity by default, snap to 100% on panel hover. The first chevron is hidden on slide 0; the last is hidden on the last slide. **No wrap** — for step-by-step infographics, hitting the end is meaningful, and looping would erase that signal.
- Click-and-drag on the track also scrolls (free behavior of `overflow-x: auto`); snap reasserts on release.
- `←` / `→` arrow keys advance when the panel has keyboard focus. `Tab` moves into the panel before passing through to chevrons / Print.

**Inline Print button**

The "Download / Print" button stays below the image but tracks the **currently visible** image. If that image has no `printUrl`, the button is hidden (not disabled) — the inline view should feel light. The lightbox toolbar is where the always-visible disabled state lives.

### Lightbox

When `mediaUrls.length > 1` the lightbox becomes a multi-image viewer; otherwise it renders identically to today.

**Trigger**

Click the inline image — same as today. The lightbox opens on the **current carousel index**, not always on slide 0. Swipe to image 3 inline, click to zoom, you arrive in the lightbox at image 3.

**Toolbar**

Today: `[− zoom% +] [↺ fit] [✕ close]`. With multi-image:

`[← prev] [2 / 4] [next →]   [− zoom% +] [↺ fit] [Print]   [✕ close]`

- Prev / next and the counter only render when `mediaUrls.length > 1`.
- `2 / 4` doubles as a where-am-I indicator — clearer than dots in a maximized viewer.
- Print is enabled when the current image has a `printUrl`, disabled (with tooltip "no print version available") otherwise — so the control's existence is stable across slides even if some lack a print version.

**Zoom interacts with image change**

When the index changes (prev / next / swipe), zoom resets to fit and pan resets to centered. Carrying zoom across images breaks expectations — a pan position from image 1 makes no sense at image 2's resolution / aspect ratio. Concretely: `lightboxZoom` and `lightboxPan` reset on every index change.

**Keyboard**

- `←` / `→` — prev / next image
- `Esc` — close (existing)
- `+` / `-` — zoom in / out (existing)
- `0` — reset to fit (proposed addition; falls out of the existing reset action for free)

**Mobile gesture disambiguation inside the lightbox**

Swipe is overloaded — it can mean "next image", "pan within zoomed image", or "dismiss lightbox". Rules:

| Zoom state | Gesture | Action |
|---|---|---|
| Zoom == 1 (fit) | Horizontal swipe, dominant axis X, distance > 80px | Prev / next image |
| Zoom == 1 (fit) | Vertical swipe, dominant axis Y downward, distance > 120px | Close lightbox |
| Zoom == 1 (fit) | Anything below thresholds | Treated as a tap |
| Zoom > 1 | Any drag | Pan within image (existing) |
| Any zoom | Pinch | Zoom (existing) |

**Loading**

The active inline slide uses `loading="eager"`; off-screen slides use `loading="lazy"`. In the lightbox, also pre-fetch index ±1 so prev / next feels instant — but no further out, to avoid pulling tens of MB of high-res images for a long deck.

### Accessibility

- Carousel root: `role="region"` `aria-roledescription="carousel"` `aria-label="Infographic images"`.
- Each slide: `role="group"` `aria-roledescription="slide"` `aria-label="Image 2 of 4: <alt>"`.
- A visually-hidden `aria-live="polite"` element announces "Showing image 2 of 4" on index change.
- Lightbox keeps the existing `role="dialog"` `aria-modal="true"`, with `aria-label` updated to include the current "image 2 of 4".

### Files touched

- `api/src/main/resources/db/changelog/v8-multi-image-infographics-XXXX.sql` — new changeset adds `media_urls jsonb`, back-fills from scalar columns, with `--rollback`
- `api/src/main/java/com/highschoolhowto/content/card/ContentCard.java` — new `mediaUrls` field with a JSON converter
- `api/src/main/java/com/highschoolhowto/content/card/ContentCardResponse.java`, `ContentCardAdminResponse.java`, `UpsertContentCardRequest.java` — add `mediaUrls` to the wire shape
- `api/src/main/java/com/highschoolhowto/content/card/ContentCardService.java` — on save, mirror `mediaUrls[0]` into the legacy scalar fields
- `frontend/src/app/core/models/content.models.ts` — new `MediaUrlEntry` type, add `mediaUrls: MediaUrlEntry[]` to the response and request models
- `frontend/src/app/admin/content/content-editor.component.{html,ts,scss}` — list editor for the INFOGRAPHIC branch; legacy URL inputs removed
- `frontend/src/app/pages/content-viewer/content-viewer.component.{html,ts,scss}` — carousel + lightbox-as-carousel rewrite
- `frontend/src/app/core/services/content-api.service.ts` — defensive read fallback that synthesizes `mediaUrls` from legacy `mediaUrl` / `printMediaUrl` when the API response is missing the new field (rolling-deploy + cached-response window)

### Out of scope

- Per-image captions beyond `alt`. Authors can use the article body for per-step prose if needed.
- Auto-generating per-image print URLs (e.g. PDF from the image). Authors continue to provide them.
- Removing the legacy scalar columns. Logged as a follow-up release.
- Changing the standalone `infographic-viewer.component` page (older code path superseded by `content-viewer`).
- Pinch-to-zoom on the inline carousel. Zoom is reserved for the lightbox to keep inline gestures unambiguous.
- Thumbnail strip in the lightbox. Prev / next + counter is enough; a thumb strip starts to compete with the image.
- Autoplay / auto-advance.
- Carousel looping at first / last slide.

---

## 9. Database Changes

| Change | File | Notes |
|---|---|---|
| Switch admin-upsert to `runAlways` | `v2-admin-upsert-0019.sql` | No schema change; directive only. |
| Add `media_urls jsonb` to `content_cards` and back-fill from scalar columns | `v8-multi-image-infographics-XXXX.sql` (new) | Carries `--rollback` that drops the column. Legacy `media_url` / `print_media_url` stay in place as back-compat mirrors. |

---

## 10. Backend Changes

| Change | Component / File |
|---|---|
| Add `mediaUrls` field to `ContentCard` entity with JSON conversion, and propagate through admin / public response and request DTOs | `ContentCard.java`, `ContentCardResponse.java`, `ContentCardAdminResponse.java`, `UpsertContentCardRequest.java` |
| On save, mirror `mediaUrls[0]` into legacy `mediaUrl` / `printMediaUrl` so back-compat readers stay consistent | `ContentCardService.java` |
| On save, when the request has no `mediaUrls` but has legacy `mediaUrl`, synthesize `mediaUrls = [{url: mediaUrl, printUrl: printMediaUrl, alt: null}]` server-side. Handles old admin clients posting against the new API. | `ContentCardService.java` |

The image upload endpoint already supports the new use case (each entry just calls `/api/admin/images/upload` independently). The content sync facility uses external scripts (psql, aws s3); the template task editor is frontend-only.

---

## 11. Frontend Changes

| Change | Component / File |
|---|---|
| Add Upload buttons for infographic `mediaUrl` and `printMediaUrl` | `content-editor.component.html`, `content-editor.component.ts` |
| Rebuild TODO_LIST branch of editor to mirror locker detail view | `content-editor.component.{html,ts,scss}` |
| Replace single-image fields in INFOGRAPHIC branch of editor with multi-image list editor | `content-editor.component.{html,ts,scss}` |
| Render INFOGRAPHIC as horizontal carousel (CSS scroll-snap + chevrons + indicator) when `mediaUrls.length > 1`; lightbox becomes a multi-image viewer | `content-viewer.component.{html,ts,scss}`, `content.models.ts` |
| Defensive read fallback: when an API response has no `mediaUrls` but has legacy `mediaUrl`, synthesize a one-entry list client-side. Handles cached responses and rolling-deploy windows where an old API still serves the new frontend. | `content-api.service.ts` (or wherever card responses are post-processed) |

The two `content-editor.component` items in the INFOGRAPHIC branch (upload buttons from §4 and the multi-image rebuild from §8) collapse into a single rebuild — the upload-button work is subsumed once the list editor lands.

---

## 12. Testing Requirements

**Infographic upload**
- Component unit test: file upload sets `form.mediaUrl` and `form.printMediaUrl` from the upload response.
- Manual smoke: create a new INFOGRAPHIC card end-to-end via the admin UI without touching S3 or the URL field manually.

**Content sync facility**
- Round-trip integration test: seed a local Postgres TestContainer, run `export-content.sh` against it, then `import-content.sh --target local` into a second TestContainer, and assert table-by-table row equality (UUID-stable). Wire as a Gradle task so CI catches FK-order regressions.
- Schema-coverage assertion: the export script declares its set of synced tables in a constant. The test compares that set against the live `information_schema.tables` minus the explicit "skipped" list, and fails if a new table is added without classifying it. Prevents silent drift when a future migration adds a content-bearing table.
- Manual smoke: starting from an empty `data/`, run `export-content.sh` against the local seed, verify the JSON tree renders sane filenames, then run `import-content.sh --target local` against a freshly-truncated DB and confirm the home page renders identically.

**Template task editor**
- Component unit tests on the TODO_LIST branch:
  - Inline title edit on the card surface updates `form.title`.
  - Inline task-description edit updates `templateTasks()` at the right index.
  - Drag-drop reorder produces the same final order as the existing `moveTemplateTask` would.
  - Swatch-picker selection updates `form.backgroundColor` / `form.textColor`.
  - Confirm-dialog deletion removes the task only after confirmation; cancel leaves it intact.
  - 50-task max disables the `+` add row and surfaces the existing inline error.
- Manual smoke: author a TODO_LIST card in the admin, save, then instantiate it from the locker — the resulting list should look identical to what the editor showed.

**Multi-image infographics**
- Backend integration test: create a card via `POST /api/admin/content` with two `mediaUrls` entries; assert (a) the row stores the JSONB array verbatim and (b) the legacy `mediaUrl` / `printMediaUrl` columns mirror entry [0]. Repeat with an update that reorders the entries — legacy columns track the new entry [0].
- Backend migration test: a row with non-null `media_url` before the v8 changeset has `media_urls = [{url, printUrl, alt:null}]` after, and a row with null `media_url` has `media_urls = []`.
- Backend back-compat test (old client → new API): post an upsert request that omits `mediaUrls` but sets `mediaUrl` and `printMediaUrl`. Assert the persisted row has `mediaUrls = [{url, printUrl, alt:null}]` derived server-side, and the legacy columns are unchanged.
- Frontend component test (admin editor): adding, reordering, and deleting image entries updates the form model; on save, the request payload contains both `mediaUrls` and the back-compat `mediaUrl` / `printMediaUrl` derived from `mediaUrls[0]`.
- Frontend component test (viewer): a card with one image renders identical markup to today (no carousel chrome); a card with three images renders the chevron buttons, the dot indicator, and supports `←` / `→` keyboard nav. Lightbox prev/next advances through entries; the print button enables/disables based on the current entry's `printUrl`.
- Frontend back-compat test (old API → new viewer): feed the response post-processor a card payload with `mediaUrls` missing/null but legacy `mediaUrl` populated. Assert the synthesized `mediaUrls` has one entry derived from the legacy fields, and the viewer renders the single-image path.
- Manual smoke: an existing single-image infographic still renders correctly post-deploy without re-saving (back-fill works); add a second image via admin and confirm carousel + mobile swipe.
- Cross-deploy manual smoke: with the new admin paired against the **previous** API (e.g. point local frontend at a stale API container), post a save and confirm the card still saves and renders. Repeat with the previous admin against the new API.

---

## 13. Implementation Phases

| Phase | Work | Gate |
|---|---|---|
| 1 | Commit the `runAlways` admin-upsert change (already pending in working tree) | Local verified; promote prod admin via deploy |
| 2 | Rebuild TODO_LIST editor branch in locker style | Tests pass; manual smoke shows admin preview matches locker render |
| 3 | Multi-image infographics — schema migration + back-fill, entity / DTO changes, save-side mirroring | Backend tests pass; existing single-image cards render unchanged after deploy |
| 4 | Multi-image admin editor (replaces the standalone upload-buttons phase from earlier scope) | Tests pass; manual smoke creates a multi-image card end-to-end |
| 5 | Multi-image viewer carousel + lightbox-as-carousel | Tests pass; mobile swipe verified on a real device |
| 6 | Provision read-only Postgres role on prod RDS via `api/scripts/provision-readonly-db-user.sh` | Role exists; credentials saved to `~/docker.env`; sanity `psql` connection succeeds |
| 7 | Implement `scripts/export-content.sh` | First export against prod produces a clean `data/` tree and refreshed `./media/uploads/`; JSON diff reviewed |
| 8 | Implement `scripts/import-content.sh --target local` + round-trip test | Round-trip integration test passes in CI; manual smoke against local DB succeeds |
| 9 | Implement `--target prod` path with typed-confirmation gating | Dry-run against a scratch RDS instance restores cleanly; safety prompts verified |
| 10 | Commit initial `data/` snapshot generated from current prod | PR review of the generated JSON tree |
| 11 | Cut v8.0.0 release (changelog, version bump, tag) | Both builds clean per release process |
