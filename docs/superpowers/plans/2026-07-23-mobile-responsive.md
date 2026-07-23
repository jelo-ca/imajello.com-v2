# Mobile Responsive Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Imajello portfolio ("Game HUD" single-scene React site) usable on phones — no horizontal overflow, all navigation reachable by tap, dialogs fully readable — while leaving desktop (≥769px) pixel-identical.

**Architecture:** One structural breakpoint at `768px`, expressed purely as CSS media queries (no JS viewport detection, no duplicate render branches). Below 768px: the scene becomes vertically scrollable instead of a fixed no-scroll `100vh` viewport, the bottom HUD bar's nav/familiar buttons become a fixed icon-only bottom tab bar (using `position: fixed` on existing DOM nodes — no JSX restructuring needed, see Task 4), and multi-column dialog grids collapse to one column. Sizing inside each regime stays fluid (existing `clamp()`/`vw`/`vh`/`min()` patterns), the breakpoint only flips structural layout.

**Tech Stack:** Vite + React + TypeScript, plain CSS Modules per component (no Tailwind, no new dependencies).

## Global Constraints

- Breakpoint: `@media (max-width: 768px)` — used verbatim in every task below, no other breakpoint values.
- No JS-side viewport/media-query detection anywhere — all responsive behavior is CSS-only, except the one JS scroll-lock effect in Task 1 (which is width-independent and safe at all sizes).
- Desktop (>768px) visual output must not change at all. Every task's media query is additive and only takes effect ≤768px.
- No new npm dependencies.
- `WorldMapDialog` gets no task in this plan — its grid already uses `repeat(auto-fit, minmax(240px, 1fr))` (auto-responsive) and its fixed-height `.photoBox` is width-independent, both already safe at any viewport width. Not an oversight.
- No automated test suite exists in this repo (established project convention — see `docs/superpowers/specs/2026-07-22-imajello-portfolio-react-design.md`, Testing section). Verification in every task is manual: run the Vite dev server and inspect via Chrome DevTools device toolbar at specified widths.
- Dev server: `npm run dev` from `client/` (confirm exact script name in Task 1, Step 1, before relying on it in later tasks).

---

### Task 1: Viewport/scroll foundation + dialog scroll-lock

**Files:**
- Modify: `client/src/styles/global.css` (`body` rule, lines 1–8)
- Modify: `client/src/App.module.css` (`.app` rule, line 1)
- Modify: `client/src/components/scene/GameScene.module.css` (`.scene` rule, lines 6–13)
- Modify: `client/src/components/dialogs/DialogHost.tsx`

**Interfaces:**
- Produces: mobile scroll behavior that all later tasks (2–10) assume is already in place (i.e. the page is allowed to grow taller than the viewport and scroll below 768px). Later tasks do not need to touch `body`/`.app`/`.scene` again.
- Produces: `document.body.style.overflow` is toggled to `'hidden'` while `DialogHost` has an open dialog, and restored on close — later tasks rely on this already existing, no other task re-implements it.

- [ ] **Step 1: Confirm the dev server command**

Run: `cat client/package.json | grep -A3 '"scripts"'` (or open `client/package.json` and check the `scripts` block).
Expected: a `"dev"` script (e.g. `vite`). Use whatever the actual script name is for all `npm run dev` references in later tasks — if it differs from `dev`, substitute it.

- [ ] **Step 2: Add `dvh` fallback + mobile scroll override to `.app`**

In `client/src/App.module.css`, replace:

```css
.app { position: relative; height: 100vh; overflow: hidden; }
```

with:

```css
.app {
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

@media (max-width: 768px) {
  .app {
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    overflow: visible;
  }
}
```

(`.app` wraps `.scene` and has its own `overflow:hidden`/fixed height — without this override, `.scene` becoming scrollable in Step 4 would still get clipped by its parent.)

- [ ] **Step 3: Add `dvh` fallback + mobile scroll override to `body`**

In `client/src/styles/global.css`, replace the `body` rule (lines 1–8):

