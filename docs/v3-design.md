# High School How To — v3.0 Design Document

**Status**: Draft
**Last updated**: 2026-04-07

## Table of Contents

1. [Overview](#1-overview)
2. [To-Do List Creation — UX Overhaul](#2-to-do-list-creation--ux-overhaul)
3. [Pomodoro Timer](#3-pomodoro-timer)
4. [Sticky Notes](#4-sticky-notes)
5. [Bookmarks](#5-bookmarks)
6. [Stickers](#6-stickers)
7. [Shared Design Patterns](#7-shared-design-patterns)
8. [Locker Grid Layout](#8-locker-grid-layout)
9. [Study Session Mode](#9-study-session-mode)
10. [About Page](#10-about-page)
11. [Custom Font — Mira's Handwriting](#11-custom-font--miras-handwriting)
12. [Implementation Phases](#12-implementation-phases)
13. [Testing Requirements](#13-testing-requirements)

---

## 1. Overview

v3.0 enhances the **My Locker** experience with a suite of interactive "locker apps" — small, personal productivity and customization tools that live inside the user's locker. The goal is to make the locker feel like a real, personal space that students can organize, decorate, and use day-to-day.

### New Locker Apps

| App | Icon location | Purpose |
|---|---|---|
| **To-Do List** (updated) | Locker header | Create and manage to-do lists |
| **Pomodoro Timer** | Locker header | Focus timer integrated with to-do lists |
| **Sticky Note** | Locker header | Quick sticky notes pinned to the locker |
| **Bookmarks** | Locker header | Saved links that open in a new tab |
| **Stickers** | Locker header | Emoji-based locker decoration |

All apps share a **consistent design language**: unified color/theme picker, confirmation dialogs on delete, and the same creation pattern (icon tap → instant creation with smart defaults).

---

## 2. To-Do List Creation — UX Overhaul

### Current Behavior
A text input field and "+ Create" button in the locker header. User types a name, clicks Create.

### New Behavior
Replace the text field and button with a **list icon** in the locker header. Tapping the icon instantly creates a new list with a generated name and auto-assigned color — no form required.

### Naming Rules
- Default name: **"To-dos"**
- If "To-dos" already exists: **"To-dos #2"**, then **"To-dos #3"**, etc.
- Gap-filling: the next available number is always used (if "To-dos" and "To-dos #3" exist, the next list is "To-dos #2")
- Users can still rename via inline title editing after creation
- See [Auto-Naming on Creation](#auto-naming-on-creation) in Shared Design Patterns for the full convention

### Color Assignment
On creation, a color is auto-assigned using the next-available-color rotation from the user's personal palette (see [Color/Theme Picker](#colortheme-picker)). Users can change the color at any time via the shared palette icon (🎨) on the card.

### API Changes
None — the existing `POST /api/tasklists` endpoint accepts a title and optional color. The frontend will generate the name and color client-side before calling the API.

### To-Do Item Due Dates

Each to-do item can optionally have a **due date/time**.

#### UX Flow
1. User adds a to-do item (text only, as today)
2. **No due date set**: a small, muted **calendar icon** (🗓) appears inline on the item — clicking it opens a date/time picker
3. **Due date set**: the date replaces the calendar icon and is displayed on a **second line** below the description in a smaller/muted style. Clicking the date allows editing or clearing it.

```
☐ Study for biology exam
  📅 Apr 10, 2026 at 3:00 PM

☑ Read chapter 5
  📅 Apr 8, 2026 at 9:00 AM

☐ Turn in homework        🗓
```

#### Due Date Input
Clicking the calendar icon or the displayed date opens a **due date popover** with two input methods:
- **Text field** (top): accepts natural language input — e.g., "tomorrow at 3pm", "next Tuesday", "Apr 10", "in 2 hours". The parsed date is shown as a preview below the field so the user can confirm it was understood correctly.
- **Date picker** (below): a traditional calendar + time picker as a fallback for precise selection

Either method populates the same due date. The popover also includes a **"Clear"** button to remove the due date.

A library like [chrono-node](https://github.com/wanasit/chrono) can handle the natural language parsing client-side.

#### Behavior
- Due date is **optional** — to-dos work exactly as before without one
- **Editing**: clicking the displayed due date reopens the popover with the current value pre-filled in both the text field and picker
- **Removing**: the "Clear" button in the popover removes the due date and returns the item to showing the muted calendar icon
- **Overdue indicator**: if the due date has passed and the item is not completed, the date is styled in red or with a warning color
- **Due date notifications**: if notifications are enabled (see [Notification Toggle](#notification-toggle)), a browser notification fires when a due date arrives. This uses the same Web Notifications API as the Pomodoro timer. The app checks upcoming due dates periodically while the page is open.
- Date format: user-friendly relative or absolute (e.g., "Tomorrow at 3 PM", "Apr 10 at 3:00 PM")

#### Backend Changes
- Add `dueAt` (TIMESTAMPTZ, nullable) column to the `tasks` table via Liquibase migration
- Widen `task_lists.color` from VARCHAR(32) to VARCHAR(255) to support gradient strings
- Add `textColor` (VARCHAR(255), nullable) column to `task_lists`
- Update `TaskItem` entity with `dueAt` field
- Update `TaskList` entity with widened `color` and new `textColor` fields
- Update `CreateTaskRequest`, `UpdateTaskRequest`, and `TaskItemResponse` DTOs to include `dueAt`
- Update `CreateTaskListRequest`, `TaskListResponse` DTOs to include `textColor`

---

## 3. Pomodoro Timer

### Overview
A focus timer based on the Pomodoro Technique that integrates with to-do lists. Users work in timed focus intervals separated by breaks, with a longer break after a set number of sessions.

### Creation
- **Timer icon** in the locker header, next to the list icon
- Tapping creates a new timer card in the locker grid
- Default name: **"Timer"** (same auto-naming rules: "Timer", "Timer #2", "Timer #3", etc.)
- Auto-assigned color from the shared palette

### Timer Configuration

#### Presets
Offer recommended presets that users can select:

| Preset | Focus | Short Break | Long Break | Sessions before long break |
|---|---|---|---|---|
| **Classic Pomodoro** | 25 min | 5 min | 15 min | 4 |
| **Short Sprint** | 15 min | 3 min | 10 min | 4 |
| **Deep Work** | 50 min | 10 min | 30 min | 3 |

#### Custom Settings
Users can manually set:
- Focus duration
- Short break duration
- Long break duration
- Number of sessions before a long break

### Timer States
1. **Idle** — timer is configured but not running
2. **Focus** — countdown is active for a focus session
3. **Short Break** — countdown is active for a short break
4. **Long Break** — countdown is active for a long break
5. **Paused** — timer is paused mid-session

### To-Do List Integration
- When starting a timer, the user can optionally **link a to-do list**
- The linked list is displayed alongside the timer so the user can check off tasks during focus sessions
- The link is persisted server-side via the `linkedTaskListId` FK on the timer entity, so it survives page refreshes

### Visual Indicators
- **Progress ring or arc** showing time remaining in the current interval
- **Color shifts** between states (e.g., accent color for focus, green for break)
- **Session counter** (e.g., "Session 2 of 4")
- **Pulsing or animation** to clearly distinguish active vs. paused

### Browser Notifications
- Use the **Web Notifications API** to alert the user when a focus session or break ends
- Prompt for notification permission on first timer use
- Graceful fallback: if notifications are denied, rely on visual + audio cues only

### Deletion
- Timers can be deleted with a **confirmation dialog** (consistent with to-do list deletion)

### Persistence
- Timer configuration (durations, preset, linked list) is persisted to the backend
- Timer _state_ (running/paused, time remaining) is kept client-side only — refreshing the page resets a running timer to idle
- This keeps the backend simple and avoids real-time sync complexity

### Backend Changes
New entity and endpoints for timer configuration:

- `POST /api/timers` — create a timer
- `GET /api/timers` — list user's timers
- `PUT /api/timers/{id}` — update timer settings (durations, name, color, linked list)
- `DELETE /api/timers/{id}` — delete a timer

**Timer entity**: `id`, `userId`, `title`, `color`, `textColor` (nullable), `focusDuration`, `shortBreakDuration`, `longBreakDuration`, `sessionsBeforeLongBreak`, `presetName`, `linkedTaskListId` (nullable FK), `createdAt`, `updatedAt`

---

## 4. Sticky Notes

### Overview
Sticky notes that appear pinned/taped to the locker interior. Quick, lightweight text capture with visual personality.

### Creation
- **Sticky Note icon** in the locker header
- Tapping creates a new note card in the locker grid
- Default name: **"Note"** (same auto-naming rules: "Note", "Note #2", "Note #3", etc.)
- Auto-assigned color from the shared palette (default: classic yellow `#fef3c7`)
- Default content: empty (placeholder text: "Type a note…")

### Customization
- **Color**: selectable from the shared color palette via the palette icon (🎨)
- **Font size**: adjustable per note (e.g., small, medium, large) to fit more or less text
- Font face follows the **locker-wide font setting** (see [Locker Font Setting](#locker-font-setting))

### Deletion
- Deletable with a **confirmation dialog**

### Backend Changes
New entity and endpoints:

- `POST /api/notes` — create a note
- `GET /api/notes` — list user's notes
- `PUT /api/notes/{id}` — update note content, color
- `DELETE /api/notes/{id}` — delete a note

**Note entity**: `id`, `userId`, `title`, `content` (TEXT), `color`, `textColor` (nullable), `fontSize` (VARCHAR, nullable — e.g., "small", "medium", "large"), `createdAt`, `updatedAt`

---

## 5. Bookmarks

### Overview
A bookmark list that lives in the locker as a card. Users can save links that open in a new browser tab — a personal collection of frequently used school resources, study sites, or any URL.

### Creation
- **Bookmark icon** (🔗) in the locker header
- Tapping creates a new bookmark list card in the locker grid
- Default name: **"Bookmarks"** (same auto-naming rules: "Bookmarks", "Bookmarks #2", "Bookmarks #3", etc.)
- Auto-assigned color from the shared palette

### Adding Bookmarks
Three ways to add a bookmark to a list:

1. **Drag and drop**: drag a URL from the browser address bar onto the bookmark list card. The app listens for the `drop` event, extracts the URL from the drag data, and creates the bookmark.
2. **Paste**: click an "Add" button or input field on the card and paste a URL from the clipboard. The app detects a valid URL and creates the bookmark.
3. **Manual entry**: type or edit a URL directly in the input field.

### Auto-Fetching Metadata
When a URL is added, the app fetches metadata from the target site:
- **Favicon**: displayed as a small icon next to the bookmark (fetched from `{origin}/favicon.ico` or parsed from the page's `<link rel="icon">`)
- **Page title**: auto-populated as the bookmark title (parsed from `<title>` or Open Graph `og:title`)

This requires a **backend proxy endpoint** to avoid CORS issues when fetching third-party pages:
- `GET /api/bookmarks/metadata?url={url}` — fetches the target URL server-side, parses the HTML for title and favicon, and returns them to the frontend

**SSRF mitigations** (this endpoint is a potential Server-Side Request Forgery vector):
- Only allow `http` and `https` schemes
- Block private/reserved IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16) and `localhost`
- Enforce a request timeout (3 seconds max)
- Limit response body size (1 MB max — only need to parse `<head>`)
- Rate limit: max 10 metadata fetches per user per minute
- Requires authentication (no anonymous access)

**Fallbacks**: if metadata can't be fetched (site blocks requests, timeout, etc.), the favicon defaults to a generic link icon and the title defaults to the URL hostname.

### Bookmark Display
Each bookmark in the list shows:
```
🌐 Khan Academy          ✏️  🗑
   khanacademy.org
```
- **Favicon** (or generic icon) on the left
- **Title** (editable) as the primary text
- **Hostname** displayed below in muted text
- **Edit** and **Delete** action icons
- Clicking the bookmark opens the URL in a **new tab** (`target="_blank"`)

### Editing
- The bookmark **title** is editable inline — click the edit icon or the title itself to modify
- The **URL** can also be updated (re-fetches metadata when changed)

### Deletion
- Individual bookmarks: delete icon with **confirmation dialog**
- Entire bookmark list: delete via card menu with **confirmation dialog**

### Reordering
- Bookmarks within a list can be reordered via drag and drop (consistent with to-do item reordering)

### Backend Changes
New entities and endpoints:

- `POST /api/bookmarklists` — create a bookmark list
- `GET /api/bookmarklists` — list user's bookmark lists
- `PUT /api/bookmarklists/{id}` — update list title, color
- `DELETE /api/bookmarklists/{id}` — delete a bookmark list
- `POST /api/bookmarklists/{id}/bookmarks` — add a bookmark
- `PUT /api/bookmarklists/{id}/bookmarks/{bookmarkId}` — update bookmark title, URL
- `PUT /api/bookmarklists/{id}/bookmarks/reorder` — reorder bookmarks
- `DELETE /api/bookmarklists/{id}/bookmarks/{bookmarkId}` — delete a bookmark
- `GET /api/bookmarks/metadata?url={url}` — fetch title and favicon for a URL

**BookmarkList entity**: `id`, `userId`, `title`, `color`, `textColor` (nullable), `createdAt`, `updatedAt`

**Bookmark entity**: `id`, `bookmarkListId`, `url` (TEXT), `title`, `faviconUrl` (nullable), `sortOrder`, `createdAt`, `updatedAt`

---

## 6. Stickers

### Overview
Decorative stickers that can be placed around the locker. Purely cosmetic — makes the locker feel personal and fun.

### Sticker Types

| Type    | Source                                                          | v3.0   |
|---------|------------------------------------------------------------------|--------|
| **Emoji** | Built-in emoji set                                             | Yes    |
| **Image** | Uploaded via content admin (hand-drawn artwork, illustrations) | Future |

v3.0 ships with emoji stickers. The data model supports image stickers from the start so no migration is needed later — image stickers will be added when artwork is available through the content admin.

### Creation
- **Sticker icon** in the locker header
- Tapping opens a **sticker picker** with tabs/sections by type
  - **Emoji tab**: emoji grid (either native OS picker or a curated set of popular emojis)
  - **Image tab** (future): browse image stickers uploaded by admin
- Selecting a sticker places it in the locker

### Customization
- **Size**: adjustable (small, medium, large — or a slider)
- **Position**: stickers can be freely placed / dragged around the locker area

### Deletion
- Tapping a sticker and confirming removal, or a delete mode where stickers become removable
- **Confirmation dialog** before deletion (consistent with other apps)

### Backend Changes
New entity and endpoints:

- `POST /api/stickers` — create a sticker
- `GET /api/stickers` — list user's stickers
- `PUT /api/stickers/{id}` — update position, size
- `DELETE /api/stickers/{id}` — delete a sticker

**Sticker entity**: `id`, `userId`, `type` (EMOJI or IMAGE), `emoji` (VARCHAR, nullable — used when type is EMOJI), `imageUrl` (VARCHAR, nullable — used when type is IMAGE), `positionX`, `positionY`, `size`, `createdAt`, `updatedAt`

**Future: Image sticker management** (admin side):
- Admin uploads sticker images via the content admin (similar to existing media uploads)
- Images stored in `media/stickers/` and served via CloudFront
- A sticker catalog endpoint serves available image stickers to users

---

## 7. Shared Design Patterns

### Locker Header App Bar
All creation icons live in a consistent row in the locker header:

```
[ 📋 List ]  [ ⏱ Timer ]  [ 📝 Sticky Note ]  [ 🔗 Bookmarks ]  [ 🌈 Sticker ]  ...  [ 🔔 Notifications ]
```

Icons should be visually consistent (same size, style, spacing) and clearly labeled or tooltipped.

### Locker Font Setting
A locker-wide font setting that applies to all card titles and card content. Accessible from the locker header (e.g., a settings gear or within the existing locker color picker area).

#### Available Fonts

| Font | Style | Source |
|------|-------|--------|
| **Mira's Handwriting** | Handwritten, personal | Custom TTF (bundled) |
| **Nunito** | Clean, rounded sans-serif | Google Fonts (already loaded) |
| **Patrick Hand** | Casual handwriting | Google Fonts (already loaded) |
| **Bangers** | Bold comic-style | Google Fonts (already loaded) |
| **Caveat** | Flowing cursive | Google Fonts |
| **Indie Flower** | Loose, sketchy handwriting | Google Fonts |
| **Fredoka** | Rounded, friendly | Google Fonts |
| **Bubblegum Sans** | Fun, bubbly | Google Fonts |
| **Poppins** | Geometric, modern | Google Fonts |
| **Quicksand** | Rounded sans-serif | Google Fonts |

#### Behavior
- Changing the font applies to **all cards** in the locker (to-do lists, timers, sticky notes, bookmark lists)
- The font selector shows a **live preview** of each font name rendered in that font
- New Google Fonts are loaded on demand (only fetched when selected) to avoid loading all fonts upfront
- Default: **Mira's Handwriting**
- Persisted per user in localStorage (keyed like the locker color: `hsht_lockerFontId`)

### Notification Toggle
A **bell icon** (🔔 / 🔕) in the locker header provides a quick way to enable or disable **all** browser notifications:
- **On** (🔔): notifications are active — Pomodoro timer alerts (focus/break ended) and to-do due date reminders will fire
- **Off** (🔕): all notifications are silenced — visual indicators and in-app cues still work, but no browser popups
- Clicking the icon toggles the state instantly (no confirmation needed)
- If the browser has not yet granted notification permission, toggling on triggers the browser's permission prompt
- State is persisted in localStorage so it survives page refreshes
- The icon is visually distinct from the app creation icons (right-aligned or separated by a divider) so it reads as a setting, not an app

### Auto-Naming on Creation
All locker apps use the same naming convention when created without a title:

| App | Default sequence |
|-----|-----------------|
| To-Do List | "To-dos", "To-dos #2", "To-dos #3", … |
| Timer | "Timer", "Timer #2", "Timer #3", … |
| Sticky Note | "Note", "Note #2", "Note #3", … |
| Bookmark List | "Bookmarks", "Bookmarks #2", "Bookmarks #3", … |

- The first instance uses the base name (no number)
- Subsequent instances append `#N` starting at `#2`
- Gap-filling: if "To-dos" and "To-dos #3" exist, the next is "To-dos #2"
- Users can always rename via inline title editing after creation

### Inline Title Editing
All locker app cards (to-do lists, timers, sticky notes, bookmark lists) support **click-to-edit titles** using the standard inline editing pattern:

1. **Display mode**: title appears as normal text. A subtle pencil icon or underline-on-hover hints that it's editable.
2. **Edit mode**: clicking the title (or the pencil icon) replaces it with a text input, pre-filled and selected. A small **checkmark** (✓) button appears next to the field.
3. **Committing**: **Enter** key or clicking the **✓ button** saves the change.
4. **Cancelling**: **Escape** key or clicking outside the field discards the change and reverts to the previous title.
5. **Validation**: empty titles are not allowed — the save is blocked and the field shows a subtle error state.

This is the same pattern already used for to-do list title editing — v3.0 extracts it into a **shared inline-edit component** and applies it consistently to all card types.

### Color/Theme Picker
A **shared component** used by **all locker apps** (to-do lists, timers, sticky notes, bookmark lists) for selecting colors and themes. Accessed via a **palette icon** (🎨) on each card — replaces the current gear icon on to-do list cards. Every card type uses this same picker for a consistent experience.

#### Picker Modes
The color picker offers multiple ways to choose a color:

1. **Preset swatches**: a curated default palette of 16 colors for quick selection
2. **Gradient builder**: select two colors and a direction (e.g., top-to-bottom, diagonal) to create a gradient background for the card
3. **Free-form picker**: a color wheel or spectrum slider for choosing any solid color

#### Default Palettes

**Card color presets** (16 curated defaults for locker app cards):

| Color | Hex | Description |
|-------|-----|-------------|
| Cream | `#fffef8` | Warm white (current default) |
| Buttercup | `#fef3c7` | Light yellow |
| Sunflower | `#fde68a` | Medium yellow |
| Marigold | `#fcd34d` | Bold yellow |
| Blush | `#fef2f2` | Lightest pink |
| Rose | `#fecdd3` | Light pink |
| Coral | `#fda4af` | Medium pink |
| Peony | `#fbcfe8` | Pink-purple |
| Lavender | `#ede9fe` | Lightest purple |
| Lilac | `#ddd6fe` | Light purple |
| Periwinkle | `#c7d2fe` | Blue-purple |
| Sky | `#bfdbfe` | Light blue |
| Mint | `#dcfce7` | Lightest green |
| Sage | `#bbf7d0` | Light green |
| Seafoam | `#a7f3d0` | Teal-green |
| Ice | `#e0f2fe` | Icy blue |

These are the same 16 pastels currently used for to-do list cards, now shared across all apps.

**Locker door color presets** (unchanged from current):

| Color | Gradient | Accent |
|-------|----------|--------|
| Blue | `linear-gradient(135deg, #6aabdf 0%, #3d8ed4 45%, #2368b0 100%)` | `#3d8ed4` |
| Red | `linear-gradient(135deg, #e86060 0%, #d42e2e 45%, #a81818 100%)` | `#d42e2e` |
| Green | `linear-gradient(135deg, #4dcc7a 0%, #28a855 45%, #157038 100%)` | `#28a855` |
| Orange | `linear-gradient(135deg, #f0a040 0%, #e07820 45%, #b85810 100%)` | `#e07820` |
| Purple | `linear-gradient(135deg, #9870d8 0%, #7048c0 45%, #5030a0 100%)` | `#7048c0` |
| Teal | `linear-gradient(135deg, #30bcd0 0%, #1898a8 45%, #0c7080 100%)` | `#1898a8` |
| Yellow | `linear-gradient(135deg, #e8d040 0%, #c8a810 45%, #a88808 100%)` | `#c8a810` |
| Gray | `linear-gradient(135deg, #8898bc 0%, #6878a0 45%, #485880 100%)` | `#6878a0` |

The locker door colors remain as-is — these are separate from the card color picker and are not changing in v3.0.

#### Custom Palette
The 16 default swatches serve as the user's **personal palette**. Users can customize it by saving colors they like into specific cells:

1. User selects a color via the gradient builder or free-form picker
2. A **"Save to palette"** option becomes available
3. User clicks a palette cell to replace that cell's color with the new one
4. The customized palette is persisted in **localStorage** (`hsht_customPalette`). Since palette preferences are cosmetic and low-stakes, localStorage is sufficient — no backend storage needed. This also avoids extra API calls on every color picker open.

This lets users build up a personal set of go-to colors over time while always having the defaults as a starting point. The defaults can be restored with a **"Reset to defaults"** action.

#### Color History
- The last **16 colors** (solid or gradient) the user has selected are saved as a **"Recent Colors"** row below the palette
- History is persisted in **localStorage** (`hsht_colorHistory`)
- Makes it easy to reuse colors across different locker apps without remembering exact values

#### Text Color
Users can optionally choose a **text color** for any locker app card, using the same picker modes (presets, gradient builder, free-form).

**Auto-contrast by default**: when no text color is explicitly set, the app automatically selects black or white text based on the background color's luminance (using the WCAG relative luminance formula). This ensures readable text out of the box without the user needing to think about it.

- Light backgrounds → dark text (default)
- Dark backgrounds → white text (default)
- User override: if a custom text color is chosen that results in poor contrast against the background, show a **warning indicator** (e.g., "Low contrast" badge) but still allow it — the user has final say
- Target: **WCAG AA** contrast ratio (4.5:1 for normal text, 3:1 for large text)

**Storage**: a `textColor` field (nullable) on each entity. `null` means auto-contrast.

#### Card Color Storage
- Solid colors continue to be stored as a single hex value (e.g., `#fef3c7`)
- Gradients are stored as a CSS gradient string (e.g., `linear-gradient(135deg, #6aabdf 0%, #3d8ed4 45%, #2368b0 100%)`)
- The existing `color` field (VARCHAR 32) is widened to **VARCHAR(255)** via Liquibase migration to accommodate gradient strings. This is simpler than adding a separate field and keeps queries straightforward.

#### Accessibility
- Keyboard navigable swatches (already implemented for to-do lists)
- Auto-contrast text color ensures readability by default (see Text Color above)
- WCAG AA contrast warning when user overrides with a low-contrast combination

### Per-User Limits
To prevent abuse and keep the locker usable, enforce maximum counts per user:

| Item | Max per user |
|------|-------------|
| To-do lists | 20 |
| Tasks per list | 50 |
| Timers | 10 |
| Sticky notes | 20 |
| Bookmark lists | 10 |
| Bookmarks per list | 50 |
| Stickers | 30 |

Limits are enforced server-side. The frontend disables the creation icon and shows a tooltip (e.g., "Maximum of 20 lists reached") when the limit is hit.

### Delete Confirmation
A **shared confirmation dialog** component:
- Triggered before any destructive action (deleting a list, timer, note, or sticker)
- Clear messaging: "Delete [item name]? This can't be undone."
- Consistent button styling: Cancel (secondary) / Delete (danger/red)

---

## 8. Locker Grid Layout

### Current
To-do list cards in a responsive CSS grid: `repeat(auto-fill, minmax(280px, 1fr))`

### Updated
The grid now contains mixed card types — to-do lists, timers, sticky notes, and bookmark lists. Stickers are positioned absolutely over the locker area rather than in the grid.

**Card type indicators**: Each card type should have a subtle visual distinction (icon badge, shape, or border style) so users can quickly scan their locker.

**Drag-and-drop reordering**: Users can rearrange cards (to-do lists, timers, sticky notes, bookmark lists) within the grid via drag and drop, using Angular CDK DragDrop (already in use for task reordering within lists). The sort order is persisted so the layout is preserved across sessions.

**Grid sort order persistence**: A separate `locker_layout` table stores the card ordering across all types:

- `POST /api/locker/layout` — save the current card order
- `GET /api/locker/layout` — retrieve the saved card order

**LockerLayoutItem entity**: `id`, `userId`, `cardType` (TASK_LIST, TIMER, NOTE, BOOKMARK_LIST), `cardId` (UUID), `sortOrder` (INT)

This avoids adding `sortOrder` to every individual entity and provides a single source of truth for the locker grid layout. A Liquibase migration creates the `locker_layout` table with a composite unique constraint on `(userId, cardType, cardId)`.

**Sticker positioning**: Stickers are positioned absolutely over the locker area and are draggable independently of the grid. Their positions are persisted via the sticker entity's `positionX`/`positionY` fields.

---

## 9. Study Session Mode

### Overview
A focused view that pairs a **to-do list** and a **Pomodoro timer** side by side, replacing the normal locker grid. Designed for distraction-free study — everything the student needs in one view without the rest of the locker clutter.

### Entering Study Session
- User can launch a Study Session from:
  - A **"Study Session"** action on a timer card (picks the timer + its linked list)
  - A dedicated button/icon in the locker header
- If launched without a pre-linked list, the user is prompted to pick a to-do list (or create one)

### Layout
Side-by-side two-panel layout:

```
┌─────────────────────┬─────────────────────┐
│                     │                     │
│     To-Do List      │   Pomodoro Timer    │
│                     │                     │
│  ☐ Task 1           │   ┌───────────┐     │
│  ☑ Task 2           │   │  24:35    │     │
│  ☐ Task 3           │   │  Focus    │     │
│  ☐ Task 4           │   └───────────┘     │
│                     │   Session 2 of 4    │
│  + Add a to-do…     │                     │
│                     │   [Pause] [Stop]    │
└─────────────────────┴─────────────────────┘
```

- **Left panel**: Full to-do list with all existing interactions (add, check off, reorder, edit, delete tasks)
- **Right panel**: Active Pomodoro timer with visual indicators, session counter, and controls
- On smaller screens, panels stack vertically (timer on top, list below)

### Exiting Study Session
- An **"Exit"** or **"Back to Locker"** button returns to the normal locker grid view
- Timer state is preserved — if the timer is running, it keeps running in the background when returning to the locker

### Backend Changes
None — Study Session is a frontend-only view mode using existing timer and to-do list data.

---

## 10. About Page

### Overview
A public About page at `/about` that displays the contents of the "My Mission" article card from the content API. This keeps the content editable through the existing admin — no code changes needed to update the About page text.

### Route
- **Path**: `/about`
- **Public**: no authentication required

### Content Source
- Fetches the article card with slug `my-mission` (or a configurable slug) via `ContentApiService`
- Renders using the **simple layout** (see below) — just the article title and body, no viewer chrome

### Navigation
- Linked from the **main nav/header** (visible on all pages)
- Also linked from the **footer**

### Simple Layout Mode
A per-article setting (checkbox in the admin content editor) that controls how the article renders at `/content/:slug`:

- **Simple layout** (checked): clean, standalone page — article title and body only. No prev/next arrows, no back link, no tag header. Suitable for standalone pages like About, Terms, etc.
- **Full viewer** (unchecked, default): the current content viewer with navigation arrows, back link, and tag context.

The About page at `/about` is simply a route alias for `/content/my-mission` that forces simple layout regardless of the setting.

### Backend Changes
- Add `simpleLayout` (BOOLEAN, default false) column to the `content_cards` table via Liquibase migration
- Update `ContentCard` entity, `SaveCardRequest`, `ContentCardResponse`, and `ContentCardAdminResponse` DTOs

---

## 11. Custom Font — Mira's Handwriting

### Overview
A custom handwriting-style font (`MirasHandwriting-Regular.ttf`) is added to give the site a more personal, hand-crafted feel. It is used selectively for display elements, not body text.

### Setup
- Move font file from `frontend/` to `frontend/public/assets/fonts/MirasHandwriting-Regular.ttf`
- Register via `@font-face` in `styles.scss`:
  ```scss
  @font-face {
    font-family: 'Miras Handwriting';
    src: url('/assets/fonts/MirasHandwriting-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  ```

### Where to Use (`var(--font-display)`)
- **Headers** (h1–h3): page titles, section headings, card titles
- **Tag filter buttons**: "All", "Academics", etc.
- **Locker app card titles**: to-do lists, timers, sticky notes, bookmark lists
- **Home page note cards**: tagline and decorative text

### Where NOT to Use (`var(--font-body)`)
- **Article body and description** — keep Nunito for readability of long-form content
- **Card descriptions** — smaller descriptive text under card titles
- **Navigation buttons** — "Home", "Log out", "Admin", "← Home" back links
- **Admin interface** — entire admin shell uses Nunito
- **Form inputs and labels**

### Font Sizes
Use consistent sizes based on font:

| Element | Font | Size |
|---------|------|------|
| Page titles / h1 | Display | inherited (clamp) |
| Card titles | Display | 1.2rem |
| Tag filter buttons | Display | 1.1rem |
| Card type badge | Display | 0.8rem |
| Article body | Body | 0.95rem |
| Article description | Body | 0.95rem |
| Card descriptions | Body | 0.75rem |
| Nav buttons (Logout, Admin, ← Home) | Body | 0.8rem |

### Font Stack
```scss
// Display elements — set as :root default
--font-display: 'Miras Handwriting', 'Patrick Hand', cursive;

// Body text — override on specific elements
--font-body: 'Nunito', 'Segoe UI', system-ui, -apple-system, sans-serif;
```

---

## 12. Implementation Phases

### Phase 1 — To-Do List UX + Shared Components
- Replace list creation form with icon-based creation
- Implement auto-naming logic ("To-dos", "To-dos #2", etc.)
- To-do due dates: `dueAt` migration, due date popover with natural language input (chrono-node), overdue indicators
- Extract shared color picker component (presets, gradient builder, free-form, custom palette, color history, text color)
- Extract shared inline title editing component
- Extract shared delete confirmation dialog component
- Custom font setup: `@font-face` registration, `--font-display` / `--font-body` CSS variables
- Locker font setting: font selector with live preview, on-demand Google Fonts loading
- Locker grid drag-and-drop reordering: `locker_layout` table migration, layout endpoints

### Phase 2 — Pomodoro Timer
- Backend: timer entity, migration, CRUD endpoints
- Frontend: timer card component with countdown, states, presets, custom settings
- To-do list integration (link a list to a timer)
- Visual indicators (progress ring, state colors)
- Browser notification support (Web Notifications API)
- Notification toggle (🔔/🔕) in locker header — controls timer alerts and due date reminders

### Phase 3 — Sticky Notes
- Backend: note entity, migration, CRUD endpoints
- Frontend: note card component with inline editing
- Color selection and per-note font size adjustment

### Phase 4 — Study Session Mode
- Side-by-side layout component (to-do list + timer)
- Entry points (timer card action, header button)
- Responsive stacking for small screens
- Background timer persistence when exiting

### Phase 5 — Bookmarks
- Backend: bookmark list/bookmark entities, migrations, CRUD endpoints
- Backend: URL metadata proxy endpoint (title + favicon fetching)
- Frontend: bookmark list card with drag-and-drop URL adding, paste support
- Favicon and title auto-fetch on add
- Inline title editing, reordering

### Phase 6 — About Page + Simple Layout
- Backend: `simpleLayout` migration, entity/DTO updates, admin checkbox
- Frontend: simple layout mode for content viewer (no nav arrows, back link, or tag header)
- Frontend: `/about` route as alias for `/content/my-mission` with simple layout
- Add About links to main nav/header and footer

### Phase 7 — Stickers
- Backend: sticker entity, migration, CRUD endpoints
- Frontend: emoji picker, drag-to-place positioning, size adjustment
- Sticker management (deletion flow)

---

## 13. Testing Requirements

Every feature in v3.0 must ship with tests. No feature is considered complete until its tests pass. Follow the test pyramid: many unit tests, fewer integration tests, minimal E2E.

### Backend Testing

#### Unit Tests (JUnit 5 + Mockito)
Every new service class and utility gets unit tests with mocked dependencies:

- **Service layer**: test all business logic, validation, edge cases, and error paths
  - Auto-naming logic (gap-filling, collision handling)
  - Per-user limit enforcement (create succeeds under limit, fails at limit)
  - Timer preset loading and custom duration validation
  - Bookmark metadata parsing (title extraction, favicon extraction, malformed HTML)
  - SSRF validation (blocked schemes, private IPs, localhost)
  - Due date handling (null allowed, stored correctly)
  - Locker layout ordering logic
- **DTOs / Validation**: test `@NotBlank`, `@Size`, and custom validators via `jakarta.validation.Validator`
- **Auto-contrast utility**: test luminance calculation and black/white text selection for various background colors

#### Integration Tests (Spring Boot + TestContainers)
Every new controller gets integration tests that hit real endpoints with a real database:

- **CRUD lifecycle**: create → read → update → delete for each entity (timers, notes, bookmark lists, bookmarks, stickers, locker layout)
- **User isolation**: verify that user A cannot read/update/delete user B's data
- **Cascading deletes**: deleting a bookmark list deletes its bookmarks; deleting a user cleans up all owned entities
- **Per-user limits**: verify 403/409 response when limits are exceeded
- **Bookmark metadata endpoint**: test successful fetch, timeout handling, SSRF blocking, rate limiting
- **Field widening**: verify existing task list colors still load after VARCHAR(32) → VARCHAR(255) migration
- **Liquibase migrations**: verify all changesets apply cleanly and rollback scripts work

#### What to Cover
| Entity | Unit tests | Integration tests |
|--------|-----------|-------------------|
| Timer | Service: CRUD, presets, custom durations, linked list FK | Controller: full lifecycle, user isolation, limits |
| Sticky Note | Service: CRUD, auto-naming, font size validation | Controller: full lifecycle, user isolation, limits |
| Bookmark List | Service: CRUD, auto-naming | Controller: full lifecycle, user isolation, limits |
| Bookmark | Service: CRUD, reorder, metadata parsing | Controller: full lifecycle, SSRF blocking, rate limiting |
| Sticker | Service: CRUD, position/size validation | Controller: full lifecycle, user isolation, limits |
| Locker Layout | Service: save/load ordering | Controller: save/load, user isolation |
| Content Card | Service: `simpleLayout` field | Controller: verify field returned in responses |
| Task Item | Service: `dueAt` handling | Controller: create/update with due date |

### Frontend Testing

#### Unit Tests (Karma + Jasmine)
Every new component, service, and utility gets unit tests:

- **Components**: test rendering, user interactions, input/output bindings, and state transitions
  - Color picker: preset selection, gradient builder, free-form input, save to palette, color history
  - Inline title editing: edit mode toggle, Enter to commit, Escape to cancel, empty validation
  - Delete confirmation dialog: displays item name, cancel returns, confirm emits delete
  - Timer card: state transitions (idle → focus → short break → long break → idle), pause/resume, session counter
  - Due date popover: natural language parsing preview, date picker selection, clear button
  - Bookmark card: drag-and-drop URL handling, paste detection, favicon/title display
  - Sticker picker: emoji selection, size adjustment
  - Notification toggle: state toggle, permission prompt trigger
  - Auto-naming: generates correct names with gap-filling
- **Services**: test API calls with `HttpClientTestingModule`
  - All new API services (timer, note, bookmark, sticker, locker layout)
  - Verify correct HTTP methods, URLs, request bodies, and error handling
- **Utilities**:
  - Auto-contrast calculation (luminance formula, black/white selection)
  - Natural language date parsing (via chrono-node) — "tomorrow at 3pm", "next Tuesday", invalid input
  - Auto-naming logic (gap-filling, collision detection)

#### What NOT to Test
- Don't test Angular framework behavior (e.g., that `*ngIf` works)
- Don't test trivial getters/setters
- Don't test third-party library internals (chrono-node parsing edge cases are their responsibility)

### Test Coverage Expectations
- **Backend**: aim for 90%+ line coverage on new code (services and controllers)
- **Frontend**: aim for 80%+ branch coverage on new components and services
- Every bug fix must include a regression test that would have caught it
- Tests must run in CI (`ci.yml`) — no feature merges without green tests
