# Changelog

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
