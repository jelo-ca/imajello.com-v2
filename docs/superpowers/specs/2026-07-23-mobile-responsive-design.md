# Mobile Responsive Pass — Design

## Overview

The site (`client/`) is a single-scene "Game HUD" portfolio, built desktop-first per the original port design (`docs/superpowers/specs/2026-07-22-imajello-portfolio-react-design.md`): fixed `100vh`/`overflow:hidden` scene, keyboard-driven navigation (arrows to cycle characters, digit keys 1–5 to open sections, `F` for familiar chat), and several components with hard pixel-width floors — most notably the bottom HUD bar (`PlayerBar`), which needs ~1020px+ (230px player plate + 5×112px nav + 230px familiar) to render as designed. Below that, and on any touch device, the layout breaks (overlapping/clipped elements, no way to reach keyboard-only affordances).

This spec covers a full responsive pass: a single structural breakpoint (`768px`) below which layout, scroll behavior, and the bottom HUD bar change to fit small/touch viewports, while desktop behavior is preserved exactly as-is. Sizing within each regime continues to use the existing fluid approach (`clamp()`, `vw`/`vh`, `min()`) — the breakpoint only flips structural concerns (grid → stack, fixed-dock → scrolls-with-content), not individual pixel values.

## Scope decisions (from user)

- Full responsive redesign (not a minimal patch), covering PlayerBar/TopBar/dialogs/FamiliarChat and touch nav.
- Sizing scales fluidly across all widths; only structural layout mode is a two-state breakpoint (desktop / mobile) at `768px`.
- Below `768px`, the scene is allowed to scroll vertically (`dvh`-safe) instead of forcing everything into one no-scroll viewport like desktop.
- Bottom HUD bar mobile pattern: **bottom tab bar** — the status strip (P1/LVL/HP/EN/XP) moves inline near the top and scrolls with content; the nav + familiar buttons become a slim, icon-only bar fixed to the bottom of the viewport.

## Breakpoint model

- New CSS custom media value, `768px`, used consistently across components as `@media (max-width: 768px)`. No JS-side viewport detection — everything is CSS media queries, matching the codebase's existing plain-CSS/CSS-Modules approach (no new deps).
- Above 768px: current desktop behavior, pixel-for-pixel unchanged.
- Below 768px: mobile mode (see sections below).

## Viewport & scroll mechanics

- Replace bare `100vh` with `100dvh` (`height: 100vh; height: 100dvh;` fallback pattern) wherever height is pinned to the viewport (`body`, `.scene` in `GameScene.module.css`), so mobile Safari's collapsing address bar doesn't clip content.
- Below 768px: `body` and `.scene` switch from `overflow:hidden` / fixed `height:100dvh` to `overflow-y:auto` / `min-height:100dvh; height:auto`. Desktop keeps the strict no-scroll lock unchanged.

## Hero section (`GameScene`, `HeroCharacterViewer`)

- `.heroWrap` (`GameScene.module.css`) keeps its existing fluid `clamp()` padding/gap; below 768px it's simply allowed to exceed viewport height (page scrolls) instead of being clipped.
- `.row` (`HeroCharacterViewer.module.css`, the ◀ portrait ▶ stats row) already has `flex-wrap: wrap`. Below 768px:
  - `.portraitBox` and `.statPanel` fixed `210×210px` become `clamp(140px, 40vw, 210px)` square (width and height both, to keep the pixel-art portrait square).
  - `.arrow` buttons keep their size (already touch-sized at `12px 16px` padding).
- `.name`, `.bio` already use `clamp()` tuned for small viewports — no change needed.
- `[data-hero-bio]` / `[data-hero-dots]` `max-height` media rules in `global.css` (currently keyed to viewport *height*) stay as-is — they're an orthogonal short-viewport concern, not width-based, and still apply usefully on mobile landscape.

## TopBar / KeybindsLegend / dialog hotbar

- `KeybindsLegend`: purely keyboard-shortcut reference, meaningless without a keyboard. Add `display: none` below 768px in `KeybindsLegend.module.css` (`.legend`). No component logic change.
- `TopBar` (`.systemButtons`, `.chip`): already small fixed chips, top-right. Below 768px, reduce `.chip` padding (`8px 12px` → `6px 9px`) and font stays same — no structural change.
- `DialogHost` vertical hotbar (`.hotbar`, shown while a dialog is open): already narrow (~40px wide, right-edge docked) — no change needed, confirmed fits mobile widths.

## PlayerBar → status strip + bottom tab bar

This is the main structural change.

