# Changelog

## [10.0.2] — 2026-06-20

### Locker — todo and notes UX polish

A focused round of usability improvements to the todo and notes locker apps.

**Navigation.** Both the todo and notes detail views now have a `‹` back chevron on the left side of the toolbar — the standard position users expect for "go back." The green ✓ done button remains on the right for users who prefer an explicit "save and close" action. Previously the green check was the only way back, which wasn't obvious to new users.

**Sort label.** The sort control pill in both apps now has a plain "Sort:" label to its left, making the purpose of the Name / Custom / Created / Updated buttons immediately clear.

**Todo editing.** Pressing space while typing in a task's description field no longer accidentally toggles the task's completed state. The keyboard shortcut is now suppressed when focus is inside an input element.

**Todo number toggle.** A `#` button in the todo detail view toolbar toggles position numbers on each task row, useful for referencing items by order.

**Inline edit button.** The commit (save) button in the inline text editor is now a small green circle with a white checkmark, consistent with the locker's done-button pattern. The pencil hint icon is now the ✏️ emoji and appears only when hovering over the row rather than always being faintly visible.

## [10.0.1] — 2026-05-26

### Signup bug fix — password validation, mobile name fields, URL sync

This patch fixes a registration bug that blocked users with a valid 10-character password from creating an account.

**Password validation.** The `RegistrationRequest` DTO had `@Size(min = 12)` while the `PasswordPolicyValidator` (and the frontend label) both said the minimum was 10 characters. A 10- or 11-character password passed frontend validation but was silently rejected by Spring bean validation with a generic 400 — surfacing as "We could not submit your signup. Please try again." The `@Size` constraint has been removed from all three password DTOs (`RegistrationRequest`, `ResetPasswordRequest`, `UpdatePasswordRequest`); `PasswordPolicyValidator` is now the single source of truth (minimum 10 characters, must include a number). The signup form label now reads "min 10 characters, including a number" and the frontend validator enforces the digit requirement so the form catches the error before submitting.

**Better error messages.** Signup errors from the backend that don't fit a known category (409 duplicate, 5xx server error) now surface the actual `detail` field from the Spring `ProblemDetails` response instead of the generic fallback. If the server returns field-level `violations`, those are shown instead. This means future validation failures arrive with a specific, actionable message rather than "We could not submit your signup."

**Mobile name fields.** The First name / Last name row on the signup form was overflowing to the right on narrow phones. The grid cells now have `min-width: 0` to prevent intrinsic-size overflow, all form inputs get `width: 100%; box-sizing: border-box`, and the two fields stack vertically on screens ≤ 480 px where side-by-side is too cramped.

