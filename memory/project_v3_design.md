---
name: v3.0 Design Document
description: v3.0 feature set designed and ready for implementation by Sonnet. Design doc at docs/v3-design.md.
type: project
---

v3.0 design is complete and approved for implementation.

**Why:** Full feature set for My Locker enhancements was designed collaboratively with Opus and documented thoroughly including testing requirements.

**How to apply:** Point Sonnet to `docs/v3-design.md` and implement one phase at a time, reviewing before moving to the next. Phase 1 is the largest.

### Phases
1. To-Do List UX + Shared Components (due dates, color picker, inline edit, font setup, grid layout)
2. Pomodoro Timer + Notification Toggle
3. Sticky Notes
4. Study Session Mode
5. Bookmarks
6. About Page + Simple Layout
7. Stickers

### Key decisions
- Auto-naming convention: "To-dos", "To-dos #2", etc. (gap-filling)
- Color picker: shared component, 16-color palette, gradient builder, free-form, custom palette + history in localStorage
- textColor: nullable on all entities, null = auto-contrast (WCAG luminance formula)
- Grid sort order: `locker_layout` table (not sortOrder on each entity)
- Bookmark metadata: backend proxy with SSRF mitigations
- Locker font: locker-wide setting in localStorage (`hsht_lockerFontId`), 10 font options
- Simple layout: per-article checkbox, used for About page
- Testing: 90%+ backend coverage, 80%+ frontend, full test pyramid required
