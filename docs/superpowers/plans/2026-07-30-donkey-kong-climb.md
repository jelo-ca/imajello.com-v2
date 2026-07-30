# Donkey Kong Climb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-roam hero platformer with a Donkey Kong–style climb: staggered girders joined by ladders, barrels cascading down, 3 lives, and a goal at the top that unlocks a Discovery.

**Architecture:** The level is authored as vh/vw data in `content.json` and converted to pixels through the existing shared `platformGeometry.ts` helper, so drawn and collided geometry can never diverge. A single `requestAnimationFrame` loop (`useDonkeyKongLoop`) owns player physics, ladder climbing, barrel simulation, and hit/win detection, keeping all per-frame values in refs. Only coarse game state (`dkLives`, `dkStatus`) lives in the reducer, because `PlayerBar` and the banners need to react to it. `PlayerBar`'s bottom bar remains the measured ground floor; every other HUD element stops being a platform.

**Tech Stack:** React 19 + TypeScript (Vite), no new dependencies. This repo has **no test framework** (`client/package.json` has no `test` script; no Jest/Vitest/RTL). `npm run build` (`tsc -b && vite build`, from `client/`) and `npm run lint` are the only automated gates. Do not add a test framework — out of scope.

## Global Constraints

- No new npm dependencies.
- All user-facing strings live in `client/src/content.json`, read through `client/src/content.ts`'s `ui` export. No hardcoded UI strings in components.
- `client/tsconfig.app.json` sets `noUnusedLocals` and `noUnusedParameters` — every declared import and local must be used or the build fails. Deleting a feature means deleting its now-unused imports too.
- Physics stays flat: land-on-top-only collision, no slopes, no side/ceiling collision, no wall-jump, no friction. Girders are flat and staggered by design (see the spec's "Deliberate deviation" section) — do not add slope support.
- Callbacks passed into `useDonkeyKongLoop` (`onHit`, `onWin`) **must** be `useCallback`-stable. The loop's `useEffect` lists them as dependencies and calls `setPose` every frame; an unstable callback would tear down and rebuild the whole rAF loop 60×/second.
- `dkLives`/`dkStatus` are ephemeral session state like `playing` — never persisted, never touched by `HYDRATE_PERSISTED`.
- Tuning values (level coordinates, speeds, intervals) are starting points, not requirements. Task 6 exists to change them after a real playtest.

---

## Task 1: Game state and level data

**Files:**
- Modify: `client/src/state/types.ts`
- Modify: `client/src/state/reducer.ts`
- Modify: `client/src/content.json`
- Modify: `client/src/content.ts`

**Interfaces:**
- Produces: `State.dkLives: number`, `State.dkStatus: 'climbing' | 'won' | 'gameover'`; actions `DK_HIT`, `DK_WIN`, `DK_RESTART`.
- Produces: `LevelSpec` type and `ui.platformer.level` / `ui.platformer.levelMobile` / `ui.platformer.maxLives` / `ui.platformer.goalGlyph` / `ui.platformer.banners` / extended `ui.platformer.controls`, all consumed by later tasks.
- Produces: a new `summit` entry in `discoveries.items`.

- [ ] **Step 1: Add the two state fields**

In `client/src/state/types.ts`, replace:

```ts
  playing: boolean;
```

with:

```ts
  playing: boolean;
  // Donkey Kong climb run state. Ephemeral like `playing` — never persisted.
  dkLives: number;
  dkStatus: 'climbing' | 'won' | 'gameover';
```

- [ ] **Step 2: Add the three actions**

In `client/src/state/types.ts`, replace:

```ts
  | { type: 'START_PLATFORMER' }
  | { type: 'STOP_PLATFORMER' }
```

with:

```ts
  | { type: 'START_PLATFORMER' }
  | { type: 'STOP_PLATFORMER' }
  | { type: 'DK_HIT' }
  | { type: 'DK_WIN' }
  | { type: 'DK_RESTART' }
```

- [ ] **Step 3: Wire the reducer**

In `client/src/state/reducer.ts`, replace:

```ts
  navHover: null,
  familiarHover: false,
  playing: false,
```

with:

```ts
  navHover: null,
  familiarHover: false,
  playing: false,
  dkLives: ui.platformer.maxLives,
  dkStatus: 'climbing',
```

Then replace:

```ts
    case 'START_PLATFORMER':
      return { ...state, playing: true };
    case 'STOP_PLATFORMER':
      return { ...state, playing: false };
```

with:

```ts
    case 'START_PLATFORMER':
      // Every run starts clean, so a previous game-over or win never leaks into the next.
      return { ...state, playing: true, dkLives: ui.platformer.maxLives, dkStatus: 'climbing' };
    case 'STOP_PLATFORMER':
      return { ...state, playing: false };
    case 'DK_HIT': {
      const dkLives = state.dkLives - 1;
      return dkLives <= 0
        ? { ...state, dkLives: 0, dkStatus: 'gameover' }
        : { ...state, dkLives };
    }
    case 'DK_WIN':
      // Idempotent: the loop can call onWin() on several frames before this state change
      // propagates back to it, and unlockDiscovery would otherwise re-fire the toast.
      return state.dkStatus === 'won' ? state : unlockDiscovery({ ...state, dkStatus: 'won' }, 'summit');
    case 'DK_RESTART':
      return { ...state, dkLives: ui.platformer.maxLives, dkStatus: 'climbing' };
```

`reducer.ts` already imports `ui` from `../content` (used for chat prefixes), so no new import is needed.

- [ ] **Step 4: Add the new Discovery**

In `client/src/content.json`, replace:

```json
      { "key": "konami", "name": "Code Breaker", "how": "Enter a legendary input sequence" }
    ],
```

with:

```json
      { "key": "konami", "name": "Code Breaker", "how": "Enter a legendary input sequence" },
      { "key": "summit", "name": "Summit Climber", "how": "Reach the top of the climb" }
    ],
```

- [ ] **Step 5: Add level data to the platformer content block**

The old `decorativePlatforms` / `decorativePlatformsMobile` fields stay for now — the code still reading them is not removed until Task 3, and keeping them here is what lets Tasks 1 and 2 each end on a green build.

In `client/src/content.json`, replace the whole existing `"platformer"` block:

```json
    "platformer": {
      "decorativePlatforms": [
        { "top": 78, "left": 8, "width": 11, "height": 3 },
        { "top": 66, "left": 40, "width": 13, "height": 3 },
        { "top": 54, "left": 78, "width": 11, "height": 3 },
        { "top": 42, "left": 22, "width": 10, "height": 3 }
      ],
      "decorativePlatformsMobile": [
        { "top": 78, "left": 8, "width": 30, "height": 2.5 },
        { "top": 64, "left": 52, "width": 32, "height": 2.5 }
      ],
      "controls": {
        "leftGlyph": "◀",
        "rightGlyph": "▶",
        "jumpGlyph": "⤒",
        "leftAriaLabel": "Move left",
        "rightAriaLabel": "Move right",
        "jumpAriaLabel": "Jump"
      }
    }
```

with:

```json
    "platformer": {
      "decorativePlatforms": [
        { "top": 78, "left": 8, "width": 11, "height": 3 },
        { "top": 66, "left": 40, "width": 13, "height": 3 },
        { "top": 54, "left": 78, "width": 11, "height": 3 },
        { "top": 42, "left": 22, "width": 10, "height": 3 }
      ],
      "decorativePlatformsMobile": [
        { "top": 78, "left": 8, "width": 30, "height": 2.5 },
        { "top": 64, "left": 52, "width": 32, "height": 2.5 }
      ],
      "maxLives": 3,
      "goalGlyph": "🏆",
      "banners": {
        "win": "YOU WIN",
        "gameOver": "GAME OVER"
      },
      "level": {
        "girders": [
          { "top": 75, "left": 0, "width": 80, "height": 1.5 },
          { "top": 62, "left": 20, "width": 80, "height": 1.5 },
          { "top": 49, "left": 0, "width": 80, "height": 1.5 },
          { "top": 36, "left": 20, "width": 80, "height": 1.5 },
          { "top": 23, "left": 0, "width": 80, "height": 1.5 }
        ],
        "ladders": [
          { "top": 75, "left": 60, "width": 2.2, "height": 13 },
          { "top": 62, "left": 30, "width": 2.2, "height": 13 },
          { "top": 49, "left": 65, "width": 2.2, "height": 13 },
          { "top": 36, "left": 30, "width": 2.2, "height": 13 },
          { "top": 23, "left": 30, "width": 2.2, "height": 13 }
        ],
        "goal": { "top": 17, "left": 68, "width": 7, "height": 6 },
        "barrelSpawn": { "top": 19, "left": 4 }
      },
      "levelMobile": {
        "girders": [
          { "top": 70, "left": 0, "width": 78, "height": 1.4 },
          { "top": 52, "left": 22, "width": 78, "height": 1.4 },
          { "top": 34, "left": 0, "width": 78, "height": 1.4 }
        ],
        "ladders": [
          { "top": 70, "left": 55, "width": 5, "height": 22 },
          { "top": 52, "left": 30, "width": 5, "height": 18 },
          { "top": 34, "left": 55, "width": 5, "height": 18 }
        ],
        "goal": { "top": 27, "left": 58, "width": 14, "height": 7 },
        "barrelSpawn": { "top": 30, "left": 4 }
      },
      "controls": {
        "leftGlyph": "◀",
        "rightGlyph": "▶",
        "upGlyph": "▲",
        "downGlyph": "▼",
        "jumpGlyph": "⤒",
        "leftAriaLabel": "Move left",
        "rightAriaLabel": "Move right",
        "upAriaLabel": "Climb up",
        "downAriaLabel": "Climb down",
        "jumpAriaLabel": "Jump"
      }
    }
```

Ladder `top`/`height` are chosen so each ladder's span reaches from the girder it stands on down to the next surface below it (13vh gaps on desktop; the bottom mobile ladder is 22vh because the mobile ground bar sits lower). Girder rows alternate left/right offsets so a barrel rolling off one end always lands on the row below — that alternation is what produces the cascade.

- [ ] **Step 6: Update content.ts types**

In `client/src/content.ts`, replace:

```ts
export interface PlatformRectSpec { top: number; left: number; width: number; height: number; }
```

with:

```ts
export interface PlatformRectSpec { top: number; left: number; width: number; height: number; }

export interface LevelSpec {
  girders: PlatformRectSpec[];
  ladders: PlatformRectSpec[];
  goal: PlatformRectSpec;
  barrelSpawn: { top: number; left: number };
}
```

Then replace:

```ts
    platformer: {
      decorativePlatforms: PlatformRectSpec[];
      decorativePlatformsMobile: PlatformRectSpec[];
      controls: { leftGlyph: string; rightGlyph: string; jumpGlyph: string; leftAriaLabel: string; rightAriaLabel: string; jumpAriaLabel: string };
    };
```

with:

```ts
    platformer: {
      // Retained until Task 3 removes the last code reading them.
      decorativePlatforms: PlatformRectSpec[];
      decorativePlatformsMobile: PlatformRectSpec[];
      maxLives: number;
      goalGlyph: string;
      banners: { win: string; gameOver: string };
      level: LevelSpec;
      levelMobile: LevelSpec;
      controls: {
        leftGlyph: string; rightGlyph: string; upGlyph: string; downGlyph: string; jumpGlyph: string;
        leftAriaLabel: string; rightAriaLabel: string; upAriaLabel: string; downAriaLabel: string; jumpAriaLabel: string;
      };
    };
```

- [ ] **Step 7: Build**

Run (from `client/`): `npm run build`
Expected: **succeeds.** Nothing consumes the new fields yet, and the old ones are still present for the code that does. If it fails, the JSON is probably malformed (a missing or trailing comma around the inserted block) — fix that rather than proceeding.

- [ ] **Step 8: Commit**

```bash
git add client/src/state/types.ts client/src/state/reducer.ts client/src/content.json client/src/content.ts
git commit -m "feat: add DK climb game state and level data"
```

---

## Task 2: Level geometry and rendering

**Files:**
- Modify: `client/src/hooks/platformGeometry.ts`
- Create: `client/src/hooks/useLevelGeometry.ts`
- Create: `client/src/hooks/useFloorRect.ts`
- Create: `client/src/components/scene/DkLevel.tsx`
- Create: `client/src/components/scene/DkLevel.module.css`

This task only *adds*. The old `usePlatformRects.ts` / `DecorativePlatforms.*` keep working untouched so the build stays green; Task 3 removes them once nothing imports them.

**Interfaces:**
- Consumes: `LevelSpec` and the `ui.platformer.level` data from Task 1.
- Produces: `PixelRect`, `LevelGeometry`, `levelPixelGeometry()`; hooks `useLevelGeometry(): LevelGeometry` and `useFloorRect(platformRefs, recomputeDeps): PixelRect | null`; component `DkLevel({ level, barrels })`; and `Barrel`/`BARREL_SIZE` re-exported for rendering (defined in Task 3's loop hook — until then `DkLevel` types its `barrels` prop against a local structural type, replaced in Task 3).

- [ ] **Step 1: Extend platformGeometry.ts with level data**

The existing `decorativePlatformSpecs` / `decorativePlatformPixelRects` exports are kept here so `usePlatformRects.ts` and `DecorativePlatforms.tsx` still compile; Task 3 deletes them along with their last callers.

Replace the full contents of `client/src/hooks/platformGeometry.ts` with:

```ts
import { content } from '../content';
import type { PlatformRectSpec, LevelSpec } from '../content';

// All level geometry is authored in content.json as viewport percentages and converted
// to pixels here, so the rectangles DkLevel draws and the ones the physics loop collides
// against come from one source and can never diverge. CSS vh/vw resolve against the
// *large* viewport per spec (URL-bar-collapsed height on mobile) while
// window.innerHeight/Width reflect the *current* viewport — on mobile those differ by
// 60-100px, which is why the conversion is done in JS rather than in CSS units.
export const MOBILE_BREAKPOINT = 768;

export interface PixelRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface LevelGeometry {
  girders: PixelRect[];
  ladders: PixelRect[];
  goal: PixelRect;
  barrelSpawn: { top: number; left: number };
}

export function specToPixelRect(spec: PlatformRectSpec): PixelRect {
  const vw = window.innerWidth / 100;
  const vh = window.innerHeight / 100;
  return {
    top: spec.top * vh,
    left: spec.left * vw,
    width: spec.width * vw,
    height: spec.height * vh,
  };
}

export function levelSpec(): LevelSpec {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  return isMobile ? content.ui.platformer.levelMobile : content.ui.platformer.level;
}

export function levelPixelGeometry(): LevelGeometry {
  const spec = levelSpec();
  const vw = window.innerWidth / 100;
  const vh = window.innerHeight / 100;
  return {
    girders: spec.girders.map(specToPixelRect),
    ladders: spec.ladders.map(specToPixelRect),
    goal: specToPixelRect(spec.goal),
    barrelSpawn: { top: spec.barrelSpawn.top * vh, left: spec.barrelSpawn.left * vw },
  };
}

// --- Superseded by the authored level; removed in Task 3 along with their last callers
// (usePlatformRects.ts and DecorativePlatforms.tsx). Kept here only so this task's
// commit still builds. ---
export function decorativePlatformSpecs(): PlatformRectSpec[] {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  return isMobile ? content.ui.platformer.decorativePlatformsMobile : content.ui.platformer.decorativePlatforms;
}

export function decorativePlatformPixelRects(): PixelRect[] {
  return decorativePlatformSpecs().map(specToPixelRect);
}
```

- [ ] **Step 2: Create useLevelGeometry.ts**

Create `client/src/hooks/useLevelGeometry.ts`:

```ts
import { useEffect, useState } from 'react';
import { levelPixelGeometry, type LevelGeometry } from './platformGeometry';

// Recomputed on resize so the level (and the desktop/mobile variant choice inside
// levelPixelGeometry) tracks the viewport. The returned object identity is stable
// between resizes, which matters because usePlatformerLoop lists it as an effect
// dependency — a new identity every render would rebuild the rAF loop constantly.
export function useLevelGeometry(): LevelGeometry {
  const [level, setLevel] = useState<LevelGeometry>(() => levelPixelGeometry());

  useEffect(() => {
    const onResize = () => setLevel(levelPixelGeometry());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return level;
}
```

- [ ] **Step 3: Create useFloorRect.ts**

Create `client/src/hooks/useFloorRect.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import type { PixelRect } from './platformGeometry';

// PlayerBar is the climb's ground floor. On desktop its whole bar is one strip
// (registered as 'bar'); below 768px that bar collapses to zero height and its pieces
// become separately fixed-positioned, so the floor there is the union of 'nav' and
// 'familiar' (which sit flush against each other and together span the full width).
// Nothing else in the HUD is a platform any more.
const FLOOR_KEYS = ['bar', 'nav', 'familiar'];

export function useFloorRect(
  platformRefs: React.RefObject<Record<string, HTMLElement | null>>,
  recomputeDeps: unknown[],
): PixelRect | null {
  const [floor, setFloor] = useState<PixelRect | null>(null);

  const recompute = useCallback(() => {
    const rects: DOMRect[] = [];
    for (const key of FLOOR_KEYS) {
      const el = platformRefs.current[key];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // collapsed by CSS at this breakpoint
      rects.push(rect);
    }
    if (rects.length === 0) {
      setFloor(null);
      return;
    }
    const top = Math.min(...rects.map(r => r.top));
    const left = Math.min(...rects.map(r => r.left));
    const right = Math.max(...rects.map(r => r.right));
    // Height runs to the bottom of the viewport so the floor is solid, not a thin ledge
    // the player could clip past.
    setFloor({ top, left, width: right - left, height: Math.max(0, window.innerHeight - top) });
    // platformRefs is a stable ref object; mutating .current doesn't belong in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformRefs]);

  useEffect(() => {
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
    // recomputeDeps is an intentionally dynamic list of values the caller wants to
    // re-measure on (dialogs opening change PlayerBar's mobile layout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recompute, ...recomputeDeps]);

  return floor;
}
```

- [ ] **Step 4: Create DkLevel.module.css**

Create `client/src/components/scene/DkLevel.module.css`:

```css
.girder {
  position: fixed;
  z-index: 4;
  background: #c25f74;
  box-shadow: 0 2px 0 rgba(20, 20, 23, .45);
}

.ladder {
  position: fixed;
  z-index: 3;
  background: repeating-linear-gradient(
    180deg,
    #7d7a84 0 3px,
    transparent 3px 11px
  );
  border-left: 3px solid #7d7a84;
  border-right: 3px solid #7d7a84;
  box-sizing: border-box;
}

.goal {
  position: fixed;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(43, 43, 48, .92);
  border: 3px solid #ffd43b;
  font-size: 22px;
  line-height: 1;
}

.barrel {
  position: fixed;
  z-index: 5;
  border-radius: 50%;
  background: #b5651d;
  border: 2px solid #1c1c20;
  box-sizing: border-box;
}
```

- [ ] **Step 5: Create DkLevel.tsx**

Create `client/src/components/scene/DkLevel.tsx`:

```tsx
import { ui } from '../../content';
import type { LevelGeometry } from '../../hooks/platformGeometry';
import styles from './DkLevel.module.css';

// Structural type rather than an import, so this component stays presentational and
// doesn't depend on the physics hook. Task 3's Barrel satisfies it.
interface RenderableBarrel {
  id: number;
  x: number;
  y: number;
}

interface Props {
  level: LevelGeometry;
  barrels: RenderableBarrel[];
  barrelSize: number;
}

// Pure presentation: every rectangle is handed in already converted to pixels
// (see platformGeometry.ts). No state, no simulation.
export function DkLevel({ level, barrels, barrelSize }: Props) {
  return (
    <>
      {level.girders.map((g, i) => (
        <div key={`girder-${i}`} className={styles.girder} style={{ top: g.top, left: g.left, width: g.width, height: g.height }} />
      ))}
      {level.ladders.map((l, i) => (
        <div key={`ladder-${i}`} className={styles.ladder} style={{ top: l.top, left: l.left, width: l.width, height: l.height }} />
      ))}
      <div
        className={styles.goal}
        style={{ top: level.goal.top, left: level.goal.left, width: level.goal.width, height: level.goal.height }}
      >
        {ui.platformer.goalGlyph}
      </div>
      {barrels.map(b => (
        <div key={b.id} className={styles.barrel} style={{ top: b.y, left: b.x, width: barrelSize, height: barrelSize }} />
      ))}
    </>
  );
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: **succeeds.** Everything added here is additive and not yet imported by any rendered component; the old decorative-platform path is untouched and still compiles.

Note `DkLevel.tsx` is not mounted anywhere yet, so there is nothing to verify visually in this task — Task 3 wires it in and verifies it on screen.

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/platformGeometry.ts client/src/hooks/useLevelGeometry.ts client/src/hooks/useFloorRect.ts client/src/components/scene/DkLevel.tsx client/src/components/scene/DkLevel.module.css
git commit -m "feat: add DK level geometry and rendering"
```

---

## Task 3: Player physics, ladders, and wiring

**Files:**
- Create: `client/src/hooks/useDonkeyKongLoop.ts`
- Delete: `client/src/hooks/usePlatformerLoop.ts`
- Delete: `client/src/hooks/usePlatformRects.ts`
- Delete: `client/src/components/scene/DecorativePlatforms.tsx`
- Delete: `client/src/components/scene/DecorativePlatforms.module.css`
- Modify: `client/src/hooks/platformGeometry.ts` (drop the decorative helpers)
- Modify: `client/src/content.json` (drop the decorative platform data)
- Modify: `client/src/content.ts` (drop the decorative platform types)
- Modify: `client/src/hooks/useHeldKeys.ts`
- Modify: `client/src/components/scene/Platformer.tsx`
- Modify: `client/src/components/scene/Platformer.module.css`
- Modify: `client/src/components/scene/GameScene.tsx`
- Modify: `client/src/components/scene/TopBar.tsx`
- Modify: `client/src/components/scene/KeybindsLegend.tsx`
- Modify: `client/src/components/shared/DiscoveryListPanel.tsx`
- Modify: `client/src/components/scene/PlayerBar.tsx`

**Interfaces:**
- Consumes: `useLevelGeometry`, `useFloorRect`, `DkLevel`, `LevelGeometry`, `PixelRect` from Task 2; `dkStatus`/`DK_HIT`/`DK_WIN` from Task 1.
- Produces: `Barrel`, `BARREL_SIZE`, `DkPose`, `useDonkeyKongLoop(params): DkPose`. Barrel simulation is stubbed here (empty array) and filled in by Task 4 — this task delivers a climbable level.

- [ ] **Step 1: Add up/down to useHeldKeys**

In `client/src/hooks/useHeldKeys.ts`, replace:

```ts
export type MoveKey = 'left' | 'right' | 'jump';
```

with:

```ts
export type MoveKey = 'left' | 'right' | 'up' | 'down' | 'jump';
```

Then replace:

```ts
const KEY_MAP: Record<string, MoveKey> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ' ': 'jump',
  Spacebar: 'jump',
};
```

with:

```ts
const KEY_MAP: Record<string, MoveKey> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ' ': 'jump',
  Spacebar: 'jump',
};
```

Note: preventDefault on ArrowUp/ArrowDown also stops the page scrolling while playing, which is wanted. It does not interfere with the Konami tracker — `App.tsx` registers its own separate window listener, and `preventDefault()` does not stop propagation to it.

- [ ] **Step 2: Create the loop hook**

Create `client/src/hooks/useDonkeyKongLoop.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import type { LevelGeometry, PixelRect } from './platformGeometry';
import type { MoveKey } from './useHeldKeys';

export interface Barrel {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
}

export interface DkPose {
  x: number;
  y: number;
  facing: 'left' | 'right';
  climbing: boolean;
  // False until real floor geometry has been measured and the player placed on it.
  // Callers must not render the sprite while this is false.
  ready: boolean;
  barrels: Barrel[];
}

const GRAVITY = 1800; // px/s^2
const MOVE_SPEED = 220; // px/s
// Peak height ~69px: enough to clear a barrel, deliberately NOT enough to clear the
// ~13vh gap between girder rows. Ladders are the only way up, as in the original.
const JUMP_VELOCITY = -500; // px/s, negative = up
const CLIMB_SPEED = 150; // px/s

export const BARREL_SIZE = 18; // px

interface Params {
  level: LevelGeometry;
  floor: PixelRect | null;
  paused: boolean;
  status: 'climbing' | 'won' | 'gameover';
  heldKeys: React.RefObject<Set<MoveKey>>;
  spriteWidth: number;
  spriteHeight: number;
  onHit: () => void;
  onWin: () => void;
}

function overlaps(ax: number, ay: number, aw: number, ah: number, b: PixelRect): boolean {
  return ax < b.left + b.width && ax + aw > b.left && ay < b.top + b.height && ay + ah > b.top;
}

export function useDonkeyKongLoop({
  level, floor, paused, status, heldKeys, spriteWidth, spriteHeight, onHit, onWin,
}: Params): DkPose {
  const pRef = useRef({
    x: 0, y: 0, vx: 0, vy: 0,
    facing: 'right' as 'left' | 'right',
    grounded: false,
    climbing: false,
  });
  const barrelsRef = useRef<Barrel[]>([]);
  const hasSpawnedRef = useRef(false);
  const prevStatusRef = useRef(status);
  const [pose, setPose] = useState<DkPose>({
    x: 0, y: 0, facing: 'right', climbing: false, ready: false, barrels: [],
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    // Bottom-left of the ground floor, the way Donkey Kong starts you.
    const placePlayer = (f: PixelRect) => {
      const p = pRef.current;
      p.x = f.left + spriteWidth;
      p.y = f.top - spriteHeight;
      p.vx = 0;
      p.vy = 0;
      p.grounded = true;
      p.climbing = false;
    };

    const publish = (ready: boolean) => {
      const p = pRef.current;
      setPose({
        x: p.x, y: p.y, facing: p.facing, climbing: p.climbing, ready,
        // Copied so React sees a new array each frame; barrelsRef holds the live objects.
        barrels: barrelsRef.current.map(b => ({ ...b })),
      });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (paused) return;
      // useFloorRect returns null until PlayerBar has actually been measured.
      if (!floor) return;

      const p = pRef.current;

      if (!hasSpawnedRef.current) {
        placePlayer(floor);
        hasSpawnedRef.current = true;
        publish(true);
        return;
      }

      // Coming back from a win or game over: reset the run before simulating again.
      if (prevStatusRef.current !== status) {
        const wasFrozen = prevStatusRef.current !== 'climbing';
        prevStatusRef.current = status;
        if (status === 'climbing' && wasFrozen) {
          placePlayer(floor);
          barrelsRef.current = [];
          publish(true);
          return;
        }
      }

      // Frozen while the win / game-over banner is up.
      if (status !== 'climbing') return;

      const surfaces: PixelRect[] = [floor, ...level.girders];
      const keys = heldKeys.current;

      const centerX = p.x + spriteWidth / 2;
      const ladder = level.ladders.find(l =>
        centerX > l.left && centerX < l.left + l.width &&
        p.y + spriteHeight > l.top && p.y < l.top + l.height,
      ) ?? null;

      if (!p.climbing && ladder && (keys.has('up') || keys.has('down'))) {
        p.climbing = true;
        p.vy = 0;
      }
      if (p.climbing && (!ladder || keys.has('left') || keys.has('right'))) {
        p.climbing = false;
      }

      if (p.climbing && ladder) {
        const dir = keys.has('up') ? -1 : keys.has('down') ? 1 : 0;
        p.y += dir * CLIMB_SPEED * dt;
        // Hold the sprite centred on the rungs so it can't drift off sideways mid-climb.
        p.x = ladder.left + ladder.width / 2 - spriteWidth / 2;
        p.vy = 0;
        if (p.y + spriteHeight <= ladder.top) {
          // Topped out — stand on the girder this ladder reaches.
          p.y = ladder.top - spriteHeight;
          p.climbing = false;
          p.grounded = true;
        } else if (p.y + spriteHeight >= ladder.top + ladder.height) {
          p.y = ladder.top + ladder.height - spriteHeight;
          p.climbing = false;
        }
      } else {
        const movingLeft = keys.has('left');
        const movingRight = keys.has('right');
        p.vx = movingLeft ? -MOVE_SPEED : movingRight ? MOVE_SPEED : 0;
        if (movingLeft) p.facing = 'left';
        if (movingRight) p.facing = 'right';
        if (keys.has('jump') && p.grounded) {
          p.vy = JUMP_VELOCITY;
          p.grounded = false;
        }

        p.vy += GRAVITY * dt;
        const prevBottom = p.y + spriteHeight;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.x = Math.max(0, Math.min(p.x, window.innerWidth - spriteWidth));

        const newBottom = p.y + spriteHeight;
        let landed = false;
        for (const s of surfaces) {
          if (p.x + spriteWidth <= s.left || p.x >= s.left + s.width) continue;
          if (prevBottom <= s.top && newBottom >= s.top && p.vy >= 0) {
            p.y = s.top - spriteHeight;
            p.vy = 0;
            landed = true;
            break;
          }
        }
        p.grounded = landed;

        if (p.y > window.innerHeight) placePlayer(floor);
      }

      if (overlaps(p.x, p.y, spriteWidth, spriteHeight, level.goal)) {
        onWin();
      }

      publish(true);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level, floor, paused, status, heldKeys, spriteWidth, spriteHeight, onHit, onWin]);

  return pose;
}
```

`onHit` is intentionally unused in this task's body (it is in the dependency list and is called in Task 4). `noUnusedParameters` does not flag destructured object properties that are referenced in the dependency array, so this compiles — but if the build does complain, do NOT delete the parameter; Task 4 needs it.

- [ ] **Step 3: Delete the superseded loop, rects hook, and decorative platforms**

```bash
git rm client/src/hooks/usePlatformerLoop.ts \
       client/src/hooks/usePlatformRects.ts \
       client/src/components/scene/DecorativePlatforms.tsx \
       client/src/components/scene/DecorativePlatforms.module.css
```

Then remove the now-caller-less decorative helpers from `client/src/hooks/platformGeometry.ts` — delete this whole trailing block:

```ts
// --- Superseded by the authored level; removed in Task 3 along with their last callers
// (usePlatformRects.ts and DecorativePlatforms.tsx). Kept here only so this task's
// commit still builds. ---
export function decorativePlatformSpecs(): PlatformRectSpec[] {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  return isMobile ? content.ui.platformer.decorativePlatformsMobile : content.ui.platformer.decorativePlatforms;
}

export function decorativePlatformPixelRects(): PixelRect[] {
  return decorativePlatformSpecs().map(specToPixelRect);
}
```

Then drop the data from `client/src/content.json` — delete these lines from the `"platformer"` block:

```json
      "decorativePlatforms": [
        { "top": 78, "left": 8, "width": 11, "height": 3 },
        { "top": 66, "left": 40, "width": 13, "height": 3 },
        { "top": 54, "left": 78, "width": 11, "height": 3 },
        { "top": 42, "left": 22, "width": 10, "height": 3 }
      ],
      "decorativePlatformsMobile": [
        { "top": 78, "left": 8, "width": 30, "height": 2.5 },
        { "top": 64, "left": 52, "width": 32, "height": 2.5 }
      ],
```

And the matching types from `client/src/content.ts` — delete these lines:

```ts
      // Retained until Task 3 removes the last code reading them.
      decorativePlatforms: PlatformRectSpec[];
      decorativePlatformsMobile: PlatformRectSpec[];
```

`PlatformRectSpec` itself stays — `LevelSpec` still uses it.

- [ ] **Step 4: Add banner styles**

In `client/src/components/scene/Platformer.module.css`, append:

```css
.banner {
  position: fixed;
  top: 34%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 90;
  padding: 18px 34px;
  font: 400 22px 'Silkscreen', monospace;
  letter-spacing: .1em;
  color: #f5d9dc;
  background: rgba(43, 43, 48, .96);
  border: 3px solid #ee9aa3;
  box-shadow: 6px 6px 0 rgba(20, 20, 23, .5);
  pointer-events: none;
  text-align: center;
}
```

- [ ] **Step 5: Rewrite Platformer.tsx**

Replace the full contents of `client/src/components/scene/Platformer.tsx` with:

```tsx
import { useCallback } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { CHARS } from '../../data/chars';
import { ui } from '../../content';
import { useFloorRect } from '../../hooks/useFloorRect';
import { useLevelGeometry } from '../../hooks/useLevelGeometry';
import { useHeldKeys } from '../../hooks/useHeldKeys';
import { useDonkeyKongLoop, BARREL_SIZE } from '../../hooks/useDonkeyKongLoop';
import { DkLevel } from './DkLevel';
import { TouchControls } from './TouchControls';
import styles from './Platformer.module.css';

const SPRITE_WIDTH = 32;
const SPRITE_HEIGHT = 40;

interface Props {
  platformRefs: React.RefObject<Record<string, HTMLElement | null>>;
}

export function Platformer({ platformRefs }: Props) {
  const { state, dispatch } = useGameState();
  const char = CHARS[state.charIdx];
  const paused = state.open != null || state.familiarOpen || state.discoveriesOpen;
  const floor = useFloorRect(platformRefs, [state.open, state.familiarOpen, state.discoveriesOpen]);
  const level = useLevelGeometry();
  const { heldKeys, press, release } = useHeldKeys(paused);

  // dispatch's identity is stable (React guarantees it for useReducer), so these stay
  // stable too. That matters: useDonkeyKongLoop lists them as effect dependencies and
  // calls setPose every frame, so unstable callbacks would rebuild the rAF loop 60x/sec.
  const onHit = useCallback(() => dispatch({ type: 'DK_HIT' }), [dispatch]);
  const onWin = useCallback(() => dispatch({ type: 'DK_WIN' }), [dispatch]);

  const pose = useDonkeyKongLoop({
    level,
    floor,
    paused,
    status: state.dkStatus,
    heldKeys,
    spriteWidth: SPRITE_WIDTH,
    spriteHeight: SPRITE_HEIGHT,
    onHit,
    onWin,
  });

  if (!pose.ready) return null;

  return (
    <>
      <DkLevel level={level} barrels={pose.barrels} barrelSize={BARREL_SIZE} />
      <img
        src={char.src}
        alt=""
        className={styles.sprite}
        style={{
          width: SPRITE_WIDTH,
          height: SPRITE_HEIGHT,
          transform: `translate3d(${pose.x}px, ${pose.y}px, 0) scaleX(${pose.facing === 'left' ? -1 : 1})`,
        }}
      />
      {state.dkStatus === 'won' && <div className={styles.banner}>{ui.platformer.banners.win}</div>}
      {state.dkStatus === 'gameover' && <div className={styles.banner}>{ui.platformer.banners.gameOver}</div>}
      <TouchControls onPress={press} onRelease={release} />
    </>
  );
}
```

- [ ] **Step 6: Update GameScene.tsx**

In `client/src/components/scene/GameScene.tsx`, replace:

```tsx
import { Platformer } from './Platformer';
import { DecorativePlatforms } from './DecorativePlatforms';
```

with:

```tsx
import { Platformer } from './Platformer';
```

Then replace:

```tsx
      <KeybindsLegend setPlatformRef={setPlatformRef} />
```

with:

```tsx
      <KeybindsLegend />
```

Then replace:

```tsx
      <TopBar setPlatformRef={setPlatformRef} />
      <PlayerBar onSummonFamiliar={toggleFamiliar} setPlatformRef={setPlatformRef} />
      {state.playing && <DecorativePlatforms />}
      {state.playing && <Platformer platformRefs={platformRefs} />}
```

with:

```tsx
      <TopBar />
      <PlayerBar onSummonFamiliar={toggleFamiliar} setPlatformRef={setPlatformRef} />
      {state.playing && <Platformer platformRefs={platformRefs} />}
```

Then replace the registry comment:

```tsx
  // Registry of DOM nodes that double as platforms while playing — one whole HUD
  // bar/box per entry (PlayerBar's entire bar, TopBar's whole link row/mobile controls,
  // KeybindsLegend's box, the discoveries trigger), so the sprite walks a continuous
  // floor/ledge rather than falling through the gaps between individual buttons.
  // Platformer reads this via getBoundingClientRect(); the setter identity per key is
  // cached so passing it down doesn't cause re-attachment on every GameScene render.
```

with:

```tsx
  // Registry of the DOM nodes that make up the climb's ground floor — PlayerBar's whole
  // bar on desktop, and its nav/familiar strips on mobile where that bar collapses (see
  // useFloorRect's FLOOR_KEYS). Nothing else in the HUD is a platform. The setter
  // identity per key is cached so passing it down doesn't re-attach refs on every render.
```

- [ ] **Step 7: Drop setPlatformRef from TopBar**

In `client/src/components/scene/TopBar.tsx`, replace:

```tsx
interface Props {
  setPlatformRef: (key: string) => (el: HTMLElement | null) => void;
}

export function TopBar({ setPlatformRef }: Props) {
```

with:

```tsx
export function TopBar() {
```

Then replace:

```tsx
      <DiscoveryListPanel setPlatformRef={setPlatformRef} />
      <div className={styles.systemButtons} ref={setPlatformRef('topbar-links')}>
```

with:

```tsx
      <DiscoveryListPanel />
      <div className={styles.systemButtons}>
```

Then replace:

```tsx
      <div className={styles.mobileControls} ref={setPlatformRef('topbar-mobile')}>
```

with:

```tsx
      <div className={styles.mobileControls}>
```

- [ ] **Step 8: Drop setPlatformRef from DiscoveryListPanel**

In `client/src/components/shared/DiscoveryListPanel.tsx`, replace:

```tsx
interface Props {
  setPlatformRef: (key: string) => (el: HTMLElement | null) => void;
}

export function DiscoveryListPanel({ setPlatformRef }: Props) {
```

with:

```tsx
export function DiscoveryListPanel() {
```

Then replace:

```tsx
      <button
        data-sfx
        className={styles.trigger}
        ref={setPlatformRef('discovery-trigger')}
        onClick={() => dispatch({ type: 'TOGGLE_DISCOVERIES' })}
      >
```

with:

```tsx
      <button
        data-sfx
        className={styles.trigger}
        onClick={() => dispatch({ type: 'TOGGLE_DISCOVERIES' })}
      >
```

- [ ] **Step 9: Drop setPlatformRef from KeybindsLegend**

In `client/src/components/scene/KeybindsLegend.tsx`, replace:

```tsx
interface Props {
  setPlatformRef: (key: string) => (el: HTMLElement | null) => void;
}

export function KeybindsLegend({ setPlatformRef }: Props) {
  const { state } = useGameState();
  if (state.familiarOpen) return null;
  return (
    <div className={styles.legend} ref={setPlatformRef('keybinds')}>
```

with:

```tsx
export function KeybindsLegend() {
  const { state } = useGameState();
  if (state.familiarOpen) return null;
  return (
    <div className={styles.legend}>
```

- [ ] **Step 10: Drop the unused plate ref from PlayerBar**

In `client/src/components/scene/PlayerBar.tsx`, replace:

```tsx
      <div className={styles.playerPlate} ref={setPlatformRef('plate')}>
```

with:

```tsx
      <div className={styles.playerPlate}>
```

- [ ] **Step 11: Build and manually verify the climb**

Run: `npm run build`
Expected: succeeds with no TS errors. This is the step most likely to surface leftover prop mismatches — fix any and re-run before moving on.

Run: `npm run dev` and open the app.
Manually verify:
1. Click ▶ START — girder rows, ladders, and a 🏆 goal box are drawn, and the sprite appears standing on the left end of the bottom bar.
2. Arrow keys walk the sprite along the bottom bar; it faces the direction it moves.
3. Space jumps a short hop — **confirm it is NOT enough to reach the girder row above.** If it is, the row spacing or `JUMP_VELOCITY` needs adjusting (record it for Task 6, don't fix here).
4. Walk onto a ladder and hold ↑ — the sprite climbs, snaps to the ladder's centre, and ends up standing on the girder above.
5. Hold ↓ on a ladder to climb back down.
6. Press ← or → mid-climb — the sprite leaves the ladder and falls normally.
7. Climb all the way to the top row and walk into the 🏆 — a "YOU WIN" banner appears and a "Summit Climber" discovery toast fires.
8. Open a dialog (click a nav button) — the sprite freezes; close it and it resumes.
9. Press ESC — back to the character picker.

- [ ] **Step 12: Commit**

```bash
git add -A client/src
git commit -m "feat: DK player physics, ladder climbing, and level wiring"
```

---

## Task 4: Barrels, lives, and the game loop

**Files:**
- Modify: `client/src/hooks/useDonkeyKongLoop.ts`
- Modify: `client/src/components/scene/Platformer.tsx`
- Modify: `client/src/components/scene/PlayerBar.tsx`

**Interfaces:**
- Consumes: `DK_HIT`/`DK_RESTART`/`dkLives`/`ui.platformer.maxLives` from Task 1; the loop and `Barrel` type from Task 3.
- Produces: a complete playable loop — barrels, death, lives in the HP meter, game-over auto-restart.

- [ ] **Step 1: Add barrel constants**

In `client/src/hooks/useDonkeyKongLoop.ts`, replace:

```ts
const CLIMB_SPEED = 150; // px/s

export const BARREL_SIZE = 18; // px
```

with:

```ts
const CLIMB_SPEED = 150; // px/s
const BARREL_SPEED = 150; // px/s
const BARREL_INTERVAL = 2.2; // seconds between spawns

export const BARREL_SIZE = 18; // px
```

- [ ] **Step 2: Add the spawn timer and id refs**

In `client/src/hooks/useDonkeyKongLoop.ts`, replace:

```ts
  const barrelsRef = useRef<Barrel[]>([]);
  const hasSpawnedRef = useRef(false);
```

with:

```ts
  const barrelsRef = useRef<Barrel[]>([]);
  const spawnTimerRef = useRef(0);
  const barrelIdRef = useRef(0);
  const hasSpawnedRef = useRef(false);
```

- [ ] **Step 3: Reset the spawn timer on run reset**

In `client/src/hooks/useDonkeyKongLoop.ts`, replace:

```ts
        if (status === 'climbing' && wasFrozen) {
          placePlayer(floor);
          barrelsRef.current = [];
          publish(true);
          return;
        }
```

with:

```ts
        if (status === 'climbing' && wasFrozen) {
          placePlayer(floor);
          barrelsRef.current = [];
          spawnTimerRef.current = 0;
          publish(true);
          return;
        }
```

- [ ] **Step 4: Simulate barrels and detect hits**

In `client/src/hooks/useDonkeyKongLoop.ts`, replace:

```ts
      if (overlaps(p.x, p.y, spriteWidth, spriteHeight, level.goal)) {
        onWin();
      }

      publish(true);
```

with:

```ts
      // --- barrels ---
      spawnTimerRef.current += dt;
      if (spawnTimerRef.current >= BARREL_INTERVAL) {
        spawnTimerRef.current -= BARREL_INTERVAL;
        barrelsRef.current.push({
          id: barrelIdRef.current++,
          x: level.barrelSpawn.left,
          y: level.barrelSpawn.top,
          vx: BARREL_SPEED,
          vy: 0,
          grounded: false,
        });
      }

      const live: Barrel[] = [];
      for (const b of barrelsRef.current) {
        b.vy += GRAVITY * dt;
        const bPrevBottom = b.y + BARREL_SIZE;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const bNewBottom = b.y + BARREL_SIZE;

        let bLanded = false;
        for (const s of surfaces) {
          if (b.x + BARREL_SIZE <= s.left || b.x >= s.left + s.width) continue;
          if (bPrevBottom <= s.top && bNewBottom >= s.top && b.vy >= 0) {
            b.y = s.top - BARREL_SIZE;
            b.vy = 0;
            bLanded = true;
            break;
          }
        }
        // Reversing only on a *fresh* landing is what produces the cascade: a barrel
        // rolls to the end of its girder, drops to the row below, and heads back the
        // other way. While it's simply rolling along, it re-lands every frame (the snap
        // above puts prevBottom exactly on the surface), so grounded stays true and the
        // direction holds.
        if (bLanded && !b.grounded) b.vx = -b.vx;
        b.grounded = bLanded;

        const offScreen =
          b.y > window.innerHeight ||
          b.x < -BARREL_SIZE * 2 ||
          b.x > window.innerWidth + BARREL_SIZE;
        if (!offScreen) live.push(b);
      }
      barrelsRef.current = live;

      const hit = live.some(b => overlaps(p.x, p.y, spriteWidth, spriteHeight, {
        top: b.y, left: b.x, width: BARREL_SIZE, height: BARREL_SIZE,
      }));
      if (hit) {
        // Clearing the field and repositioning immediately means the overlap is gone
        // this same frame, so onHit() can't re-fire on the next one.
        barrelsRef.current = [];
        spawnTimerRef.current = 0;
        placePlayer(floor);
        onHit();
      }

      if (overlaps(p.x, p.y, spriteWidth, spriteHeight, level.goal)) {
        onWin();
      }

      publish(true);
```

- [ ] **Step 5: Auto-restart after win or game over**

In `client/src/components/scene/Platformer.tsx`, replace:

```tsx
import { useCallback } from 'react';
```

with:

```tsx
import { useCallback, useEffect } from 'react';
```

Then replace:

```tsx
  const onHit = useCallback(() => dispatch({ type: 'DK_HIT' }), [dispatch]);
  const onWin = useCallback(() => dispatch({ type: 'DK_WIN' }), [dispatch]);
```

with:

```tsx
  const onHit = useCallback(() => dispatch({ type: 'DK_HIT' }), [dispatch]);
  const onWin = useCallback(() => dispatch({ type: 'DK_WIN' }), [dispatch]);

  // Hold the banner briefly, then put the player back at the bottom for another run.
  // Play mode is never exited here — ESC remains the only way out.
  useEffect(() => {
    if (state.dkStatus === 'climbing') return;
    const delay = state.dkStatus === 'won' ? 3200 : 2000;
    const timer = setTimeout(() => dispatch({ type: 'DK_RESTART' }), delay);
    return () => clearTimeout(timer);
  }, [state.dkStatus, dispatch]);
```

- [ ] **Step 6: Drive the HP meter from lives**

In `client/src/components/scene/PlayerBar.tsx`, replace:

```tsx
  const discoveredCount = Object.keys(state.discoveries).length;
```

with:

```tsx
  // While playing, the decorative HP bar becomes the climb's lives display; outside
  // play mode it falls back to the static width its stylesheet already sets.
  const hpStyle = state.playing
    ? { width: `${(state.dkLives / ui.platformer.maxLives) * 100}%` }
    : undefined;

  const discoveredCount = Object.keys(state.discoveries).length;
```

Then replace:

```tsx
          <div className={styles.meterTrough}><div className={styles.meterFillHp} /><div className={styles.meterSegments} /></div>
```

with:

```tsx
          <div className={styles.meterTrough}><div className={styles.meterFillHp} style={hpStyle} /><div className={styles.meterSegments} /></div>
```

- [ ] **Step 7: Build and manually verify the full game**

Run: `npm run build`
Expected: succeeds.

Run: `npm run dev`, click START.
Manually verify:
1. Barrels appear at the top left and roll right along the top girder.
2. A barrel reaching the end of a girder falls to the row below and rolls back the other way — the zig-zag cascade.
3. Barrels rolling off the bottom row land on the PlayerBar floor and eventually leave the screen; none pile up forever.
4. Jumping over a barrel works and does not cost a life.
5. Touching a barrel drains the HP meter by a third, clears the barrels, and puts the sprite back at the bottom-left.
6. Three hits shows "GAME OVER"; after ~2s the HP meter refills and the climb restarts, still in play mode.
7. Reaching the 🏆 shows "YOU WIN" and unlocks the Summit Climber discovery; after ~3s the climb restarts.
8. Opening the Discoveries panel lists "Summit Climber" under FOUND once earned.
9. ESC still exits to the picker at any point.

Record — do not fix — anything that feels unfair, unreachable, too fast, or too slow. Task 6 is where that gets tuned.

- [ ] **Step 8: Commit**

```bash
git add client/src/hooks/useDonkeyKongLoop.ts client/src/components/scene/Platformer.tsx client/src/components/scene/PlayerBar.tsx
git commit -m "feat: rolling barrels, lives, and win/lose loop"
```

---

## Task 5: Four-way touch controls and keybinds legend

**Files:**
- Modify: `client/src/components/scene/TouchControls.tsx`
- Modify: `client/src/components/scene/TouchControls.module.css`
- Modify: `client/src/content.json`
- Modify: `client/src/content.ts`
- Modify: `client/src/components/scene/KeybindsLegend.tsx`

**Interfaces:**
- Consumes: `MoveKey` (now including `up`/`down`) from Task 3, and `ui.platformer.controls`'s up/down glyphs from Task 1.
- Produces: `ui.keybinds.climb`.

- [ ] **Step 1: Add the climb keybind string**

In `client/src/content.json`, replace:

```json
      "move": "MOVE",
      "jump": "JUMP",
      "stopPlaying": "STOP PLAYING"
```

with:

```json
      "move": "MOVE",
      "climb": "CLIMB LADDER",
      "jump": "JUMP",
      "stopPlaying": "STOP PLAYING"
```

- [ ] **Step 2: Update the keybinds type**

In `client/src/content.ts`, replace:

```ts
    keybinds: { heading: string; changeCharacter: string; summonFamiliar: string; close: string; move: string; jump: string; stopPlaying: string };
```

with:

```ts
    keybinds: { heading: string; changeCharacter: string; summonFamiliar: string; close: string; move: string; climb: string; jump: string; stopPlaying: string };
```

- [ ] **Step 3: Add the climb row to the legend**

In `client/src/components/scene/KeybindsLegend.tsx`, replace:

```tsx
    return [
      { keys: ['←', '→'], label: ui.keybinds.move },
      { key: 'SPACE', label: ui.keybinds.jump },
      { key: 'ESC', label: ui.keybinds.stopPlaying },
    ];
```

with:

```tsx
    return [
      { keys: ['←', '→'], label: ui.keybinds.move },
      { keys: ['↑', '↓'], label: ui.keybinds.climb },
      { key: 'SPACE', label: ui.keybinds.jump },
      { key: 'ESC', label: ui.keybinds.stopPlaying },
    ];
```

- [ ] **Step 4: Make the touch pad four-way**

Replace the full contents of `client/src/components/scene/TouchControls.tsx` with:

```tsx
import type { MoveKey } from '../../hooks/useHeldKeys';
import { ui } from '../../content';
import styles from './TouchControls.module.css';

interface Props {
  onPress: (key: MoveKey) => void;
  onRelease: (key: MoveKey) => void;
}

export function TouchControls({ onPress, onRelease }: Props) {
  const c = ui.platformer.controls;
  // Note: React's touch listeners are passive by default, so calling preventDefault()
  // here would be a no-op (and logs a console warning) — omitted rather than kept as
  // dead code. onTouchCancel is bound alongside onTouchEnd so a gesture the browser
  // takes over (scroll, system swipe) can't leave a direction stuck held down.
  const bind = (key: MoveKey) => ({
    onTouchStart: () => onPress(key),
    onTouchEnd: () => onRelease(key),
    onTouchCancel: () => onRelease(key),
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.dpad}>
        <button type="button" className={`${styles.btn} ${styles.up}`} aria-label={c.upAriaLabel} {...bind('up')}>{c.upGlyph}</button>
        <div className={styles.dpadRow}>
          <button type="button" className={styles.btn} aria-label={c.leftAriaLabel} {...bind('left')}>{c.leftGlyph}</button>
          <button type="button" className={styles.btn} aria-label={c.rightAriaLabel} {...bind('right')}>{c.rightGlyph}</button>
        </div>
        <button type="button" className={`${styles.btn} ${styles.down}`} aria-label={c.downAriaLabel} {...bind('down')}>{c.downGlyph}</button>
      </div>
      <button type="button" className={`${styles.btn} ${styles.jump}`} aria-label={c.jumpAriaLabel} {...bind('jump')}>{c.jumpGlyph}</button>
    </div>
  );
}
```

- [ ] **Step 5: Restyle the pad**

Replace the full contents of `client/src/components/scene/TouchControls.module.css` with:

```css
.wrap {
  display: none;
}

@media (max-width: 768px) {
  .wrap {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 64px;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 65;
    pointer-events: none;
  }
}

.dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}

.dpadRow {
  display: flex;
  gap: 44px;
}

.btn {
  width: 44px;
  height: 44px;
  font: 400 15px 'Silkscreen', monospace;
  background: rgba(43, 43, 48, .9);
  color: #f5d9dc;
  border: 3px solid #2b2b30;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
  user-select: none;
}

.up,
.down {
  align-self: center;
}

.jump {
  width: 56px;
  height: 56px;
  align-self: flex-end;
}
```

- [ ] **Step 6: Build and verify on a mobile viewport**

Run: `npm run build`
Expected: succeeds.

Run: `npm run dev`, switch dev tools to a mobile viewport (e.g. 375×667), reload, click START.
Manually verify:
1. A four-way pad (▲ ▼ ◀ ▶) sits bottom-left and a larger jump button bottom-right, above the mobile nav bar and not overlapping it.
2. Holding ◀/▶ walks; holding ▲/▼ on a ladder climbs; the jump button hops.
3. The mobile level (3 girder rows) is fully climbable and the 🏆 is reachable.
4. On desktop width, the keybinds legend while playing reads: `← → MOVE`, `↑ ↓ CLIMB LADDER`, `SPACE JUMP`, `ESC STOP PLAYING`.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/scene/TouchControls.tsx client/src/components/scene/TouchControls.module.css client/src/content.json client/src/content.ts client/src/components/scene/KeybindsLegend.tsx
git commit -m "feat: four-way touch pad and climb keybind row"
```

---

## Task 6: Playtest and tuning

**Files:** no new files. Tuning only, in `client/src/hooks/useDonkeyKongLoop.ts` (the constants block) and `client/src/content.json` (`ui.platformer.level` / `levelMobile`).

**This task cannot be completed by static analysis and must not be reported as done on the strength of a passing build.** Everything below is a runtime judgement call. If whoever executes this plan has no browser, the correct outcome is to report Task 6 as BLOCKED and hand the checklist to a human, not to mark it complete.

- [ ] **Step 1: Reachability pass**

Play the desktop level start to finish. Confirm:
1. Every girder row is reachable via a ladder.
2. No row is accidentally reachable by jumping (jumping between rows would defeat the ladders).
3. Every ladder's top actually lands the sprite on the girder above it, with no gap or overlap.
4. The 🏆 is standing-reachable from the top row, not floating out of reach.

Fix by adjusting `top`/`left`/`width`/`height` in `content.json`'s `ui.platformer.level`, or `JUMP_VELOCITY` in `useDonkeyKongLoop.ts`.

- [ ] **Step 2: Difficulty pass**

Confirm the run is challenging but winnable:
1. `BARREL_INTERVAL` (2.2s) — are barrels dense enough to matter, sparse enough to survive?
2. `BARREL_SPEED` (150px/s) vs `MOVE_SPEED` (220px/s) — can you outrun a barrel when you need to?
3. Are there spots where a barrel arrives at a ladder mouth so predictably that progress is impossible?
4. Does a full successful climb take roughly 30-90 seconds? Much less is trivial; much more is tedious for a portfolio easter egg.

- [ ] **Step 3: Mobile pass**

Repeat both passes at 375×667 against `levelMobile`. The 3-row mobile level has its own coordinates and its own reachability and fairness answers — do not assume desktop tuning transfers.

- [ ] **Step 4: Feel pass**

1. Does the ladder mount feel responsive, or do you have to fight to get on?
2. Does dismounting at the top place you sensibly?
3. Does the sprite ever visibly jitter, stick to a girder edge, or fall through a surface?

- [ ] **Step 5: Final build and lint**

Run: `npm run build` — expected: clean.
Run: `npm run lint` — expected: no new warnings. One pre-existing warning in `client/src/state/GameStateContext.tsx` (react-refresh `only-export-components`) is unrelated to this feature and is not to be fixed here.

- [ ] **Step 6: Commit (only if tuning changed something)**

```bash
git add client/src/hooks/useDonkeyKongLoop.ts client/src/content.json
git commit -m "fix: tune DK climb difficulty and level geometry"
```

If nothing needed changing, skip the commit.