```css
body {
  margin: 0;
  background: #f5d9dc;
  color: #2b2b30;
  font-family: 'Archivo', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}
```

with:

```css
body {
  margin: 0;
  background: #f5d9dc;
  color: #2b2b30;
  font-family: 'Archivo', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

@media (max-width: 768px) {
  body {
    overflow-y: auto;
    overflow-x: hidden;
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
  }
}
```

- [ ] **Step 4: Add `dvh` fallback + mobile scroll override to `.scene`**

In `client/src/components/scene/GameScene.module.css`, replace:

```css
.scene {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: repeating-linear-gradient(0deg, transparent 0 7px, rgba(43, 43, 48, .03) 7px 9px), #f5d9dc;
}
```

with:

```css
.scene {
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: repeating-linear-gradient(0deg, transparent 0 7px, rgba(43, 43, 48, .03) 7px 9px), #f5d9dc;
}

@media (max-width: 768px) {
  .scene {
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    overflow-y: auto;
    overflow-x: hidden;
  }
}
```

- [ ] **Step 5: Verify scroll works and desktop is unaffected**

Run `npm run dev` (from `client/`), open the printed local URL in a browser.
- At full desktop width (≥769px): page still has no scrollbar, everything fits one screen — unchanged from before this task.
- Open Chrome DevTools device toolbar, set a custom size of 390×2000 (or any width ≤768px with a tall height) to simulate content taller than viewport: confirm the page scrolls vertically with no horizontal scrollbar.
- Set device width back to 375×667 (a real phone aspect ratio): confirm the page scrolls vertically instead of clipping.

- [ ] **Step 6: Add scroll-lock while a dialog is open**

Desktop never scrolls the page (body is permanently `overflow:hidden` there), so no dialog code has ever needed to lock scroll. Now that mobile allows page scroll, opening a dialog (which shows a full-screen `.scrim` backdrop) must prevent the page underneath from scrolling, or the hero content will scroll behind the backdrop on touch devices.

In `client/src/components/dialogs/DialogHost.tsx`, add a `useEffect` that locks/restores `document.body.style.overflow` based on whether a dialog is open. Update the imports and add the effect:

```tsx
import { useEffect } from 'react';
import { useGameState } from '../../state/GameStateContext';
```

(add `useEffect` to the existing `react` import if one already exists in this file — check the current import line first; there is currently no React import in `DialogHost.tsx` since it only uses hooks imported from elsewhere, so add `import { useEffect } from 'react';` as a new top import line.)

Then, inside the `DialogHost` function, before the `if (!anyOpen) return null;` line, add:

```tsx
useEffect(() => {
  if (!anyOpen) return;
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prevOverflow; };
}, [anyOpen]);
```

The full top of the function should now read:

```tsx
export function DialogHost() {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const anyOpen = !!state.open;

  useEffect(() => {
    if (!anyOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [anyOpen]);

  if (!anyOpen) return null;

  const close = () => { tick(); dispatch({ type: 'CLOSE_SECTION' }); };
  // ...rest unchanged
```

Note the effect must run (and its cleanup fire) even though the component returns `null` when closed — that's why the hook is placed above the early return, not after it (hooks can't follow a conditional return anyway; this ordering is required, not just style).

- [ ] **Step 7: Verify scroll-lock**

With the dev server still running, in the DevTools device toolbar at 375×667:
- Scroll down the page, open any dialog (tap a bottom nav icon — this won't be fully styled for mobile until Task 4, but it will still open).
- Try to scroll the page while the dialog's backdrop is visible: the background must not scroll (only the dialog's own internal content, if it overflows, scrolls).
- Close the dialog: confirm the page becomes scrollable again at the same scroll position.

- [ ] **Step 8: Commit**

```bash
git add client/src/styles/global.css client/src/App.module.css client/src/components/scene/GameScene.module.css client/src/components/dialogs/DialogHost.tsx
git commit -m "feat(mobile): allow scene to scroll below 768px, lock scroll while a dialog is open"
```

