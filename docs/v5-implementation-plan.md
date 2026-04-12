# v5.0 Implementation Plan

**Design doc**: `docs/v5-locker-apps-design.md`
**Help content mockup**: `docs/help-content-mockup.md`

This plan is ordered for Sonnet to execute phase by phase. Each phase is self-contained and can be verified before moving to the next. Always clean up dead code and remove deprecated concepts as you go — don't leave unused imports, commented-out code, or orphaned files.

---

## Phase 0: Site Structure & Content Enhancements

### 0A: Image Upload in Content Editor

The backend already has an image upload system in the `storage` package (`ImageUploadController`, `S3StorageService`). Extend it for content editor images.

**Backend:**

1. Add a new endpoint in `ImageUploadController` (or create a new controller in `storage/`):
   - `POST /api/admin/media/upload` — accepts multipart file upload
   - Saves to `media/content/` locally (dev) or `s3://highschoolhowto/prod/media/content/` (prod)
   - Returns `{ "url": "/media/content/filename.jpg" }` (relative path)
   - Restrict to ADMIN role
   - Validate file type (images only: jpg, png, gif, webp) and size (reasonable max, e.g. 5MB)

2. Add the endpoint to `SecurityConfig.java` — require ADMIN role for `/api/admin/media/**`

3. Unit test for the upload service, integration test for the endpoint.

**Existing files to reference:**
- `api/src/main/java/com/highschoolhowto/storage/ImageUploadController.java` — existing upload patterns
- `api/src/main/java/com/highschoolhowto/storage/S3StorageService.java` — S3 integration
- `api/src/main/java/com/highschoolhowto/config/SecurityConfig.java` — endpoint security

**Frontend:**

1. Update `frontend/src/app/admin/content/tiptap-editor.component.ts`:
   - Add Tiptap `Image` extension (from `@tiptap/extension-image`)
   - Add an "Insert Image" toolbar button
   - On click: open file picker, upload via `POST /api/admin/media/upload`, insert returned URL as `<img>` node
   - Also support drag-and-drop onto the editor (intercept drop event, upload, insert)

2. Add upload method to `content-api.service.ts` (or a new `media-api.service.ts`):
   - `uploadImage(file: File): Observable<{ url: string }>`
   - Calls `POST /api/admin/media/upload` with FormData

3. Ensure the content viewer (`frontend/src/app/pages/content-viewer/`) renders `<img>` tags from the rich text content correctly. It likely already does if using Tiptap's HTML output, but verify.

### 0B: New Site Pages

**Routing — update `frontend/src/app/app.routes.ts`:**

