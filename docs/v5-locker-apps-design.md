# High School How To — v5.0 Design Document

**Status**: Draft
**Last updated**: 2026-04-12

## Table of Contents

### Part 1: Site Structure
1. [Overview](#1-overview)
2. [Site Map](#2-site-map)
3. [How To Page](#3-how-to-page)
4. [About Page](#4-about-page)
5. [Help Section](#5-help-section)
6. [Content Editor Enhancements](#6-content-editor-enhancements)
7. [Content Seeding](#7-content-seeding)

### Part 2: Locker Redesign
8. [Locker Overview](#8-locker-overview)
9. [Core Concepts](#9-core-concepts)
10. [App Launcher Home Screen](#10-app-launcher-home-screen)
11. [Apps and Home Screen Features](#11-apps-and-home-screen-features)
12. [Active App Layouts](#12-active-app-layouts)
13. [In-App Navigation](#13-in-app-navigation)
14. [Responsive Behavior](#14-responsive-behavior)
15. [Content Import Flow](#15-content-import-flow)
16. [Migration from v4](#16-migration-from-v4)

### Part 3: Implementation
17. [Implementation Phases](#17-implementation-phases)
18. [Testing Requirements](#18-testing-requirements)

---

## 1. Overview

v5.0 has two major themes:

1. **Site restructure** — dedicated pages for content browsing (How To), About, and Help, all powered by the content card system with enhanced rich text editing and image embedding.
2. **Locker redesign** — replaces the free-form widget grid with a simple app-based model inspired by a phone home screen.

### Goals

- **Clear site structure** — separate pages for browsing content, learning about the site, getting help, and using personal tools
- **Content-driven pages** — About, Help, and How To pages are all managed through the content admin, making them easy to update
- **Simpler locker** — no window management, no clutter, just apps that open and close
- **Feel like a phone** — familiar app model for high school students

---

## 2. Site Map

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Landing page, welcome, hero, CTAs to sign up and explore |
| `/about` | About | Mission, purpose, who the site is for |
| `/how-to` | How To | Content library — browse/filter all How To content by tags |
| `/content/:slug` | Content Viewer | Individual content item (stays as-is) |
| `/help` | Help | Documentation on how to use the locker tools |
| `/locker` | My Locker | App launcher with personal tools (auth required, replaces `/account/dashboard`) |
| `/auth/*` | Auth | Login, signup, verify, reset password (stays as-is) |
| `/admin/**` | Admin | Content editor, tag manager, layout editor (stays as-is) |

---

## 3. How To Page

A dedicated content library page, similar to the current home page's content grid but as its own route.

### Content

- All content cards tagged/categorized as How To content
- Tag-based filtering (existing tag system)
- Card grid layout with thumbnails, titles, descriptions
- Search (if not already present)

### Relationship to Home Page

The home page becomes a proper landing page — hero section, value proposition, CTAs to explore How To content or sign up. It no longer serves as the content browser.

---

## 4. About Page

A single page describing the mission and purpose of the site.

### Content

- Managed as content card(s) in the admin, using the ARTICLE card type with rich text
- Rich formatting with embedded images (see Section 6)
- Could be a single card or multiple sections composed together

### Content Identification

Content cards are assigned to pages using tags or a `section` field (e.g., tag "about" pulls content for the About page).

---

## 5. Help Section

Full documentation on how to use the locker tools, also managed through the content system.

### Content

- One help article per topic (e.g., "How to use the To-do app", "How to set up timers", "How to customize your locker")
- Managed as ARTICLE content cards tagged with "help"
- Rich text with embedded images/screenshots
- Organized by topic with a table of contents or category navigation

### Initial Content

Help documentation is written with AI assistance and seeded via Liquibase on first deployment (see Section 7).

---

## 6. Content Editor Enhancements

### Image Upload in Editor

The Tiptap rich text editor gains inline image upload:

1. **Upload trigger** — drag-and-drop onto the editor, or click an "Insert Image" button in the toolbar
2. **Upload destination** — images are uploaded to `media/content/` (or a structured subfolder)
3. **URL insertion** — after upload, the image URL is inserted into the Tiptap content as an `<img>` node
4. **Preview** — uploaded image renders inline in the editor immediately

### Image Storage

- **Local dev**: images saved to `media/content/`, served by the Angular dev server via the Docker mount
- **Production**: images uploaded to S3 at `s3://highschoolhowto/prod/media/content/`, served via CloudFront
- Backend endpoint: `POST /api/admin/media/upload` — accepts multipart file, returns the public URL

### Image Management

For v5, image management is minimal:
- Upload inline during editing
- No media library browser (future enhancement)
- Deleting an image from content does not auto-delete from storage (cleanup can be manual or automated later)

---

## 7. Content Seeding

Initial content for About, Help, and starter How To items is authored with AI assistance and seeded via Liquibase.

### Process

1. AI helps write the content (about page copy, help articles, etc.)
2. Content is formatted as Liquibase seed data (CSV or SQL inserts)
3. Changeset is added to `db.changelog-master.yaml`
4. On first deployment, Liquibase populates the content cards
5. Admins can edit the seeded content afterward through the normal content editor

### Seeded Content

- About page content (1 article)
- Help articles (one per locker tool — To-do, Notes, Timer, Shortcuts, Stickers, Palettes, Edit Mode)
- Referenced images included in `media/content/` and committed to the repo

### Rollback

Each seed changeset includes a rollback that deletes the seeded rows by slug or ID range.

---

# Part 2: Locker Redesign

---

## 8. Locker Overview

v5.0 replaces the free-form widget grid with an **app-based locker model**. Instead of managing individual widgets on a canvas (dragging, resizing, minimizing, layering), the locker becomes a simple app launcher where each tool is a self-contained app.

### What Changes

| Before (v4) | After (v5) |
|---|---|
| Each to-do list is a separate widget | One To-do app contains all lists |
| Each note is a separate widget | One Notes app contains all notes |
| Separate basic and Pomodoro timer widgets | One Timer app with a mode toggle |
| Widgets placed on a freeform grid | Apps shown in a predefined layout |
| Minimize collapses to 40px title bar | Apps are either active (on screen) or inactive (in the launcher) |
| Users manage layout manually | Layout auto-determined by number of active apps |
| Up to 50+ widgets on screen | Max 3 apps on screen at once |

---

## 9. Core Concepts

### Apps

Each tool is a single-instance app. There is one Notes app, one Timer app, one To-do app — not one widget per item. The app contains all of the user's data for that type and provides its own internal navigation.

### Active vs. Inactive

Apps have two states:

- **Active** — visible in the layout, taking up screen space
- **Inactive** — available in the launcher but not shown in the layout

Users toggle apps between these states. The layout adjusts automatically based on how many apps are active.

### App Launcher

The locker home screen is an app launcher showing all available apps. Active apps are visually distinguished from inactive ones. Tapping an active app opens the layout view; toggling an inactive app adds it to the layout.

### Predefined Layouts

The layout is determined by the number of active apps — not manually arranged by the user:

| Active apps | Layout |
|---|---|
| 1 | Full screen |
| 2 | Side by side (two-pane) |
| 3 | Three-pane |

No drag-and-drop positioning or resizing. The layout is automatic.

---

## 10. App Launcher Home Screen

The launcher is what users see when they enter their locker. It shows all available apps in a fixed grid of icons.

### Layout

- App icons arranged in a grid (similar to a phone home screen)
- Each icon shows the app emoji, name, and active/inactive state
- Active apps are visually highlighted (e.g., full color, border, checkmark)
- Inactive apps are dimmed or outlined

### Edit Mode

Customization happens in a dedicated edit mode, accessed via a "Customize" or pencil button on the launcher.

When edit mode is active:
- App icons wiggle/pulse (like rearranging iPhone apps)
- Each icon shows a checkmark overlay — checked = active, unchecked = inactive
- User taps icons to toggle active/inactive
- Active count shown ("2 of 3 active")
- If 3 are already active, tapping a 4th shows a shake animation and hint to deactivate one first
- Pane positions can be rearranged by dragging (see Section 12)
- Color palette picker is accessible
- Stickers can be added, moved, or deleted
- Tap "Done" to exit edit mode and save changes

One place for all personalization: app selection, pane order, palette, and stickers.

### Home Screen Elements

The launcher home screen contains four elements:

1. **App icon grid** — To-do, Notes, Timer with active/inactive state and dot indicators for attention
2. **Shortcuts row** — user's quick-launch links, always visible, tap to open in new tab. Add/edit/delete in edit mode.
3. **Quote** — daily inspirational quote displayed directly on the home screen, rotates automatically
4. **Stickers** — free-positioned emoji decorations on the launcher background, between and around icons. Managed in edit mode. Only visible on the launcher (desktop/tablet), not inside apps.

### Default State

On first login, all 3 apps (To-do, Notes, Timer) are active with the default color palette applied.

---

## 11. Apps and Home Screen Features

### Apps

Three apps, each a single-instance container for its data type:

| App | Icon | Purpose | Multi-item? |
|---|---|---|---|
| **To-do** | 📋 | Manage to-do lists and tasks | Yes — up to 20 lists, each with tasks |
| **Notes** | 📝 | Write and organize notes | Yes — up to 20 notes |
| **Timer** | ⏱ | Countdown timer with Basic and Pomodoro modes | No — single timer with mode toggle |

Creating new items (lists, notes) happens inside each app — not from the toolbar. The Timer app is single-view with no item creation.

### Home Screen Features (not apps)

These are not openable apps — they live directly on the launcher home screen:

- **Shortcuts** — a row of quick-launch links, always visible. Tap to open in a new tab. Managed in edit mode.
- **Quote** — daily inspirational quote, displayed on the home screen and rotated automatically.
- **Stickers** — free-positioned emoji decorations on the launcher background. Managed in edit mode. Desktop/tablet only.

### App Toolbar Removal

The current app bar buttons (To-do, Timer, Note, Shortcuts, Quote, Stickers, Fonts, Badges, Arrange) are all removed. The launcher home screen and edit mode replace their functionality entirely.

---

## 12. Active App Layouts

### One Active App — Full Screen

The app occupies the entire locker content area with a thin header bar showing the app icon, title, and a back/home button to return to the launcher.

```
┌──────────────────────────────┐
│ 📋 To-do              ← Home │
├──────────────────────────────┤
│                              │
│         App content          │
│                              │
│                              │
└──────────────────────────────┘
```

### Two Active Apps — Split View

Two apps share the screen side by side (desktop) or top/bottom.

```
┌──────────────┬───────────────┐
│ 📋 To-do     │ ⏱ Timer      │
├──────────────┼───────────────┤
│              │               │
│  List view   │  Timer view   │
│              │               │
└──────────────┴───────────────┘
```

### Three Active Apps — Three-Pane

The layout is determined intelligently based on the apps selected. Each app has a **size weight** — content-heavy apps are "large", compact apps are "small":

- **Large**: To-do, Notes (lists of items, need vertical space)
- **Small**: Timer (single-view, compact display)

| Combo | Layout |
|---|---|
| 1 large + 2 small | Large gets the big pane |
| 2 large + 1 small | Equal thirds |
| 3 large | Equal thirds |
| 3 small | Equal thirds |

Default three-pane layout (1 large + 2 small):

```
┌──────────────┬───────────────┐
│              │ ⏱ Timer      │
│ 📋 To-do     ├───────────────┤
│              │ 📝 Notes      │
└──────────────┴───────────────┘
```

### Smart Default Positions

Apps have a default pane assignment based on their type:

| Combo | Position |
|---|---|
| To-do + Timer | To-do left, Timer right |
| To-do + Notes | To-do left, Notes right |
| To-do + Timer + Notes | To-do large left, Timer top-right, Notes bottom-right |
| Timer + Notes | Timer left, Notes right |

### Pane Reordering

In edit mode, users can drag panes to swap positions. Custom ordering is saved and persists. Most users won't need this — the smart defaults handle the common cases.

### Pane Header

Each pane has a minimal header:
- App icon + title
- Back/home button to return to the launcher
- No minimize/maximize/close — those concepts don't exist

---

## 12.1. Color Palettes

Users pick a single **color palette** (e.g., "Ocean", "Sunset", "Forest"). Each palette defines a set of complementary colors, and each active app is automatically assigned a color from that set. One decision, coordinated look, every app visually distinct.

### How It Works

1. User selects a palette from the locker settings or home screen customization
2. Each app is assigned a color from the palette automatically (e.g., app 1 gets the primary color, app 2 gets the secondary, etc.)
3. The assigned color applies to the app's pane header, icon highlight on the launcher, and accent elements within the app

### Example Palettes

| Palette | Color 1 (To-do) | Color 2 (Notes) | Color 3 (Timer) |
|---|---|---|---|
| **Ocean** | Deep blue | Teal | Sea green |
| **Sunset** | Coral | Amber | Warm pink |
| **Forest** | Emerald | Moss | Olive |
| **Minimal** | Charcoal | Steel gray | Slate blue |

### Palette Assignment

- Colors are assigned by app in a fixed order (To-do always gets color 1, Notes always gets color 2, Timer always gets color 3)
- This keeps the mapping predictable — switching palettes changes the vibe without changing which app is which
- Inactive apps still show their palette color on the launcher, just dimmed
- Palette colors also apply to the app icon highlights on the launcher and accent elements within each app

### Default

A default palette is applied on first login. Users can change it at any time.

---

## 13. In-App Navigation

Apps that contain multiple items (To-do, Notes) use a **drill-down** navigation pattern. The Timer app is single-view (see below).

### Drill-Down Flow

1. **List view** — shows all items for that app (e.g., all to-do lists)
2. **Detail view** — tap an item to view/edit it full-pane
3. **Back** — return to the list view

```
┌─────────────────────┐      ┌─────────────────────┐
│ 📋 To-do            │      │ ← My Study List     │
├─────────────────────┤      ├─────────────────────┤
│ > My Study List     │ ──►  │ ☐ Read chapter 4    │
│ > Shopping List     │      │ ☑ Do practice test  │
│ > College Apps      │      │ ☐ Review notes      │
│                     │      │                     │
│ [+ New List]        │      │                     │
└─────────────────────┘      └─────────────────────┘
```

### Item Management

Creating, editing, and deleting items happens within the app:
- **Create**: "New List" / "New Note" button in the list view
- **Edit**: Inline editing in the detail view (same as current behavior)
- **Delete**: Delete action in the detail view or swipe-to-delete in the list view

### Single-View Apps

The **Timer** app has no drill-down — it opens directly to the timer interface with a mode toggle (Basic / Pomodoro). One timer, two modes. Switch modes anytime you're not mid-countdown.

### In-App Help

Each app's pane header includes a small info icon (circled "i", rendered as an SVG or CSS-styled element — not the Unicode character). Tapping it shows a tooltip/popover with 1-3 lines of context-specific help and a "Learn more" link.

- **Tooltip content** is hardcoded per app (no API call needed)
- **"Learn more"** links to the full help article for that app (e.g., `/content/help-todo`)
- Tooltip dismisses on click-away or tap outside

Example tooltip for the To-do app:
> Create lists, add tasks, and check them off as you go. You can have up to 20 lists. [Learn more](/content/help-todo)

### Navigation State Persistence

When the user switches between apps (e.g., from To-do to Timer and back), each app remembers its drill-down position. If you were viewing "Math Homework" in the To-do app, it's still there when you return — no reset to the list view.

### Dot Indicators

App icons on the launcher show a small colored dot when they need attention — e.g., a newly imported to-do list, or a running timer. No counts or numbers, just a dot to signal "something to see here."

---

## 13.1. Keyboard Shortcuts

Global keyboard shortcuts for the locker (desktop only). Active when the user is not focused on a text input field.

| Shortcut | Action |
|---|---|
| `E` | Enter/exit Edit Mode |
| `1` / `2` / `3` | Switch focus to app pane 1, 2, or 3 |
| `H` | Return to the home screen (launcher) |
| `N` | Create new item in the currently focused app (new list in To-do, new note in Notes) |
| `Esc` | Go back (close detail view, exit edit mode, return to list view) |

### Implementation

- A single `@HostListener('document:keydown')` on the locker shell component
- Guard: skip if `event.target` is an input, textarea, or contenteditable element
- Each shortcut dispatches to the appropriate app or shell action
- No modifier keys required (no Ctrl/Cmd) — single key presses for simplicity

---

## 14. Responsive Behavior

The layout adapts based on screen width. The app grouping stays the same — only the presentation changes.

### Desktop / Tablet (wide viewport)

Active apps display side by side in panes as described in Section 12.

### Mobile (narrow viewport)

On mobile, there is **no launcher screen**. The user lands directly in their active apps.

#### Swipe Navigation

Active apps are pages that the user swipes between horizontally, like iPhone home screen pages.

The **first app page** includes a compact header area above the app content showing:
- **Shortcuts row** — quick-launch links, always one tap away
- **Daily quote** — small, non-intrusive text

**Stickers are desktop/tablet only** — they don't appear on mobile.

```
┌─────────────────────┐
│ 📋 To-do             │
├─────────────────────┤
│ 🚀 School | Canvas  │  ← shortcuts row
│ "Stay focused..."   │  ← daily quote
├─────────────────────┤
│                     │
│    App content      │
│                     │
├─────────────────────┤
│      ● ○ ○         │  ← page dots
└─────────────────────┘

  swipe left →

┌─────────────────────┐
│ ⏱ Timer             │
├─────────────────────┤
│                     │
│    App content      │
│                     │
│                     │
├─────────────────────┤
│      ○ ● ○         │  ← page dots
└─────────────────────┘
```

- Page dots at the bottom indicate position and total active apps
- Swipe left/right to switch between active apps
- Drill-down navigation works normally within each app page

#### Adding / Removing Apps (Mobile)

Swiping past the last active app reveals an **app drawer page** showing inactive apps that can be toggled on.

```
┌─────────────────────┐
│ Add Apps             │
├─────────────────────┤
│                     │
│   📋 To-do    ☑     │
│   📝 Notes    ☑     │
│   ⏱ Timer    ☐     │
│                     │
│  Tap to activate    │
├─────────────────────┤
│      ○ ○ ●         │  ← last page
└─────────────────────┘
```

- Tapping an inactive app activates it and inserts it as a new page
- To deactivate an app: settings icon in the app's header, or a toggle on the app drawer page
- The 3-app active limit still applies — if 3 are active, activating a new one prompts to deactivate one first

---

## 15. Content Import Flow

When a user encounters a TODO_LIST content card and clicks "Add to My Locker":

### Before (v4)
1. Creates a new TaskList with the template tasks
2. Creates a new widget on the locker grid
3. Saves the layout with the new widget positioned

### After (v5)
1. Creates a new TaskList with the template tasks
2. The list appears inside the To-do app's list view
3. No layout changes needed — the To-do app shows it on next open
4. Optional: badge or "New" indicator on the To-do app icon in the launcher

This simplifies the import flow by removing all layout/positioning logic.

---

## 16. Migration from v4

### Data Migration

User data (lists, notes, timers, shortcuts) is preserved — only the presentation layer changes:

- **TaskLists, Tasks**: No schema change. To-do app reads from the same tables.
- **Notes**: No schema change. Notes app reads from the same tables.
- **Timer**: No schema change. Timer app reads from the same tables.
- **Shortcuts**: No schema change.
- **Layout data**: The `locker_layout_items` table becomes largely obsolete. May be replaced with a simpler `active_apps` table or user preference field.

### Removed Concepts

- Widget grid positioning (posX, posY, width, height)
- Widget minimized state
- Widget z-index / ordering
- Per-widget drag and resize
- App bar "create" buttons

### New Data

- Active app set per user (which apps are toggled on)
- Possibly: last-viewed item per app (to restore drill-down state)

---

## 17. Implementation Phases

Strategy: site structure and content enhancements first, then locker redesign. Build the new app shell alongside the existing locker, migrate widget internals into app components, then delete the old locker and all dead code.

### Phase 0: Site Structure & Content Enhancements

**Goal**: New site pages and content editor image upload.

Frontend:
- New routes: `/how-to`, `/about`, `/help`
- How To page — content card grid with tag filtering (extract from current home page)
- About page — renders ARTICLE content card(s) tagged "about"
- Help section — renders ARTICLE content cards tagged "help" (see Section 5)
- Home page redesign — landing page with hero, CTAs, no longer the content browser

Backend:
- `POST /api/admin/media/upload` — multipart image upload endpoint, saves to `media/content/`
- Returns public URL (relative path for local, CloudFront URL for prod)

Content editor:
- Tiptap image upload extension — drag-and-drop or toolbar button
- Calls upload endpoint, inserts returned URL as image node
- Inline preview in editor

### Phase 0.1: Content Seeding

**Goal**: Seed initial About, Help, and How To content via Liquibase.

- Author content with AI assistance (about page copy, help articles)
- Create Liquibase seed changeset (CSV or SQL inserts)
- Include referenced images in `media/content/` committed to repo
- Rollback deletes seeded rows by slug

### Phase 1: Backend — Active Apps Preference

**Goal**: API support for storing which apps a user has active and their color palette.

- Add `user_app_preferences` table (user_id, active_apps JSON array, palette_name)
- Add Liquibase changeset with rollback
- `GET /api/locker/app-preferences` — returns active apps + palette
- `PUT /api/locker/app-preferences` — updates active apps + palette
- Default: all 3 apps active (To-do, Notes, Timer) with default palette

**No deletions yet** — existing layout endpoints stay until the frontend migration is complete.

### Phase 2: Frontend — App Shell & Launcher

**Goal**: New locker shell with app launcher and pane layout system.

Build new components:
- `locker-shell` — top-level container, replaces `locker.component.ts` as the route component
- `app-launcher` — home screen grid of app icons with active/inactive toggle (desktop only)
- `app-pane-layout` — manages 1/2/3-pane layouts based on active app count
- `app-pane-header` — thin header bar per pane (icon, title, home button)

Wire up routing:
- `/locker` loads `locker-shell` (replaces old `/account/dashboard` route)
- Launcher is the default view; opening apps transitions to the pane layout

**No deletions yet** — old locker component remains but is no longer routed to.

### Phase 3: Frontend — App Components

**Goal**: Migrate widget internals into app-level components with drill-down navigation.

Build one app component per type, extracting logic from existing card components:
- `todo-app` — list view of all TaskLists, drill-down to individual list. Extracts from `bookmark-card.component.ts`. Includes "New List" creation (moved from the old app bar button).
- `notes-app` — list view of all notes, drill-down to editor. Extracts from `note-card.component.ts`.
- `timer-app` — single-view timer with Basic/Pomodoro mode toggle. Extracts from `timer-card.component.ts` and `basic-timer-card.component.ts`. No drill-down, no item creation.

Home screen feature components (not apps — live on the launcher, not in panes):
- `shortcuts-row` — compact row of quick-launch links. Extracts from shortcuts panel logic. Displayed on launcher (desktop) and first app page header (mobile).
- `daily-quote` — displays rotating daily quote. Extracts from quote panel logic. Displayed on launcher (desktop) and first app page header (mobile).

Each app component:
- Receives its palette color as input
- Manages its own drill-down state (list view vs. detail view)
- Handles CRUD internally (no app bar buttons needed)

### Phase 4: Frontend — Mobile Swipe Navigation

**Goal**: Responsive behavior — swipeable pages on mobile, pane layout on desktop.

- `app-swipe-container` — horizontal page swipe with dot indicators
- App drawer as the last swipeable page (for adding/removing apps)
- Breakpoint detection to switch between pane layout (desktop) and swipe layout (mobile)
- Touch gesture handling for swipe navigation

### Phase 4.1: Keyboard Shortcuts

**Goal**: Global keyboard shortcuts for desktop locker navigation.

- `@HostListener('document:keydown')` on locker shell component
- Input guard to skip when focused on text fields
- Shortcuts: `E` (edit mode), `1/2/3` (pane focus), `H` (home), `N` (new item), `Esc` (back)
- No shortcuts on mobile (keyboard not relevant)

### Phase 5: Color Palettes

**Goal**: Theme system with auto-assigned app colors.

- Define 4-6 palettes (Ocean, Sunset, Forest, Minimal, etc.) as design tokens
- Palette picker in locker settings / home screen customization
- Each app receives its color from the active palette based on fixed assignment order
- Persist palette choice via the app preferences API from Phase 1

### Phase 6: Cleanup — Delete Old Locker System

**Goal**: Remove all dead code from the v4 widget grid system.

Frontend deletions:
- `locker.component.ts` / `.scss` / `.html` — old grid locker
- `locker-grid-engine.service.ts` — grid packing/positioning
- `locker-layout-api.service.ts` — old layout persistence (replace with app preferences service)
- `widget-title-bar.component.ts` — old minimize/maximize title bar
- `bookmark-card.component.ts` — internals migrated to `todo-app`
- `note-card.component.ts` — internals migrated to `notes-app`
- `timer-card.component.ts`, `basic-timer-card.component.ts` — internals migrated to `timer-app`
- All layout-related interfaces from `task.models.ts` (LockerLayoutItem, posX/posY/width/height/minimized fields)

Backend deletions (evaluate — may keep for rollback safety):
- `LockerLayoutController` layout save/get endpoints (once no frontend references remain)
- `LockerLayoutItem` entity fields: posX, posY, width, height, minimized, order
- Or: deprecate the table entirely if `user_app_preferences` fully replaces it

Backend cleanup:
- Remove `minimized` column from `locker_layout_items` (Liquibase changeset with rollback)
- Evaluate whether `locker_layout_items` table can be dropped entirely

### Phase 7: Content Import Update

**Goal**: Simplify the "Add to My Locker" flow for TODO_LIST content cards.

- Remove layout positioning logic from import flow
- Import creates the TaskList only — no layout item creation
- Frontend: remove redirect-to-locker-and-scroll behavior, replace with confirmation message
- Optional: add "New" badge to To-do app icon after import

---

## 18. Testing Requirements

### Phase 1 — Backend
- Unit tests for app preferences service (default state, save, update, palette persistence)
- Integration tests for preferences endpoints (auth required, per-user isolation)

### Phase 2 — App Shell
- Launcher renders all apps with correct active/inactive state
- Pane layout renders correct number of panes (1, 2, 3)
- Active app toggle updates layout
- 3-app limit enforced

### Phase 3 — App Components
- Each app: drill-down navigation (list → detail → back)
- Each app: CRUD operations work within the app (create, edit, delete items)
- Data loads correctly from existing API services

### Phase 4 — Mobile
- Swipe navigation between active apps
- Page dots reflect current position
- App drawer accessible by swiping past last page
- Breakpoint switching between pane and swipe layouts

### Phase 4.1 — Keyboard Shortcuts
- Each shortcut triggers the correct action
- Shortcuts ignored when typing in text fields
- `Esc` correctly navigates back through drill-down levels
- `N` does nothing in Timer app (no item creation)

### Phase 5 — Palettes
- Palette selection persists across sessions
- Each app receives correct color from palette
- Switching palettes updates all app colors

### Phase 6 — Cleanup
- No references to deleted components remain
- No unused imports or dead code
- All existing tests updated or removed to reflect new architecture
- Build succeeds with no warnings from removed code

### Phase 7 — Content Import
- "Add to My Locker" creates TaskList without layout data
- Imported list appears in To-do app's list view