---

### Task 2: Hero section reflow

**Files:**
- Modify: `client/src/components/scene/HeroCharacterViewer.module.css` (`.portraitBox`, `.statPanel`, lines 49–60 and 100–113)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Shrink portrait/stat boxes below 768px**

In `client/src/components/scene/HeroCharacterViewer.module.css`, `.portraitBox` currently:

```css
.portraitBox {
  width: 210px;
  height: 210px;
  box-sizing: border-box;
  position: relative;
  background: #2b2b30;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex: none;
  border: 3px solid #2b2b30;
}
```

and `.statPanel` currently:

```css
.statPanel {
  flex: none;
  width: 210px;
  height: 210px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  background: rgba(43, 43, 48, .94);
  border: 3px solid #2b2b30;
  padding: 14px 16px;
  color: #f5d9dc;
}
```

Add, at the end of the file:

```css
@media (max-width: 768px) {
  .portraitBox,
  .statPanel {
    width: clamp(140px, 40vw, 210px);
    height: clamp(140px, 40vw, 210px);
  }
}
```

This keeps both boxes square (same clamp expression) and lets `.row`'s existing `flex-wrap: wrap` (already present, no change needed there) wrap the arrow/portrait/stats row onto two lines on narrow screens without either box overflowing.

- [ ] **Step 2: Verify at phone widths**

`npm run dev`, DevTools device toolbar at 360px, 390px, and 428px widths:
- Confirm the portrait box and stat panel both shrink and stay square (not stretched).
- Confirm the ◀/▶ arrows plus portrait/stats row wraps without any element being clipped by the viewport edge or overlapping another element.
- At 1024px and desktop widths: confirm portrait/stat boxes are still exactly 210×210px (unchanged).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/scene/HeroCharacterViewer.module.css
git commit -m "feat(mobile): shrink hero portrait/stat boxes below 768px"
```

---

### Task 3: Hide KeybindsLegend, shrink+wrap TopBar chips below 768px

**Files:**
- Modify: `client/src/components/scene/KeybindsLegend.module.css` (`.legend`, lines 7–19)
- Modify: `client/src/components/scene/TopBar.module.css` (`.systemButtons`, `.chip`, whole file)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Hide the keybinds legend below 768px**

`KeybindsLegend` lists keyboard shortcuts (arrows, digits 1–5, F, ESC) that don't exist on a touch device. In `client/src/components/scene/KeybindsLegend.module.css`, add at the end of the file:

```css
@media (max-width: 768px) {
  .legend {
    display: none;
  }
}
```

- [ ] **Step 2: Shrink and wrap TopBar chips below 768px**

The 4 chips (`RESUME ↓`, `GITHUB`, `LINKEDIN`, `SFX ON`/`SFX OFF`) sit at `position:fixed; top:18px; right:18px` with no wrap — on very narrow phones (≤360px) their combined width can exceed the space between the right edge and the discoveries trigger button on the left. In `client/src/components/scene/TopBar.module.css`, replace:

```css
.systemButtons {
  position: fixed;
  top: 18px;
  right: 18px;
  display: flex;
  gap: 8px;
  z-index: 50;
}

.chip {
  font: 400 9px 'Silkscreen', monospace;
  text-decoration: none;
  background: rgba(43, 43, 48, .94);
  color: #f5d9dc;
  border: 3px solid #2b2b30;
  padding: 8px 12px;
  cursor: pointer;
}
```

with:

```css
.systemButtons {
  position: fixed;
  top: 18px;
  right: 18px;
  display: flex;
  gap: 8px;
  z-index: 50;
}

