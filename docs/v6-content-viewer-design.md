# High School How To — v6.0 Design Document

**Status**: Draft
**Last updated**: 2026-04-16

## Table of Contents

1. [Overview](#1-overview)
2. [Problems](#2-problems)
3. [Design Goals](#3-design-goals)
4. [Container Width](#4-container-width)
5. [Video Viewer](#5-video-viewer)
6. [Infographic Viewer](#6-infographic-viewer)
7. [Article Viewer](#7-article-viewer)
8. [Navigation Redesign](#8-navigation-redesign)
9. [Responsive Behavior](#9-responsive-behavior)
10. [Implementation Phases](#10-implementation-phases)
11. [Testing Requirements](#11-testing-requirements)

---

## 1. Overview

v6.0 focuses on the content viewer, making better use of available screen space across content types. The current viewer constrains all content to a 900px max-width column with side navigation arrows, which leaves significant desktop real estate unused. Videos feel small, and tall infographics require excessive scrolling.

---

## 2. Problems

| Problem | Content type | Details |
|---|---|---|
| Excessive scrolling | Infographic | Infographics are typically tall/portrait images. On desktop, the narrow column forces users to scroll through long images that could be displayed more efficiently. |
| Small video player | Video | The 16:9 player is capped at ~812px effective width (900px minus side arrows). On wide screens, this produces a small viewing experience. |
| Wasted horizontal space | All | Side navigation arrows consume 44px on each side, and the 900px max-width leaves large gutters on modern desktop screens. |

---

## 3. Design Goals

- **Desktop-first, mobile-friendly** — optimize for desktop as the primary experience; ensure mobile works well as a secondary priority.
- **Content-type-aware layouts** — each content type gets a layout suited to its shape and usage rather than forcing everything into one column.
- **Reclaim horizontal space** — widen the container and remove side navigation arrows to give content more room.
- **Reduce infographic scrolling** — use a side-by-side layout on desktop to let tall images use vertical space more efficiently.

---

## 4. Container Width

**Current**: 900px max-width, centered.

**v6**: 1200px max-width, responsive below. The container scales fluidly with the viewport and caps at 1200px on wide screens. This gives all content types more room without stretching to absurd widths on ultra-wide monitors.

---

## 5. Video Viewer

**Layout**: Single column, same as today but wider.

The 16:9 video iframe scales with the container width (up to 1200px), producing a significantly larger player on desktop. No structural layout changes — just more space.

| Viewport | Current effective width | v6 effective width |
|---|---|---|
| 1440px+ | ~812px | ~1200px |
| 1024px | ~812px | ~1024px (fluid) |
| 768px | ~768px (fluid) | ~768px (fluid) |

Title and description remain below the video.

---

## 6. Infographic Viewer

### Desktop: Side-by-side layout

On desktop viewports, the infographic viewer switches to a two-panel layout:

```
+--------------------------------------------------+
|  [Sidebar]          |  [Infographic Image]        |
|                     |                             |
|  Title              |                             |
|  Description        |                             |
|                     |                             |
|  [Download/Print]   |                             |
|                     |                             |
|  Related Content    |                             |
|  - Link 1           |                             |
|  - Link 2           |                             |
+--------------------------------------------------+
```

- **Sidebar**: Contains the title, description, download/print button, and related content links. Fixed or sticky so it stays visible as the user scrolls the image.
- **Image panel**: The infographic image occupies the remaining width and full natural height. With horizontal space freed up, the image renders wider and therefore shorter in scroll distance.

### Mobile: Full-width image with title overlay

On mobile, the infographic fills the full viewport width. The title and description appear as a semi-transparent overlay on load, then fade out after a few seconds. The user can tap to toggle the overlay back.

```
+---------------------+
| Title overlay       |  <-- fades out after load
|                     |
| [Infographic image  |
|  full width]        |
|                     |
|                     |
+---------------------+
```

- Download button and related content appear below the image.

---

## 7. Article Viewer

**Layout**: Single column, comfortable reading width.

Articles keep a narrower content column (~900px or a readable line length) centered within the 1200px container. This preserves readability — long text lines at 1200px would be uncomfortable to read.

No structural changes to the article layout. The wider container provides more breathing room (margins) around the article content.

---

## 8. Navigation Redesign

### Current

Prev/next arrows sit in dedicated 44px columns flanking the content, sticky at the viewport vertical center.

### v6: Top bar navigation

Prev/next arrows move into the existing top navigation bar, positioned at the far right. This eliminates the side columns entirely, freeing all horizontal space for content.

```
+----------------------------------------------------------+
| [Logo] [< Back to Topic]  [Tag Badge]    [<Prev] [Next>] |
+----------------------------------------------------------+
|                                                          |
|                    Content area                          |
|                    (full width)                          |
|                                                          |
+----------------------------------------------------------+
```

- Arrows are compact icon buttons integrated into the nav bar.
- The three-column flex layout (arrow | content | arrow) is replaced by a single content column.
- The nav bar remains at the top of the page (not sticky/fixed) to maximize viewport for content.

---

## 9. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| > 1200px | Container caps at 1200px, centered. Infographics use side-by-side layout. |
| 768px - 1200px | Container is fluid (full width minus padding). Infographics use side-by-side layout if space permits (~768px+), otherwise collapse to single column. |
| < 768px | Single column for all content types. Infographic title becomes a fade-on-load overlay. Video scales to full width. Articles fill available width. |

### Priority

1. Desktop (1200px+) — primary experience
2. Mobile (< 768px) — secondary, must work well
3. Tablet (768px - 1200px) — graceful transition between the two

---

## 10. Implementation Phases

### Phase 1: Container and navigation

- Widen max-width from 900px to 1200px
- Move prev/next arrows into the top nav bar
- Remove side arrow columns from the viewer stage layout
- Verify all content types render correctly at wider width

### Phase 2: Infographic side-by-side layout

- Build desktop two-panel layout (sidebar + image)
- Make sidebar sticky for scroll tracking
- Implement mobile title overlay with fade behavior
- Add tap-to-toggle for the mobile overlay

### Phase 3: Polish and responsive tuning

- Fine-tune breakpoints and transitions between layouts
- Test across devices and screen sizes
- Verify article readability at new widths
- Ensure video aspect ratio and scaling behave correctly

---

## 11. Testing Requirements

### Frontend unit tests

- Content viewer renders correct layout per content type
- Navigation arrows appear in top bar, not side columns
- Infographic side-by-side layout activates at correct breakpoint
- Mobile overlay shows on load and fades
- Container respects 1200px max-width

### Manual/visual testing

- Desktop: verify video player size improvement at 1440px+
- Desktop: verify infographic side-by-side reduces scrolling for tall images
- Desktop: verify articles maintain comfortable reading width
- Mobile: verify infographic overlay appears and fades
- Mobile: verify all content types work at narrow widths
- Tablet: verify graceful transition between desktop and mobile layouts