Add new routes:
- `/how-to` — `HowToPageComponent` (new)
- `/about` — `AboutPageComponent` (new)
- `/help` — `HelpPageComponent` (new)
- `/locker` — will replace `/account/dashboard` in Phase 2 (don't change yet)

Keep existing routes working during this phase.

**How To Page — `frontend/src/app/pages/how-to/`:**

Create `how-to-page.component.ts`:
- Extract the content card grid + tag filtering logic from the current home page (`frontend/src/app/pages/home/`)
- Use `ContentApiService` to fetch published cards (exclude cards tagged "about" or "help")
- Tag filter bar at the top
- Card grid layout with thumbnails, titles, descriptions
- Clicking a card navigates to `/content/:slug` (existing content viewer)

**About Page — `frontend/src/app/pages/about/`:**

Create `about-page.component.ts`:
- Fetch content cards tagged "about" via `ContentApiService`
- Render the ARTICLE body (rich text HTML) directly on the page
- Simple, clean layout — just the content with site header/footer

**Help Page — `frontend/src/app/pages/help/`:**

Create `help-page.component.ts`:
- Fetch all content cards tagged "help" via `ContentApiService`
- Display as a table of contents (list of help article titles)
- Clicking a title navigates to `/content/:slug` for the full article
- Or: render all help articles inline on one scrollable page with anchor links from the TOC — either approach works, pick whichever is simpler

**Home Page Redesign — `frontend/src/app/pages/home/`:**

Update the existing home page component:
- Remove the content card grid and tag filtering (moved to How To page)
- Replace with a landing page layout:
  - Hero section with site name, tagline, and call-to-action buttons
  - CTA: "Explore How To" → `/how-to`
  - CTA: "Sign Up" → `/auth/signup` (or "My Locker" → `/locker` if logged in)
  - Brief description of what the site offers
  - Link to About page

**Navigation:**

Update the site header/nav (wherever it lives) to include links to:
- Home (`/`)
- How To (`/how-to`)
- About (`/about`)
- Help (`/help`)
- My Locker (`/locker`) — if authenticated

### 0C: Content Seeding

**Goal**: Seed initial About and Help content so the new pages have content on first deploy.

1. Write content using the help content mockup (`docs/help-content-mockup.md`) as the source. Each help section becomes a content card with:
   - `card_type`: `ARTICLE`
   - `status`: `PUBLISHED`
   - `slug`: as defined in the mockup (e.g., `help-welcome`, `help-todo`, `help-timer`)
   - `body`: the article content as HTML (convert from markdown)
   - Tags: `help` for help articles, `about` for the about page

2. Write an About page article — use the site's mission/purpose. Slug: `about-mission`. Tag: `about`.

3. Create Liquibase changeset:
   - File: `api/src/main/resources/db/changelog/v5-content-seed-NNNN.sql` (use next available sequence number)
   - Insert content cards, tags, and tag associations
   - Include `--rollback` directives that delete the seeded rows by slug
   - Register in `db.changelog-master.yaml`

4. If any images are referenced in the help/about content, add them to `media/content/` in the repo.

**Existing files to reference:**
- `api/src/main/resources/db/changelog/quotes-seed.csv` — example seed data pattern
- `api/src/main/resources/db/changelog/v4-quote-seed-0046.yaml` — example seed changeset
- `api/src/main/resources/db/changelog/db.changelog-master.yaml` — master changelog

---

## Phase 1: Backend — Active Apps Preference

**Goal**: API for storing which apps a user has active, their pane order, and color palette.

### Database

1. Create Liquibase changeset `api/src/main/resources/db/changelog/v5-app-preferences-NNNN.sql`:

```sql
CREATE TABLE user_app_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    active_apps TEXT NOT NULL DEFAULT '["TODO","NOTES","TIMER"]',
    pane_order TEXT DEFAULT NULL,
    palette_name VARCHAR(50) NOT NULL DEFAULT 'ocean',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- active_apps: JSON array of app identifiers, e.g. ["TODO","NOTES","TIMER"]
-- pane_order: JSON array defining custom pane positions, null = use smart defaults
-- palette_name: name of the selected color palette

--rollback DROP TABLE IF EXISTS user_app_preferences;
```

2. Register in `db.changelog-master.yaml`.

### Backend Code

Create new package `api/src/main/java/com/highschoolhowto/locker/preferences/`:

1. **Entity** — `UserAppPreferences.java`
   - Fields: `id`, `userId`, `activeApps` (String/JSON), `paneOrder` (String/JSON, nullable), `paletteName`, `createdAt`, `updatedAt`
   - Map `activeApps` and `paneOrder` as JSON strings in the DB, convert to/from `List<String>` in the service layer

2. **Repository** — `UserAppPreferencesRepository.java`
   - `Optional<UserAppPreferences> findByUserId(Long userId)`

3. **DTOs:**
   - `AppPreferencesResponse.java` — record with `activeApps: List<String>`, `paneOrder: List<String>`, `paletteName: String`
   - `UpdateAppPreferencesRequest.java` — record with `activeApps: List<String>`, `paneOrder: List<String>` (nullable), `paletteName: String`

4. **Service** — `AppPreferencesService.java`
   - `getPreferences(Long userId)` — returns preferences, creates default if none exist
   - `updatePreferences(Long userId, UpdateAppPreferencesRequest request)` — validates and saves
   - Validation: `activeApps` must be 1-3 items, must be valid app identifiers (`TODO`, `NOTES`, `TIMER`), no duplicates
   - Default: `["TODO","NOTES","TIMER"]`, paneOrder null (smart defaults), palette "ocean"

5. **Controller** — `AppPreferencesController.java`
   - `GET /api/locker/app-preferences` — returns current user's preferences
   - `PUT /api/locker/app-preferences` — updates preferences
   - Both require authentication

6. Update `SecurityConfig.java` — add `/api/locker/app-preferences` to authenticated endpoints.

### Tests

- Unit tests for `AppPreferencesService`: default creation, update, validation (max 3 apps, valid identifiers, no duplicates)
- Integration test for controller endpoints: auth required, correct defaults, update round-trip

**Do NOT delete any existing locker code yet.**

---

## Phase 2: Frontend — App Shell & Launcher

**Goal**: Build the new locker shell and app launcher, wire up to `/locker` route.

### New Components

Create under `frontend/src/app/pages/locker/` (new directory, separate from old `account/locker/`):

1. **`locker-shell.component.ts`** — top-level container
   - Fetches `AppPreferences` on init
   - Manages state: `currentView: 'launcher' | 'apps'`
   - On launcher: renders `app-launcher`
   - On apps: renders `app-pane-layout`
   - Provides preferences to children via input or shared service

2. **`app-launcher.component.ts`** — home screen (desktop)
   - Icon grid showing all 3 apps (To-do 📋, Notes 📝, Timer ⏱)
   - Active apps highlighted (full color), inactive dimmed
   - Tap an active app icon → switch to `apps` view
   - Edit mode toggle (Customize button)
   - Renders `shortcuts-row` and `daily-quote` components
   - Sticker layer (can be deferred to Phase 5 with palettes)

3. **`app-pane-layout.component.ts`** — manages 1/2/3 pane layouts
   - Input: `activeApps: string[]`, `paneOrder: string[]`
   - Uses CSS Grid or Flexbox for layout:
     - 1 app: single full-width column
     - 2 apps: two equal columns
     - 3 apps: smart layout based on app size weights (To-do/Notes = large, Timer = small)
   - Each pane renders `app-pane-header` + the app component
   - Home button in header returns to launcher view

4. **`app-pane-header.component.ts`** — thin header per pane
   - App icon + title
   - Home button (navigates back to launcher)
   - Info icon with tooltip (help popover) — see Section 13 of design doc
   - Receives palette color as input, applies to header background

5. **`edit-mode.component.ts`** — overlay for edit mode
   - App icon grid with checkmark toggles and wiggle animation
   - Active count display ("2 of 3")
   - Shake animation if trying to activate 4th
   - Pane order drag-to-swap (can be simplified to a list reorder initially)
   - Palette picker (placeholder for Phase 5)
   - Shortcut management (add/edit/delete)
   - Done button to save and exit

### New Service

Create `frontend/src/app/core/services/app-preferences-api.service.ts`:
- `getPreferences(): Observable<AppPreferencesResponse>`
- `updatePreferences(request: UpdateAppPreferencesRequest): Observable<AppPreferencesResponse>`
- Calls `GET /PUT /api/locker/app-preferences`

### New Models

Add to `frontend/src/app/core/models/` (new file or extend existing):
- `AppPreferences` interface: `{ activeApps: string[], paneOrder: string[], paletteName: string }`
- `AppType` enum/const: `'TODO' | 'NOTES' | 'TIMER'`

### Routing

Update `frontend/src/app/app.routes.ts`:
- Add route: `{ path: 'locker', component: LockerShellComponent, canActivate: [authGuard] }`
- Keep old `/account/dashboard` route pointing to the old locker component for now (don't break it)
- Update any nav links that point to `/account/dashboard` to point to `/locker` instead

### Key Implementation Details

- The launcher grid is a simple CSS grid with 3 items — nothing fancy
- Wiggle animation in edit mode: CSS `@keyframes` with slight rotation oscillation
- Pane layout uses CSS Grid: `grid-template-columns` changes based on active count and size weights
- The old locker component at `frontend/src/app/pages/account/locker/` is NOT modified or deleted yet

---

## Phase 3: Frontend — App Components

**Goal**: Build the three app components and two home screen feature components, extracting logic from existing widgets.

### App Components

Create under `frontend/src/app/pages/locker/apps/`:

#### 1. `todo-app.component.ts`

Extract from:
- `frontend/src/app/shared/bookmark-card/bookmark-card.component.ts` (task list rendering, task CRUD)
- `frontend/src/app/pages/account/locker/locker.component.ts` (list creation logic: `createList()`, `nextListName()`, `nextAvailableColor()`)

Component structure:
- **State**: `currentView: 'list' | 'detail'`, `selectedListId: number | null`
- **List view**:
  - Fetch all task lists via `TaskApiService`
  - Display list of lists with title, color indicator, task count
  - "+ New List" button at bottom (calls existing `taskApi.createList()`)
  - Tap a list → set `selectedListId`, switch to detail view
- **Detail view**:
  - Back arrow → return to list view
  - Render the selected task list with full task management (checkbox toggle, add task, edit task, delete task, reorder, color picker, due dates)
  - Extract this rendering logic from `bookmark-card.component.ts`
- **Input**: `paletteColor: string` for accent theming

Services to inject: `TaskApiService` (`frontend/src/app/core/services/task-api.service.ts`)

#### 2. `notes-app.component.ts`

Extract from:
- `frontend/src/app/shared/note-card/note-card.component.ts`
- `frontend/src/app/pages/account/locker/locker.component.ts` (note creation logic: `createNote()`)

Component structure:
- **State**: `currentView: 'list' | 'detail'`, `selectedNoteId: number | null`
- **List view**:
  - Fetch all notes via `NoteApiService`
  - Display list with title, color indicator, preview snippet
  - "+ New Note" button
  - Tap a note → detail view
- **Detail view**:
  - Back arrow → list view
  - Full note editor (text content, color picker)
  - Extract from `note-card.component.ts`
- **Input**: `paletteColor: string`

Services to inject: `NoteApiService` (`frontend/src/app/core/services/note-api.service.ts`)

#### 3. `timer-app.component.ts`

Extract from:
- `frontend/src/app/shared/timer-card/timer-card.component.ts` (Pomodoro logic)
- `frontend/src/app/shared/basic-timer-card/basic-timer-card.component.ts` (basic countdown logic)

Component structure:
- **Single view** — no drill-down, no list
- Mode toggle at top: Basic / Pomodoro (two buttons or a toggle switch)
- **Basic mode**: time picker (hours/minutes/seconds), start/pause/reset, countdown display
- **Pomodoro mode**: work/break cycle display, start/pause/reset, session counter, auto-transition between work and break
- Combine both timer card implementations into one component with conditional rendering based on mode
- **Input**: `paletteColor: string`
- Timer state (running/paused/remaining time) should persist across view switches using `NavigationStatePersistence` (the timer keeps running even when viewing another app)

Services to inject: `TimerApiService` (`frontend/src/app/core/services/timer-api.service.ts`), `TimerSoundService` (`frontend/src/app/core/services/timer-sound.service.ts`)

### Home Screen Feature Components

Create under `frontend/src/app/pages/locker/features/`:

#### 4. `shortcuts-row.component.ts`

Extract from:
- Shortcuts panel logic in `locker.component.ts` (`toggleShortcutsPanel()`, shortcut CRUD)
- `frontend/src/app/shared/shortcut-icon/`

Component structure:
- Horizontal row of shortcut icons/links
- Each shortcut: favicon + name, opens URL in new tab on click
- Compact layout (fits in launcher and mobile header area)
- In edit mode: shows add/edit/delete controls (receives `editMode: boolean` input)

Services to inject: `ShortcutApiService` (`frontend/src/app/core/services/shortcut-api.service.ts`)

#### 5. `daily-quote.component.ts`

Extract from:
- Quote panel logic in `locker.component.ts` (`toggleQuotePanel()`)

Component structure:
- Simple text display: quote text + attribution
- Fetches daily quote via `QuoteApiService`
- Compact layout (one or two lines)

Services to inject: `QuoteApiService` (`frontend/src/app/core/services/quote-api.service.ts`)

### Integration

- Wire all app components into `app-pane-layout.component.ts` — use `@switch` or `ngSwitch` on the app type to render the correct component in each pane
- Wire `shortcuts-row` and `daily-quote` into `app-launcher.component.ts`
- Each app component manages its own data fetching and state
- Navigation state persistence: each app component preserves its `currentView` and `selectedItemId` across parent view switches (don't reset on `ngOnInit` — use a signal or service to hold state)

### Shared Components to Keep

These existing shared components may be reusable inside the new app components:
- `frontend/src/app/shared/color-picker/` — used in to-do and notes detail views
- `frontend/src/app/shared/confirm-dialog/` — delete confirmations
- `frontend/src/app/shared/due-date-popover/` — task due dates
- `frontend/src/app/shared/inline-title-edit/` — editing list/note titles
- `frontend/src/app/shared/swatch-picker/` — color selection

Do NOT delete these. They're shared utilities, not widget-specific.

---

## Phase 4: Frontend — Mobile Swipe Navigation

**Goal**: On narrow viewports, replace the pane layout with swipeable app pages.

### Breakpoint Detection

Add to `locker-shell.component.ts`:
- Use `window.matchMedia('(max-width: 768px)')` or a `ResizeObserver` signal
- Signal: `isMobile = signal(false)` — updated on resize
- When mobile: skip launcher, show `app-swipe-container` directly
- When desktop: show launcher → pane layout flow as built in Phase 2

### New Component: `app-swipe-container.component.ts`

Create under `frontend/src/app/pages/locker/`:

- Horizontal swipe container with snap scrolling (CSS `scroll-snap-type: x mandatory`)
- Each "page" is one active app component, rendered at full width
- **First page** includes `shortcuts-row` and `daily-quote` above the app content
- **Last page** is the app drawer (for adding/removing apps)
- Page dot indicators at the bottom: `● ○ ○` style
- Track current page index via `scroll` event or `IntersectionObserver`

Implementation approach:
- Use CSS `overflow-x: scroll; scroll-snap-type: x mandatory` on a flex container
- Each child page: `scroll-snap-align: start; min-width: 100%; width: 100%`
- This gives native-feeling swipe with no JS gesture library needed
- Page dots: small circles, active one filled, positioned fixed at bottom

### App Drawer Page

Last page in the swipe container:
- Shows all 3 apps with checkboxes (active/inactive)
- Tap to toggle — same logic as edit mode but simplified for mobile
- 3-app limit enforced with feedback message
- Palette picker (simplified version)

### Key Details

- The swipe container replaces both the launcher AND the pane layout on mobile — it IS the mobile locker experience
- No stickers on mobile (desktop/tablet only)
- Timer app should show a persistent mini-indicator somewhere if a timer is running and the user swipes away from it (optional, could defer)

---

## Phase 4.1: Keyboard Shortcuts

**Goal**: Global keyboard shortcuts for desktop locker.

Add to `locker-shell.component.ts`:

```typescript
@HostListener('document:keydown', ['$event'])
onKeydown(event: KeyboardEvent): void {
  if (this.isMobile()) return;
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

  switch (event.key) {
    case 'e': this.toggleEditMode(); break;
    case '1': this.focusPane(0); break;
    case '2': this.focusPane(1); break;
    case '3': this.focusPane(2); break;
    case 'h': this.goHome(); break;
    case 'n': this.createNewItem(); break;
    case 'Escape': this.goBack(); break;
  }
}
```

- `toggleEditMode()` — enters/exits edit mode
- `focusPane(index)` — switches to apps view and focuses the given pane (if it exists)
- `goHome()` — returns to launcher view
- `createNewItem()` — calls the focused app's create action (new list for To-do, new note for Notes, no-op for Timer)
- `goBack()` — context-dependent: if in detail view → list view, if in edit mode → exit, if in apps view → launcher

### Tests

- Unit test each shortcut triggers the correct method
- Test that shortcuts are ignored when typing in an input
- Test `Escape` navigates back through each level
- Test `N` is a no-op for Timer app

---

## Phase 5: Color Palettes

**Goal**: Palette system with auto-assigned app colors.

### Define Palettes

Create `frontend/src/app/pages/locker/palettes.ts`:

```typescript
export interface Palette {
  name: string;
  label: string;
  colors: { TODO: string; NOTES: string; TIMER: string };
}

export const PALETTES: Palette[] = [
  { name: 'ocean', label: 'Ocean', colors: { TODO: '#1a5276', NOTES: '#148f77', TIMER: '#1abc9c' } },
  { name: 'sunset', label: 'Sunset', colors: { TODO: '#e74c3c', NOTES: '#f39c12', TIMER: '#e91e63' } },
  { name: 'forest', label: 'Forest', colors: { TODO: '#27ae60', NOTES: '#6d8764', TIMER: '#8b7355' } },
  { name: 'minimal', label: 'Minimal', colors: { TODO: '#2c3e50', NOTES: '#7f8c8d', TIMER: '#5d6d7e' } },
];
```

Exact hex values are placeholders — adjust to look good.

### Palette Picker Component

Create `frontend/src/app/pages/locker/palette-picker.component.ts`:
- Displayed in edit mode
- Shows palette options as color swatch groups
- Tap to select — preview updates immediately
- Selection saved via `AppPreferencesApiService.updatePreferences()`

### Wire Palette Colors

- `locker-shell` reads `paletteName` from preferences, looks up the `Palette` object
- Passes the correct color to each app component and pane header via input: `[paletteColor]="palette.colors[appType]"`
- App components use the palette color for accent elements (header background, active states, borders)
- App icons on the launcher use the palette color for their highlight/border
- Inactive app icons show the palette color dimmed (lower opacity)

### Stickers

If stickers were deferred from Phase 2, implement them now:
- Free-positioned emoji elements on the launcher background
- Positioned with `position: absolute` and stored as `{ emoji, x, y }` in user preferences (extend the `user_app_preferences` table or use a separate stickers store)
- In edit mode: draggable, deletable, add from a picker
- Desktop/tablet only — don't render on mobile

---

## Phase 6: Cleanup — Delete Old Locker System

**Goal**: Remove all v4 widget grid code. This is a deletion-only phase — no new features.

**IMPORTANT**: Before deleting anything, verify the build passes and all tests pass with the new locker system. Run `npm run build` and `npm test` from `frontend/`, and `./gradlew clean build` from `api/`.

### Frontend Deletions

Delete these files/directories entirely:
- `frontend/src/app/pages/account/locker/` — old locker component (entire directory)
- `frontend/src/app/shared/widget-title-bar/` — old minimize/maximize title bar
- `frontend/src/app/shared/bookmark-card/` — migrated to `todo-app`
- `frontend/src/app/shared/note-card/` — migrated to `notes-app`
- `frontend/src/app/shared/timer-card/` — migrated to `timer-app`
- `frontend/src/app/shared/basic-timer-card/` — migrated to `timer-app`
- `frontend/src/app/core/services/locker-grid-engine.service.ts` — grid packing engine
- `frontend/src/app/core/services/locker-layout-api.service.ts` — old layout persistence

### Frontend Model Cleanup

Edit `frontend/src/app/core/models/task.models.ts`:
- Remove `LockerLayoutItem` interface
- Remove layout-related fields (posX, posY, width, height, minimized, order) from any interfaces that have them
- Keep task/list/note model interfaces — they're still used

### Frontend Route Cleanup

Edit `frontend/src/app/app.routes.ts`:
- Remove the old `/account/dashboard` route
- Ensure `/locker` is the only locker route
- Add redirect: `{ path: 'account/dashboard', redirectTo: '/locker' }` for any bookmarks/links

### Backend Cleanup

Evaluate each of these — delete if no frontend code references them:

- `LockerLayoutController.java` — the `saveLayout`/`getLayout` endpoints. If the new frontend doesn't call them, delete the controller.
- `LockerLayoutService.java` — if the controller is deleted, delete the service
- `LockerLayoutItem.java` — if the service is deleted, delete the entity
- `LockerLayoutItemRepository.java` — if the entity is deleted, delete the repo
- `locker/dto/` — delete all layout DTOs (`LockerLayoutItemRequest`, `LockerLayoutItemResponse`, `SaveLockerLayoutRequest`)

If deleting the `locker_layout_items` table entirely:
- Create Liquibase changeset: `DROP TABLE IF EXISTS locker_layout_items`
- Rollback: recreate the table with its original schema (copy from the original creation changeset)

If keeping for rollback safety: just leave it, add a comment in the entity that it's deprecated.

### Verify

After all deletions:
1. `cd frontend && npm run build` — should compile with zero errors
2. `cd frontend && npm test` — all tests pass (update or remove tests that reference deleted components)
3. `cd api && ./gradlew clean build` — compiles and tests pass
4. `grep -r "bookmark-card\|note-card\|timer-card\|widget-title-bar\|locker-grid-engine\|locker-layout-api\|LockerLayoutItem" frontend/src/` — should return nothing
5. Manual smoke test: open `/locker` in browser, verify all apps work

---

## Phase 7: Content Import Update

**Goal**: Simplify the "Add to My Locker" flow.

### Frontend

Edit `frontend/src/app/pages/content-viewer/content-viewer.component.ts`:
- The `handleAddToLocker()` method currently creates a TaskList AND a layout item
- Remove the layout item creation — just create the TaskList
- Remove any redirect-to-locker-and-scroll behavior
- After successful import: show a success toast/message "Added to your To-do app!" with a link to `/locker`
- The imported list will appear in the To-do app's list view automatically (it's just a TaskList)

Edit `frontend/src/app/pages/content-viewer/content-viewer.component.html`:
- Update "View in My Locker" link to point to `/locker` instead of `/account/dashboard`

### Backend

Edit the add-to-locker endpoint (in `ContentCardController.java` or `ContentCardService.java`):
- If it currently creates a `LockerLayoutItem` alongside the TaskList, remove that logic
- It should only create the TaskList with the template tasks
- The response doesn't need to include layout position data

### Dot Indicator (Optional)

To show a dot on the To-do app icon when a new list is imported:
- Add a `hasNewImports` flag to the app preferences or a separate lightweight endpoint
- Or: check if any TaskList has `sourceContentCardId != null` and was created since the user's last locker visit
- This is a nice-to-have — can be deferred

---

## General Guidelines for All Phases

1. **Dead code**: After extracting logic from old components into new ones, don't leave the old code around. But don't delete the old files until Phase 6 — they serve as the rollback path.

2. **Tests**: Write tests for new code as you build it. Update existing tests that break due to new code. Don't delete existing tests until Phase 6.

3. **Imports**: Don't leave unused imports. Run `ng build` frequently to catch compile errors.

4. **SCSS**: New components should use component-scoped SCSS. Don't add to global styles unless necessary.

5. **Liquibase**: Every database changeset must include `--rollback` directives. Follow existing naming conventions in `db.changelog-master.yaml`.

6. **API services**: Reuse existing API services (`TaskApiService`, `NoteApiService`, `TimerApiService`, etc.). Don't duplicate API call logic.

7. **Signals vs observables**: Follow whatever pattern the codebase already uses. Check existing components for conventions.

8. **Accessibility**: All interactive elements need keyboard access and ARIA labels. Use semantic HTML.

9. **Mobile-first CSS**: Use `min-width` media queries so mobile is the default and desktop is the enhancement.