.chip {
  font: 400 9px 'Silkscreen', monospace;
  text-decoration: none;
  background: rgba(43, 43, 48, .94);
  color: #f5d9dc;
  border: 3px solid #2b2b30;
  padding: 8px 12px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .systemButtons {
    flex-wrap: wrap;
    justify-content: flex-end;
    max-width: calc(100vw - 36px);
  }

  .chip {
    padding: 6px 9px;
  }
}
```

- [ ] **Step 3: Verify**

`npm run dev`, DevTools device toolbar at 320px (narrowest common width), 360px, 390px:
- Keybinds legend text is gone entirely below 768px.
- TopBar chips wrap to a second row instead of overflowing off-screen or overlapping the discoveries trigger (top-left).
- At ≥769px: keybinds legend still visible, chips still single row — unchanged.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/scene/KeybindsLegend.module.css client/src/components/scene/TopBar.module.css
git commit -m "feat(mobile): hide keyboard-only legend, wrap TopBar chips below 768px"
```

---

### Task 4: PlayerBar → status strip + fixed bottom tab bar

**Files:**
- Modify: `client/src/components/scene/PlayerBar.module.css` (whole file gets a mobile media query block appended; no changes to existing desktop rules)

**Interfaces:**
- Consumes: nothing from other tasks. No changes to `PlayerBar.tsx` — this task is CSS-only.
- Produces: nothing other tasks depend on, but Task 5 (FamiliarChat) depends on knowing the bottom tab bar's height (`56px`) to avoid overlapping it — that exact value is fixed by this task's Step 1 and must not change without updating Task 5's `bottom` offset.

**Implementation approach (read before writing code):** No JSX changes. `.playerPlate`, `.nav`, and `.familiarWrap` are all children of `.bar`, which is `position: relative` (not fixed) on desktop — that's what makes the bar dock naturally at the bottom of the flex column (`.heroWrap` above it has `flex: 1`, absorbing the remaining space). Below 768px, this task gives `.playerPlate`, `.nav`, and `.familiarWrap` each their own `position: fixed` rule. Because none of their ancestors (`.bar`, `.scene`, `.app`) use `transform`/`filter`/`contain`/`will-change: transform` (verified — grep confirms none of the ancestor chain has these), a `position: fixed` descendant positions itself relative to the actual browser viewport, completely ignoring its parent's layout. This lets the three groups "escape" the single docked bar and land in three different fixed screen positions without moving anything in the DOM tree. `.bar` itself collapses to zero visible height once its children are all fixed-positioned.

- [ ] **Step 1: Add the mobile layout override**

In `client/src/components/scene/PlayerBar.module.css`, add this block at the end of the file:

```css
@media (max-width: 768px) {
  .bar {
    display: block;
    height: 0;
    background: none;
    box-shadow: none;
  }

  .xpTrack {
    display: none;
  }

  .playerPlate {
    position: fixed;
    top: 54px;
    left: 50%;
    transform: translateX(-50%);
    width: min(320px, 92vw);
    min-width: 0;
    border-right: none;
    background: rgba(43, 43, 48, .94);
    padding: 8px 14px;
    gap: 5px;
    z-index: 40;
  }

  .nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 64px;
    height: 56px;
    background: rgba(43, 43, 48, .96);
    box-shadow: 0 -4px 0 rgba(20, 20, 23, .25);
    z-index: 60;
  }

  .navBtn {
    flex: 1;
    width: auto;
    padding: 8px 4px;
    gap: 2px;
  }

  .navLabel,
  .navSub {
    display: none;
  }

  .navBadge {
    top: -6px;
    left: -6px;
    width: 14px;
    height: 14px;
    font-size: 8px;
  }

  .navGlyph {
    font-size: 18px;
  }

  .familiarWrap {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 64px;
    height: 56px;
    min-width: 0;
    background: rgba(43, 43, 48, .96);
    box-shadow: 0 -4px 0 rgba(20, 20, 23, .25);
    z-index: 60;
    justify-content: center;
    gap: 2px;
  }

  .familiarBtn {
    width: 40px;
    height: 40px;
  }

  .familiarLabel {
    display: none;
  }

  .familiarIcon {
    font-size: 20px;
  }
}
```

