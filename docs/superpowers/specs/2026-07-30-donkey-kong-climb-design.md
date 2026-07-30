# Hero Platformer → Donkey Kong Climb — Design

## Overview

The hero section currently hosts a small free-roam platformer (built per `docs/superpowers/specs/2026-07-29-hero-platformer-design.md`): press ▶ START, the selected character shrinks to a ~32×40px sprite, and you walk/jump around the screen using the real HUD chrome as platforms. There is no objective, no hazard, and no fail state.

This spec replaces that free-roam mode with a Donkey Kong–style climb: a designed level of staggered girders connected by ladders, barrels rolling down toward you, three lives, and a goal at the top that unlocks a Discovery.

The START button, character picker, ESC-to-exit, pause-on-dialog, and mobile-touch-controls behaviors all carry over unchanged — this changes what happens *inside* play mode, not how play mode is entered or left.

## Scope decisions (from user)

- **Level structure:** a designed girder/ladder level occupying the open space, with `PlayerBar`'s bottom bar as the ground floor. `TopBar`, `KeybindsLegend`, and the discoveries trigger stop being platforms.
- **Barrels:** classic Donkey Kong rules — barrels roll toward you and contact costs a life. You jump *over* them. No Mario-style stomping.
- **Goal:** a marker at the top of the level. Reaching it shows a win banner and unlocks a new (11th) entry in the existing Discoveries system.
- **Lives:** 3. Each hit respawns you at the ground floor. Losing all 3 shows a GAME OVER banner, then resets lives and restarts the climb — still inside play mode (ESC remains the way out).
- **Lives display:** `PlayerBar`'s existing HP meter is repurposed while playing, draining a third per hit, and returns to its decorative resting state when not playing.

## Deliberate deviation from the original game

**Girders are flat and staggered, not sloped.** Real Donkey Kong girders slant, which makes barrels accelerate downhill and requires slope-aware collision. The existing engine is explicitly flat-only (`land-on-top-only`, no slopes — a constraint carried from the prior spec), and slope physics would be a disproportionate lift relative to the visual payoff. Staggered flat rows read as Donkey Kong without it. This is the one intentional departure from the arcade original.

## Level data

The level is authored as data in `client/src/content.json` under `ui.platformer.level`, with a `levelMobile` sibling for narrow viewports — matching how `decorativePlatforms`/`decorativePlatformsMobile` already work today.

Shape (all positions in viewport percentages — `vh` for `top`/`height`, `vw` for `left`/`width` — converted to pixels through the existing shared helper in `client/src/hooks/platformGeometry.ts`, so drawn geometry and collision geometry can never diverge):

```
level: {
  girders: Array<{ top, left, width, height }>,
  ladders: Array<{ top, left, width, height }>,
  goal:    { top, left, width, height },
  barrelSpawn: { top, left },
}
```

Rows are laid out bottom-to-top with vertical gaps small enough to clear with the existing jump height and horizontal gaps that force ladder use. `PlayerBar`'s measured bar rect remains the ground floor (row 0) and is not duplicated in this data.

Layout authoring is iterative by nature; exact coordinates are tuning values, not spec commitments, and are expected to be adjusted during implementation and playtest.

## Mechanics

### Player

Carried over unchanged from the existing loop: gravity, horizontal move speed, jump velocity, land-on-top-only collision against girder rects, screen-edge clamping, and the deferred spawn gate that waits for real measured floor geometry before placing or rendering the sprite.

### Ladders

- While the player's rect overlaps a ladder rect and ↑ or ↓ is held, the player enters climbing state: gravity is suspended and vertical position tracks the held direction at a fixed climb speed.
- Climbing ends when the player leaves the ladder's vertical extent (stepping onto the girder at either end) or presses left/right to move off it.
- Ladders do not block horizontal movement — you can walk past one without climbing.

### Barrels

- Spawned on a fixed interval at `barrelSpawn` while status is `climbing`.
- Each barrel rolls horizontally at a constant speed along the girder it rests on. On reaching that girder's end it falls until it lands on the next girder down, then resumes rolling in the opposite direction — the alternating-direction cascade characteristic of the original.
- A barrel that falls past the bottom of the viewport despawns.
- Barrel rect overlapping the player rect costs a life (see below). Jumping over a barrel is the intended counterplay; there is no stomp interaction.
- Barrels live in a ref-held array updated inside the same `requestAnimationFrame` loop as the player, for the same reason player pose does: per-frame reducer dispatches would re-render the app tree 60× per second.

### Lives, death, win

