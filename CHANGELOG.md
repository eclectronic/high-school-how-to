# Changelog

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