Notes on specific values:
- `.playerPlate`'s `top: 54px` clears the TopBar chip row (`top: 18px` + roughly 24px chip height from Task 3).
- `.xpTrack`/`.xpFill` (the thin progress bar) is hidden below 768px rather than repositioned — the same percentage is already shown as text inside `.playerPlate` via `.xpLabel` (`{xp}% XP · ...`, from `PlayerBar.tsx`), so no information is lost.
- `.nav`'s `right: 64px` and `.familiarWrap`'s `width: 64px` must stay equal — the nav row is sized to leave exactly enough room for the familiar button beside it, both docked at `bottom: 0`.
- `56px` height (both `.nav` and `.familiarWrap`) exceeds the 44px minimum touch-target guideline.
- `z-index: 60` for both keeps them below `DialogHost`'s `.scrim` (`z-index: 70`) and `.hotbar` (`z-index: 85`), matching how the desktop `.bar` (`z-index: 2`) already sits below those same layers — when a dialog opens, the bottom tab bar is correctly covered by the scrim, same relative stacking as desktop.

- [ ] **Step 2: Verify**

`npm run dev`, DevTools device toolbar at 375×667:
- The player plate (P1/LVL/HP/EN/XP text) appears as a small floating block near the top, below the TopBar chips, not at the bottom.
- The 5 nav icons + familiar button form one slim bar fixed to the bottom edge, each tappable, each showing its glyph + numbered badge but no text labels.
- Tap each of the 5 nav icons: the corresponding dialog opens (dialogs aren't mobile-reflowed yet until later tasks, but they should open/close correctly).
- Tap the familiar button (🔮): the familiar chat panel opens (not yet mobile-repositioned until Task 5, but should appear).
- Scroll the page: the bottom tab bar and player plate stay fixed in place (don't scroll away).
- At ≥769px: bar looks completely unchanged from before this task — player plate/nav/familiar back in their single docked grid row.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/scene/PlayerBar.module.css
git commit -m "feat(mobile): split PlayerBar into a top status strip and fixed bottom tab bar below 768px"
```

---

### Task 5: FamiliarChat mobile repositioning

**Files:**
- Modify: `client/src/components/familiar/FamiliarChat.module.css` (`.wrap`, lines 5–16)

**Interfaces:**
- Consumes: the bottom tab bar height (`56px`) fixed in Task 4, Step 1 — the `bottom` offset below is `56px + 12px` gap.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Reposition the chat panel below 768px**

In `client/src/components/familiar/FamiliarChat.module.css`, `.wrap` currently:

```css
.wrap {
  position: fixed;
  right: 5vw;
  top: 50%;
  transform: translate(0, -50%);
  z-index: 9;
  width: min(360px, 88vw);
  height: 40vh;
  display: flex;
  flex-direction: column;
  animation: chatboxIn .38s cubic-bezier(.22, .8, .32, 1) both;
}
```

Add, at the end of the file:

```css
@media (max-width: 768px) {
  .wrap {
    right: 50%;
    top: auto;
    bottom: 68px;
    transform: translate(50%, 0);
    width: min(360px, 92vw);
    height: min(52vh, 420px);
  }
}
```

This anchors the panel centered horizontally and docked near the bottom (68px = the 56px fixed tab bar from Task 4 + a 12px gap), instead of vertically centered on the right — avoiding any overlap with the bottom tab bar.

- [ ] **Step 2: Verify**

`npm run dev`, DevTools device toolbar at 375×667:
- Open the familiar chat (tap 🔮 in the bottom tab bar). Confirm the panel appears centered horizontally, sitting above the bottom tab bar with a visible gap, not overlapping it.
- Confirm the panel's own internal scroll area (chat messages) still scrolls independently, and the close button (✕) still works.
- At ≥769px: chat panel appears in its original right-side vertically-centered position — unchanged.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/familiar/FamiliarChat.module.css
git commit -m "feat(mobile): dock familiar chat panel above the bottom tab bar below 768px"
```

---

### Task 6: ContactDialog single-column reflow

**Files:**
- Modify: `client/src/components/dialogs/ContactDialog.module.css` (`.grid`, `.linkGrid`, `.statusGrid`, `.headerLeft`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Collapse the two-column layouts below 768px**

In `client/src/components/dialogs/ContactDialog.module.css`, add at the end of the file:

```css
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .linkGrid {
    grid-template-columns: 1fr;
  }

  .statusGrid {
    grid-template-columns: 1fr;
  }

  .headerLeft {
    flex-wrap: wrap;
  }

  .formCard {
    height: auto;
  }
}
```

`.formCard`'s `height: 100%` (desktop) was meant to stretch it to match `.left`'s height inside the 2-column grid — with a single column below 768px it should size to its own content instead, hence `height: auto`.

- [ ] **Step 2: Verify**

`npm run dev`, DevTools device toolbar at 375×667: open Contact (tap [✉] in the bottom tab bar).
- The intro/links/status content and the message form stack in one column, form below content, no horizontal overflow.
- The 4 link chips (EMAIL/GITHUB/LINKEDIN/RESUME) and the 4 status rows (AVAILABILITY/FOCUS/RESPONSE TIME/LOCATION) are each in a single column, not 2-up.
- Typing into the name/email/message fields and tapping ▶ SAY HELLO still works (opens the mail app link).
- At ≥769px: dialog layout unchanged (2-column).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/ContactDialog.module.css
git commit -m "feat(mobile): collapse ContactDialog to a single column below 768px"
```

---

### Task 7: QuestLogDialog grid reflow

**Files:**
- Modify: `client/src/components/dialogs/QuestLogDialog.module.css` (`.jobGrid`, `.sideGrid`, `.achGrid`, `.eduRow`, `.eduLabel`, `.tabs`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Collapse the two-column grids and the education row below 768px**

In `client/src/components/dialogs/QuestLogDialog.module.css`, add at the end of the file:

```css
@media (max-width: 768px) {
  .jobGrid,
  .sideGrid,
  .achGrid {
    grid-template-columns: 1fr;
  }

  .eduRow {
    flex-direction: column;
    gap: 10px;
  }

  .eduLabel {
    width: auto;
  }

  .eduList {
    min-width: 0;
  }

  .tab,
  .tabActive {
    font-size: 10px;
    padding: 9px 12px;
  }
}
```

(`.tab`/`.tabActive` padding/font-size is trimmed slightly so the 3 tabs — MAIN QUESTS / SIDE QUESTS +4 / TIMELINE — are less likely to wrap awkwardly on narrow phones; `.tabs` already has `flex-wrap: wrap` from the base rule so it degrades safely even if they do wrap.)

- [ ] **Step 2: Verify**

`npm run dev`, DevTools device toolbar at 375×667: open Quest Log (tap [▣]).
- MAIN QUESTS tab: job cards stack in one column.
- SIDE QUESTS tab: side quest cards stack in one column, skill chips still wrap correctly (`.skillsRow` already has `flex-wrap: wrap`, unchanged).
- Achievements grid (visible on both Main/Side tabs): stacks to one column.
- Education row: label above the list instead of beside it.
- TIMELINE tab: don't worry about the chart yet — that's Task 8.
- At ≥769px: all grids remain 2-column — unchanged.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/QuestLogDialog.module.css
git commit -m "feat(mobile): collapse QuestLogDialog job/side/achievement grids to one column below 768px"
```

---

### Task 8: TimelineTab horizontal scroll

**Files:**
- Modify: `client/src/components/dialogs/TimelineTab.tsx`
- Modify: `client/src/components/dialogs/TimelineTab.module.css` (add `.chartScroll`, adjust `.chartRow`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

**Why not reflow the chart itself:** every bar's `top`/`left`/`width`/`height` is a hand-placed pixel value from `TIMELINE_BARS` (`client/src/data/quests.ts`), tuned for a specific rendered width. The rightmost bar (`left: 496, width: 88`, in `client/src/data/quests.ts` line 58) ends at `584px`; adding the axis column (`50px`) and the `chartRow` gap (`18px`) means the chart needs at least `584 + 50 + 18 = 652px` of width to render without any bar being clipped or overlapping. Rather than rescaling all 9 bars' hand-tuned geometry for arbitrary phone widths, wrap the chart in a horizontally-scrollable container below 768px so it keeps its designed proportions and the user swipes to see it.

- [ ] **Step 1: Wrap `.chartRow` in a scroll container**

In `client/src/components/dialogs/TimelineTab.tsx`, find:

```tsx
      <div className={styles.chartRow}>
        <div className={styles.axis}>
```

and the matching closing tags:

```tsx
        </div>
      </div>
      <Legend />
```

Wrap the existing `.chartRow` div in a new `.chartScroll` div (don't change anything inside it):

```tsx
      <div className={styles.chartScroll}>
        <div className={styles.chartRow}>
          <div className={styles.axis}>
            {YEAR_LABELS.map(y => (
              <div key={y.text} className={y.now ? styles.axisLabelNow : styles.axisLabel} style={{ top: y.top }}>{y.text}</div>
            ))}
          </div>
          <div className={styles.track}>
            <div className={styles.futureLabel}>↑ future</div>
            {YEAR_LABELS.map(y => (
              <div
                key={y.text}
                className={y.now ? styles.gridlineNow : styles.gridline}
                style={{ top: y.top }}
              />
            ))}
            {TIMELINE_BARS.map((bar, i) => (
              <div
                key={i}
                className={VARIANT_CLASS[bar.variant]}
                style={{ top: bar.top, left: bar.left, width: bar.width, height: bar.height, padding: bar.padding }}
              >
                {bar.tag && <span className={styles.barTag}>{bar.tag}</span>}
                <span className={styles.barTitle} style={{ fontSize: bar.titleSize }}>{bar.title}</span>
                {bar.org && <span className={styles.barOrg}>{bar.org}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Legend />
```

- [ ] **Step 2: Add scroll container + minimum chart width in CSS**

In `client/src/components/dialogs/TimelineTab.module.css`, add at the end of the file:

```css
@media (max-width: 768px) {
  .chartScroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .chartRow {
    min-width: 680px;
  }
}
```

(`680px` gives headroom above the `652px` floor computed in this task's intro.) `.chartScroll` needs no rule above 768px — on desktop it's just a plain wrapping `div` with no layout effect, since `.chartRow` already fits within the dialog's `min(1020px, 94vw)` width there.

- [ ] **Step 3: Verify**

`npm run dev`, DevTools device toolbar at 375×667: open Quest Log → TIMELINE tab.
- The chart is wider than the screen and scrolls horizontally by touch/drag; no bar is clipped by `overflow: hidden` or squeezed unreadably.
- The intro paragraph + legend above/below the chart stay full-width and don't scroll horizontally with the chart.
- At ≥769px: timeline chart renders exactly as before (no scrollbar, fits the dialog).

- [ ] **Step 4: Commit**

```bash
git add client/src/components/dialogs/TimelineTab.tsx client/src/components/dialogs/TimelineTab.module.css
git commit -m "feat(mobile): make TimelineTab chart horizontally scrollable below 768px"
```

---

### Task 9: BattleLogDialog single-column reflow

**Files:**
- Modify: `client/src/components/dialogs/BattleLogDialog.module.css` (`.card`, `.shotWrap`, `.info`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Stack the project card's screenshot and info below 768px**

`.card` is already `display:flex; flex-wrap:wrap`, so `.shotWrap` (`width:260px`) and `.info` (`min-width:300px`) already wrap onto their own lines once the dialog is narrower than `260 + 300 = 560px` — but `.info`'s `min-width:300px` still forces horizontal overflow below ~300px + padding. In `client/src/components/dialogs/BattleLogDialog.module.css`, add at the end of the file:

```css
@media (max-width: 768px) {
  .shotWrap {
    width: 100%;
    border-right: none;
    border-bottom: 3px solid #2b2b30;
  }

  .info {
    min-width: 0;
  }
}
```

- [ ] **Step 2: Verify**

`npm run dev`, DevTools device toolbar at 375×667: open Battle Log (tap [⚔]).
- Each project card shows the screenshot full-width on top, project info below, no horizontal overflow.
- The "⌂ REPO" link badge (absolute-positioned bottom-right of the card) still displays without overlapping text awkwardly.
- At ≥769px: cards still show screenshot-left/info-right side by side — unchanged.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/BattleLogDialog.module.css
git commit -m "feat(mobile): stack BattleLogDialog project cards below 768px"
```

---

### Task 10: InventoryDialog grid + gallery reflow

**Files:**
- Modify: `client/src/components/dialogs/InventoryDialog.module.css` (`.grid`, `.galleryGrid`, `.photoStage`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Reduce the slot grid columns and stack the gallery below 768px**

In `client/src/components/dialogs/InventoryDialog.module.css`, add at the end of the file:

```css
@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .galleryGrid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .photoStage {
    min-height: 260px;
  }
}
```

- [ ] **Step 2: Verify**

`npm run dev`, DevTools device toolbar at 375×667: open Inventory (tap [♦]).
- Grid view: the 18 slots render 4 per row instead of 6, each still square (`aspect-ratio:1`, unchanged), no horizontal overflow.
- Tap a filled slot to open its gallery view: the two overlapping photo cards stage renders above the item description text (stacked), instead of side by side.
- Tap a photo to swap front/back — still works (no JS changes in this task).
- Tap "◀ BACK TO ITEMS" — returns to grid view.
- At ≥769px: grid still 6 columns, gallery still 2-column side-by-side — unchanged.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/InventoryDialog.module.css
git commit -m "feat(mobile): reflow InventoryDialog grid and gallery below 768px"
```

---

### Task 11: Full cross-breakpoint regression pass

**Files:** none (verification only — no code changes expected; if this step surfaces a bug, fix it in the relevant file from Tasks 1–10 and commit as a small fix within this task).

**Interfaces:**
- Consumes: the completed state of Tasks 1–10.

- [ ] **Step 1: Build check**

Run: `cd client && npm run build`
Expected: build completes with no TypeScript/compile errors (this catches any JSX typos from Task 8's wrapping change).

- [ ] **Step 2: Full manual pass, mobile widths**

`npm run dev`, DevTools device toolbar, test at 360px, 390px, 428px (phones) and 768px (breakpoint edge):
- No horizontal scrollbar/overflow anywhere, including inside every dialog and the familiar chat panel.
- All 5 sections (World Map, Battle Log, Quest Log incl. all 3 tabs, Inventory incl. gallery, Contact) open via the bottom tab bar, are fully readable, and close via the ✕ button, the vertical hotbar's ✕, and tapping the backdrop.
- Familiar chat opens via the 🔮 button, doesn't overlap the bottom tab bar, sends a message (or shows the expected sleep/limit state), and closes.
- Hero character ◀/▶ cycling works by tap.
- Page scrolls vertically when content exceeds the viewport; dialogs lock that scroll while open (from Task 1).

- [ ] **Step 3: Full manual pass, desktop widths**

Same dev server, DevTools device toolbar at 1024px and 1440px (or just a normal maximized browser window):
- Confirm every screen listed in Step 2 is pixel-identical to how it behaved before this plan's changes — no scrollbar, bottom bar in its single docked grid row, keybinds legend visible, all dialogs 2-column where they were before.

- [ ] **Step 4: Fix any regressions found**

If Steps 2 or 3 surface an issue, fix it in the relevant file (from Tasks 1–10) and re-run the affected check before moving on. Commit each fix separately with a message describing what broke and the breakpoint it broke at, e.g.:

```bash
git add <fixed file>
git commit -m "fix(mobile): <what broke> at <width>px"
```

- [ ] **Step 5: Final commit (only if no code changes were needed in Step 4)**

If Steps 2–3 passed clean with no fixes needed, no commit is required for this task — it was verification-only.
