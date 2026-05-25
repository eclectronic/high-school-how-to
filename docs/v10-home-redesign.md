# High School How To — v10 Design Document

**Status**: Implemented
**Last updated**: 2026-05-25
**Scope**: Home page redesign — corkboard post-it layout with hero, about slot, and How-To / Locker promo cards. Socials dropdown and hamburger nav added to site nav. How-to page full-width layout.

## Table of Contents

1. [Overview](#1-overview)
2. [What Was Built](#2-what-was-built)
3. [Home Page Layout](#3-home-page-layout)
4. [Post-it Card System](#4-post-it-card-system)
5. [Nav Bar Changes](#5-nav-bar-changes)
6. [How-To Page Changes](#6-how-to-page-changes)
7. [Backend Changes](#7-backend-changes)
8. [Frontend Component Changes](#8-frontend-component-changes)
9. [Removed Elements](#9-removed-elements)

---

## 1. Overview

v10 redesigns the home page to feel like a real physical corkboard — colorful post-it notes, tape strips, and thumbtack pins as visual attachments. The layout moves the logo into a prominent hero row alongside a tagline card and an About card, with the two main destinations (How To and the Locker) presented as large clickable post-its below. The entire page is admin-edit-free; all home page content is either static copy or driven by the existing `about` content slot.

---

## 2. What Was Built

### Home page

- **Hero row**: Logo (pinned figure) + tagline post-it + About post-it, side by side on desktop. On mobile these stack vertically with the logo appearing inline between the tagline and about cards.
- **How-To + Locker post-its**: Two large static post-it cards below the hero. Each is a full-card anchor link. Content (bullet lists, heading, CTA) is hardcoded — not CMS-driven. Clicking anywhere on the How-To card navigates to `/how-to`; clicking the Locker card navigates to `/locker` (auth guard redirects unauthenticated users to login).
- **Random attachments**: On each page load, each of the four post-its (tagline, about, how-to, locker) is assigned a random attachment — tape or one of four colored thumbtack pins (red, blue, green, yellow). Tape appears roughly twice as often as any single pin color. The attachment is chosen at component init time and does not change on re-render.
- **Dynamic sections**: Below the promo row, `HomeLayoutApiService`-driven `app-home-slot` sections continue to render (split or full-width) from the admin-configured home layout.

### Removed from home page

- All inline edit-mode functionality (`EditModeBarComponent`, `EditModeStore` wiring, edit-mode CSS branches)
- The `SessionStore` dependency (login state is no longer needed on the home page itself)

---

## 3. Home Page Layout

### Desktop (≥ 768 px)

```
┌─────────────────────────────────────────────────────────────────┐
│ [logo] How To  About  Help  Socials▾         [Log In / Sign Up] │
├───────────────┬─────────────────────────────────────────────────┤
│               │  ┌─ Tagline post-it (480px) ─────────────┐      │
│  Logo         │  │ Helping you navigate…                  │      │
│  (pinned)     │  └────────────────────────────────────────┘      │
│               │  ┌─ About post-it (480px) ────────────────┐      │
│               │  │ About High School How To               │      │
│               │  │ [CMS-driven about content]             │      │
│               │  └────────────────────────────────────────┘      │
├───────────────┴─────────────────────────────────────────────────┤
│  ┌─ How-To post-it (480px) ──┐  ┌─ Locker post-it (480px) ──┐  │
│  │ How-To Guides             │  │ Study Locker               │  │
│  │ • Study strategies…       │  │ • Notes & quick captures   │  │
│  │ • Time management…        │  │ • To-do lists…             │  │
│  │ Browse all guides →       │  │ Open your locker →         │  │
│  └───────────────────────────┘  └────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [CMS-driven dynamic sections via HomeLayoutApiService]          │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile (< 768 px)

```
┌──────────────────────────────────┐
│ [logo]  [Log In / Sign Up]  [☰]  │
├──────────────────────────────────┤
│  Tagline post-it (full width)    │
├──────────────────────────────────┤
│  Logo image (centered, 180px)    │
├──────────────────────────────────┤
│  About post-it (full width)      │
├──────────────────────────────────┤
│  How-To post-it (full width)     │
├──────────────────────────────────┤
│  Locker post-it (full width)     │
└──────────────────────────────────┘
```

On mobile the hero becomes a flex column with CSS `order` controlling sequence: tagline (order 1), logo col (order 2), about (order 3). The logo renders inline in normal document flow — not as a background image.

---

## 4. Post-it Card System

### Visual design

All four post-its share a consistent visual language:
- `border-radius: 2px` (paper-edge feel)
- Box shadow: `4px 5px 14px rgba(#2d1a10, 0.22), 0 1px 3px rgba(#2d1a10, 0.12)`
- Slight rotation via `transform: rotate(Xdeg)` (different per card)
- Hover: lifts slightly (`translateY(-3px)`) and deepens shadow; rotation shifts toward 0 on hover

| Card | Color | Rotation |
|---|---|---|
| Tagline | `#bae6fd` (sky blue) | −1.2° |
| About | `#fed7aa` (peach/orange) | +0.6° |
| How-To | `#fef08a` (yellow) | −1.5° |
| Locker | `#c4b5fd` (lavender) | +1.2° |

### Card headings

All post-it headings (tagline main text, About title, How-To/Locker headings) use `var(--font-display)` — the Miras Handwriting font — at `1.8rem`, `font-weight: 400`, with a subtle `-webkit-text-stroke: 0.6px currentColor` for visual weight and `text-decoration: underline` for hyperlink cues.

### Attachments

Each card renders either a `.card-tape` element or a `.card-pin` element at the top:

**Tape** (`.card-tape`): 90 × 26 px, semi-transparent grey (`rgba(220, 220, 214, 0.88)`), `border-radius: 3px`, slight dashed border, slight rotation, centered at top.

**Pins** (`.card-pin`): 24 px circle with `radial-gradient` giving a 3D sphere effect. `::after` adds a specular highlight (small blurred white oval in the upper-left). Four color variants:

| Class | Gradient |
|---|---|
| `.card-pin--red` | `#ff7070 → #d41515 → #8b0000` |
| `.card-pin--blue` | `#6bb5f5 → #1a6fd4 → #0d3f8a` |
| `.card-pin--green` | `#6dde8a → #1aab40 → #0d6025` |
| `.card-pin--yellow` | `#ffe87a → #e6b800 → #8a6d00` |

**Selection logic** (TypeScript, client-side):
```typescript
type Attachment = 'tape' | 'pin-red' | 'pin-blue' | 'pin-green' | 'pin-yellow';
const ATTACHMENTS: Attachment[] = ['tape', 'tape', 'pin-red', 'pin-blue', 'pin-green', 'pin-yellow'];
// tape appears ~33% of the time vs ~11% each for pins
```
Each card picks independently at component init. The `pinClass()` helper returns `"card-pin card-pin--{color}"`.

### Full-card links

- **About card**: `<a class="hero__about-slot" routerLink="/about">` — the entire peach card is the link. Inner `app-home-slot`'s card chrome (background, border, shadow) is stripped via `::ng-deep .slot__article { background: transparent; … }`. The title gets the handwriting font style via `::ng-deep .slot__title`.
- **How-To card**: `<a class="postit postit--howto" routerLink="/how-to">`
- **Locker card**: `<a class="postit postit--locker" routerLink="/locker">` — Angular's `authGuard` redirects unauthenticated users to `/auth/login`.

### About slot

The about card fetches and renders the CMS content card tagged `about` via `HomeSlotComponent` (ARTICLE type). The `titleLink` input is not set (the whole card is the link, so no nested `<a>` inside).

---

## 5. Nav Bar Changes

### Socials dropdown

A **"Socials" pill** sits between Help and the CTA area on desktop. It fetches enabled links from `GET /api/social-links` (public endpoint). The pill is hidden if no links are enabled. The dropdown opens on click; closes on second click, Escape, or outside click. Each entry is `<a target="_blank" rel="noreferrer">` with an inline SVG icon and platform name.

### Login/Signup CTA

The unauthenticated CTA reads **"Log In / Sign Up"** on all screen sizes.

### Mobile hamburger drawer

Below **768 px**, the nav collapses to a top bar (logo + primary CTA + ☰) with a right-side slide-in drawer. The drawer contains: How To, About, Help, Socials (inline expand), Log Out (authenticated), Admin (admin only). A backdrop closes the drawer on tap; Escape and any link tap also close it.

---

## 6. How-To Page Changes

The `.how-to-page` container no longer has a `max-width` cap. The heading and card grid now fill the full viewport width (with standard `1.5rem` horizontal padding). The card grid uses `repeat(auto-fill, minmax(220px, 1fr))` so the number of columns adjusts to available width.

---

## 7. Backend Changes

### Social links

A `social_links` table stores configurable social profiles. Endpoints:
- `GET /api/social-links` — public; returns enabled links with non-null URLs. Added to `SecurityConfig.permitAll()` so unauthenticated home page loads don't trigger a login redirect.
- `GET /api/admin/social-links` — admin; returns all rows.
- `PUT /api/admin/social-links/{id}` — admin; updates URL, enabled, display order.

Platforms are seeded via Liquibase (`v10-social-links-0082.sql`): INSTAGRAM, YOUTUBE, TIKTOK (TikTok URL starts null/hidden).

### Home layout

A `home_layout_sections` table (and associated API) drives the dynamic sections below the promo row. Managed via `HomeLayoutApiService` on the frontend and `HomeLayoutController` / `HomeLayoutService` on the backend. Liquibase changeset: `v10-home-layout-0083.sql`.

---

## 8. Frontend Component Changes

### `home-page.component.ts`

- Added `Attachment` type, `ATTACHMENTS` weighted array, `randomAttachment()` function
- Added `attachments` object (tagline, about, howto, locker — each randomly assigned at init)
- Added `pinClass(a: Attachment): string` helper
- Removed `SessionStore`, `EditModeBarComponent` imports
- Added `RouterLink` import

### `home-page.component.html`

- Hero: `grid-template-areas: "logo tagline" "logo about"` on desktop
- About card: `<a routerLink="/about">` wrapping `<app-home-slot slotTag="about" />`
- Promo row: How-To and Locker as `<a>` elements with conditional tape/pin spans
- Dynamic sections loop via `HomeLayoutApiService` signals

### `home-page.component.scss`

- Hero: CSS grid (`auto 480px` columns, `justify-content: center`)
- Mobile hero: flex column with `order` on each child
- Post-it system: `.postit`, `.postit--howto`, `.postit--locker`, `.card-tape`, `.card-pin`, pin color variants
- `::ng-deep` overrides for `app-home-slot` within the about card

### `home-slot.component.ts` / `.html`

- Removed all edit-mode logic (no `EditModeStore`, `SessionStore`, `TiptapEditorComponent`)
- Added `@Input() titleLink: string | null = null` for optional linked titles
- Article title conditionally renders as `<a [routerLink]="titleLink">` when set

### `security-config.java`

- Added `.requestMatchers("/api/social-links").permitAll()` to allow unauthenticated home page loads

---

## 9. Removed Elements

| Element | Disposition |
|---|---|
| Inline edit mode on home page | Removed — home page is now read-only for all users |
| `SessionStore` dependency in home page | Removed — login state not needed on the home page |
| `max-width` cap on how-to page | Removed — content fills full viewport width |
| Old top CTA strip / social image strip | Replaced by post-it layout and nav socials dropdown |
| Quote of the Day card | Removed in a prior release; not re-added |