**URL sync.** Switching between Sign In and Create Account modes on the login page now updates the browser URL to `/auth/login` or `/auth/signup` respectively (using `replaceUrl: true` so the mode switch doesn't add a browser history entry). Deep-linking to `/auth/signup` continues to open the signup form directly.

**Tests.** A new `PasswordPolicyValidatorTest` covers the minimum length, digit requirement, null input, and both violations together. Three new integration specs in `AuthFlowIntegSpec` lock in the contract: 10-character passwords are accepted, 9-character passwords return a 400 with the rule in `detail`, and no-digit passwords return a 400 with the rule in `detail`. Seven new frontend specs cover the digit validator, the 400-surfacing behavior, and the `extractProblemDetail` helper.

## [10.0.0] — 2026-05-25

### Home page redesign — corkboard post-its, socials nav, hamburger drawer, full-width how-to

v10 transforms the home page from a minimal landing screen into a richly styled corkboard with colorful post-it notes. The layout is built around four cards — a sky-blue tagline, a peach About card, a yellow How-To card, and a lavender Locker card — each attached to the board with randomly chosen tape or a colored thumbtack pin (red, blue, green, or yellow). Tape is weighted to appear roughly twice as often as any single pin color; the selection is random on each page load.

**Hero.** The logo sits in its own column on the left, spanning both the tagline and About cards. The tagline card carries the existing site description copy in the Miras Handwriting font at bold size. The About card is a full-card link to `/about` and renders the CMS-driven about content via the existing content slot system, with the card's chrome stripped so the peach post-it shell is the container.

**Promo row.** Below the hero, the How-To and Locker cards sit side by side (480 px each, centered). Both are full-card links. The How-To card lists the guide categories as a bullet list; the Locker card lists the study tools and includes a sign-in prompt for unauthenticated visitors. All headings across the four cards use Miras Handwriting at 1.8 rem with an underline treatment.

**Mobile layout.** On screens narrower than 768 px the hero collapses to a flex column: tagline, then the logo image displayed inline (centered, 180 px wide), then the About card. The How-To and Locker cards stack full-width below. The logo is rendered in normal document flow rather than as a background image, so it's fully visible between the two cards.

**Edit mode removed from home page.** The inline edit-mode bar and all `EditModeStore` / `SessionStore` wiring have been removed from the home page. The page is now read-only for all users; content changes go through the admin UI on other pages.

**Socials dropdown.** A "Socials" pill has been added to the desktop nav between Help and the CTA. It opens a dropdown with platform links fetched from the new `GET /api/social-links` API. The pill hides itself if no links are enabled. Initial platforms: Instagram and YouTube (seeded via Liquibase); TikTok is seeded with a null URL and stays hidden until set by an admin.

**Mobile hamburger drawer.** Below 768 px the nav collapses to a top bar (logo + primary CTA + ☰ button) with a right-side slide-in drawer. The drawer contains all nav links, an inline Socials expand, and admin-only items. A backdrop tap, ☰ button, Escape key, or any link tap closes the drawer.

**How-to page.** The how-to page's container no longer has a `max-width` cap, so the heading and card grid fill the full viewport width. The card grid column width was bumped from 200 px to 220 px minimum so cards use available space more effectively.

**Backend.** A new `social_links` table and REST API (`GET /api/social-links`, `GET/PUT /api/admin/social-links`) were added, along with a `home_layout_sections` table for the admin-configurable dynamic sections below the promo row. The `/api/social-links` endpoint was added to `SecurityConfig.permitAll()` so unauthenticated home page loads never trigger a login redirect.

## [9.1.0] — 2026-05-16

### Inline-authoring polish — edit UX, keyboard navigation, locker button, admin filters

This release rounds out the v9 inline-authoring experience with a collection of focused UX improvements built on real usage feedback.

**Edit mode controls.** The floating "Unsaved changes" overlay has been replaced with a smarter in-place indicator: the Save (✓) and Discard (↺) buttons in the viewer toolbar are grey by default and gain color only when there are actual changes — Save turns green, Discard turns amber. The Delete button has moved from the Properties panel to the main toolbar, to the left of the Draft/Published toggle, so all destructive and status actions are in one place. Pressing Escape in the viewer now discards the current changes and navigates back to the How To listing in a single keystroke.

**Infographic viewer.** Infographic images now fill the available screen height with minimal padding, using a flex-column chain that propagates `flex: 1; min-height: 0` through every wrapper layer down to the `<img>`, which gets `height: 100%; object-fit: contain` so it occupies the full viewport height while preserving its aspect ratio. The filmstrip's dark sprocket-hole effect has been removed, leaving only the clean white bounding box with overflow scroll when there are too many thumbnails. The Replace button has also been removed — the existing Delete + Add flow handles the same case more cleanly. Arrow keys now navigate infographic slides: left/right moves between slides within a multi-image card; pressing past the first or last slide advances to the previous or next card, matching how the arrow keys behave for video and article cards.

**Inline editing reach.** The title and description rows in the content viewer are now fully clickable — clicking anywhere in the row activates the inline edit field, rather than requiring a precise click on the small text itself.

**My Locker nav button.** The My Locker button in the site nav has been restyled as a rounded square with a black border, colored with the user's chosen locker color as the background. When the user is on the locker page, the button switches to white-on-black to match the active-page motif used by all other nav links.

**Admin status filter.** In edit mode the How To listing now shows a compact filter bar — All / Published / Draft — above the card grid. Selecting Draft shows only cards with `status: DRAFT`; Published shows only published cards. The filter stacks with the existing topic filter so admins can narrow to, say, draft cards in a specific topic.

**Control panel.** Pressing Escape anywhere in the Control Panel (`/admin`) navigates back to the previous page using the browser's history, so the gear button becomes a true round-trip: click gear, press Escape to return.

**Topic handling fix.** Cards tagged with the `about` topic were being incorrectly suppressed from the How To listing (the exclusion was intended only for the nav bar and home page). The inline topic picker in the content viewer also incorrectly offered `about` and `help` as assignable topics. Both are now fixed: the `about` and `help` tags are excluded only from the picker and from the topic filter pills, not from the card grid.

## [9.0.0] — 2026-05-11

### Inline authoring — edit the live site directly; human-readable upload filenames

v9 collapses the standalone admin content editor into the live site itself. Admins flip an "Edit Mode" toggle in the nav and the site becomes the editor. Every visible content surface — title, description, body, infographic slides, video URL, to-do tasks — is editable in place, on the same components users see. A floating Save / Discard bar at the bottom-right commits or reverts changes without a context switch.

Each card type has its own inline editing experience. ARTICLE cards use the existing Tiptap rich-text editor, now rendered directly in the viewer. INFOGRAPHIC cards show a Replace button and alt-text input per slide, a drag handle for reordering slides, a "Set print version" pill, and a trailing "+ Add image" tile for appending new slides. VIDEO cards expose a YouTube URL input with a live preview iframe below and a thumbnail Pick button. TODO_LIST cards use a new inline template editor with drag-to-reorder tasks, add/delete, and a color swatch picker — the same UI admins author in is the UI users see when they browse the card.

The properties panel (⚙ Properties pill) gives access to fields that don't have a visible inline home: status (Draft/Published), slug, card type, and thumbnail. Changing any of these marks the card dirty and the floating Save bar commits them together with any inline edits. The Delete action lives here too, behind a confirm dialog.

On listing pages (How To, Topic), edit mode reveals draft badges, pencil buttons for one-click navigation to the viewer in edit mode, and drag handles for assigning cards to topics. A "+ New topic" pill in the filter bar opens an inline popover that creates a new topic immediately. A "+ New how-to" tile at the end of the card grid opens a type dropdown; picking a type creates a blank draft and navigates to its viewer with the title focused.

Image uploads now produce human-readable storage filenames instead of UUIDs. The uploaded filename (or an optional typed title) is sanitized to lowercase alphanumeric + hyphens and used as the storage key: uploading `Study Tips Cover.jpg` stores at `uploads/images/study-tips-cover.jpg`. Same-name uploads are rejected with a 409 Conflict response, surfacing the existing asset so the admin can choose "Use existing" or rename. Existing UUID-named assets are unchanged.

The tag → topic vocabulary rename is now complete across all admin- and user-facing strings. The data layer (`tags` table, `Tag` interface) keeps its name. The admin control panel no longer has a "Content" section — all content authoring happens on the live site.

## [8.1.0] — 2026-04-28

### TODO_LIST cards, local dev upload pipeline, and content sync script fixes

TODO_LIST cards can now be created and published end-to-end from the admin editor. Two bugs that blocked saving were fixed: the title input is now always visible for all card types (it was previously hidden for TODO_LIST, requiring users to find a small pencil icon in the card preview), and the `@Pattern` constraint on `backgroundColor` and `textColor` was removed — the swatch picker emits gradient CSS values like `linear-gradient(…)` that the old hex-only pattern rejected. Save errors now surface field-level detail from the API's constraint violations rather than a generic "Save failed" message.

On the how-to page, TODO_LIST cards without a thumbnail now show a mini task preview in place of the generic placeholder: a warm sticky-note background with up to four checklist items drawn from the card's template tasks. This makes to-do cards immediately recognisable in the grid.

Image uploads in the local Docker dev environment now work correctly. Previously the admin editor always called the S3 upload path, which fails without AWS credentials. A `StorageService` interface was extracted and a `LocalStorageService` implementation added, activated by `storage.local.enabled=true` in `application-docker.yml`. The local service writes uploads to `./media/uploads/` on the host (via a new `./media:/workspace/media` volume mount on the API container). A companion `LocalMediaWebConfig` registers a Spring MVC resource handler so the API serves `/media/uploads/**` directly from disk, and the Angular dev proxy was updated to forward those paths to the API — necessary because the Angular esbuild dev server only picks up files in `public/` that exist at startup, not ones written at runtime. Unauthenticated access to `/media/uploads/**` is permitted in `SecurityConfig` for local dev.

The content export and import scripts (`scripts/export-content.sh` and `scripts/import-content.sh`) were updated to match the current production schema. Fixes include: `quotes.quote_text` (was `body`), the badges table having no `code` column (now exports to a single `badges.json` keyed by `trigger_type`/`trigger_param`), `recommended_shortcuts.name` (was `label`, with new `emoji`, `category`, and `active` columns), and the removal of `page_layouts`/`page_layout_sections` which were dropped in v5.

## [8.0.0] — 2026-04-27

### Admin upgrades — multi-image infographics, locker-style TODO editor, and content sync

The admin content editor has been substantially rebuilt. Infographic cards now support multiple images in a single card: the editor manages an ordered list of image/print-URL/alt-text entries with drag-to-reorder and per-entry upload buttons, while the viewer displays them as a swipe carousel with chevron navigation, dot indicators, and a per-image lightbox. The lightbox supports multi-slide navigation, zoom, and pan. Legacy single-image infographics continue to work without any data migration — the API synthesizes the new format from the existing scalar fields on the way out, and the viewer falls back gracefully on the way in.

The TODO_LIST editor branch has been rebuilt to match the locker's card-preview style: an inline title editor, swatch-picker buttons for background and text color, drag-to-reorder tasks with confirm-on-delete, and a 50-task maximum enforced in both directions. The standalone title input is hidden for TODO_LIST cards; the inline title edit in the preview card drives both the title and the slug auto-generation.

A content-sync facility was added to turn the repository into a versioned snapshot of all admin-authored data. `scripts/export-content.sh` reads the prod database (via a dedicated read-only export role) and both S3 buckets, writing per-slug JSON files under `data/` and mirroring media under `media/`. `scripts/import-content.sh --target local|prod` truncates and re-inserts all content tables in a single transaction, optionally syncing media to S3. The `hshowto_export` Postgres role is provisioned automatically by a Liquibase changeset on app startup, reading its password from the `HIGHSCHOOLHOWTO_DB_EXPORT_PROD_PASSWORD` secret.

## [7.0.3] — 2026-04-25

### Networking — App Runner default egress + public Postgres

The 7.0.0 Google Sign-In feature was returning `401 Unauthorized` for every user in production. After the diagnostic logging added in 7.0.1 and the JWKS fetch-timeout bump in 7.0.2 failed to fix it, root-cause analysis revealed that the App Runner service was routing all outbound traffic through a VPC connector whose ENIs had no path to the public internet — App Runner connector ENIs are never assigned public IPs, and an Internet Gateway only NATs traffic from instances that have one. Anything App Runner needed on the public internet — Google's JWKS for ID-token verification, Amazon SES for verification and password-reset emails — silently failed. v6 and earlier did not surface the issue because nothing in the codebase reached out beyond the VPC; v7 introduced two new external dependencies and both broke for the same reason.

Removed the VPC connector and switched App Runner egress to its default public path. To preserve database access without provisioning a NAT Gateway, the Postgres instance is now reachable on the public internet — it was already configured `PubliclyAccessible: true` and enforcing SSL via `rds.force_ssl=1`, so the only gate was the security group. Inbound `tcp/5432` is now permitted from `0.0.0.0/0` on the database security group; SSL is mandatory; the master credential remains in AWS Secrets Manager. Storage is encrypted at rest. The 3-second JWKS-fetch timeout from 7.0.2 is now inert (App Runner reaches Google in under 100 ms via default egress) but is left in place as cold-start insurance.

User-visible result: Google Sign-In, account-verification emails, and password-reset emails all work in production again. Full diagnosis, options considered, and security tradeoffs are in [`docs/v7-network-egress.md`](docs/v7-network-egress.md).

## [7.0.2] — 2026-04-25

### Google Sign-In — JWKS fetch timeout fix

Production Google Sign-In was failing with `401 Unauthorized` for every user after deploy. Diagnostic logging from 7.0.1 revealed the cause: Nimbus's `RemoteJWKSet` ships with a 500 ms connect / 500 ms read timeout, which cold App Runner containers routinely exceed on the first DNS + TLS handshake to `googleapis.com`. Once the timeout fires, the JWK cache stays empty for the worker's lifetime and every signature verification fails, even though the ID tokens are valid. `GoogleIdTokenVerifier` now passes an explicit `DefaultResourceRetriever` with 3 s / 3 s timeouts — generous enough to absorb cold-start network variance, still fast enough to fail real outages cleanly.

## [7.0.1] — 2026-04-22

### Google Sign-In — diagnostic logging

`GoogleIdTokenVerifier` now logs the underlying Nimbus exception (class name, message, and stack trace) at `WARN` when ID-token processing fails, instead of swallowing the details at `DEBUG`. End-user behavior is unchanged — a failed verification still returns `401 Unauthorized` with `detail: "Invalid Google ID token"` — but production logs now surface *why* verification failed (signature check, JWKS fetch failure, parse error, etc.), which is the difference between a five-minute investigation and a dead-end. No user-visible change.

## [7.0.0] — 2026-04-22

### Google Sign-In

You can now sign in with your Google account directly from the login page. A **Sign in with Google** button appears on the login and signup screens. First-time Google users get an account created automatically; returning users are matched by email. The flow uses ID-token verification — no redirect dance, no server-side OAuth secret — just a credential token from the Google One Tap UI validated against Google's public keys. The Google Web Client ID is a public value committed to source; no additional secrets are required.

### Remember Me & Session Management

The login form now has a **Remember me** checkbox. When checked, your session stays active for 30 days instead of the default 7. This applies to both password login and Google Sign-In. Refresh tokens are now rotated on every use — each call to `/api/auth/refresh` issues a new token and invalidates the old one — so long-lived sessions are still safe. A new **Sign out** option is available from the account menu and revokes the refresh token server-side, so signing out on one device doesn't silently leave an active session elsewhere.

### Locker Apps — Sort & Custom Order

All three locker apps — **Notes**, **To-do Lists**, and **Pins** — now have a sort bar at the top of the list. Notes supports sorting by **Name**, **Created**, **Updated**, or **Custom**; To-do Lists and Pins support **Name** and **Custom**. Custom mode reveals ⋮⋮ drag handles so you can reorder items freely; the new order is persisted server-side. Sort preference is remembered per browser in localStorage. A new `sort_order` column on `task_lists` backs the to-do reordering, mirroring the pattern already used for notes and pins.

### Locker Apps — Keyboard Navigation

All three list views now support keyboard navigation: **↑ ↓** moves focus between items, **Space** activates the focused item (opens a note or pin, toggles a to-do task), **Enter** also opens the item. In the to-do detail view, pressing **A** or **+** from anywhere outside a text field jumps focus to the add-task input. The Pins browse panel additionally supports **Space**, **A**, or **+** to toggle the focused pin, and ↑ ↓ to move between browse rows.

### Notes — Timestamps & Info

Note cards now show a compact relative timestamp (e.g. "3d ago") in the lower-left corner. The date shown tracks your current sort mode — when sorted by **Created** it shows the creation date; otherwise it shows the last-updated date. Clicking the timestamp expands an inline info block showing the full creation and update datetimes.

### Pins — Browse, Emoji Icons & Iconic UI

The Pins app has a new **Browse** panel. A 🔍 magnifying-glass button sits next to the + button at the bottom of the pin list; tapping it opens a categorized library of ~30 commonly-used student sites — Google Workspace tools, Khan Academy, Quizlet, Desmos, Grammarly, Common App, and more — each shown with its favicon. Clicking a row opens the site in a new tab. The ✓ / + button on the right edge of each row toggles whether the pin is already in your list; keyboard users can press **Space**, **A**, or **+** to toggle, and **↑ ↓** to move between rows. Adding a pin from Browse automatically fills in its favicon.

When adding or editing a pin manually, you can assign a **custom emoji icon** via an emoji picker — handy for personal bookmarks or sites with an unhelpful favicon. When a URL is entered without a name, the app silently fetches the page title and uses it, so you rarely need to type a name at all.

More broadly, text-label buttons throughout the locker have been replaced with **iconic equivalents**: the Browse button became a grey 🔍 circle, "New Note / New Pin / Add List" text buttons became green ＋ circles, "Back / Save" exit buttons became green ✓ circles, and list-item delete controls were standardized to ✕. The result is a more compact, visually consistent chrome that stays out of the way of your content.

### Locker Pane — Minimize and Maximize Removed

The minimize and maximize buttons have been removed from locker pane headers. The locker layout is fixed-size by design, and those controls were vestigial — the done/collapse state is handled by the pane's natural interaction model instead.

### Locker UI Polish

A consistent visual convention now governs all locker apps. The button that exits a detail view (done editing a note, done with a to-do list) is a **green circle ✓** — not a text button — matching the same green circle **+** used to create new items. Category headers in the Pins browse panel use the app's brown palette instead of grey, and every browse row has the same semi-opaque white card background as the main pin list. Grey swatches were added to the color palette for notes and to-do lists. Note card previews are trimmed to a single line.

### Locker Opening Animation

The locker interior is now fully randomized on every open — **31 items** picked from themed pools (sports gear, electronics, snacks, clothes, toiletries, books, and more) fill the shelves, floor, and two hook positions. Item sizes vary widely, from tiny accent pieces to large statement items. There is now a **60% chance of a surprise event** on each open: a 🐦 bird that flies out diagonally across the screen, a 🍌 rotting banana or 🥡 lunchbox with floating stink clouds, a 🧦 sock falling from above, a 🐱 cat that peeks from the top and retreats, a 🐛 worm bobbing out of the books, an old 🐟 fish, a 🕷️ spider descending on a thread, or a 👻 ghost drifting through.

---

## [6.0.0] — 2026-04-16

### Content Viewer Redesign

The content viewer (`/content/:slug`) has been fully redesigned around a **1200 px container** for a wider, more immersive reading experience. The old two-column arrow layout (side columns flanking the content) is gone. Navigation arrows now live in a compact **nav bar card** at the top of the page alongside the content title and description — everything on one line so no vertical real estate is wasted. The nav bar is identical across all content types (videos, articles, infographics, to-do lists) so the arrows always appear in the same screen position as you navigate.

### Keyboard Arrow Navigation

Press **← →** on any content page to jump to the previous or next item in the current browsing context (all How To content, or filtered by tag). A small animated pill — **← → arrow keys** — appears near the nav arrows on page load and fades out after a few seconds to let first-time visitors discover the shortcut. The Escape key closes the infographic lightbox when it is open. Arrow keys are suppressed when focus is inside a form field.

### Page Title

The browser tab title now reflects the current content item — e.g. **"How to Study for Your Driver's Test | High School How To"** — so tabs are identifiable at a glance and back/forward navigation is meaningful in browser history.

### Infographic Lightbox

Clicking an infographic image opens a fullscreen **lightbox viewer**. A toolbar at the top provides zoom-in (+), zoom-out (−), fit-to-screen (↺), and close (✕) controls. Mouse-wheel scrolling adjusts zoom at a fine-grained step so zooming feels precise rather than jumpy. When zoomed in, click and drag to pan the image. Cursor changes to a grab hand when panning is available. Press Escape or click ✕ to dismiss. Body scroll is locked while the lightbox is open.

### Infographic Mobile Overlay

On mobile, a translucent title overlay fades in over the infographic image on load and disappears after three seconds, giving visitors context before they start scrolling. Tapping the image opens the lightbox on all screen sizes.

### How To & Topic Page — Corkboard Card Effects

Content cards on the How To (`/how-to`) and Topic (`/topics/:slug`) pages now look like **notes pinned to a bulletin board**. Every fourth card cycles through tape, push-pin, and double-tape decorations rendered as CSS `::before` pseudo-elements. Cards have a slight random rotation (alternating left and right) and every second, third, and fourth card in a group picks up a soft pastel body color (pale yellow, pale blue, pale pink) so the grid reads as a colorful collection of post-its.

### Navigation Cleanup

- The generic **← Home** button was removed from all content pages — the site logo already links home, making the button redundant.
- **← Back to Help** is preserved on help articles where it provides real contextual value.
- `/content/about-mission` now redirects to `/about` so the About page is no longer reachable through the generic content viewer.
- Help articles and the about-mission card are excluded from the arrow-key navigation sequence so users cycling through How To content don't accidentally land on meta pages.

### Download / Print Fix

The **Download / Print** button on infographic pages now reliably opens the browser print dialog. The previous implementation used an inline `onload` attribute that could be silently blocked; it now sets `win.onload` from the parent window context, which is not subject to the same restrictions.

---

## [5.2.0] — 2026-04-16

### Notes App — Sort by Name, Date, or Custom Order

The Notes list now has a small **sort bar** at the top with three pills: **Name**, **Date**, and **Custom**. Name sorts alphabetically (case-insensitive), Date sorts newest-first by creation date, and Custom lets you drag notes into whatever order you want. Your sort preference is saved per browser in `localStorage`, so the list opens in the same mode you left it in. When Custom mode is active, each note card shows a ⋮⋮ drag handle on the left; grabbing the handle lets you reorder notes freely, and the new order is persisted server-side. A new `sort_order` column on the `notes` table (backfilled newest-first to match the prior display) powers the custom ordering, and a new `PUT /api/notes/reorder` endpoint mirrors the pattern already used for pins and to-do tasks.

### To-Do App — Drag Handles Are Back

Each to-do item now has a ⋮⋮ **drag handle** on the left side of the row, restoring the ability to reorder tasks within a list. Dragging is locked to the vertical axis and updates the list order optimistically — the UI reflects the new position immediately, and a `PUT /api/tasks/reorder` call persists the change. If the server rejects the reorder, the list reloads so the UI stays in sync with the backend.

---

## [5.1.0] — 2026-04-16

### Help Page Redesign — Post-It Bulletin Board

The Help page (`/help`) has been rebuilt as a colorful bulletin board of **post-it notes**. Each help article is rendered as a tinted square with a slight rotation, a paper-fold corner, and a colored push pin at the top. Pin colors rotate randomly on every page load, while each post-it's color is stable per article (seeded in the database) so admins can override the color from the content editor when needed. The page title got a card treatment so it stands out against the corkboard background.

### Help Articles — Logo, Back Button & Navigation

Every help article (`/content/help-*`) now shows the **High School How To logo** in the upper-left, always linking back to the home page. A context-aware back button sits next to it: on a help article you get **← Back to Help**; on any other content card it stays as **← Home**. Internally this required flipping the `simple_layout` flag for help cards so the viewer-nav block actually renders.

### Help Articles — Accuracy Pass

All help articles were audited against the live locker UI and rewritten to match what the code actually does. The keyboard-shortcuts article now lists only the shortcuts that exist (`1`/`2`/`3`/`n`); references to dropped or never-implemented features (drag-to-reorder tasks, swipe-to-delete, the daily quote, the standalone shortcuts row, an `Edit Mode` keyboard toggle) were removed. The To-Do, Notes, Timer, Apps, Customizing-Your-Locker, and Mobile pages were rewritten to describe the real toolbar, panes, dividers, due-date picker, chime sound, Pomodoro gear icon, and four-app swipe layout. The orphaned **Stickers** article was hidden (set to `DRAFT`) since the stickers feature isn't yet wired into the UI.

### New "Creating an Account" Help Article

A new **Creating an Account** help article walks new users through signup, email verification, where to find the verification email, and how to troubleshoot common login problems. It links back to the relevant `/auth/*` pages.

### Pins App Documentation

The old **Shortcuts** help article was renamed and rewritten as **Pins**, matching the new in-locker terminology. The article describes the 📌 Pins app: how to add a pin, how to edit/delete with the ✏ and ✕ buttons, and how pins also surface as quick-tap icons across the top of the locker home screen.

### Locker Color Help — Simplified

The old **Color Palettes** help article became **Locker Color**, reflecting the simpler one-tap color picker that replaced the multi-palette system. It explains how a single color choice automatically derives coordinated accent tones for each app pane.

### About Page — Post-It Design & Mission Polish

The About page article now renders as a single large post-it with a pin, matching the new help-page aesthetic. The mission copy was refined — the duplicate "convenient" was cleaned up, and the closing line now includes a direct **Create an account** call to action so first-time visitors have a clear next step.

### Home Page — Rotating Post-It Colors

The hero tagline card and the **Quote of the Day** card on the home page now pick from the same post-it color palette as the help page, with a random offset per page load so the home page reads as a colorful bulletin board on every visit. The existing tape elements still ride on top of each card. The **Quote of the Day** label is now in Mira's display font at a larger size; the quote text and attribution use the standard site body font for readability.

### Auth Dialog Typography

The login, signup, forgot-password, and reset-password dialogs now use a consistent typographic hierarchy: **headers** (Sign up, Reset password, etc.) stay in Mira's display font, while **subtext** ("Log in to sync your checklists and keep the streak alive."), **helper text** ("Minimum 12 characters, include upper/lowercase, a number, and a symbol."), and **links** ("Already have an account? Log in") use the standard site body font (Nunito) so they're easy to read.

---

## [5.0.0] — 2026-04-13

### New Site Structure

The site now has dedicated pages for every major purpose. **How To** (`/how-to`) is a full content library where you can browse and filter all articles, videos, and infographics by tag. **About** (`/about`) and **Help** (`/help`) are content-managed pages editable from the admin panel — no code changes needed to update them. The home page has been redesigned as a clean landing page with a hero section, calls to action, and a **Quote of the Day** that rotates daily from a curated collection of inspirational quotes.

### Locker Redesign — App Model

The locker has been completely rebuilt. The old free-form drag-and-drop widget grid is replaced by a focused **three-pane app layout** modeled on a phone home screen. Each pane holds one app — To-dos, Notes, or Timer — and panes can be resized by dragging the dividers between them. Toggle apps on and off from the toolbar at the top, or maximize any single app to fill the full locker. The locker opens with an animated combination-lock door that spins open to reveal the interior.

### Notes App

A new **Notes** app lives in the locker. Notes are displayed as a list; clicking a note opens the full editor as an overlay covering the entire pane. Each note has its own background color, and the editor background matches the note color throughout. Notes can be deleted from the list or from inside the editor, with a confirmation prompt before anything is removed.

### To-Dos App

The to-do experience has been rebuilt as a first-class app. To-do lists are displayed as colored rows — each row has a **circular color swatch** to change the list color and a trash icon to delete it. Opening a list shows all tasks with checkboxes, inline title editing, optional due dates with a visual date picker, and a per-task delete button. The "Add a to-do" input sits in a fixed bar at the bottom of the pane so it's always reachable.

### Timer App

The timer pane now supports two modes side by side — **Basic** (a simple countdown you set yourself) and **Pomodoro** (25-minute focus sessions with short and long breaks). Switch between modes with the tabs at the top. The timer plays a sound alert when a session ends and tracks completed Pomodoro cycles.

### Pastel Post-It Pane Styling

Locker panes now look like **pastel post-it notes**. The title bar is transparent and inherits the pane's background color so the whole widget reads as one uniform piece of paper. All four built-in color palettes (Ocean, Sunset, Forest, Candy) use soft pastel tones, and the dynamic palette derived from your chosen locker color also generates pastels. The pane body uses a richer tint blend so the color is clearly visible throughout.

### Locker Color & Font Preferences

Choose a **locker background color** from the toolbar — the app palette automatically derives three complementary pastel tones for your panes. You can also pick a **font family** for the locker from a menu of standard and dyslexia-friendly options. Both preferences are saved per user.

### Badges

A **badge system** tracks milestones: completing tasks, writing notes, using the timer, and more. Badges appear in a shelf in the locker and trigger a celebration animation the first time you earn one.

### Content Editor: Image Upload

The admin content editor now supports **inserting images** directly into rich text articles. Click the image toolbar button or drag and drop a file onto the editor to upload and embed it. Images are stored in S3 and served through CloudFront alongside other media.

### Locker Opening Animation

Signing in to the locker now plays a **combination-lock animation** — a row of metal locker doors with a center door that swings open after the dial spins through its combination. The interior is stocked with school supplies.

---

## [4.0.0] — 2026-04-11

### To-Do List Content Cards

Admins can now publish **To-Do List content cards** — curated, step-by-step checklists like "How to Study for Your Driver's Test" that appear alongside articles, videos, and infographics on the site. Any signed-in user can click **Add to My Locker** from a to-do list card's page to get their own personal copy that they can check off, edit, and customize. If you've already added a list, the button changes to **View in My Locker**.

### Content Links

All content cards (articles, videos, infographics, and to-do lists) can now display a **Related** section at the bottom of the page. Admins can link any card to other cards with custom display text. Each link shows a type icon so you know at a glance whether you're jumping to an article, video, infographic, or checklist.

### Free-Form Locker Layout

The locker's drag-and-drop system has been rebuilt to support **full free-form rearrangement**. You can now drag widgets both horizontally and vertically — not just between columns, but to any position in the grid. A drop indicator shows exactly where a card will land before you release it, and the grid reflows in real time as you drag.

### Shortcuts Panel

Shortcuts have moved out of the locker grid into a **compact dropdown panel** accessible from the rocket icon in the locker header. This frees up locker space for your notes, timers, and to-do lists. Click the rocket to open your shortcuts, click + to add a new one, and right-click any shortcut to edit or delete it.

### Locker Improvements

- **To-do list edit mode** — the title and pencil icon are on the same line; the pencil sits on the right in view mode. The save button is a green checkmark bubble.
- **Larger task checkboxes** — task completion checkboxes are bigger and bolder throughout the locker.
- **Auto-growing lists** — to-do list widgets automatically expand when you add items so the Add row stays visible without manual resizing.
- **Widget focus/depth** — hovering any part of a widget brings it to the foreground, even when it's partially hidden behind another widget.
- **Timer improvements** — timer widgets no longer have a double-window appearance. All timer buttons are always visible. Opening a timer or launching a Pomodoro session scrolls it into view near the top of the locker.
- **New widgets start at the top** — newly created lists, timers, and notes always appear at the upper-left of the locker grid, so they're immediately in view.
- **Narrower resize handles** — widget resize handles are half as wide as before for a cleaner look.