- **Status strip** (current `.playerPlate`: `P1 · IMAJELLO`, `LVL 21`, HP/EN meters, konami hint, XP label): below 768px, renders as a full-width block placed in normal document flow near the top of the scene (under `TopBar`, above the hero row), not docked. It scrolls with the page.
- **Bottom tab bar** (current `.nav` 5 buttons + `.familiarWrap`): below 768px, becomes `position: fixed; bottom: 0; left: 0; right: 0;`, a single row of 6 equal-width (`flex: 1`) buttons: the 5 section glyphs + the familiar button, each ≥44px tall (touch target minimum). Per-button content shrinks to: numbered badge (small, corner) + glyph — the text label/sublabel (`WORLD MAP` / `THE JOURNEY` etc.) is dropped below 768px (icon + badge carry identity; full labels are desktop-only real estate).
- Implementation approach: `PlayerBar.tsx` JSX stays a single structure (no duplicate render branches) — reorganize `PlayerBar.module.css` with a `768px` media query that:
  - Changes `.bar` from `grid-template-columns: 1fr auto 1fr` to a mobile layout where `.playerPlate` gets pulled out of the fixed dock (`position: static`, full width, order changed via a wrapping element or `grid-template-areas` swap) and `.nav`+`.familiarWrap` merge into one fixed-bottom flex row.
  - If pure CSS reorg proves awkward given the current flat JSX (all three groups are siblings inside `.bar`), acceptable to lightly restructure `PlayerBar.tsx` into two sibling containers (status strip container, bottom-bar container) — same data/handlers/dispatches, just regrouped markup. This is a structural JSX change, not a rewrite; call it out during implementation review since it touches more than CSS.
- The XP track/fill bar (`.xpTrack`/`.xpFill`, currently spanning the full bottom bar width) moves with the status strip on mobile (renders as part of that block, not the fixed bottom dock).

## Dialogs (shared pattern + per-dialog reflow)

All 5 dialogs (`WorldMapDialog`, `BattleLogDialog`, `QuestLogDialog`, `InventoryDialog`, `ContactDialog`) already share the same shell pattern: `width: min(Npx, 94vw); max-height: 86vh; overflow: auto;`, sticky header. This shell is confirmed fine as-is (verified `max-height`/`overflow` already present in each `.dialog` class) — no shell rewrite needed.

Below 768px, additionally:
- Any 2-column `grid-template-columns: 1fr 1fr` (or `minmax(...)` 2-up layout) collapses to a single column:
  - `QuestLogDialog.module.css`: `.jobGrid`, `.sideGrid`, `.achGrid` (all `1fr 1fr`) → `1fr`.
  - `QuestLogDialog.module.css`: `.eduRow`'s fixed `.eduLabel { width: 170px }` + `.eduList { min-width: 280px }` two-column layout → stack vertically (`.eduRow` to `flex-direction: column`, `.eduLabel` full width).
  - `ContactDialog.module.css`: `.grid` (`minmax(0,1fr) minmax(240px,320px)`, left content + form card) → single column, form card below the content.
  - `BattleLogDialog.module.css`: card layout (`width:260px` / `min-width:300px` project cards) → full-width single column list.
- `InventoryDialog.module.css`: `.grid` (6-column slot grid) → `repeat(4, 1fr)` or `repeat(3, 1fr)` below 768px (keep slots square, just fewer per row). `.galleryGrid` (`minmax(180px,1fr) 1.2fr` photo+text split) → stacked (photo stage on top, text below).
- `TimelineTab.module.css`: the bar chart uses hand-tuned absolute-positioned geometry per bar (inline `top/left/width/height` from `TIMELINE_BARS` data) tuned for its `max-width: 520px` container — rather than reworking that geometry for narrow widths, wrap it in a horizontally-scrollable container below 768px (`overflow-x: auto`, inner content keeps its designed width) so the chart stays legible instead of being visually compressed.
- `WorldMapDialog.module.css`: `.grid` already `repeat(auto-fit, minmax(240px, 1fr))` — auto-responsive, no change needed. `.photoBox { height: 280px }` stays (width-independent).

## FamiliarChat

- Currently `position: fixed; right: 5vw; top: 50%; transform: translate(0,-50%); width: min(360px, 88vw); height: 40vh;` — a floating panel vertically centered on the right.
- Below 768px: reposition as a bottom-anchored sheet — `right: 50%; transform: translateX(50%);` (or simpler `left/right: 16px`), `bottom` anchored above the new fixed bottom tab bar (e.g. `bottom: calc(56px + 12px)` where 56px ≈ tab bar height) instead of vertically centered, so it doesn't collide with the bottom tab bar. Width stays `min(360px, 88vw)`.

## Testing

No automated test suite in this repo (established convention, per the original port design doc — this project is judged by visual/interaction fidelity, not unit tests). Verification: run the Vite dev server, check via Chrome DevTools device emulation at 360px, 390px, 428px (phones), 768px (breakpoint edge), 1024px (tablet/desktop edge), confirming:
- No horizontal overflow/scrollbar at any width.
- Bottom tab bar reachable and all 5 sections + familiar chat operable by tap alone (no keyboard dependency) below 768px.
- Desktop (≥769px) is pixel-identical to current behavior (regression check).
- Each dialog opens, is fully readable/scrollable, and closes via tap (✕ button, hotbar ✕, and backdrop tap) below 768px.

## Out of scope

- No new touch gestures (swipe-to-navigate, etc.) — existing tap targets (nav buttons, hero ◀/▶ arrows) already work via `onClick`, which fires for touch taps; no JS interaction changes needed beyond the CSS/layout work above.
- No changes to state management, data files, or the familiar-chat backend.
- No tablet-specific third layout tier — tablet widths (769–1024px) get the desktop layout (already reasonably fluid) or the mobile layout depending on which side of 768px they land on; no dedicated in-between design.
