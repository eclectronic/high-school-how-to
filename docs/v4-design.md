# High School How To — v4.0 Design Document

**Status**: Draft
I w**Last updated**: 2026-04-09

## Table of Contents

1. [Overview](#1-overview)
2. [To-Do List Content Card](#2-to-do-list-content-card)
3. [Content Links](#3-content-links)
4. [Locker Free-Form Drag-and-Drop](#4-locker-free-form-drag-and-drop)
5. [Shortcuts Panel](#5-shortcuts-panel)
6. [Implementation Phases](#6-implementation-phases)
7. [Testing Requirements](#7-testing-requirements)

---

## 1. Overview

v4.0 introduces two foundational content features and two locker UX improvements:

1. **To-Do List content card** — a new content type that lets admins author template to-do lists (e.g., "How to study for your driver's test") that users can add to their personal locker with one click.
2. **Content links** — any content card can link to other content cards with customizable link text, rendered automatically at the bottom of the content viewer.
3. **Locker free-form drag-and-drop** — replaces the column-only drag system with full free-form rearrangement, allowing users to move cards both horizontally between columns and vertically to reorder within columns.
4. **Shortcuts panel** — redesigns shortcuts from individual locker grid cards into a compact dropdown panel toggled from the locker header, similar to the font picker.

Together, these features connect the content layer (public, admin-curated) to the locker layer (personal, per-user), allow content cards to cross-reference each other, and make the locker feel more interactive and customizable.

---

## 2. To-Do List Content Card

### Concept

A To-Do List content card is a **template** — a curated, admin-authored checklist that any authenticated user can copy into their personal locker. The content card itself is public and read-only; the personal copy is a full TaskList that the user owns and can modify.

Example: An admin creates a "How to Study for Your Driver's Test" to-do list with items like "Get the driver's handbook", "Take practice tests online", "Schedule your test date". A student browsing the site sees this content, clicks "Add to My Locker", and gets a personal copy they can check off, reorder, and customize.

### Admin Interface

The content editor gains a new card type: **To-Do List** (`TODO_LIST`).

When `TODO_LIST` is selected, the editor shows:

#### Standard Card Fields (same as other types)
- Title, slug, description, tags, status (DRAFT/PUBLISHED)
- Thumbnail URL, cover image URL
- Simple layout toggle

#### Template Tasks Section (new, TODO_LIST only)
An ordered list editor for the template tasks:

```
Template Tasks
─────────────────────────────────────
  ⠿  1. Get the driver's handbook              🗑
  ⠿  2. Read chapters 1-3                      🗑
  ⠿  3. Take online practice tests             🗑
  ⠿  4. Schedule your test date                🗑
  ⠿  5. Review road signs                      🗑

  [ + Add task ]
─────────────────────────────────────
```

- **Add task**: text input + Enter to append a new task
- **Reorder**: drag handle (⠿) for drag-and-drop reordering
- **Delete**: remove icon per task
- **Inline editing**: click a task description to edit it
- **Minimum**: at least one task is required for a TODO_LIST card

#### Template List Appearance
These fields control the default appearance when the list is copied to a user's locker:

- **List color** — color picker (uses the same 16 preset swatches from the locker color palette). Defaults to Cream (`#fffef8`).
- **Text color** — optional override (auto-contrast by default, same as locker cards)

These are stored on the content card itself (`backgroundColor`, `textColor`) and applied as defaults when creating the personal copy.

#### Hidden Fields
The following standard content card fields are **not shown** for TODO_LIST cards since they don't apply:
- `mediaUrl` (no video/infographic media)
- `printMediaUrl` (no printable version)
- `bodyJson` / `bodyHtml` (template tasks replace article body)

### Content Viewer (Public)

When a user navigates to `/content/:slug` for a TODO_LIST card, the viewer displays:

```
┌──────────────────────────────────────────────┐
│                                              │
│  How to Study for Your Driver's Test         │
│                                              │
│  A step-by-step checklist to help you        │
│  prepare and pass your driver's test.        │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  ☐ Get the driver's handbook                 │
│  ☐ Read chapters 1-3                         │
│  ☐ Take online practice tests                │
│  ☐ Schedule your test date                   │
│  ☐ Review road signs                         │
│                                              │
│         [ ➕ Add to My Locker ]               │
│                                              │
│  ─────────────────────────────────────────── │
│  Related                                     │
│  📄 Driver's Test Study Guide →              │
│  🎬 Top 5 Mistakes on the Driving Test →     │
└──────────────────────────────────────────────┘
```

- **Description** at the top (from `description` field)
- **Read-only task list** showing all template tasks with unchecked checkboxes
- **"Add to My Locker" button** — copies the template into the user's personal TaskList
  - If the user is not authenticated: redirect to `/auth/login` with a `returnUrl` back to this content page
  - If already added: button changes to **"View in My Locker"** and links to `/account/locker`
- **Content links** rendered below (see [Section 3](#3-content-links))

#### "Add to My Locker" Behavior

When the user clicks "Add to My Locker":

1. Frontend calls `POST /api/content/cards/{slug}/add-to-locker`
2. Backend creates a new `TaskList` owned by the authenticated user:
   - `title` ← content card's `title`
   - `color` ← content card's `backgroundColor` (or default `#fffef8`)
   - `textColor` ← content card's `textColor` (or null for auto-contrast)
   - `sourceContentCardId` ← content card's `id` (tracks which template it came from)
3. Backend creates `TaskItem` entries for each template task:
   - `description` ← template task description
   - `sortOrder` ← template task sort order
   - `completed` ← false
   - `dueAt` ← null
4. Backend returns the created `TaskListResponse`
5. Frontend shows a success message and changes the button to "View in My Locker"

The `sourceContentCardId` on `TaskList` enables:
- Checking whether the user has already added this template (to show "View in My Locker" instead)
- A user can add the same template multiple times (no uniqueness constraint) — each creates a fresh copy

#### Checking "Already Added" State

When the content viewer loads a TODO_LIST card for an authenticated user:
- Frontend calls `GET /api/content/cards/{slug}/locker-status`
- Returns `{ added: true, taskListId: "uuid" }` or `{ added: false }`
- If added, the button shows "View in My Locker" and links to `/account/locker`

### Home Page & Topic Pages

TODO_LIST cards appear in the same card grid as other content types on the home page and topic pages. They are distinguished by:

- A **checklist icon badge** (☑) on the card thumbnail/cover area (similar to how video cards show a play button overlay)
- The card type label "To-Do List" displayed as a subtle badge

Clicking a TODO_LIST card navigates to `/content/:slug` like any other card.

### Backend Changes

#### New Enum Value
Add `TODO_LIST` to `CardType`:
```java
public enum CardType {
    VIDEO, INFOGRAPHIC, ARTICLE, TODO_LIST
}
```

#### New Entity: ContentCardTask

Template tasks stored in a dedicated table:

```java
@Entity
@Table(name = "content_card_tasks")
public class ContentCardTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    private ContentCard card;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
```

#### ContentCard Entity Update

Add relationship to template tasks:

```java
@OneToMany(mappedBy = "card", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("sortOrder ASC")
private List<ContentCardTask> templateTasks = new ArrayList<>();
```

#### TaskList Entity Update

Add optional reference to the source content card:

```java
@Column(name = "source_content_card_id")
private Long sourceContentCardId;
```

This is a plain Long rather than a `@ManyToOne` FK to avoid a hard dependency from the tasks package to the content package. If the content card is deleted, orphan task lists continue to function — the source reference simply becomes stale.

#### New/Updated DTOs

**ContentCardTaskRequest** (for admin save):
```java
public record ContentCardTaskRequest(
    @NotBlank @Size(max = 2000) String description
) {}
```

**ContentCardTaskResponse** (for public/admin responses):
```java
public record ContentCardTaskResponse(
    Long id,
    String description,
    int sortOrder
) {}
```

**SaveCardRequest** — add:
```java
List<ContentCardTaskRequest> templateTasks  // required when cardType == TODO_LIST
```

**ContentCardResponse** / **ContentCardAdminResponse** — add:
```java
List<ContentCardTaskResponse> templateTasks  // populated for TODO_LIST cards
```

**LockerStatusResponse** (new):
```java
public record LockerStatusResponse(
    boolean added,
    UUID taskListId  // null when added is false
) {}
```

#### New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/content/cards/{slug}/add-to-locker` | User | Copy template to-do list into user's locker |
| `GET` | `/api/content/cards/{slug}/locker-status` | User | Check if user has added this template |

#### Validation Rules

- `templateTasks` must be non-empty when `cardType == TODO_LIST`
- `templateTasks` must be null or empty when `cardType != TODO_LIST`
- Each task description max 2000 chars
- Max 50 template tasks per content card (consistent with per-user task limit)
- `mediaUrl`, `printMediaUrl`, `bodyJson`, `bodyHtml` are ignored for TODO_LIST cards

#### Database Migration

```sql
-- v4-todolist-content-0001.sql

-- Template tasks for TODO_LIST content cards
CREATE TABLE content_card_tasks (
    id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_card_tasks_card_id ON content_card_tasks(card_id);

-- Track which content card a personal task list was created from
ALTER TABLE task_lists ADD COLUMN source_content_card_id BIGINT;

-- rollback DROP INDEX idx_content_card_tasks_card_id;
-- rollback DROP TABLE content_card_tasks;
-- rollback ALTER TABLE task_lists DROP COLUMN source_content_card_id;
```

---

## 3. Content Links

### Concept

Any content card can link to other content cards. Links have customizable display text and are rendered at the bottom of the content viewer in a "Related" section. This enables admin-curated cross-references — e.g., a video about test prep linking to the companion to-do list, or an infographic linking to a related article.

### Admin Interface

All content types (VIDEO, INFOGRAPHIC, ARTICLE, TODO_LIST) get a new **"Related Content"** section in the content editor, below the existing fields:

```
Related Content
─────────────────────────────────────────────────────
  ⠿  📄 Driver's Test Study Guide
     Link text: [ Read the full study guide → ]      🗑

  ⠿  ☑ Driver's Test Prep Checklist
     Link text: [ Get the checklist →          ]      🗑

  [ 🔍 Search content to link... ]
─────────────────────────────────────────────────────
```

- **Search**: a text input that searches existing content cards by title (typeahead/autocomplete). Selecting a card adds it to the links list.
- **Link text**: customizable per link. Defaults to the target card's title if left blank.
- **Reorder**: drag handle for ordering.
- **Delete**: remove a link.
- **Self-links prevented**: a card cannot link to itself.
- **Duplicate prevention**: the same target card cannot be linked twice from the same source.

### Content Viewer (Public)

Links are rendered at the bottom of the content, above the prev/next navigation:

```
Related
───────────────────────────────────
📄  Read the full study guide →
☑   Get the checklist →
🎬  Top 5 Mistakes on the Driving Test →
───────────────────────────────────
```

- Each link shows a **type icon** (📄 article, 🎬 video, 🖼 infographic, ☑ to-do list) + the **link text**
- Clicking navigates to `/content/:target-slug`
- Only **published** target cards are shown (draft links are hidden from public view but visible in admin)
- If a linked card is deleted, the link is automatically removed (CASCADE)

### Backend Changes

#### New Entity: ContentCardLink

```java
@Entity
@Table(name = "content_card_links",
       uniqueConstraints = @UniqueConstraint(columnNames = {"source_card_id", "target_card_id"}))
public class ContentCardLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_card_id", nullable = false)
    private ContentCard sourceCard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_card_id", nullable = false)
    private ContentCard targetCard;

    @Column(name = "link_text", length = 500)
    private String linkText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
```

#### ContentCard Entity Update

Add relationship to outgoing links:

```java
@OneToMany(mappedBy = "sourceCard", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("sortOrder ASC")
private List<ContentCardLink> links = new ArrayList<>();
```

#### New/Updated DTOs

**ContentCardLinkRequest** (for admin save):
```java
public record ContentCardLinkRequest(
    @NotNull Long targetCardId,
    @Size(max = 500) String linkText,  // null/blank → defaults to target card title
    int sortOrder
) {}
```

**ContentCardLinkResponse** (for public/admin responses):
```java
public record ContentCardLinkResponse(
    Long id,
    Long targetCardId,
    String targetSlug,
    String targetTitle,
    CardType targetCardType,
    String linkText,       // resolved: custom text or target title
    int sortOrder
) {}
```

The response includes resolved target card info so the frontend doesn't need a second fetch.

**SaveCardRequest** — add:
```java
List<ContentCardLinkRequest> links  // optional, any card type
```

**ContentCardResponse** / **ContentCardAdminResponse** — add:
```java
List<ContentCardLinkResponse> links  // only published targets in public response; all targets in admin response
```

#### Validation Rules

- `targetCardId` must reference an existing content card
- A card cannot link to itself (`sourceCardId != targetCardId`)
- Duplicate target links are rejected (enforced by unique constraint)
- Max 10 links per card
- `linkText` max 500 chars; if null/blank, defaults to target card's title at render time

#### Content Card Search Endpoint (for admin link picker)

A lightweight search endpoint for the admin typeahead:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/content/search?q={query}` | Admin | Search cards by title substring, returns id + title + cardType + slug |

**Response**: `List<ContentCardSummary>`
```java
public record ContentCardSummary(
    Long id,
    String title,
    String slug,
    CardType cardType,
    CardStatus status
) {}
```

Returns at most 20 results, ordered by title. Excludes the current card being edited (passed via optional `exclude` query param).

#### Database Migration

```sql
-- v4-content-links-0002.sql

CREATE TABLE content_card_links (
    id BIGSERIAL PRIMARY KEY,
    source_card_id BIGINT NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
    target_card_id BIGINT NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
    link_text VARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_content_card_links UNIQUE (source_card_id, target_card_id),
    CONSTRAINT chk_no_self_link CHECK (source_card_id != target_card_id)
);

CREATE INDEX idx_content_card_links_source ON content_card_links(source_card_id);
CREATE INDEX idx_content_card_links_target ON content_card_links(target_card_id);

-- rollback DROP INDEX idx_content_card_links_target;
-- rollback DROP INDEX idx_content_card_links_source;
-- rollback DROP TABLE content_card_links;
```

---

## 4. Locker Free-Form Drag-and-Drop

### Problem

The current locker drag system only moves cards horizontally between columns. Dragging updates `col` but never changes `order`, so cards always stack in their original creation order within each column. Users cannot reorder cards vertically — there is no way to move a card above or below another card.

### Solution

Replace the column-only drag with full free-form drag-and-drop that updates both column placement and vertical ordering in a single gesture.

### Drag Behavior

#### Initiation
- Drag initiates from the `.widget-title-bar` (unchanged)
- Clicks on buttons, inputs, links, and textareas do not initiate drag (unchanged)

#### During Drag
- The dragged card follows the cursor via CSS `transform: translate(dx, dy)` for smooth, GPU-accelerated movement
- The dragged card gets elevated styling: semi-transparent (`opacity: 0.85`), raised shadow, and `z-index` above other cards
- **Target column** is resolved from the cursor's X position using the existing `resolveDropColumn()` logic
- **Insertion index** is resolved from the cursor's Y position by comparing the card's vertical center against the midpoints of other cards in the target column range
- A **drop indicator** (horizontal line/gap) appears at the resolved insertion point, showing where the card will land
- Other cards **reflow in real-time** around the gap to preview the final layout

#### Column Clamping
- Multi-column-span cards are clamped to valid positions. A card with `colSpan: 2` cannot be placed beyond column 11 on a 12-column grid (its rightmost valid starting column is `columnCount - colSpan + 1`).
- The card stops sliding right at the edge rather than pushing other cards out of the way. If a wide card doesn't fit somewhere, the user should resize it first, then move — this keeps behavior predictable and avoids disorienting cascading shifts.

#### On Drop
- Set the card's `col` to the resolved (clamped) column
- Insert the card at the resolved position in the sequence
- **Renumber all cards** with sequential `order` values (0, 1, 2, 3, ...) based on their new positions — `order` is a pure sequence number, not a meaningful value
- Call `saveLockerLayout()` to persist

### Frontend Changes

#### LockerGridEngineService

No changes to the `pack()` algorithm — it already sorts by `order` then `col` and stacks items correctly. The fix is entirely in how drag events update `order`.

New helper method:

```typescript
/**
 * Given the current packed layout and a cursor Y position, determine the
 * insertion index among items occupying the target column range.
 *
 * Compares the cursor Y against the vertical midpoint of each item in the
 * target columns. The insertion index is the position of the first item
 * whose midpoint is below the cursor.
 */
resolveDropIndex(
  packedItems: PackedItem[],
  targetCol: number,
  targetColSpan: number,
  cursorY: number,
  heightMap: Map<string, number>,
  draggedId: string,
): number
```

#### LockerComponent

Update `onDragStart()`:
- Record initial cursor position and the card's current packed position (for computing translate offset)

Update `handleDragMove()`:
- Apply `transform: translate(dx, dy)` to the dragged card element (delta from drag start)
- Resolve target column from X (existing logic, with clamping for colSpan)
- Resolve insertion index from Y using the new `resolveDropIndex()`
- Update `layoutMap` with the new `col` and tentative `order` so the reflow preview is live
- Track drop indicator position for rendering

Update `onMouseUp()`:
- Renumber all card `order` values sequentially based on final positions
- Clear drag state and visual styling
- Save layout

New template elements:
- Drop indicator element (a thin horizontal line, e.g., 2px accent-colored bar) positioned absolutely at the resolved insertion point
- CSS class `.dragging` on the dragged card for elevated/transparent styling

#### CSS Changes (`locker.component.scss`)

```scss
.grid-widget.dragging {
  opacity: 0.85;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  z-index: 100;
  pointer-events: none; // prevent hover effects on the dragged card
  transition: none;     // disable transitions during drag for instant response
}

.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-color, #4a90d9);
  border-radius: 1px;
  z-index: 99;
  pointer-events: none;
}
```

### Backend Changes

None. The existing `POST /api/locker/layout` endpoint already persists `gridCol`, `colSpan`, `itemOrder`, and `minimized` per card. The only change is that the frontend will now send updated `itemOrder` values after drag-and-drop — the API contract is unchanged.

---

## 5. Shortcuts Panel

### Problem

Shortcuts currently render as individual cards in the locker grid, each with its own title bar and grid cell. This clutters the locker layout — shortcuts are small, quick-access links that don't need the same visual weight as task lists, timers, and notes. Users with many shortcuts end up with a grid dominated by tiny cards.

### Solution

Move shortcuts out of the locker grid into a **dropdown panel** toggled by the rocket (🚀) icon in the locker header. The panel follows the same pattern as the font picker — a floating container that appears below the header button and disappears when toggled off.

### Panel Behavior

#### Toggle
- Clicking the 🚀 button **opens** the shortcuts panel
- Clicking the 🚀 button again **closes** it
- Clicking outside the panel closes it (consistent with font picker)
- Opening other panels (font picker, sticker dialog, etc.) closes the shortcuts panel

#### Layout

```
  🚀 Shortcuts
  ┌─────────────────────────────────────────┐
  │                                         │
  │  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌──┐  │
  │  │ 🌐 │  │ 📺 │  │ 🎓 │  │ 📝 │  │ + │  │
  │  │Khan│  │ YT │  │ SAT │  │Docs│  │   │  │
  │  └────┘  └────┘  └────┘  └────┘  └──┘  │
  │                                         │
  └─────────────────────────────────────────┘
```

- Shortcuts display as a **grid of icons** — each shortcut shows its icon (favicon, emoji, or custom image) above a truncated label, using the same `ShortcutIconComponent` visual style
- The panel is **sized to fit its content** — it grows horizontally with the number of shortcuts up to a max width, then wraps to additional rows
- A **+ button** appears at the end of the icon grid, styled consistently with the shortcut icons. Clicking it opens the existing add-shortcut dialog.
- When there are **no shortcuts**, the panel shows the + button alone

#### Interactions
- **Click** a shortcut icon → opens the URL in a new tab (unchanged)
- **Right-click** a shortcut icon → context menu with Edit and Delete options (unchanged)
- **Hover** a shortcut icon → subtle background highlight and edit pencil overlay (unchanged)
- **Click +** → opens the add-shortcut dialog (same dialog as today)

### Frontend Changes

#### LockerComponent

- Replace the current 🚀 button behavior: instead of `openAddShortcutDialog()`, it calls `toggleShortcutsPanel()`
- New state: `shortcutsPanelOpen` boolean, toggled by the rocket button
- Close the panel when other panels open (font picker, sticker dialog, note menu)
- Close the panel on `document:click` outside (consistent with other panels)

Template changes:
```html
<!-- Rocket button in header -->
<button type="button" class="app-icon-btn"
        (click)="toggleShortcutsPanel(); $event.stopPropagation()"
        aria-label="Shortcuts">
  🚀
</button>

<!-- Shortcuts panel -->
<div class="shortcuts-panel" *ngIf="shortcutsPanelOpen" (click)="$event.stopPropagation()">
  <app-shortcut-icon
    *ngFor="let s of shortcuts()"
    [shortcut]="s"
    (editRequested)="onShortcutEditRequested($event)"
    (deleteRequested)="onShortcutDeleteRequested($event)"
  ></app-shortcut-icon>

  <button type="button" class="shortcuts-panel__add"
          [disabled]="atShortcutLimit()"
          [title]="atShortcutLimit() ? 'Maximum of 50 shortcuts reached' : 'Add a shortcut'"
          (click)="openAddShortcutDialog()"
          aria-label="Add a shortcut">
    +
  </button>
</div>
```

#### Locker Grid Changes

- Remove `SHORTCUT` from the `LockerCard` union type — shortcuts no longer participate in the grid
- Remove `SHORTCUT` entries from `cardOrder` signal and `orderedCards` computed
- Remove `SHORTCUT` from `locker_layout` persistence — no more grid position for shortcuts
- Remove the `<app-shortcut-icon>` block from the grid widget template

#### CSS (`locker.component.scss`)

```scss
.shortcuts-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  margin-top: 0.25rem;
  max-width: 480px;         // wraps to rows beyond this
  align-items: flex-start;
}

.shortcuts-panel__add {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 2px dashed rgba(0, 0, 0, 0.2);
  background: transparent;
  cursor: pointer;
  font-size: 1.4rem;
  color: rgba(0, 0, 0, 0.4);
  transition: background 0.12s, border-color 0.12s;
}

.shortcuts-panel__add:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.35);
}

.shortcuts-panel__add:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

### Backend Changes

None. The shortcut CRUD API (`/api/shortcuts`) is unchanged. The only change is removing `SHORTCUT` entries from the locker layout data — this can be handled with a migration that deletes existing `SHORTCUT` rows from `locker_layout`, or the frontend can simply stop persisting them and ignore any stale entries.

#### Database Migration

```sql
-- v4-shortcuts-panel-cleanup.sql

-- Remove shortcut entries from locker layout (shortcuts no longer live in the grid)
DELETE FROM locker_layout WHERE card_type = 'SHORTCUT';

-- rollback: (no-op — shortcut layout entries will be re-created if the feature is reverted)
```

---

## 6. Implementation Phases

### Phase 1 — To-Do List Content Card (Backend)
- Add `TODO_LIST` to `CardType` enum
- Create `content_card_tasks` table migration
- Add `source_content_card_id` column to `task_lists` migration
- Create `ContentCardTask` entity
- Update `ContentCard` entity with `templateTasks` relationship
- Update `TaskList` entity with `sourceContentCardId` field
- Update `SaveCardRequest`, `ContentCardResponse`, `ContentCardAdminResponse` DTOs
- Update `ContentCardService` to handle template tasks on create/update
- Add validation: require template tasks for TODO_LIST, reject for other types
- Add `POST /api/content/cards/{slug}/add-to-locker` endpoint
- Add `GET /api/content/cards/{slug}/locker-status` endpoint
- Update `ContentCardRepository` queries to eager-load template tasks

### Phase 2 — To-Do List Content Card (Frontend)
- Add `TODO_LIST` to `CardType` type
- Update content models with `templateTasks` and `sourceContentCardId`
- Update content editor: show template tasks section when TODO_LIST is selected
- Template task list editor: add, remove, reorder, inline edit
- Hide irrelevant fields (mediaUrl, bodyJson) for TODO_LIST
- Update content viewer: render read-only task list for TODO_LIST cards
- "Add to My Locker" / "View in My Locker" button with auth gating
- Update home page and topic page card grid: checklist icon badge for TODO_LIST cards
- Update content API service with new endpoints

### Phase 3 — Content Links (Backend)
- Create `content_card_links` table migration
- Create `ContentCardLink` entity
- Update `ContentCard` entity with `links` relationship
- Update DTOs with link request/response types
- Update `ContentCardService` to handle links on create/update
- Add validation: no self-links, no duplicates, max 10 links
- Filter unpublished targets from public responses
- Add `GET /api/admin/content/search` endpoint for typeahead

### Phase 4 — Content Links (Frontend)
- Update content models with links
- Content editor: "Related Content" section with search typeahead, reorder, delete
- Content viewer: render links at bottom with type icons
- Update content API service with search endpoint

### Phase 5 — Locker Free-Form Drag-and-Drop (Frontend)
- Add `resolveDropIndex()` method to `LockerGridEngineService`
- Update `onDragStart()`: record initial cursor position and card's packed position
- Update `handleDragMove()`: apply CSS transform to follow cursor, resolve target column (clamped for colSpan), resolve insertion index from Y, update `layoutMap` with new `col` and tentative `order`, live reflow preview
- Update `onMouseUp()`: renumber all card `order` values sequentially, clear drag state, save layout
- Add drop indicator element (horizontal bar at resolved insertion point)
- Add `.dragging` CSS class (semi-transparent, elevated shadow, z-index, no pointer-events)
- Verify existing resize behavior still works alongside new drag logic

### Phase 6 — Shortcuts Panel (Frontend)
- Replace 🚀 button click handler: `openAddShortcutDialog()` → `toggleShortcutsPanel()`
- Add `shortcutsPanelOpen` state and `toggleShortcutsPanel()` method
- Close shortcuts panel when other panels open (font picker, sticker dialog, note menu)
- Add shortcuts panel template with icon grid and + button
- Add `.shortcuts-panel` and `.shortcuts-panel__add` CSS
- Remove `SHORTCUT` from `LockerCard` union and `orderedCards` computed
- Remove `SHORTCUT` from `cardOrder` signal and locker layout persistence
- Remove `<app-shortcut-icon>` from grid widget template
- Run migration to clean up stale `SHORTCUT` entries from `locker_layout`

---

## 7. Testing Requirements

### Backend Testing

#### Unit Tests (JUnit 5 + Mockito)

**ContentCardService:**
- Create TODO_LIST card with template tasks → tasks are persisted in order
- Update TODO_LIST card: add, remove, reorder template tasks
- Create TODO_LIST with empty template tasks → validation error
- Create VIDEO/INFOGRAPHIC/ARTICLE with template tasks → validation error or tasks ignored
- Create card with links → links persisted with correct sort order
- Create card with self-link → validation error
- Create card with duplicate target → validation error
- Create card with more than 10 links → validation error
- Link text defaults to target title when null/blank

**Add-to-locker endpoint:**
- Authenticated user adds TODO_LIST → TaskList created with correct title, color, tasks
- `sourceContentCardId` set correctly on created TaskList
- Unauthenticated user → 401
- Non-TODO_LIST card → 400
- Nonexistent slug → 404

**Locker status endpoint:**
- User who has added the template → `{ added: true, taskListId: "..." }`
- User who has not added → `{ added: false }`
- Returns the most recently created task list ID when added multiple times

**Content search endpoint:**
- Finds cards by title substring (case-insensitive)
- Excludes card by `exclude` param
- Returns max 20 results
- Requires admin auth

#### Integration Tests (Spring Boot + TestContainers)

- Full lifecycle: create TODO_LIST card with tasks → read back → update tasks → delete
- Add-to-locker: create template → add to locker → verify TaskList + TaskItems
- Locker status: verify added/not-added states
- Content links: create card with links → read back → verify resolved target info
- Cascade: delete target card → link removed from source
- Cascade: delete source card → all links removed
- Cascade: delete TODO_LIST card → template tasks removed
- User isolation: locker status only returns current user's data
- Content link filtering: draft target cards hidden from public response, visible in admin

### Frontend Testing

#### Unit Tests (Karma + Jasmine)

**Content Editor:**
- TODO_LIST type shows template task editor, hides media/body fields
- Add/remove/reorder template tasks
- At least one task required validation
- Related content section: search, add, remove, reorder links
- Self-link prevention (current card excluded from search)
- Link text defaults to target title

**Content Viewer:**
- TODO_LIST renders read-only task list
- "Add to My Locker" button shown for unauthenticated and authenticated users
- "View in My Locker" shown when already added
- Redirects to login when unauthenticated user clicks "Add to My Locker"
- Content links rendered with correct type icons
- Draft target links not rendered
- Links navigate to `/content/:slug`

**Content API Service:**
- `addToLocker(slug)` calls correct endpoint
- `getLockerStatus(slug)` calls correct endpoint
- `searchCards(query, exclude)` calls correct endpoint

**LockerGridEngineService:**
- `resolveDropIndex()` returns correct insertion index when cursor is above all items
- `resolveDropIndex()` returns correct insertion index when cursor is between two items
- `resolveDropIndex()` returns correct insertion index when cursor is below all items
- `resolveDropIndex()` excludes the dragged card from midpoint comparison
- `resolveDropIndex()` only considers items overlapping the target column range

**Locker Drag-and-Drop:**
- Dragging a card horizontally changes its `col`
- Dragging a card vertically changes its `order` (insertion index)
- Dragging a card to a new column and vertical position updates both `col` and `order`
- Multi-column-span card is clamped to valid column range (cannot exceed grid boundary)
- Drop renumbers all cards with sequential `order` values (no gaps)
- `saveLockerLayout()` is called on drop
- Dragged card gets `.dragging` class during drag, removed on drop
- Drop indicator is positioned at resolved insertion point during drag
- Resize still works independently of the new drag logic

**Shortcuts Panel:**
- Clicking 🚀 opens the shortcuts panel; clicking again closes it
- Clicking outside the panel closes it
- Opening font picker / sticker dialog / note menu closes the shortcuts panel
- All user shortcuts render as icons inside the panel
- Clicking a shortcut icon opens URL in new tab
- Right-click on shortcut icon shows context menu with Edit and Delete
- The + button opens the add-shortcut dialog
- The + button is disabled when at 50 shortcut limit
- Shortcuts do not appear as cards in the locker grid
- Panel width adjusts to fit content, wraps to rows beyond max width
