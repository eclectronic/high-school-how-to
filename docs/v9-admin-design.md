# High School How To — v9 Design Document

**Status**: Draft — design in progress
**Last updated**: 2026-05-09
**Scope**: Inline / WYSIWYG content authoring; collapse the standalone admin content editor into the live site; rename "tag" to "topic" in user-facing strings; human-readable upload filenames

## Table of Contents

1. [Overview](#1-overview)
2. [Problems](#2-problems)
3. [Design Goals](#3-design-goals)
4. [Edit-mode toggle](#4-edit-mode-toggle)
5. [Inline editing on listings (How To, Topic, Home)](#5-inline-editing-on-listings-how-to-topic-home)
6. [Drag-to-topic and topic creation (How To page)](#6-drag-to-topic-and-topic-creation-how-to-page)
7. [Tag → topic rename](#7-tag--topic-rename)
8. [Inline editing on the content viewer](#8-inline-editing-on-the-content-viewer)
9. [The expanded properties panel](#9-the-expanded-properties-panel)
10. [Creating new content (the plus button)](#10-creating-new-content-the-plus-button)
11. [Drafts and admin-only data](#11-drafts-and-admin-only-data)
12. [Save model and dirty state](#12-save-model-and-dirty-state)
13. [Image management](#13-image-management)
14. [Slimmed-down `/admin`](#14-slimmed-down-admin)
15. [Backend changes](#15-backend-changes)
16. [Frontend changes](#16-frontend-changes)
17. [Testing requirements](#17-testing-requirements)
18. [Implementation phases](#18-implementation-phases)
19. [Out of scope](#19-out-of-scope)

---

## 1. Overview

v8 ended the admin tooling cycle with a real media library and round-trip content sync. The remaining rough edge is the *shape* of authoring itself: today, every edit is a context switch — admins author against an abstract form at `/admin/content/:id/edit` that has no visual relation to what users actually see. Authors mentally compile the form into the rendered card and discover only after saving that the description wraps wrong, the cover crops badly, or the carousel order is wrong.

v9 collapses that round-trip. Admins flip a toggle and the live site becomes the editor. Each visible content surface — the title, body, infographic image, to-do list, topics, related links — gets editing affordances *in place*, on the same component the user sees. Structured properties that have no natural inline home (status, slug, layout flags) live in a properties panel that expands from the card itself.

The standalone content editor at `/admin/content/*` goes away. The other admin tools (topics, badges, quotes, color palette, recommended pins, media library) keep their dedicated pages — they edit cross-cutting taxonomies and resources that have no single inline home.

v9 also finishes the tag → topic rebrand that the existing `/topics/:slug` URL and "Filter by topic" aria-label started. After v9 no admin- or user-facing string says "tag"; the data layer (`tags` table, `Tag` interface) keeps its name and is rebranded later if it actually causes friction (§7). And v9 fixes the longstanding annoyance that every uploaded image lands in storage as `<uuid>.jpg` regardless of what the admin uploaded — new uploads get a sanitized version of the original filename (§13).

---

## 2. Problems

| Problem | Details |
|---|---|
| Editing is divorced from rendering | The current `content-editor.component` is a flat form with title / slug / body / cover / topics / links / template tasks fields. Nothing about the form looks like the resulting card. Authors save, navigate to `/content/:slug`, see the issue, navigate back to the editor, fix, save, refresh — a 4-step round-trip per visual tweak. The TODO_LIST locker-preview rebuild from v8.2 was a partial mitigation; v9 generalises it to every card type. |
| New-content flow is buried | Creating a new how-to means: log in → click admin badge in nav → land on `/admin/content` → click `+ New` → fill fields blind → save → click "View on site". Most authoring sessions are *adding* content, not editing existing rows; the current path treats it as a peripheral admin task. |
| Drafts are invisible from the site | Cards with `status='DRAFT'` are filtered out of every public listing. To see the draft of a card you're working on, you have to leave the site experience entirely (back to `/admin/content`). There is no way to preview a draft "as a logged-out user would see it" without flipping status, and no way to see a draft alongside published siblings on the How To page. |
| Two parallel surfaces, two render paths | Every card type has two render paths: the public component (e.g. INFOGRAPHIC carousel inside `content-viewer`, TODO_LIST in `todo-app`, ARTICLE Tiptap-rendered body) and the admin component (the matching branch of `content-editor`). They drift. v8.2 explicitly called out the gap for TODO_LIST (the editor didn't look like the rendered list); the same drift exists for INFOGRAPHIC (carousel) and ARTICLE (typography, max-width, prose styles). Eliminating the second path eliminates the drift. |
| Vocabulary drift between "tag" and "topic" | The URL `/topics/:slug` and the How To filter bar's `aria-label="Filter by topic"` already use "topic" as the user-facing word, but the admin nav says "Tags", inline labels say "Add tag", and the topic page header uses `tag.name` from the `Tag` model. v9 finishes the rename so admins and users see one consistent word. |
| Uploaded images have opaque UUID filenames | `StorageService.generateFilename(extension)` (defined as `UUID.randomUUID() + "." + extension`) means every uploaded image lands in storage and in URLs as something like `f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg`. The original filename is preserved as a `MediaAsset.filename` column for display, but the storage key, the URL stored on every content card, and what shows up in the S3 console are all UUIDs. Sharing an image URL conveys nothing; debugging in the S3 console requires cross-referencing the DB; CloudFront cache analytics are unreadable. |

---

## 3. Design Goals

- **One render path per card type.** The component the user sees *is* the component the admin edits. No second editor with parallel markup.
- **Editing is opt-in.** An admin browsing the site as a user must look identical to a logged-out user, so admin self-testing stays honest. Edit affordances appear only when an explicit toggle is flipped.
- **Inline first, panel second.** Anything visible in the rendered card is edited in the rendered card. Anything that isn't visible (slug, status, simpleLayout) lives in a panel that expands from the same card — never a separate page.
- **Existing admin pages keep their dedicated routes.** Topics, badges, quotes, color palette, recommended pins, and media library aren't card-scoped — they edit cross-cutting taxonomies. They stay where they are. Only the content editor collapses.
- **Backwards-safe with the existing API.** No schema changes. The existing admin endpoints (`/api/admin/content/*`) keep their contract; the frontend just calls them from a different shell.
- **One word for one concept.** Finish the tag → topic rename in every admin- and user-facing string. The data layer keeps its `tags` name for v9 (§7); the user never sees that.
- **Filenames carry meaning.** Uploads land at storage keys derived from the user's original filename or a typed title. No retroactive rename of UUID-named legacy assets — they keep working — but every new upload becomes self-describing.
- **No manual URL entry for images.** Anywhere an image is referenced on a content card — cover, thumbnail, infographic slides, infographic print versions, badge icons, content-body inline images — the URL is set via the media picker (or Upload-inside-picker), never typed into a text input. The `Tag` model and the data layer continue to store URLs as strings, but the admin UI never exposes a URL input field for images.

---

## 4. Edit-mode toggle

### Location and behaviour

A new "Edit Mode" pill button sits in `site-nav` in place of the current "Admin" button (when `isAdmin()` is true). Two states:

- **Off** (default): site looks and behaves identically to a logged-out user view. Drafts are filtered out, no edit affordances render, all interactions navigate normally.
- **On**: a thin sticky banner appears across the top of the page (`background: #fef3c7; border-bottom: 2px solid #d97706`) reading "Edit mode — changes are live"; the toggle pill turns solid amber; cards on every page render with their edit chrome (pencil button, drag handle, draft badge).

Toggling is instant and client-side only — no API call. The banner is the always-visible reminder that you're authoring, not browsing; the colour is deliberately loud to prevent accidental edits during a screen-share or demo.

### Persistence

Edit mode persists in `localStorage` under `hsht.editMode = '1'`. This means an admin who flips it on stays in edit mode across page reloads and tabs until they flip it off. Logging out clears the flag (alongside the existing session clear).

The flag is read on bootstrap by a new `EditModeStore` (see §16) that exposes a `signal<boolean>`. Components that need to react to the toggle subscribe to that signal in their templates.

### Keyboard shortcut

`?` brings up an existing-style help overlay (none today, deferred). v9 ships only the on/off button; keyboard shortcuts are a refinement once the workflow settles. Listed under §19.

### Visibility gating

The toggle pill renders only when `isAdmin()` is true. The banner and edit affordances render only when `isAdmin() && editMode()` is true — both are required, so a stale localStorage flag from a now-demoted account does nothing. The backend authoritative `@PreAuthorize("hasRole('ADMIN')")` on every save endpoint is what actually enforces the boundary; the frontend gating is UX only.

### What "edit mode" actually changes (the contract)

| Surface | Off | On |
|---|---|---|
| Listing pages (How To, Topic) | `getPublishedCards()` — public endpoint, drafts filtered | `adminListContent()` — admin endpoint, drafts included with badge |
| Content viewer | `getCardBySlug()` — public endpoint | `adminGetCard(id)` — admin endpoint, includes `bodyJson`, `status`, `simpleLayout` |
| Card chrome | normal | pencil button (top-right), drag handle (left edge), draft badge if applicable |
| Topic filter bar (How To) | normal click-to-filter | pills become drop targets for drag-to-topic; trailing `+ New topic` pill |
| Plus button | not rendered | `+ New how-to` tile at end of grid |
| Properties panel | n/a | expandable from each card |
| Sticky banner | hidden | visible |
| Save / discard bar | hidden | shown when any field is dirty |

This is the entire contract. If a surface isn't in this table, edit mode doesn't change it.

---

## 5. Inline editing on listings (How To, Topic, Home)

### What edit mode adds to a card on a listing page

Each card on `/how-to`, `/topics/:slug`, and `/` (home) gains three pieces of chrome when edit mode is on:

1. **Pencil button** — top-right corner of the card, absolute-positioned. Click navigates to `/content/:slug` and starts in editing-focused state (title focused, ready to type). The card body itself remains a normal link target — clicking the title or thumbnail still navigates as a user would, so the editor is reachable without forcing edit-mode users into a separate UX. The pencil is the explicit "I want to edit this" affordance.
2. **Drag handle** — left edge, `⋮⋮`. The handle is the drag *source* for the drag-to-topic gesture (§6) — grabbing it lifts the card so it can be dropped onto a topic pill in the filter bar. Drag-reorder of cards within the grid (changing `sort_order`) is a separate feature and stays deferred — see §19. Dropping a dragged card anywhere other than a topic pill snaps it back with no effect.
3. **Draft badge** — top-left corner if `status === 'DRAFT'`. Yellow pill reading "DRAFT". Cards with this badge are only visible in edit mode; they never appear in the off state.

### How To: per-topic card visibility

Today `how-to-page.component` calls `getPublishedCards()` and filters out the `about` and `help` topic slugs. In edit mode, it switches to a new admin endpoint `adminListContent({ excludeTopics: ['about','help'], includeDrafts: true })` and surfaces the draft badge on cards with `status === 'DRAFT'`.

The visible card count therefore differs between modes for the same admin user: edit mode shows N + drafts; off mode shows just N. This is correct — the whole point of edit mode is to surface unpublished work.

### The plus button on How To and Topic pages

A trailing `+ New how-to` tile sits at the end of the card grid in edit mode. See §10 for the full creation flow. (This creates a new *card*; creating a new *topic* is a separate gesture — see §6.)

### Home page

The home page is composed of `page_layouts` sections (curated, not just raw cards). Inline editing on the home page is *layout* editing rather than card editing — drag-reorder of sections, edit section title, change which cards appear. That's a bigger lift than card-scoped editing and doesn't fit the "expand the widget" model cleanly (a section is not a widget).

**v9 keeps the home-page section editor at `/admin/layouts/home`** (deferred — it doesn't exist today; today layout sections are edited via raw DB rows). Cards *within* a home-page section render normally and pick up the same inline pencil button as on listings, so editing the cards' content works inline on the home page even before layout-level editing is built.

---

## 6. Drag-to-topic and topic creation (How To page)

This section covers the two gestures that make the topic filter bar at the top of `/how-to` *active* in edit mode rather than just clickable.

### 6.1 Drag a card onto a topic pill to add the topic

When edit mode is on, the topic pills in the How To filter bar (currently click-to-filter) become drop targets in addition to their normal click behaviour. Grab a card by its `⋮⋮` drag handle, drag it over a topic pill, drop — the card is now tagged with that topic.

#### Behaviour

- **Click on a pill** — same as today. Filters the grid to that topic.
- **Drag a card over a pill** — pill highlights with a yellow halo and scales 1.05× to indicate it's a valid drop target. Pills the card already has stay highlighted in a *muted* style (subtle "already there" hint) and dropping on them is a no-op rather than a duplicate.
- **Drop on a pill** — adds the topic to the card's tag set. Calls the existing `PATCH /api/admin/content/{id}` (or the closest variant in the current admin API; if only PUT exists, send the merged card) with the new topic list. On success: a toast appears reading "Added 'Study Skills' to 'How to Study'" with an Undo button (5s). On error: revert and show error toast.
- **Drop anywhere else** — card snaps back, no effect. The grid does not become a drop target — drag-reorder of cards (sort_order) is deferred (§19).
- **The "All" pill** is not a drop target — dropping on it has no semantics and would just visually flicker. The pill is greyed out during drag.

#### Why immediate save (not via the dirty bar)

Drag-to-topic is a one-shot atomic action with no in-between editing state. Forcing it through the dirty-bar Save/Discard contract would mean a stray drop accidentally puts a card into "unsaved" limbo — confusing when nothing else on the page is being edited. Immediate save with an Undo toast matches the pattern image-replace already uses.

#### Mobile

Drag-and-drop on touch is awkward and rarely needed for an admin gesture. v9 does not implement touch DnD; on mobile, admins use the inline topic chip row on the card body (§8 — chip × to remove, `+ Add topic` to add). Listed under §19 as a refinement.

### 6.2 Create a new topic from the topic filter bar

A trailing `+ New topic` pill renders at the end of the topic filter bar in edit mode. Click → an inline popover anchored to the pill:

```
┌─────────────────────────────┐
│  Create new topic           │
├─────────────────────────────┤
│  Name        [ ___________ ]│
│  Description [ ___________ ]│
│                             │
│  [ Cancel ]      [ Create ] │
└─────────────────────────────┘
```

#### Fields

- **Name** (required) — the human-readable label. Slug is derived server-side (lowercase, hyphenated) with a collision suffix on conflict.
- **Description** (optional) — surfaced on the topic page header (`tag.description` field already exists).

`sortOrder` is set server-side as `(max(sort_order) + 1)` so the new pill appears last in the bar — admins reorder via the existing `/admin/topics` page if needed.

#### What the create call does

`POST /api/admin/tags` with `{ name, description? }`. The endpoint already exists (the current tag manager uses it) — no new backend code, just the popover UI calling it.

On success: the popover closes, `getAllTags` refetches in the background, the new pill appears at the end of the bar, and the popover surface flashes a brief "Created '{name}'" toast.

On 409 (duplicate slug): the popover stays open with a red message under the Name input ("A topic with this name already exists"). The admin can rename or cancel.

### 6.3 Why the topic bar is the right place for both gestures

Today the topic filter bar is the only spot on the page where every topic appears at once and where a card-to-topic mental model is already wired (clicking a pill filters cards by topic, so "card → pill" is already a thing the user does cognitively). Drop-on-pill and create-pill both extend that surface rather than inventing a new one. The bar already has the visual real estate for `+ New topic` because the pills are short and sit on a single row.

---

## 7. Tag → topic rename

### Scope

| Layer | Renamed in v9? | Notes |
|---|---|---|
| User-visible strings (page headers, aria-labels, button labels, chip text) | **Yes** | Every "Tag" / "tag" → "Topic" / "topic" |
| Admin nav label | **Yes** | "Tags" → "Topics" |
| Admin route path `/admin/tags` → `/admin/topics` | **Yes** | Plus a server-side redirect for `/admin/tags` → `/admin/topics` to keep bookmarked URLs working for one release |
| Existing `/topics/:slug` user URL | **No change needed** | Already named "topics" |
| Component file names that are *new in v9* (e.g. `topics-edit.component`, `topics-bar.component`) | **Yes** | New components ship under the new name |
| Component file names that *exist today* (`tag-manager.component`) | **Renamed** | Renamed to `topic-manager.component` since its sole purpose is the now-rebranded admin page |
| Frontend `Tag` TypeScript interface, methods like `getCardsByTag`, `getAllTags`, properties like `card.tags` | **No** | Renaming touches every consumer; cost outweighs benefit since these names never reach the user. Logged for a future code-cleanup pass |
| Backend `Tag` entity, `TagController`, `TagService`, `tag` Java package, `tags` DB table, `content_card_tags` join | **No** | Same reason. A future release can do a proper rename + Liquibase column rename if the dual vocabulary actually causes friction |
| API request/response field names (`tags: [...]` on a card payload, `tagIds: number[]` in upsert request, `excludeTags`, `tag.slug`) | **No** | Wire compatibility — old admin client posting against the new API and vice versa would break on a rename. Stays as-is |

### What admins see after the rename

- Admin nav: "Topics" (was "Tags")
- Admin page header on `/admin/topics`: "Topics" (was "Tags") with the existing CRUD UI relabelled accordingly
- Inline chip row on a content card: "Topics" header, "+ Add topic", chip-× tooltip "Remove topic"
- Filter bar on How To: unchanged ("Filter by topic" was already the aria-label); the trailing pill is new — `+ New topic`
- Topic page header on `/topics/:slug`: unchanged (already a topic)
- Toasts and confirmations: "Topic 'study-skills' deleted", "Added 'Study Skills' to 'How to Study'", etc.

### Why not rename the data layer too

Three concrete costs that outweighed the benefit:

1. **Wire compatibility.** Renaming the response field `tags` → `topics` is a breaking change for any cached frontend bundle, the admin export script, and the JSON files in `data/content-cards/*.json` (which use the field name verbatim). Compatible-rollout requires emitting both names for a window, then dropping `tags` — non-trivial.
2. **Liquibase rename of `tags` and `content_card_tags`.** Postgres `ALTER TABLE … RENAME` is straightforward but every JPA entity / `@Table(name=...)` / repository query needs to track. Plus rollbacks, plus the export/import scripts in `scripts/` that hard-code table names.
3. **Negligible payoff for users.** The user never sees the word "tag" in v9 once the UI rename lands. The remaining audience for "tag" is the developer reading code, who can cope with a one-paragraph note in CLAUDE.md.

A future release can do the full code rename if and when "tag in code, topic in UI" actually trips someone up. Listed under §19.

### CLAUDE.md addendum

Add a short note under the "Architecture" section explaining the dual vocabulary: data layer says `tag`, user-facing strings say `topic`. New code under `frontend/src/app/shared/inline-edit/` and the `topic-manager` page consistently says `topic`; entity / repository / DTO layers consistently say `tag`. The bridge happens at the component template level (a TS `Tag` is bound to a template that renders the word "Topic").

---

## 8. Inline editing on the content viewer

This is the centre of v9. The viewer at `/content/:slug` is currently strictly a render component; v9 makes every visible field editable when edit mode is on, using the same component instance. No second component, no `?edit=1` route variant — just conditional editing chrome that renders inside the existing template.

### Per card-type editing affordances

| Field | When edit mode off | When edit mode on |
|---|---|---|
| Title (every type) | `<h1>{{ card.title }}</h1>` | `<app-inline-title-edit [value]="card.title" (changed)="patchTitle($event)">` — single-line contenteditable, blur or Enter commits |
| Description (every type) | `<p>{{ card.description }}</p>` | Same `app-inline-title-edit` (multi-line variant), patches `description` |
| ARTICLE body | server-sanitized `bodyHtml` rendered through the existing `[innerHTML]` binding | Existing `app-tiptap-editor` mounted in place of the rendered HTML, seeded with `bodyJson` (or `bodyHtml` parsed). Toolbar floats at the top of the body card. Patches `bodyJson` + `bodyHtml` on debounced change |
| INFOGRAPHIC carousel | `<img>` per slide, click → lightbox | Each slide gains: a "Replace" button (opens `app-image-picker`), an alt-text inline edit below the image, a `⋮⋮` drag handle on the slide's bottom-right for reordering. A trailing `+ Add image` slide opens the picker for new entries. Click on the image still opens the lightbox. **No URL text input** anywhere on the slide |
| INFOGRAPHIC print URL | not visible inline | "Print version" pill per slide showing the print asset's filename (or a "Set print version" placeholder when empty); click opens `app-image-picker`. **No URL text input** |
| VIDEO embed | rendered iframe | iframe replaced with a single text input bound to `mediaUrl` (the YouTube URL — *not* an image, exempt from the no-URL rule), plus a thumbnail `Pick` button (which IS subject to the no-URL rule and opens `app-image-picker`). iframe re-renders below as a live preview |
| TODO_LIST card | rendered locker-style preview (already present from v8.2 work) | Renders the same shared `app-todo-list-view` component that the locker todo-app uses, configured in `mode='template'`. See §8.1 for the shared-component refactor that closes the v8.2 deferred follow-up |
| Cover image (above title) | `<img>` if present | Click on the cover opens `app-image-picker`; a small "Remove" button appears in the corner. **No URL text input** |
| Thumbnail (not visible on viewer) | n/a | Edited from the properties panel — the viewer doesn't render the thumbnail in user mode, so editing it inline has no visual surface |

### 8.1 Shared TODO_LIST presentation (`app-todo-list-view`)

v8.2 left a deferred follow-up: extracting a single presentational component used by both the locker todo-app and the admin TODO_LIST editor. v9 closes that. The two consumers today render the same visual treatment with parallel markup that has already drifted in places — v9 collapses them into one component so authoring a TODO_LIST card is *literally* the same UI surface the user sees, minus the instance-only affordances.

#### Component shape

`frontend/src/app/shared/todo-list-view/todo-list-view.component.ts`

```typescript
export type TodoListMode = 'instance' | 'template';

export interface TodoListViewTask {
  id: string;
  description: string;
  // Instance-only:
  done?: boolean;
  dueDate?: string | null;
}

@Input() mode: TodoListMode;
@Input() title: string;
@Input() backgroundColor: string;
@Input() textColor: string;
@Input() tasks: TodoListViewTask[];

@Output() titleChange = new EventEmitter<string>();
@Output() backgroundColorChange = new EventEmitter<string>();
@Output() textColorChange = new EventEmitter<string>();
@Output() taskAdded = new EventEmitter<{ description: string }>();
@Output() taskEdited = new EventEmitter<{ id: string; description: string }>();
@Output() taskReordered = new EventEmitter<{ from: number; to: number }>();
@Output() taskDeleted = new EventEmitter<{ id: string }>();
@Output() taskToggled = new EventEmitter<{ id: string; done: boolean }>();   // instance only
@Output() taskDueDateChanged = new EventEmitter<{ id: string; dueDate: string | null }>(); // instance only
@Output() done = new EventEmitter<void>();                                   // instance only — the green ✓ exit button
```

The component is purely presentational. It owns no persisted state — it emits events; the consumer mutates its store and feeds the new state back as inputs.

#### Mode-driven affordance differences

| Affordance | `mode='instance'` (locker) | `mode='template'` (admin TODO_LIST card) |
|---|---|---|
| Per-task checkbox | shown, toggles `done` | hidden — templates have no completion state |
| Due-date pill on each task | shown; tap opens `app-due-date-popover` | hidden — templates have no due dates |
| Drag-reorder via `⋮⋮` handle | shown | shown |
| Inline-title-edit on tasks | shown | shown |
| Swatch pickers for background/text colour | shown | shown |
| `+ Add task` row | shown | shown |
| Sort toggle (Name / Custom) | shown | hidden — templates have only one canonical order |
| Green ✓ "Done" header button (per CLAUDE.md rule) | shown — emits `done` event | hidden — admin save lives in the floating Save bar (§12), not on the card |
| Confirm-dialog on delete | shown | shown |

#### Consumer wiring

**Locker** (`pages/locker/apps/todo-app.component.ts`): becomes a thin wrapper. State lives in the existing locker stores and persists via the existing locker API. The wrapper:
- Subscribes to the active list's tasks and renders `<app-todo-list-view mode="instance" …>` with bound inputs.
- Translates `(taskToggled)`, `(taskAdded)`, etc. into the existing API calls.
- Owns the sort-mode signal that toggles between Name and Custom view (the shared component receives the already-sorted task array).
- The existing locker-app entry / exit animations and routing stay in the wrapper.

**Admin** (the new `frontend/src/app/shared/inline-edit/todo-list-edit.component.ts` from §16): a thin wrapper that renders `<app-todo-list-view mode="template" …>` bound to `dirtyCard()`'s `templateTasks` array. Outputs route into `EditModeStore.markDirty(...)`. The 50-task max from v8.2 stays — the admin wrapper enforces it before forwarding `(taskAdded)`.

#### What's gained

- One component to maintain. Future visual changes (e.g. updated swatch palette, new drag handle treatment) land in one place.
- The admin's TODO_LIST card looks *exactly* like the locker — not "locker-style", literally identical in mode='template' minus the instance-only chrome. Admins authoring a template see the live result of their edits without re-rendering through a parallel surface.
- The CLAUDE.md "green-circle ✓ Done button" rule continues to apply automatically wherever `mode='instance'` is used; templates skip it without restating the rule.

#### Migration safety

The locker todo-app's existing API contract, persistence model, and animations don't change. The refactor is structural — same component public behaviour, internals split into a presentational view + a stateful wrapper. Existing locker-instantiated lists must render identically before and after the refactor. The phase-11 gate (§18) requires explicit visual diff against today's locker render before merging.

### Auto-focus on entry

When the viewer is loaded with the `?edit=focus` query param (set by the listing-page pencil button) and edit mode is on, the title's inline editor is auto-focused on mount. This makes the pencil-from-listing path land the cursor where the admin most likely wants to type.

### Toolbar shadowing

Each editable surface gets a soft outline (`outline: 1px dashed rgba(217, 119, 6, 0.4)`) on hover when edit mode is on, so the affordances aren't hidden until interaction. The outline upgrades to a solid `outline: 2px solid #d97706` on focus.

### Topics

Topic chips are rendered today as a row of chip-style links. In edit mode each chip gains a small `×` to remove the topic, and a trailing chip-shaped `+ Add topic` opens an autocomplete input that searches existing topics. Typing a topic that doesn't exist exposes a "Create '{name}' as new topic" option which calls `POST /api/admin/tags`, then attaches the new topic to the card. Re-uses the existing topic autocomplete already in the content editor today.

### Related-content links

Today's editor has a "links" section binding to `content_card_links`. In edit mode the inline render of related links (the `[Pair with...]` block at the bottom of a card) gains the same controls: re-order, remove, search-and-add another card. Same UI as the existing editor's link list, just rendered alongside the live link block instead of in a separate form.

### Template tasks (TODO_LIST)

The TODO_LIST viewer renders the shared `app-todo-list-view` component in both modes — `mode='template'` (admin authoring on the content viewer) and `mode='instance'` (the locker todo-app). v9 closes the v8.2 deferred follow-up by extracting the shared component; the admin's editor and the locker's renderer become the same UI surface configured differently. See §8.1 for the full refactor.

### Save trigger

Every inline edit marks the card as dirty in the `EditModeStore`. The floating Save / Discard bar at the bottom-right of the viewport (see §12) lets the admin commit or revert. There is no auto-save and no per-field save button — one explicit Save flushes everything.

(Drag-to-topic from §6 is the *exception* — it commits immediately with an Undo toast rather than going through the dirty bar, since it's an atomic one-shot action with no other in-flight editing.)

---

## 9. The expanded properties panel

Some fields don't have a visible surface to edit inline:

- `status` (DRAFT / PUBLISHED)
- `slug` (the URL key — visible only as part of the URL bar)
- `simpleLayout` (boolean rendering flag)
- `cardType` (rarely changed but possible during early authoring)
- `thumbnailUrl` (used on listing pages, not visible on the viewer itself)
- `coverImageUrl` (visible on the viewer but already inline-editable per §8)
- `backgroundColor` / `textColor` (TODO_LIST only — already inline-editable via swatch pickers)

These live in a **properties panel** that expands from a small "⚙ Properties" pill in the top-right corner of the viewer (just below the pencil-equivalent area, since on the viewer there's no pencil — the viewer *is* the pencil target).

### Behaviour

- The pill is always visible in edit mode.
- Click toggles the panel — slides down from below the pill, anchored to the right side of the content card.
- Panel is a vertical stack of structured form fields with the same look as today's content editor's right column.
- Panel shares the same dirty-state contract as inline edits — changing `status` from DRAFT to PUBLISHED marks the card dirty; the floating Save bar appears.
- ESC closes the panel; clicking outside the panel does not close it (avoids losing in-flight unsaved changes).

### Why a panel, not separate inline edits

Status, slug, and simpleLayout are *meta* about the card — they don't have a natural visual surface to edit inline. Pretending they do (e.g. an inline-edit on the URL bar for slug) is more confusing than honest. The panel is the right place for "things about the card that aren't part of the card's visible content".

### Panel content

```
┌─────────────────────────────────┐
│  ⚙ Properties                   │
├─────────────────────────────────┤
│  Status                         │
│  ◯ Draft  ●  Published          │
│                                 │
│  Slug                           │
│  [ how-to-study ]               │
│  ⚠ changing this breaks         │
│    incoming links               │
│                                 │
│  Card type                      │
│  [ ARTICLE ▾ ]                  │
│                                 │
│  Thumbnail                      │
│  [ preview ] [ Pick ] [ Upload ]│
│                                 │
│  Simple layout                  │
│  ☐ Hide nav arrows / topic bar  │
│                                 │
│  ─── Danger zone ───            │
│  [ Delete card ]                │
└─────────────────────────────────┘
```

### Delete

The properties panel has a "Delete card" button. Clicking opens an `app-confirm-dialog` with the card title in the body. Confirming calls `adminDeleteCard(id)` and navigates to `/how-to`. Delete is destructive and does not pass through the dirty-state bar.

---

## 10. Creating new content (the plus button)

### Where the plus button lives

A `+ New how-to` tile renders at the **end** of the card grid on `/how-to` and `/topics/:slug` when edit mode is on. Same dimensions as a normal content card; dashed border, a `+` icon centred, and the label "New how-to" (or "New {topic.name}" on a topic page).

A homepage equivalent is **deferred** — see §19. Plus-on-home requires deciding which section the new card joins, which is layout territory.

### Click flow — type dropdown, no popover

Click the tile → a small dropdown opens *anchored to the tile* listing the four card types:

```
┌──────────────────────────────┐
│  + New how-to                │  ← the tile
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│  📄  Article                 │
│  🖼   Infographic             │
│  ▶   Video                   │
│  ☑   To-do list              │
└──────────────────────────────┘
```

Click a type → the card is **created immediately** as a draft of that type, and the browser navigates to its viewer in edit mode with the title focused. There is no Title input on the way in — the title gets typed *into the live card*, in place where it'll appear, which is the WYSIWYG point.

Click outside the dropdown or hit ESC → dropdown closes, no card is created.

### Why a dropdown, not a popover

Each card type renders a different editing surface, and the popover-then-create pattern showed those surfaces only *after* creation. With the dropdown the admin's mental model is "I'm making an infographic", they pick "Infographic", and they land on the empty infographic — carousel placeholder, alt-text inputs, print-version controls — exactly the shape they're about to fill in. The Title input was always going to be the very next thing they typed; making it the inline title on the live card is one fewer field with the same effect.

### What each blank card looks like immediately after creation

| Type | Blank state on arrival |
|---|---|
| Article | Empty title (focused), empty Tiptap body block with placeholder "Start writing…", empty Topics row, empty Related links row |
| Infographic | Empty title (focused), empty carousel with a single `+ Add image` placeholder slide, empty Topics row |
| Video | Empty title (focused), empty `mediaUrl` input with placeholder "Paste a YouTube URL…", thumbnail `Pick` button, empty Topics row |
| To-do list | Empty title (focused), `<app-todo-list-view mode="template">` with the default background/text colours, empty task list with a `+ Add task` row, empty Topics row |

Topics row on a topic page comes pre-populated with the current topic chip (auto-tagged); on How To it's empty.

### Slug placeholder

The card needs a slug at create time because the URL is `/content/:slug`. Without a title there's nothing to derive from, so the server generates a placeholder slug `{cardtype}-{4-char-random}` (e.g. `article-a3f9`, `infographic-c401`). The slug is shown in the properties panel and the admin can rename it there.

**Auto-derive on first save with a title**: if the slug is still the auto-generated placeholder (matching the regex `^(article|infographic|video|todo-list)-[a-z0-9]{4}$`) AND the title is non-empty, the server replaces the slug with one derived from the title (with the standard collision-suffix logic) on Save. After that first save, the slug is "owned" — admin must rename via the properties panel; no further auto-derivation. This means the typical authoring flow (pick type, type title, hit Save) lands at a clean URL without any slug touch; the placeholder URL only persists for cards the admin abandoned before titling.

### What the create call does

`POST /api/admin/content` with `{ cardType }` and (on topic pages) `{ tagIds: [activeTopicId] }`. Server fills in: `title=""`, `slug=<placeholder>`, `status='DRAFT'`, all other fields null/default. Response is the full card, ready for the inline editor to render.

The existing endpoint accepts `UpsertContentCardRequest` with most fields nullable; the new behaviour is allowing missing `title` and `slug` and computing the placeholder slug server-side. Same skeleton-create behaviour the previous popover required, just with title now optional too.

### After creation

The browser navigates to `/content/{placeholderSlug}?edit=focus`. The viewer renders the empty card per the table above. The title's inline editor is auto-focused. Edit mode is already on. Status is DRAFT.

The `+ New how-to` tile stays at the end of the grid for the next creation. Abandoned drafts (admin clicks a type then navigates away without typing anything) accumulate as DRAFT cards with placeholder slugs and empty titles; they're filtered from public listings and visible in edit mode with the DRAFT badge for the admin to clean up.

---

## 11. Drafts and admin-only data

### What "draft" means in v9

Today, the public content API filters `status='DRAFT'`; the admin API does not. v9 keeps that contract — drafts are not served to public callers — and adds a UX layer:

- Listings called via `adminListContent` (i.e., the listing page when edit mode is on) include drafts, marked with the yellow "DRAFT" badge on the card chrome.
- The viewer called via `adminGetCard` (i.e., the viewer when edit mode is on) renders the full card regardless of status, with a sticky "DRAFT — not published" pill below the title.
- Toggling `status` to PUBLISHED in the properties panel and saving makes the card appear in user-mode listings on the next render.

### What edit mode does NOT change

- Database schema — no `is_admin_visible` column or similar. Status stays as the single source of truth.
- Public API surface — `/api/content/*` continues to filter drafts. Admins fetch drafts via `/api/admin/content/*`.
- Auth — the JWT role check on `/api/admin/*` endpoints is unchanged. An admin with edit mode off but visiting an admin URL directly still gets the admin response; edit mode is purely a frontend convenience.

### Linking to drafts

Sharing the URL of a draft card to a non-admin returns the public 404 (because public viewer calls `getCardBySlug` which filters drafts). This is the right behaviour — drafts shouldn't leak. An admin sharing the URL with another admin works because the recipient's frontend, on detecting `isAdmin()`, falls through to the admin endpoint.

The fall-through logic: `content-viewer` first tries `getCardBySlug` (public). On 404, *if* `isAdmin()`, it retries `adminGetCardBySlug(slug)`. This handles both "draft I'm authoring" and "draft I just got a link to from another admin".

A new `GET /api/admin/content/by-slug/{slug}` is required — today the admin endpoint is keyed on numeric ID. Listed in §15.

---

## 12. Save model and dirty state

### Dirty tracking

Every inline edit mutates a *draft* copy of the card held in `EditModeStore.dirtyCard()`. The original card from the API stays untouched in the viewer's `card()` signal. UI binds against `dirtyCard() ?? card()` so edits are visible immediately without reloading.

A computed `isDirty()` returns true when any field on `dirtyCard()` differs from `card()`. The floating Save / Discard bar renders only when `isDirty()` is true.

### The bar

Bottom-right floating bar, fixed-position, rendered once at the app shell level:

```
┌─────────────────────────────────────┐
│  Unsaved changes  [Discard] [Save]  │
└─────────────────────────────────────┘
```

- **Save**: posts the merged `dirtyCard()` payload to the admin save endpoint, on success replaces `card()` with the response and clears `dirtyCard()`.
- **Discard**: clears `dirtyCard()`. UI snaps back to the saved state. No confirmation prompt — discarding a few minutes of inline edits is annoying but recoverable; the prompt friction is worse than the loss.

### Why not auto-save

A contenteditable losing focus mid-thought saves a half-finished edit. Tab-switching during research saves whatever was on screen. The v9 dirty-bar pattern is what Notion-like editors use for the same reason — explicit Save preserves the author's mental model of "I'm typing draft text" vs "I'm done".

The one auto-save case worth considering — Tiptap article body — is handled by debouncing the dirty-set call (not the API call) by 500ms. Typing into the article body sets the dirty flag *after* a brief pause, which is enough to trigger the Save bar but doesn't post to the API until the admin clicks Save.

Drag-to-topic (§6) and topic creation are *exempt* from the dirty-bar contract — they commit immediately. They are atomic one-shot actions with no other in-flight editing state, so the dirty-bar overhead is wrong for them. Image upload via `app-image-picker` (§13) is similarly immediate (matches existing v8 behaviour).

### Optimistic updates

Save applies to the local card optimistically: `card()` is set to the dirty payload before the API call returns. On error (network, 409 conflict, 422 validation), the change is reverted and a toast shows the error. This makes Save feel instant for the typical case where it succeeds.

### Conflict handling

If two admins edit the same card concurrently, last-write-wins. v9 does not version cards or detect conflicts. The risk is small (one-author site, occasional collaboration) and the cost of CRDT/OT is large. If it becomes a real problem, a future release can add an `If-Match` header on the save call against `updated_at`. Listed under §19.

### Navigation guards

Navigating away with `isDirty() === true` triggers a `beforeunload` warning ("You have unsaved changes"). In-app navigation hooked into the Angular router triggers a `confirm()` dialog with the same message; cancelling stays on the page, confirming discards and navigates.

---

## 13. Image management

This section is the unified plan for how admins find, upload, name, attach, and reuse images in v9. It covers four threads:

1. **Image library rename** — the existing "Media Library" admin page is renamed to "Image Library" (UI + route, not data layer).
2. **Human-readable storage filenames** — new uploads land at storage keys derived from a sanitized canonical name, not UUIDs.
3. **Title input on upload** — the upload UI exposes an optional title that overrides the OS filename for the canonical name.
4. **Same-name uploads are rejected, not auto-suffixed** — 409 with the existing asset returned so the admin can pick "Use existing" or rename.
5. **No manual URL entry for images anywhere** — every image reference on a card is set via the picker, never typed into a URL text input.

The dedicated admin page at `/admin/images` (renamed from `/admin/media`) is the centre of gravity. Inline upload paths from the content viewer all flow through the same picker / popover the library page uses.

### 13.1 Image library rename

The admin page at `/admin/media` is renamed to `/admin/images`. UI strings change from "Media Library" to "Image Library" everywhere:

| Layer | Renamed in v9? | Notes |
|---|---|---|
| Admin nav label | **Yes** | "Media Library" → "Image Library" |
| Frontend route path `/admin/media` → `/admin/images` | **Yes** | Plus a redirect for `/admin/media` → `/admin/images` (parallel to tags → topics in §7), removed in v10 |
| Component file paths (`admin/media/media-library.component`, `admin/media/media-picker.component`) | **Renamed** | Move to `admin/images/image-library.component` and `admin/images/image-picker.component`. Selectors change from `app-media-picker` → `app-image-picker`, etc. |
| API routes (`/api/admin/media`, `/api/admin/images/upload`) | **No** | Backend stays `media` for the asset CRUD endpoints to avoid wire churn; the existing `/api/admin/images/upload` already says "images" anyway. Inconsistency in the API surface is logged for a future cleanup |
| Backend `MediaAsset`, `MediaAssetService`, `MediaAssetRepository`, `MediaAssetController`, `media_assets` table | **No** | Data-layer name unchanged. Same dual-vocabulary pattern as tag/topic (§7). Documented in CLAUDE.md |
| Frontend `media-api.service.ts`, `MediaAsset` interface | **No** | Same — data-layer stays |

The CLAUDE.md addendum from §7 grows a second paragraph: data layer says `media`, user-facing strings say `image`. The bridge is the component template / page label.

### 13.2 Current state of filenames

`StorageService.generateFilename(extension)` is defined as `UUID.randomUUID() + "." + extension` (`StorageService.java:10–12`). Every image upload — thumbnail, cover, infographic image, content body image, badge icon — calls this and lands at a key like `uploads/images/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg`. The original filename is captured into `MediaAsset.filename` as a metadata column for display, but never surfaces in the storage key, the URL stored on the content card, the S3 console listing, or CloudFront cache analytics.

### Proposed change

Derive the storage filename from a sanitized canonical name. The canonical name comes from one of two sources, in order of preference:

1. An optional **title** the admin types in the upload UI (e.g. "Study Tips Cover") — the same field the user sees as "Title (optional)" alongside the file picker.
2. The upload's `MultipartFile.getOriginalFilename()` (e.g. `IMG_2354.jpg`) — used when no title is provided.

Either source goes through the sanitization rules below. Result: `uploads/images/study-tips-cover.jpg` instead of `uploads/images/<uuid>.jpg`. The legacy UUID-named assets are not touched — they keep working — but every new upload becomes self-describing, and the admin gets exactly the filename they asked for or a clear error if it's already taken.

### Sanitization rules

Applied in order against the canonical name source (typed title if present, otherwise the original filename):

1. Strip everything before the last `/` or `\` (path traversal hygiene).
2. Drop the extension portion (everything after the last `.`); the canonical extension is re-derived from the validated content type (so a user can't upload `bad.exe` renamed to `good.png` and end up with a `.exe` URL).
3. Lowercase.
4. Replace any run of non-`[a-z0-9-]` characters with a single `-`.
5. Trim leading and trailing `-`.
6. Truncate to 64 characters.
7. If the result is empty (e.g. all-Unicode original, file with no name), fall back to `image`.
8. Append the canonical extension: `<sanitized-name>.<ext>`.

#### Examples

| Source (typed title, else OS filename) | Canonical filename |
|---|---|
| Title `Study Tips Cover`, OS file `IMG_2354.jpg` | `study-tips-cover.jpg` |
| (no title), OS file `IMG_2354.PNG` | `img-2354.png` |
| (no title), OS file `chart.png` | `chart.png` |
| Title `My Vacation Pic 2025`, OS file anything `.jpeg` | `my-vacation-pic-2025.jpeg` |
| (no title), OS file `../../../etc/passwd.png` | `etc-passwd.png` (path stripped, extension validated) |
| (no title), OS file `файл.png` | `image.png` (non-ASCII collapses to empty → fallback) |
| Title `   `, OS file `chart .with    spaces!!.png` | `chart-with-spaces.png` (blank title falls through to OS filename) |
| (no title, no OS filename) | `image.png` (or whatever the content type maps to) |

### Same-name uploads are rejected

After sanitization, the storage layer checks whether `<subfolder>/<filename>.<ext>` already exists. If it does, the upload is **rejected** with a 409 Conflict — no auto-suffix, no silent overwrite. Filenames are predictable: what the admin types is exactly what they get, or the upload fails.

| Sequence | Result |
|---|---|
| Upload `chart.png` (first) | Stored at `uploads/images/chart.png`; success response |
| Upload `chart.png` (second) | 409 Conflict; existing asset's URL returned in the body |

The check is a `Files.exists` on local storage and an `S3Client.headObject` on S3. Both are cheap; the rejection path is the rare case.

#### Conflict response

The 409 body carries the conflicting asset so the frontend can offer a useful choice:

```json
{
  "error": "Filename conflict",
  "message": "An image named 'chart.png' already exists.",
  "existingUrl": "/uploads/images/chart.png",
  "existingAssetId": 142
}
```

The frontend opens an `app-upload-conflict-modal` showing the existing asset's thumbnail with two actions:

- **"Use existing"** — closes the modal and treats the upload as if the admin had picked the existing asset (sets the target field to `existingUrl`). No new upload happens.
- **"Cancel"** — closes the modal. The admin can rename the source file and try again, or delete the existing asset from `/admin/media` first if they want to replace it with new bytes.

Forced overwrite (replace bytes at the same URL) is **not** offered in v9 — every card that references the URL would silently get the new bytes, which is exactly the surprise the rejection was supposed to prevent. Listed under §19 as a future refinement.

#### Race condition

Two simultaneous uploads of `chart.png` could both pass the existence check and both write to S3 / local with last-write-wins on the bytes. The `media_assets` unique-on-URL constraint catches the duplicate row at INSERT time, so the second `recordExisting` call no-ops, but the bytes have already been overwritten. Mitigations considered and rejected:

- **S3 `If-None-Match: "*"` conditional put** — atomically rejects if the key exists. Solves the S3 case but not local; would require a backend-specific code path. Worth doing if it becomes a real problem.
- **Distributed lock** — wildly oversized for a one-author site.

The race is bounded: two admins uploading the same filename within milliseconds of each other is rare enough to accept last-write-wins on bytes, matching the v9 conflict policy on content cards (§12). Listed under §19.

### Thumbnails

`ImageUploadController.upload` generates a thumbnail under `uploads/thumbs/` using the same filename as the source. The thumbnail upload **skips** the collision check — the source's name was already validated as free, so the matching `uploads/thumbs/<name>.jpg` is by construction also free for v9-era uploads. (If an admin has manually placed a file at the thumb-side path by accident, it gets overwritten — matches today's behaviour.) Single point of truth: only the source upload can cause a 409.

### Existing assets

UUID-named files in storage stay where they are. No backfill, no rename. The `media_assets` table is unchanged. Over time the library naturally rebrands as new uploads come in.

If the admin really wants a UUID asset to have a human-readable name, the path is: re-upload the original with a meaningful filename (gets a clean URL), update any cards that referenced the old URL, then delete the UUID asset from `/admin/media`. v9 does not automate that flow — listed under §19.

### Storage interface change

`StorageService.generateFilename(String extension)` becomes `StorageService.generateFilename(String canonicalName, String extension, String subfolder)`. The `canonicalName` is whichever of (typed title, OS filename) the controller chose; the `subfolder` parameter is required because the existence check must scope to the destination subfolder.

```java
default String generateFilename(String canonicalName, String extension, String subfolder) {
    String base = sanitize(canonicalName);          // §13 sanitization rules
    String candidate = base + "." + extension;
    if (objectExists(subfolder + "/" + candidate)) {
        throw new FilenameConflictException(
            subfolder + "/" + candidate,
            buildPublicUrl(subfolder + "/" + candidate)
        );
    }
    return candidate;
}

// New helper that backends must implement:
boolean objectExists(String key);
```

`FilenameConflictException` is a new exception in the `storage` package carrying the conflicting key and existing public URL. `ImageUploadController` catches it (or relies on a `@ControllerAdvice` handler) and returns a 409 with the body shape from the §13 conflict response.

`LocalStorageService.objectExists(key)` does `Files.exists(Paths.get(mediaPath, key))`. `S3StorageService.objectExists(key)` does `s3Client.headObject(...)` and treats `NoSuchKey` as `false`.

### Controller call sites

`ImageUploadController.upload`, `uploadContentImage`, `uploadBadgeIcon` each gain an optional `title` request parameter and resolve the canonical name from `(title, file.getOriginalFilename())`:

```java
@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ImageUploadResponse upload(
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "title", required = false) String title) {
    validate(file);
    byte[] originalBytes = readBytes(file);
    String contentType = file.getContentType();
    String canonicalSource = (title != null && !title.isBlank())
            ? title
            : file.getOriginalFilename();
    String filename = storageService.generateFilename(
            canonicalSource, extensionFor(contentType), "images");
    String imageUrl = storageService.upload(originalBytes, filename, contentType, "images");
    // … existing thumbnail + recordExisting calls …
}
```

(Three sites total, one per endpoint. All three accept the same optional `title` param.)

### Upload UI: title input + conflict handling

Every place that uploads an image — inline cover, thumbnail, infographic image, content body image, badge icon, the media-library upload button — routes through a new shared `app-image-upload-popover` component. The popover opens after the admin picks a file (browser file dialog) and before the upload happens.

```
┌─────────────────────────────────────────┐
│  Upload image                           │
├─────────────────────────────────────────┤
│   ┌───────────────┐                     │
│   │  thumbnail    │  IMG_2354.jpg       │
│   │  preview      │  2.1 MB · JPEG      │
│   └───────────────┘                     │
│                                         │
│   Title (optional)                      │
│   [ Study Tips Cover                  ] │
│                                         │
│   Filename will be:                     │
│     study-tips-cover.jpg                │
│                                         │
│   [ Cancel ]              [ Upload ]    │
└─────────────────────────────────────────┘
```

#### Behaviour

- **Title (optional)** — defaults to empty. Placeholder text: "e.g. Study Tips Cover".
- **Filename will be: …** — live preview that runs the §13 sanitization on whichever of (typed title, OS filename) is currently the canonical source. Updates as the admin types. If the title is blank, the preview shows the OS-filename-derived value, so the admin sees exactly what's about to be saved.
- **Upload** — POSTs the file + title to `/api/admin/images/upload`. On 200, the popover closes and the URL is returned to the caller (sets the inline field, the picker, etc.).
- **On 409 conflict** — the popover stays open, the title input gets a red ring, and a message appears below the live preview:
  ```
  ⚠ A file named 'study-tips-cover.jpg' already exists.
     [ Use existing ]   (or rename above and try again)
  ```
  Clicking "Use existing" closes the popover with `existingUrl` from the 409 body — same effect as if the admin had picked that asset from the media library.
- **Cancel** — discards everything; no upload, no field change.

#### Why the popover, not a flat conflict modal

The popover is the single surface for the entire upload interaction. Same component handles the happy path (type optional title, click Upload) and the conflict path (rename inline). No separate modal opens "after" upload. This keeps the rename-after-conflict flow inside the same context the admin started in.

#### Where the popover replaces existing UI

Today's inline upload paths (cover, thumbnail, infographic image, badge icon, content body image, library upload) all invoke `app-media-picker` (today) / `app-image-picker` (v9) and its "Upload" button immediately fires the multipart request. v9 inserts the popover between the file pick and the request. The picker modal's "Upload" button opens the popover. Tiptap's image insertion (drag-drop or button) opens the popover too.

### Why no flag

This is a strictly better default for new uploads and doesn't touch existing assets, so a feature flag would only complicate rollout. Ship it on by default.

### 13.3 No manual URL entry for images

The corollary of the upload pipeline above: anywhere an image is referenced on a content card, the admin sets the URL by **picking**, not by **typing**. No URL text input anywhere for image fields. The library is always the source.

#### Affected fields

| Field | Today | After v9 |
|---|---|---|
| `coverImageUrl` (article cover) | text input + Pick + Upload buttons (v8.3) | thumbnail preview + `[ Pick ] [ Upload ]` buttons. No URL text input |
| `thumbnailUrl` (listing thumbnail) | text input + Pick + Upload buttons (v8.3) | thumbnail preview + `[ Pick ] [ Upload ]` buttons in the properties panel |
| INFOGRAPHIC `mediaUrls[].url` | text input per slide + Pick + Upload buttons (v8.3) | thumbnail preview per slide + `[ Replace ]` button (opens picker) + `+ Add image` slide (opens picker). No URL text input |
| INFOGRAPHIC `mediaUrls[].printUrl` | text input per slide + Pick + Upload buttons (v8.3) | small "Print version" pill per slide; click opens picker. The pill shows the *filename* of the print asset (`study-tips-print.pdf`), not the URL |
| Badge icon on `/admin/badges` | text input + Pick + Upload buttons (v8.3) | thumbnail preview + Pick / Upload buttons. No URL text input |
| Tiptap content body inline image | image-insert button → URL prompt (today's Tiptap default) | image-insert button opens `app-image-picker`. Drag-drop also routes through the picker (the dropped file goes through the upload popover with the title field). No URL prompt |

#### What about read-only URL display?

For debugging clarity, the **filename** of the picked asset is shown next to the thumbnail (e.g. `study-tips-cover.jpg`) so the admin can see *what* they picked. The full URL is not shown — it's an implementation detail.

#### Tiptap-specific notes

Tiptap's stock image extension prompts for a URL via a `prompt()` dialog. v9 replaces it with a custom node-view (or a thin wrapper extension) whose insert button opens `app-image-picker`. Drag-and-drop of a local file into the editor opens the upload popover (same as the picker's Upload), then inserts the resulting URL. There is no path for Tiptap to render an `<img>` whose `src` was typed by the admin.

#### What still uses text inputs (not images)

- `slug` — admin types it
- `mediaUrl` on VIDEO cards (YouTube link) — admin types or pastes the YouTube URL. Not an image; not affected by this rule
- `title`, `description`, ARTICLE body — typed
- Topic name on creation — typed
- Image upload "Title (optional)" — typed (but it's a sanitized filename input, not a URL)

The rule is precisely: **image URL fields** are never typed. Every other text field stays as it is.

---

## 14. Slimmed-down `/admin`

The admin shell at `/admin` survives. Three things change:

1. **Content list and editor routes are removed** — `/admin/content`, `/admin/content/new`, `/admin/content/:id/edit` are deleted. The components (`content-list.component`, `content-editor.component`) are deleted from the codebase. Subcomponents that are still useful inline (`tiptap-editor`, infographic image-list editor) are extracted into shared components under `frontend/src/app/shared/inline-edit/` and imported by the viewer. The TODO_LIST editor markup is replaced by the shared `app-todo-list-view` (§8.1) used in `mode='template'`.
2. **The admin nav drops "Content" and renames "Tags" to "Topics"** — the sidebar in `admin-shell.component.html` removes the "Content" link. The "Tags" link's label becomes "Topics" and its `routerLink` points to `topics` (renamed from `tags`).
3. **The shell becomes a "Control Panel"** — the title in the sidebar changes from "Admin" to "Control Panel"; the home `redirectTo` shifts from `'content'` to `'topics'` (most-frequent destination among the remaining tools). The `← Site` back-link stays.

What lives in `/admin`:

| Route | Purpose | Why it can't be inline |
|---|---|---|
| `/admin/topics` (renamed from `/admin/tags`) | Topic CRUD | Topics are cross-cutting; editing a topic affects every card using it. No single card is the right home |
| `/admin/quotes` | Locker quote library | Quotes are surfaced via random sampling on the locker, not on a content card |
| `/admin/badges` | Earned-badge taxonomy | Same — badges are not card-scoped |
| `/admin/color-palette` | Default colour swatches | Edits a system-wide palette, not a card |
| `/admin/recommended-pins` | Curated locker shortcut suggestions | Shortcut catalogue, not card-scoped |
| `/admin/images` (renamed from `/admin/media`) | Image Library (renamed from Media Library) — v8.3 facility, v9 polish | Cross-card asset index. Inline picking still uses the picker modal, now `app-image-picker` |

A redirect at `/admin/tags` → `/admin/topics` is wired in `admin.routes.ts` for one release so bookmarked URLs continue to work; removed in v10. Same pattern for `/admin/media` → `/admin/images`.

Future additions (users, audit logs, system settings) land in this shell.

---

## 15. Backend changes

| Change | Component / File |
|---|---|
| Add `GET /api/admin/content/by-slug/{slug}` mirroring `/api/content/by-slug/{slug}` but skipping the published-only filter, so the admin viewer can fall through to it when the public call 404s on a draft | `ContentCardAdminController.java` |
| Add `POST /api/admin/content` skeleton-create variant: when the request body has only `title` and `cardType`, fill defaults — `slug` from a slugified title (with collision-suffix), `status='DRAFT'`, all other fields null — and return the created card. The current endpoint already accepts an `UpsertContentCardRequest` with most fields nullable; the change is allowing missing `slug` and computing it server-side, plus a 409 + suffix-retry loop on slug collisions | `ContentCardService.java`, `ContentCardAdminController.java` |
| Confirm `DELETE /api/admin/content/{id}` exists and cleanly cascades `content_card_links`, `content_card_tags`, `content_card_tasks`, and `media_assets` usage rows. Add the missing cascades if not already present | `ContentCardAdminController.java`, `ContentCardService.java` |
| Confirm `POST /api/admin/tags` accepts `{ name, description? }` and computes slug + sortOrder server-side. Used by the in-page topic-create popover (§6). The endpoint already exists and accepts these fields; verify behaviour and add the sortOrder server-side default if missing | `TagController.java`, `TagService.java` |
| Confirm `POST /api/admin/content/{id}/topics` (or the equivalent on the existing Upsert endpoint) supports adding a topic to a card without rewriting the entire card. Used by drag-to-topic (§6). If only the full upsert endpoint exists, drag-to-topic posts the merged card | `ContentCardAdminController.java` (verify) |
| Replace `StorageService.generateFilename(extension)` with `generateFilename(canonicalName, extension, subfolder)`. Implement sanitization per §13 and **throw `FilenameConflictException` on existing key** (no auto-suffix). Add `boolean objectExists(String key)` to the interface and implement in both backends. Add the new `FilenameConflictException` class in the `storage` package | `StorageService.java`, `LocalStorageService.java`, `S3StorageService.java`, `FilenameConflictException.java` (new) |
| Update all three `ImageUploadController` endpoints to accept an optional `title` form param, resolve the canonical name as `title?.trim() ?: file.originalFilename`, and pass it to `generateFilename`. Map `FilenameConflictException` to a 409 response with body `{ error, message, existingUrl, existingAssetId }` (look up `existingAssetId` from `MediaAssetRepository.findByUrl`) | `ImageUploadController.java`, optional `@ControllerAdvice` |
| No changes to public endpoints. Edit mode is a frontend toggle only. | — |

No database changes. v9 is purely a UX rewrite over the v8.3 schema. The `tags` table and `Tag` entity keep their names (§7).

---

## 16. Frontend changes

### New code

| File | Description |
|---|---|
| `frontend/src/app/core/edit-mode/edit-mode.store.ts` | Signal-based store. State: `enabled` (bool), `dirtyCard` (Partial<ContentCard> \| null), `lastError` (string \| null). Methods: `toggle()`, `enable()`, `disable()`, `markDirty(patch)`, `discard()`, `commit(savedCard)`. Hydrates `enabled` from `localStorage.hsht.editMode`. Cleared on session logout |
| `frontend/src/app/shared/edit-mode-toggle/edit-mode-toggle.component.ts` | The pill button. Reads `isAdmin` from `SessionStore` and `enabled` from `EditModeStore`. Replaces the existing `Admin` link in `site-nav` for admins; non-admins see nothing |
| `frontend/src/app/shared/edit-mode-banner/edit-mode-banner.component.ts` | The amber sticky banner across the top. Rendered in `app.component.html` at the root level so it appears on every route |
| `frontend/src/app/shared/edit-mode-bar/edit-mode-bar.component.ts` | The floating Save / Discard bar. Bottom-right, fixed-position, rendered in `app.component.html` |
| `frontend/src/app/shared/inline-edit/article-body-edit.component.ts` | Wraps `tiptap-editor` for inline use on the viewer's article render — sized to match the read view, toolbar floats at the top of the body card |
| `frontend/src/app/shared/inline-edit/infographic-images-edit.component.ts` | Multi-image list editor (Pick / Upload / drag / delete) — extracted from the `INFOGRAPHIC` branch of `content-editor` |
| `frontend/src/app/shared/todo-list-view/todo-list-view.component.{ts,html,scss}` | The new shared presentational component (§8.1). Pure inputs/outputs, no persistence. Drives both the locker todo-app and the admin TODO_LIST inline editor via a `mode` input |
| `frontend/src/app/shared/inline-edit/todo-list-edit.component.ts` | Thin admin wrapper around `<app-todo-list-view mode="template">` bound to `dirtyCard()`'s template-task array; routes outputs into `EditModeStore.markDirty(...)` and enforces the 50-task max |
| `frontend/src/app/shared/inline-edit/topics-edit.component.ts` | Topic chip row with `×` and `+ Add topic` autocomplete |
| `frontend/src/app/shared/inline-edit/links-edit.component.ts` | Related-content link list with search + reorder. Extracted from the link section of `content-editor` |
| `frontend/src/app/shared/inline-edit/properties-panel.component.ts` | The ⚙ panel — status / slug / cardType / thumbnail / simpleLayout / delete |
| `frontend/src/app/shared/inline-edit/new-content-popover.component.ts` | The plus-tile popover — title + cardType radio + Cancel / Create-and-Edit |
| `frontend/src/app/shared/inline-edit/topics-bar.component.ts` | The How To topic filter bar in edit mode — pills as drop targets, `+ New topic` trailing pill, popover for new-topic creation. Wraps the existing tag-nav filter UI rather than replacing it |
| `frontend/src/app/shared/inline-edit/new-topic-popover.component.ts` | The `+ New topic` popover — name + description + Create. Calls `POST /api/admin/tags` directly (commits immediately, not via the dirty bar) |
| `frontend/src/app/shared/inline-edit/image-upload-popover.component.ts` | The unified upload popover described in §13. Inputs: `file` (already-picked), target `subfolder`. Outputs: `(uploaded)` carrying the resulting URL. Renders the file preview, the optional Title input, the live-preview filename, the Upload button, and the inline conflict state. Used by `app-image-picker`, every inline upload entry point in the viewer, the badge upload, and the Tiptap image-insert action |

### Modified

| File | Description |
|---|---|
| `frontend/src/app/shared/site-nav/site-nav.component.{ts,html}` | Replace the `Admin` link with `<app-edit-mode-toggle>` (which conditionally renders the pill or, for non-admins, nothing). Keep a smaller "Control Panel" link in the avatar dropdown for direct access to `/admin` |
| `frontend/src/app/app.component.html` | Mount `<app-edit-mode-banner>` and `<app-edit-mode-bar>` at the root |
| `frontend/src/app/pages/how-to/how-to-page.component.{ts,html}` | When edit mode is on, fetch via `adminListContent` instead of `getPublishedCards`; render draft badges; render the trailing `+ New how-to` tile and wire the popover; wrap the topic filter bar in `<app-topics-bar>` so pills become drop targets and the `+ New topic` pill renders |
| `frontend/src/app/pages/topic/topic-page.component.{ts,html}` | Same treatment as How To, with the active topic passed as the auto-topic for `+ New how-to` |
| `frontend/src/app/pages/content-viewer/content-viewer.component.{ts,html,scss}` | The main rewrite. Conditional inline editing per card type; properties pill; auto-fall-through to admin endpoint on draft 404; dirty-tracking; auto-focus via `?edit=focus` |
| `frontend/src/app/pages/locker/apps/todo-app.component.{ts,html,scss}` | Refactored into a thin wrapper around `<app-todo-list-view mode="instance">` (§8.1). Persistence, animations, sort-mode toggle, and locker routing stay in the wrapper. Visual output unchanged — verified by side-by-side diff before merge |
| `frontend/src/app/admin/admin.routes.ts` | Remove the three `content` routes; rename `tags` route to `topics` and `media` route to `images`; add redirects `tags` → `topics` and `media` → `images`; redirect `''` to `'topics'` |
| `frontend/src/app/admin/shell/admin-shell.component.html` | Remove the `Content` nav item; rename "Tags" to "Topics" with new `routerLink="topics"`; rename "Media Library" to "Image Library" with new `routerLink="images"`; rename "Admin" header to "Control Panel" |
| `frontend/src/app/admin/tags/tag-manager.component.{ts,html,scss}` → `frontend/src/app/admin/topics/topic-manager.component.{ts,html,scss}` | Move + rename. All visible strings switch from "Tag" to "Topic". Internal references to the `Tag` interface and `getAllTags()` / `adminListTags()` stay (data layer unchanged per §7) |
| `frontend/src/app/admin/media/media-library.component.{ts,html,scss}` → `frontend/src/app/admin/images/image-library.component.{ts,html,scss}` | Move + rename. Component selector becomes `app-image-library`. All visible strings switch from "Media" to "Image". Internal `MediaAsset` / `media-api.service` imports unchanged. Asset card surfaces the human-readable URL (truncate UUID-named legacy URLs in the centre with `…`, show the full filename for v9-era uploads). The "Upload" button opens the new `app-image-upload-popover` |
| `frontend/src/app/admin/media/media-picker.component.{ts,html,scss}` → `frontend/src/app/admin/images/image-picker.component.{ts,html,scss}` | Move + rename. Component selector becomes `app-image-picker`. Same wiring change to the "Upload" button — opens the popover, handles 409 inline, refreshes the grid + auto-selects on success |
| `frontend/src/app/core/services/content-api.service.ts` | Add `adminGetCardBySlug(slug)`, `adminListContent(opts)`, the skeleton-create variant of `adminCreateCard`. Existing methods unchanged |
| Tiptap image extension config (likely in `frontend/src/app/admin/content/tiptap-editor.component.ts`, retained as a shared component) | Replace the stock URL-prompt image insertion with a custom action that opens `app-image-picker`. Wire drag-drop of files into the editor through the upload popover too. Result: no path for Tiptap to render an `<img>` whose `src` was admin-typed |

### Removed

| File | Why |
|---|---|
| `frontend/src/app/admin/content/content-list.component.{ts,html,scss,spec.ts}` | Replaced by inline listings |
| `frontend/src/app/admin/content/content-editor.component.{ts,html,scss,spec.ts}` | Replaced by inline editing on the viewer |

The Tiptap host component (`tiptap-editor.component`) and the picker modal (renamed to `image-picker.component`) stay — they're imported by the new inline-edit components. `inline-title-edit`, `swatch-picker`, and `confirm-dialog` are unchanged.

### CLAUDE.md updates

- New "Edit mode" subsection under Architecture → Frontend explaining the toggle, the dirty-bar contract, and the inline-vs-immediate-save split.
- New paragraph under Architecture → Frontend explaining the tag/topic dual vocabulary: data layer says `tag`, user-facing strings say `topic`.
- Companion paragraph for the media/image dual vocabulary: data layer says `media` (`MediaAsset`, `media_assets`, `/api/admin/media/*`), user-facing strings and the admin route say `image` (`Image Library`, `/admin/images`, `app-image-picker`).
- Update the admin section to reflect the slimmed-down `/admin` (no more content list / editor pages).
- New paragraph under Architecture → Media Assets noting v9's three rules: filenames are human-readable (with v9-era assets coexisting alongside legacy UUID names — no backfill), same-name uploads are rejected, and image URLs are never typed in admin UI.

---

## 17. Testing requirements

### EditModeStore

- Unit test: `toggle()` flips `enabled`; persists to `localStorage` on enable, removes on disable.
- Unit test: hydrate from localStorage on construction with `'1'` value → `enabled = true`; with no value → `enabled = false`.
- Unit test: `markDirty({ title: 'X' })` then `markDirty({ description: 'Y' })` produces `dirtyCard = { title: 'X', description: 'Y' }`.
- Unit test: `discard()` clears dirty; `commit(savedCard)` clears dirty and signals listeners.
- Unit test: logging out clears `enabled` and `dirtyCard`.

### Edit-mode toggle component

- Renders nothing for non-admin users.
- Renders the pill in the off state for admins; clicking flips to on; banner appears.
- Clicking again flips off; banner disappears.

### Listings (How To)

- Component test: with edit mode off, the page calls `getPublishedCards`; no `+ New how-to` tile; no draft badges; topic pills behave click-only.
- Component test: with edit mode on, the page calls `adminListContent`; cards with `status='DRAFT'` have the badge; trailing `+ New how-to` tile renders; topic pills accept drag-drop.
- Component test: clicking the pencil button on a card navigates to `/content/:slug?edit=focus`.
- Component test: clicking `+ New how-to`, filling title + cardType, clicking Create-and-Edit posts to `POST /api/admin/content` and navigates to the new card.

### Drag-to-topic

- Component test: dragging a card by its handle and dropping on a topic pill calls the admin save endpoint with the new topic added to the card's topic list; success toast appears with Undo.
- Component test: dropping on a topic the card already has is a no-op (no API call).
- Component test: dropping on the "All" pill is a no-op.
- Component test: dropping on the grid (not a pill) snaps the card back without an API call.
- Component test: API error reverts the optimistic add and shows an error toast.
- Component test: clicking Undo within the toast window calls the save endpoint again with the topic removed.

### New-topic creation

- Component test: clicking `+ New topic` opens the popover; submitting with name + description posts to `POST /api/admin/tags` and the new pill appears at the end of the bar.
- Component test: 409 duplicate-slug response keeps the popover open and surfaces the error message.
- Component test: clicking Cancel discards without an API call.

### Content viewer

- Component test (per card type): with edit mode off, the existing read-only render is unchanged.
- Component test (ARTICLE): with edit mode on, the body renders `app-tiptap-editor` instead of `[innerHTML]`; typing marks the card dirty after the 500ms debounce; the Save bar appears.
- Component test (INFOGRAPHIC): with edit mode on, each carousel slide has Replace / Pick / drag / delete affordances; reordering updates the local `mediaUrls` and marks dirty.
- Component test (VIDEO): with edit mode on, the iframe renders below an editable URL input; updating the URL re-renders the embed.
- Component test (TODO_LIST): with edit mode on, `<app-todo-list-view mode="template">` renders in place of the read-only preview; adding a task marks dirty; the 50-task max enforces; the green ✓ Done button is **not** rendered (template mode); checkboxes and due-date pills are **not** rendered.

### Shared `app-todo-list-view` component (§8.1)

- Component test (`mode='instance'`): renders checkboxes, due-date pills, sort toggle, and the green ✓ Done button. Each affordance emits the correct event when clicked.
- Component test (`mode='template'`): renders only the title, swatch pickers, drag-reorderable task rows, `+ Add task`, and confirm-on-delete. No checkboxes, no due-date pills, no sort toggle, no Done button.
- Component test: `(taskAdded)` and `(taskEdited)` emit the description; `(taskReordered)` emits `{from, to}`; `(taskDeleted)` emits the id only after confirm-dialog confirmation; `(taskToggled)` and `(taskDueDateChanged)` only fire in `mode='instance'`.
- Component test: changing the `tasks` input reflects in render without internal state corruption (the component is purely presentational).
- Visual regression / snapshot test: baseline render of `mode='instance'` matches the current locker todo-app; baseline render of `mode='template'` matches the v8.2 admin editor. Catches accidental drift during the locker wrapper refactor.

### Locker todo-app wrapper (post-refactor non-regression)

- Existing locker todo-app tests (instantiation from a TODO_LIST template, completion toggling, due-date editing, sort-mode switching, persistence to backend) all pass unchanged — the wrapper preserves the public behaviour while delegating presentation.
- Component test (auto-fall-through): viewer for a draft slug — public call 404s, admin call returns the card; the card renders. With edit mode off and admin role, the public 404 is not retried (drafts shouldn't be visible without explicit edit-mode opt-in). With edit mode on and admin role, the retry happens.
- Component test (?edit=focus): query param + edit mode on auto-focuses the title's inline editor on mount.

### Properties panel

- Toggling shows/hides the panel.
- Changing status from DRAFT → PUBLISHED marks the card dirty.
- Changing slug shows the warning text.
- Delete opens the confirm dialog; confirming calls `adminDeleteCard` and navigates to `/how-to`.

### Save / Discard bar

- Bar is hidden when no card is dirty.
- Bar appears when a single field is dirty; disappears after Save.
- Save posts the merged dirty payload to the admin update endpoint; on success, replaces `card()` with the response; on error, the dirty state survives and a toast shows.
- Discard reverts inline edits to the saved card without confirmation.
- `beforeunload` warning fires when navigating away with dirty state.

### Topic manager rename

- Component test: `/admin/topics` renders the renamed page with "Topics" header and existing CRUD UI.
- Routing test: navigating to `/admin/tags` redirects to `/admin/topics` (back-compat for one release).

### Image management

#### Filename derivation (backend unit)

- `generateFilename("Study Tips Cover.jpg", "jpg", "images")` returns `study-tips-cover.jpg` when no `images/study-tips-cover.jpg` exists yet.
- Parameterized cases per the §13 examples table cover title vs OS-filename precedence, blank-title fallthrough, non-ASCII fallback, and path-stripping.
- Empty / null canonical name falls back to `image.<ext>`.
- Extension is always derived from `contentType`, never from the apparent extension on the canonical name (`bad.exe` uploaded as `image/png` lands as `<name>.png`).

#### Same-name rejection (backend)

- Unit test: pre-seed the storage with `images/chart.png`, then `generateFilename("chart.png", "png", "images")` throws `FilenameConflictException` carrying `key = "images/chart.png"` and the existing public URL.
- Integration test: pre-seed the asset, then `POST /api/admin/images/upload` with multipart filename `chart.png` returns 409 with body `{ error, message, existingUrl, existingAssetId }` where `existingAssetId` is the ID of the seeded `MediaAsset`.
- Integration test: pre-seed the asset, then `POST /api/admin/images/upload` with multipart filename `Different.png` and form param `title=chart` returns the same 409 (the title is the canonical source, OS filename ignored).
- Integration test: 409 response does **not** create a new file in storage and does not insert a new `media_assets` row.

#### Title input on upload (backend)

- Integration test: `POST /api/admin/images/upload` with multipart filename `IMG_2354.jpg` and form param `title=Study Tips Cover` produces a stored object at `uploads/images/study-tips-cover.jpg`, a thumbnail at `uploads/thumbs/study-tips-cover.jpg`, and `MediaAsset` rows for both. `MediaAsset.filename` records the original OS filename `IMG_2354.jpg`.
- Integration test: same upload with `title=` (blank) falls back to the OS filename and produces `uploads/images/img-2354.jpg`.

#### Backwards compatibility

- Integration test: legacy UUID-named assets still serve correctly through `MediaAssetService.list` and `MediaAssetService.usage` after the change (no migration breaks them).
- Routing test: navigating to `/admin/media` redirects to `/admin/images` (back-compat for one release).
- Component test: `<app-image-library>` (the renamed component) renders the existing v8.3 grid + paginator + search; clicking Upload opens the popover.

#### Upload popover (frontend)

- Component test: opening the popover with a picked file displays the OS filename and a live filename preview that matches the §13 sanitization.
- Component test: typing in the Title input updates the live preview to the title-derived filename.
- Component test: clearing the Title input falls back to the OS-filename-derived live preview.
- Component test: Upload button POSTs `multipart/form-data` with both `file` and `title`; on 200, the popover emits the resulting URL via the `(uploaded)` output.
- Component test: 409 response shows the inline conflict message under the live preview, surfaces "Use existing" with the existing thumbnail; clicking "Use existing" emits the `existingUrl` and closes.
- Component test: Cancel closes without emitting and without firing any HTTP call.

#### No manual URL entry (frontend)

- Component test (content-viewer in edit mode, INFOGRAPHIC): the carousel slide editor renders **no** `<input type="text">` bound to `mediaUrls[i].url` or `mediaUrls[i].printUrl`. The only controls are Replace / Pick / Upload buttons.
- Component test (properties panel): the `thumbnailUrl` row renders no URL text input — only thumbnail preview + Pick + Upload buttons.
- Component test (cover image inline edit): no URL text input; Pick / Upload only.
- Component test (Tiptap image action): triggering the image-insert button opens `app-image-picker` rather than a `prompt()` URL dialog.

### Backend

- Integration test: `GET /api/admin/content/by-slug/{slug}` returns drafts; the public `/api/content/by-slug/{slug}` does not.
- Integration test: `POST /api/admin/content` with only `title='Foo'` + `cardType='ARTICLE'` creates a card with slug `foo`, `status='DRAFT'`, and other nullable fields null.
- Integration test: skeleton-create slug collision — posting two cards with the same title produces `foo` and `foo-2`.
- Integration test: `DELETE /api/admin/content/{id}` cascades children (links / topics / tasks); media assets are not deleted (delete-by-card doesn't tell us if the asset is reused).
- Integration test: `POST /api/admin/tags` with `{ name: 'Study Skills' }` returns a Tag with slug `study-skills` and `sortOrder = max + 1`.

### Manual smoke

- End-to-end: log in as admin, flip edit mode, navigate to How To, click `+ New how-to`, create a draft article, write a title and body, save, toggle status to Published, save, log out, refresh — the new article is visible publicly.
- End-to-end: in edit mode on How To, create a new topic via the `+ New topic` pill, then drag an existing card onto the new topic pill — confirm the card now lists the topic on the viewer page.
- End-to-end: upload an image named `Study Tips Cover.jpg` via the inline editor; verify the resulting URL in the card's `coverImageUrl` is `…/uploads/images/study-tips-cover.jpg` (not a UUID).
- Negative end-to-end: log in as a non-admin and confirm the toggle pill does not render and inline edit affordances are absent on every page.

---

## 18. Implementation phases

The release is bigger than v8 — most of the value lands when ARTICLE, INFOGRAPHIC, and TODO_LIST are all inline-editable. Splitting per card type lets earlier phases ship safely and gives clear gates.

| Phase | Work | Gate |
|---|---|---|
| 1 | `EditModeStore`, toggle pill, banner, save / discard bar (no card editing yet — wires the chrome and dirty tracking) | Unit tests pass; manual smoke flips toggle, sees banner, sees no functional change to listings or viewer |
| 2 | Listings: `adminListContent` swap, draft badge, pencil button, `?edit=focus` plumbing | How To and Topic pages render drafts with the badge in edit mode; pencil navigates to viewer with focus param |
| 3 | Skeleton create endpoint + `+ New how-to` popover on listings | Posting `title` + `cardType` creates a draft; navigates to the new card |
| 4 | Drag-to-topic gesture + `+ New topic` pill on the How To filter bar | Dragging a card onto a topic pill assigns the topic; clicking `+ New topic` creates one |
| 5 | Tag → topic UI rename: admin nav, topic manager move, redirect from `/admin/tags`, all visible strings | All admin- and user-facing strings say "topic"; `/admin/tags` redirects to `/admin/topics`; CLAUDE.md note added for the dual vocabulary |
| 6a | Image management — backend: `StorageService.generateFilename` rewrite (sanitization + reject-on-conflict), `objectExists` on both backends, `FilenameConflictException`, controller `title` param, 409 mapping with `existingUrl` / `existingAssetId` | New uploads land at sanitized keys; same-name attempts return 409 with the existing asset; legacy UUID assets still serve |
| 6b | Image management — frontend: `app-image-upload-popover`; rename Media Library → Image Library (file moves, route rename, `/admin/media` redirect, selectors); strip URL text inputs from every image field in the inline editor and the properties panel; Tiptap image-insert action routes through the picker | All inline upload entry points open the popover; no URL text inputs remain in admin UI for image fields; `/admin/images` is the canonical route |
| 7 | Properties panel + `GET /api/admin/content/by-slug/{slug}` + draft-fallthrough on viewer | Panel toggles, status / slug / delete work; visiting a draft URL as admin loads the card |
| 8 | ARTICLE inline editing (title + description + body via Tiptap + topics + links) | Editing each field marks dirty; Save persists; existing articles render unchanged in user mode |
| 9 | INFOGRAPHIC inline editing (image list, alt text, print URLs) | Same gate; carousel renders unchanged in user mode |
| 10 | VIDEO inline editing (URL + thumbnail) | Same gate |
| 11 | TODO_LIST inline editing — extract shared `app-todo-list-view` (§8.1), refactor locker todo-app into a wrapper around it, build the admin wrapper bound to `dirtyCard()` | Editing TODO_LIST cards inline marks dirty and saves; locker todo-app behaves and renders identically to today (verified by side-by-side visual diff); locker-instantiated lists from a v9-authored card look identical to those authored today |
| 12 | Remove `content-list.component` and `content-editor.component`; remove their routes; rename admin shell to "Control Panel" | Old `/admin/content/*` URLs return a 404 on the SPA; admin sidebar shows only the cross-cutting tools |
| 13 | Cut v9.0.0 release (changelog, version bump, tag) | Both builds clean per release process |

Phases 8–11 are independent across card types; if needed they can be split across smaller releases (v9.1, v9.2, …). Phase 12 must wait until *all* card types have their inline path or admins lose the ability to edit some types. Phase 6 (filename) is fully independent and could ship on its own as a v8.4 if it's wanted ahead of the inline-edit work.

---

## 19. Out of scope

- **Layout / section editing on the home page.** Cards within home-page sections still get the inline pencil; reordering or recomposing sections stays at `/admin/layouts/home` (which doesn't exist today; layout editing is a future release).
- **Drag-reorder of cards on listing pages.** Card order on How To / Topic pages is determined by `sort_order` on the join table; visualising and editing that requires UX decisions about per-topic-vs-global ordering. Reserved for v9.x.
- **Per-section plus button on the home page.** Same reason — depends on layout-section editing.
- **Touch drag-and-drop for drag-to-topic.** Mobile admins use the inline topic chip row instead.
- **Code-level rename of `Tag` → `Topic` across frontend models, services, methods, backend entity, controllers, DB tables, JSON export field names.** Logged for a future release; v9 keeps the data layer named `tag` per §7.
- **Backfilling UUID-named legacy assets to human-readable filenames.** Existing assets keep their UUID URLs to avoid a lossy / risky bulk-update. New uploads only.
- **Forced overwrite (replace bytes at the same URL).** Same-name uploads return 409. Admins who want to replace bytes delete the old asset from `/admin/images` first, then re-upload. A future refinement could expose a "Replace" action on an asset in the library that bypasses the rejection — but every referencing card would silently get the new bytes, which is exactly the surprise the rejection was designed to prevent.
- **Atomic upload to prevent same-name race conditions.** Two simultaneous uploads of the same filename land last-write-wins. Real cost is rare for a small admin team. S3 `If-None-Match: "*"` would solve the S3 case if it becomes a problem.
- **Storage-key rename for an existing asset.** Renaming `chart.png` → `chart-final.png` in the library would require an S3 copy + delete plus updating every referencing card across `media_url`, `print_media_url`, `cover_image_url`, `thumbnail_url`, `media_urls` JSONB, and `body_html`. Out of scope. The display-only `MediaAsset.filename` and `MediaAsset.altText` remain editable per v8.3.
- **Backend rename `MediaAsset` → `ImageAsset`, `media_assets` table → `image_assets`, `/api/admin/media` → `/api/admin/images`.** Same dual-vocabulary tradeoff as tag/topic: data layer keeps its name in v9 to avoid wire and migration churn. CLAUDE.md documents the bridge.
- **Concurrent-edit conflict detection.** Last-write-wins is enough for a one-to-three-author site. If it bites, add an `If-Match` against `updated_at`.
- **Versioning / history / undo across saves.** The Tiptap editor has its own in-session undo; persistent revision history is a real CMS feature and out of scope.
- **Workflows.** Status is binary (DRAFT / PUBLISHED); no review / approval / scheduled-publish.
- **Slug redirects on rename.** Renaming a slug breaks incoming links. The properties panel warns; auto-redirect tables are deferred.
- **Inline topic editing on `/admin/topics`.** The topic manager keeps its dedicated page since editing a topic affects every card.
- **Keyboard shortcuts beyond the existing per-component ones** (Tiptap, lightbox arrow keys). A global shortcut overlay (`?`) is a refinement.
- **Mobile-first inline editing polish.** v9 makes inline editing functional on mobile (existing inline-title-edit already works on touch) but doesn't redesign the toolbar / properties panel for small screens beyond making sure they're reachable.
- **Bulk operations.** No multi-select / bulk-delete / bulk-tag from the listings; the admin list page is gone, and the use case is too thin to invent new gestures for.
- **Image cropping / transforms.** Same as v8.
