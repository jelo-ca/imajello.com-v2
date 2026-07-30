# Hero Section → Playable Platformer — Design

## Overview

The hero zone (`GameScene`/`HeroCharacterViewer`) currently shows static text (eyebrow, name, bio) plus a character portrait with ◀/▶ switching and a STATS panel. This spec removes all the hero text and turns the site into a tiny playable moment: pick a character, press Start, and the character shrinks into a movable sprite that walks and jumps around the whole screen, using the real HUD chrome (`TopBar`, `PlayerBar`, `KeybindsLegend`, the discoveries trigger) as platforms, plus a few extra decorative platforms. Walking into one of the 5 `PlayerBar` nav buttons opens that section's dialog, same as clicking it.

This is a charming easter-egg-grade platformer, not a game engine: no enemies, no scoring, no slopes/wall-jump/side-collision — just gravity, jump, and "land on top of a rectangle."

## Scope decisions (from user)

- Play area is the whole screen; existing HUD bars double as platforms (not a separate overlay/dedicated view).
- Controls: Arrow keys move, Space jumps (desktop). On mobile: on-screen ◀ ▶ + jump buttons.
- Walking into a `PlayerBar` nav button opens its dialog (same as click). All other platforms (TopBar chips, KeybindsLegend, discoveries trigger, decorative blocks) are walkable but inert — deliberately not wired to trigger external links or toggle panels on incidental contact.
- Pre-start screen keeps the character portrait + ◀/▶ picker (all other hero text removed) with a new "▶ START" button.
- ESC (when no dialog/familiar/discoveries panel is open) exits play mode back to the picker screen.
- Physics: simple arcade gravity + jump, land-on-top-only collision.

## State & control flow

