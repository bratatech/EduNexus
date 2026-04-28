# EduNexuZ — ctOS-style Tutoring Desktop

A full-screen "desktop OS" experience for **EduNexuZ**, a tutoring service. The layout follows wesdieleman.com (top menu bar, desktop with icons, dock at the bottom, draggable windows that open from icons/dock), and the interaction model follows damianb.dev (real draggable, focusable, minimizable windows). Visual style is inspired by **Watch Dogs / ctOS**: dark slate background, signature amber-orange accent, scanline overlay, monospace HUD typography, subtle data-grid motifs.

We are **not** copying damianb's About/Github/Do Not Open/X icons or his personal content. All content is original to EduNexuZ.

---

## Visual style — "ctOS Academy"

- **Palette**
  - Background: near-black slate `#0B0F14` with faint cyan grid lines
  - Surface (windows): `#141A22` with 1px cyan-tinted border
  - Primary accent: ctOS amber `#F5A623`
  - Secondary accent: signal cyan `#3FD0E0`
  - Text: warm off-white `#E6EAF0`, muted `#7A8694`
  - Alert red `#E5484D` for close button
- **Typography**: monospace for HUD chrome (JetBrains Mono / IBM Plex Mono), clean sans (Inter) for body content inside windows
- **Texture**: very subtle scanlines + animated CRT flicker on window headers, faint hex/grid background, glowing amber underline on active items
- **Boot sequence**: 1.5s "ctOS // EDUNEXUZ NETWORK CONNECTED" terminal-style intro before desktop appears

---

## Desktop layout (matches wesdieleman.com structure)

```text
┌───────────────────────────────────────────────────────────────┐
│ ◆ EduNexuZ   File  View  Network        ☼  Sat 25 Apr 14:30  │  ← top menu bar
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [📁]  programs/                                              │
│  [📁]  instructors/                                           │
│  [📄]  readme.txt                                             │
│  [📄]  enroll.form                                            │
│                                                               │
│              (animated ctOS hex-grid wallpaper)               │
│                                                               │
│                                                               │
│                                                               │
│        ┌──────────────────────────────────┐                   │
│        │ ▣ Programs               — □ ✕   │  ← draggable      │
│        │──────────────────────────────────│     window        │
│        │  content...                      │                   │
│        └──────────────────────────────────┘                   │
│                                                               │
│                ┌───────────────────────────┐                  │
│                │ 🏠 📚 👥 ✉ 🔍 ⚙ ▶ 🗂      │  ← dock           │
│                └───────────────────────────┘                  │
└───────────────────────────────────────────────────────────────┘
```

- **Top menu bar** with EduNexuZ logo, dummy menu items (File / View / Network), and live clock + status (signal/wifi/battery icons styled as ctOS HUD).
- **Desktop icons** (left side) — folders/files that open windows on double-click.
- **Dock** (bottom center, anchored) — quick launchers that open or focus windows. Active app gets a glowing amber dot underneath.
- **Wallpaper** — dark slate with animated faint hex grid + a stylized "EDUNEXUZ // ctOS NETWORK" wordmark watermark.

---

## Windows (the four sections)

Each window is draggable, focusable (raises z-index on click), can be minimized (slides to dock) and closed (re-openable from icon/dock). Windows have a header with title, traffic-light controls (minimize / maximize / close, restyled as amber/cyan/red hex chips), and a tabbed sidebar inside (mirroring damianb's left-rail navigation pattern but with our own content).

### 1. `readme.txt` — Home + About
Opens by default on first load. Terminal-styled window with sidebar tabs:
- **Welcome** — Big serif/mono hero: *"EduNexuZ — tutoring for the connected generation."* Short pitch + "Enroll now" amber CTA.
- **Mission** — Why EduNexuZ exists, learning philosophy.
- **How it works** — 3-step process (Assess → Match → Learn) as numbered HUD cards.
- **Stats** — animated counters (students helped, subjects covered, avg. grade improvement).

### 2. `programs/` — Courses / Programs
File-explorer-styled window. Left rail = subject categories (Math, Sciences, Languages, Computer Science, Test Prep). Right pane = grid of "program cards" with:
- Subject icon, title, level (Primary / Secondary / University)
- Duration, format (1-on-1 / group / online)
- Short description + "View details" → opens a detail sub-view
- Amber "Enroll" button per card

### 3. `instructors/` — Instructors + Blog
Tabbed window:
- **Tutors tab** — grid of instructor cards (avatar placeholder as ctOS profile silhouette, name, subjects, bio snippet, years experience, rating bar).
- **Field notes tab** — blog/resource list with 4–6 sample articles (study tips, exam strategies, learning science). Each opens a reader sub-view inside the window.

### 4. `enroll.form` — Contact / Enroll
Terminal-form-styled window:
- Name, email, phone, student grade level, subject(s) of interest (multi-select chips), preferred format, message
- Submit button labeled `> TRANSMIT REQUEST` with typing animation
- Below the form: contact info block (email, phone, location) styled as ctOS info card
- On submit: success toast styled as ctOS notification ("CONNECTION ESTABLISHED — we'll respond within 24h")

---

## Interactions

- **Double-click desktop icon** → opens corresponding window (or focuses if already open)
- **Single-click dock icon** → same behavior
- **Drag window header** → moves window (constrained to viewport)
- **Click window body** → brings to front
- **Minimize** → window animates down to its dock icon
- **Close** → removes window; can reopen from icon/dock
- **Resize** (optional polish) — bottom-right corner drag handle
- **Keyboard**: `Esc` closes focused window
- **Mobile / small screens**: desktop metaphor doesn't suit phones. Below `md` breakpoint, render a stacked single-column version: top bar stays, desktop icons become a vertical menu, windows render as full-width sections in order (Home, Programs, Instructors, Enroll). Same content, no dragging.

---

## Routes (TanStack Start)

Even though the experience is single-page-feeling, each window also gets a real route for SEO and shareability. Opening a window pushes a route; the home `/` opens `readme.txt` by default.

- `/` → desktop, `readme.txt` window open
- `/programs` → desktop, programs window focused
- `/instructors` → desktop, instructors window focused
- `/enroll` → desktop, enroll window focused

Each route file sets its own `title`, `description`, `og:title`, `og:description`.

---

## Technical notes

- TanStack Start + React 19, Tailwind v4 with CSS variable design tokens added to `src/styles.css` for the ctOS palette.
- Window manager built as a small Zustand-free React context (`WindowManagerProvider`) holding `windows: { id, title, isOpen, isMinimized, position, size, zIndex }[]` with actions `open/close/minimize/focus/move`.
- Drag handled with pointer events (no library needed); position stored in state, applied via inline `transform: translate3d`.
- Boot sequence is a one-time `sessionStorage` flag so it doesn't replay on every navigation.
- All icons via `lucide-react` (already available) restyled with the amber accent.
- Google Fonts: Inter + JetBrains Mono loaded via `<link>` in `__root.tsx` head.
- No backend needed for v1; the enroll form shows a success toast (sonner). If you later want submissions stored, we can wire Lovable Cloud.

---

## Out of scope (explicitly not included)

- No "About Damian", GitHub, X/Twitter, or "Do Not Open" desktop icons
- No Firefox/VSCode/Spotify sidebar app launchers from damianb's design
- No copying of damianb's personal text or wesdieleman's personal content — everything is original EduNexuZ copy

After approval I'll build the desktop shell, window manager, all four windows with placeholder-but-realistic tutoring content, the boot sequence, and the mobile fallback.