- `dkLives` starts at 3.
- Barrel contact: decrement `dkLives`, respawn the player at the ground floor, clear all live barrels (so you don't respawn into an unavoidable second hit).
- `dkLives` reaching 0: status becomes `gameover`, a GAME OVER banner shows, then after a short delay lives reset to 3 and the climb restarts. Play mode is not exited.
- Reaching the goal rect: status becomes `won`, a win banner shows, and `UNLOCK_DISCOVERY` fires for the new discovery key. The existing `unlockDiscovery()` reducer helper already surfaces the unlock as a toast, so no separate toast plumbing is needed.
- Barrels stop spawning and simulation freezes while status is `won` or `gameover`.

### Discovery integration

A new entry is appended to `content.json`'s `discoveries.items` (existing shape: `{ key, name, how }`, currently 10 entries). It is unlocked by dispatching the existing `UNLOCK_DISCOVERY` action.

**Known side effect:** `PlayerBar` derives its XP percentage as `discoveredCount / DISCOVERIES.length`. Going from 10 to 11 discoveries means a visitor who had previously found all 10 (100%) will read ~91% until they also finish the climb. This is intended — it's new content — but it is a visible change to existing saved progress and is called out here so it isn't mistaken for a regression.

### Lives in the HP meter

`PlayerBar.module.css`'s `.meterFillHp` is currently a static `width: 96%`. While playing, its width is driven from `dkLives` (3 → 100%, 2 → 66%, 1 → 33%, 0 → 0%) via an inline style override; when not playing it renders at its existing decorative width. No other HUD chrome changes.

## State

Added to the reducer's `State`:

- `dkLives: number`
- `dkStatus: 'climbing' | 'won' | 'gameover'`

Both are ephemeral session state, not persisted — matching `playing`, `open`, and `familiarOpen`. `HYDRATE_PERSISTED` does not touch them.

New actions: `DK_HIT` (decrement lives, or transition to `gameover` at zero), `DK_WIN`, `DK_RESTART` (reset lives to 3 and status to `climbing`).

`START_PLATFORMER` resets both fields so each run starts clean.

Player pose and barrel positions deliberately stay *out* of the reducer, in refs inside the loop hook.

## Controls

| Input | Keyboard | Touch |
|---|---|---|
| Move | ← → | ◀ ▶ buttons |
| Climb | ↑ ↓ | ▲ ▼ buttons |
| Jump | Space | jump button |
| Exit | ESC | — |

`useHeldKeys` gains `up`/`down`. `TouchControls` becomes a four-way pad plus jump. Its existing `paused` gating, typing-target guard, and narrow interactive-element guard all carry over unchanged.

`KeybindsLegend`'s playing-mode rows gain a climb entry. All new user-facing strings (banners, keybind labels, touch-control glyphs and aria-labels, the discovery's name/how text) go in `content.json` per the existing project-wide convention.

## Components

| File | Change |
|---|---|
| `hooks/useDonkeyKongLoop.ts` | **New.** Replaces `usePlatformerLoop.ts`. Player physics + ladder state + barrel simulation + hit/win detection in one rAF loop. |
| `components/scene/DkLevel.tsx` + `.module.css` | **New.** Pure presentational: renders girders, ladders, and the goal marker from level geometry, plus live barrels from a barrel array passed in as a prop. Holds no state and runs no simulation. |
| `components/scene/Platformer.tsx` | Orchestrates: reads level geometry, runs the loop, and renders the sprite, `DkLevel` (passing it the loop's current barrel array), `TouchControls`, and the win/game-over banners. |
| `hooks/usePlatformRects.ts` | Shrinks to measuring only the floor: `PlayerBar`'s `bar` rect on desktop, and its `nav`/`familiar` rects on mobile where `bar` collapses to zero height. The `plate` rect and all `TopBar`/`KeybindsLegend`/discoveries-trigger measurement are removed. |
| `hooks/useHeldKeys.ts` | Adds `up`/`down`. |
| `components/scene/TouchControls.tsx` + `.module.css` | Four-way pad. |
| `components/scene/PlayerBar.tsx` | HP meter width driven by `dkLives` while playing. |
| `components/scene/KeybindsLegend.tsx` | Climb row added to playing-mode rows; drops its `setPlatformRef` wiring (no longer a platform). |
| `components/scene/TopBar.tsx` | Drops its `setPlatformRef` wiring, and stops forwarding it to `DiscoveryListPanel`. |
| `components/shared/DiscoveryListPanel.tsx` | Drops its `setPlatformRef` wiring. |
| `components/scene/PlayerBar.tsx` (refs) | Keeps `setPlatformRef` — it still supplies the floor — but drops the now-unused `plate` registration. |
| `components/scene/GameScene.tsx` | Updated wiring. |
| `components/scene/DecorativePlatforms.tsx` + `.module.css` | **Deleted** — superseded by the authored level. |
| `state/types.ts`, `state/reducer.ts` | `dkLives`, `dkStatus`, three new actions. |
| `content.json`, `content.ts` | Level data, new discovery, new strings, new types. |

## Verification

This repo has **no test framework** (`client/package.json` has no test script; no Jest/Vitest/RTL). `npm run build` (`tsc -b && vite build`) plus `npm run lint` are the only automated gates, and they can only prove the code compiles and type-checks.

Every prior round of this feature was verified that way and by code-reading alone, because no browser automation was available. That was already a stretch for free-roam movement; it is **not adequate** for barrel timing, ladder feel, level reachability, or difficulty balance, all of which are judgement calls that only exist at runtime.

Therefore this spec treats **human playtest as a required acceptance step, not an optional nicety.** Specifically these cannot be signed off from static analysis:

- Are all girder rows actually reachable — by jump where intended, by ladder where intended?
- Is the barrel spawn interval and roll speed fair rather than impossible or trivial?
- Does the ladder mount/dismount feel right, or does the player snag or overshoot?
- Does the level fit and remain playable at mobile widths?
- Does the whole climb take an appropriate amount of time for a portfolio easter egg?

Implementation should land the mechanics and explicitly hand these off for tuning rather than claiming them verified.

## Out of scope

- Sloped girders (see deviation above), and consequently downhill barrel acceleration.
- Score, high scores, or persistence of any run state.
- Multiple levels, difficulty ramp, or a second level layout.
- Additional hazards (fireballs, springs, elevators, hammers) — barrels only.
- Any animated Donkey Kong / Pauline character; the barrel spawner and goal are simple markers.
- Sound effects for jump/hit/win beyond what the existing `useSfx` already provides.