- `state/types.ts`: add `playing: boolean` to `State`, plus actions `START_PLATFORMER` and `STOP_PLATFORMER` (both trivial reducer cases: `{ ...state, playing: true/false }`; `STOP_PLATFORMER` additionally resets nothing else — position state doesn't live in the reducer, see below).
- `App.tsx`'s existing keydown handler changes:
  - `Escape`: if `state.playing` and nothing else is open, dispatch `STOP_PLATFORMER` before the existing discoveries/section/familiar escape branches (same priority position as those — dialogs still take precedence, e.g. if a dialog is somehow open while playing, closing that first).
  - `ArrowLeft`/`ArrowRight`: only dispatch `PREV_CHAR`/`NEXT_CHAR` when `!state.open && !state.playing`. While playing, arrow keys are consumed by the platformer's own movement listener instead.
- `HeroCharacterViewer.tsx`: remove the eyebrow `<div>`, `<h1>` name, and bio `<p>`. Keep the portrait/arrows/stat-panel row and the name/class plate as the "picker" state. Add a "▶ START" button (new `ui.hero.startBtn` string) below the name/class plate, calling a new `dispatch({ type: 'START_PLATFORMER' })`. When `state.playing` is true, `HeroCharacterViewer` renders `null` (the picker UI disappears; `Platformer` takes over rendering the character).

## Physics component (`components/scene/Platformer.tsx` + `hooks/usePlatformerLoop.ts`)

- Mounted by `GameScene` only when `state.playing` is true, as a sibling positioned to cover the full `.scene` (absolute, `inset: 0`, `pointer-events: none` except it doesn't need pointer events at all — keyboard/touch-button driven).
- `usePlatformerLoop(platforms, options)`: a `requestAnimationFrame` loop holding `x, y, vx, vy, grounded, facing` in a ref (not reducer state, to avoid re-rendering the app tree every frame) and mirrors it into local `useState` once per frame for rendering the sprite's inline `transform: translate(x, y)`.
  - Constants: gravity (px/s²), move speed (px/s), jump velocity (px/s) — tuned by feel during implementation, not fixed in the spec.
  - Each frame: apply horizontal velocity from held-key state, apply gravity to `vy`, integrate position, then check AABB overlap against every platform rect for landing — only from above (character's previous bottom ≤ platform top, current bottom ≥ platform top, horizontal ranges overlap) → snap to platform top, `vy = 0`, `grounded = true`. No side/ceiling collision.
  - Screen bounds: clamp `x` to `[0, viewportWidth - spriteWidth]`. If `y` exceeds viewport height (fell through everything), respawn at the `PlayerBar` floor platform's position.
  - Loop pauses (stops advancing physics, stays mounted) whenever `state.open || state.familiarOpen || state.discoveriesOpen` — checked at the top of each frame, so closing a dialog resumes exactly where the character was.
- Sprite: reuses `char.src` (current `CHARS[state.charIdx]`) at a small fixed size (~40px tall) instead of the 210px portrait, `image-rendering: pixelated` like today, flipped horizontally via `scaleX(-1)` based on `facing`.
- Z-index: `TopBar`/`PlayerBar`/`DiscoveryListPanel` are `position: fixed` with `z-index` 40–60 today. `Platformer`'s sprite needs a `z-index` above all of them (so the character visibly stands on top of platforms rather than behind them) but below `DialogHost`'s scrim/dialogs (which sit above everything when open) — pick a value like `70`, confirmed against the existing stacking order during implementation rather than guessed here.

## Platform sources

- `hooks/usePlatformRects.ts`: measures `getBoundingClientRect()` of a set of DOM refs (passed in) on mount, on window resize, and on any layout-affecting state change (dialog open/close, familiar open/close — since `PlayerBar`'s mobile layout and `TopBar`'s menu can shift things). Returns a flat list of `{ x, y, width, height, sectionKey? }` rects.
- Real HUD elements measured (desktop): `PlayerBar`'s outer bar (the floor — but see below, subdivided), `TopBar`'s `.systemButtons` chip row, `KeybindsLegend`'s `.legend` box, `DiscoveryListPanel`'s `.trigger` button.
- `PlayerBar` floor is special: instead of one rect for the whole bar, `PlayerBar.tsx` forwards a ref to each of the 5 nav `<button>`s (plus the player plate and familiar button as plain non-interactive segments) so the floor is really 7 adjacent rects — the 5 nav-button rects carry `sectionKey`, the plate/familiar segments don't.
- Decorative extra platforms: new `content.json` entry `ui.platformer.decorativePlatforms: Array<{ top, left, width, height }>` (same pattern as existing `TIMELINE_BARS`), rendered by a small `DecorativePlatforms.tsx` as styled boxes matching the existing dark chip look (`#2b2b30`, 3px border), and included in the same rect list for collision.
- Mobile: `usePlatformRects` measures whatever's actually on-screen in the mobile layout (bottom tab bar buttons, hamburger menu button, discoveries trigger); `KeybindsLegend` is already `display:none` below 768px so it's naturally excluded. Decorative platform positions get a mobile-specific variant in `content.json` (`decorativePlatformsMobile`) sized/placed for the narrower viewport.

## Nav-button trigger

- In the physics loop, after resolving landing collisions each frame, if `grounded` and the landed-on rect has a `sectionKey` and it's not the same section as the last trigger, dispatch `OPEN_SECTION` for it (mirrors clicking that nav button). Track "last triggered section" in the loop's ref to avoid re-firing every frame while standing still on it; clear that ref when the character leaves the rect (horizontal range no longer overlaps) so walking off and back re-triggers.
- No other platform (TopBar chips, KeybindsLegend, discoveries trigger, decorative blocks) has any trigger behavior — purely walkable geometry.

## KeybindsLegend text while playing

- `content.json`'s `ui.keybinds` gets playing-mode variants: `movePrompt` ("← → MOVE"), `jumpPrompt` ("SPACE JUMP"), `stopPrompt` ("ESC STOP PLAYING"). `KeybindsLegend.tsx` swaps its row list based on `state.playing` (still driven entirely by `content.json` strings, no hardcoded text).

## Mobile controls (`components/scene/TouchControls.tsx`)

- Rendered only when `state.playing` is true and on a touch/mobile layout (reuse the existing `max-width: 768px` CSS breakpoint pattern — component always renders when playing, hidden via CSS media query above 768px, matching how other mobile-only controls in this codebase work).
- Fixed-position ◀ ▶ buttons bottom-left, jump button bottom-right, positioned above the existing bottom nav tab bar / familiar button (which are already fixed-bottom on mobile) so they don't overlap — likely docked just above that strip.
- Buttons set/clear the same held-key state the keyboard listener uses (shared state, e.g. a small `useRef<Set<string>>` or equivalent read by `usePlatformerLoop`), via `onTouchStart`/`onTouchEnd` (or pointer events) rather than click, so holding down continues movement.

## Out of scope

- No enemies, collectibles-as-gameplay, scoring, or win condition.
- No slope, wall-jump, side-collision, or momentum/friction physics.
- No persistence of `playing` across reloads (always starts back at the picker screen on load, like `open`/`familiarOpen` today).
- TopBar links, discoveries panel, and familiar button remain click-only; not wired as walk-into triggers.
