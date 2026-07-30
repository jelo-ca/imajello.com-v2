# Hero Section → Playable Platformer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the hero section's static text, replace it with a character-select + Start button, and turn the whole HUD into a tiny walkable/jumpable platformer where the existing UI chrome doubles as platforms.

**Architecture:** A new `playing: boolean` flag on the existing reducer gates everything. `HeroCharacterViewer` keeps its portrait/arrow picker but drops all prose and gains a Start button; when `playing` is true it renders nothing and a new `Platformer` component takes over, driven by a `requestAnimationFrame` physics loop (gravity + jump + land-on-top-only collision) against a list of platform rectangles. Those rectangles come from two sources: real HUD elements measured via `getBoundingClientRect()` (the `PlayerBar` nav buttons/plate/familiar button, `TopBar`'s link chips and hamburger, `KeybindsLegend`, the discoveries trigger) and a handful of decorative rectangles read straight out of `content.json`. Standing on a `PlayerBar` nav button dispatches the same `OPEN_SECTION` action clicking it would.

**Tech Stack:** React 19 + TypeScript (Vite), no new dependencies. This repo has **no test framework** (`client/package.json` has no `test` script, no Jest/Vitest/RTL installed) — `"build": "tsc -b && vite build"` (strict TS incl. `noUnusedLocals`/`noUnusedParameters`) is the only automated gate. Every task's "Verify" step is (1) `npm run build` from `client/` and (2) a concrete, exact manual check in the Vite dev server (`npm run dev`). Do not introduce a test framework as part of this plan — out of scope.

## Global Constraints

- No new npm dependencies.
- Preserve every existing keyboard shortcut except: ArrowLeft/ArrowRight stop switching characters while `state.playing` is true (they move the character instead).
- All user-facing strings live in `client/src/content.json` (read through `client/src/content.ts`'s `ui` export) — no hardcoded UI strings in components, matching the existing convention in this codebase.
- `client/tsconfig.app.json` already has `noUnusedLocals: true` and `noUnusedParameters: true` — every declared import/local must be used, or `npm run build` fails.
- CSS breakpoint convention already established in this codebase: `@media (max-width: 768px)`, CSS-only (no JS `matchMedia` for layout/rendering decisions). The one exception introduced by this plan is inside the physics math itself (`usePlatformRects.ts`), which needs `window.innerWidth` numerically to pick which set of decorative platform coordinates to use — that's a physics concern, not a layout one, and does not change the CSS-only convention for actual rendering/layout.
- Physics is intentionally simple: land-on-top-only collision (no side/ceiling collision, no slopes, no wall-jump, no momentum/friction). Do not add these — out of scope per the design spec (`docs/superpowers/specs/2026-07-29-hero-platformer-design.md`).

---

## Task 1: Hero screen — Start/Stop platforming state & UI

**Files:**
- Modify: `client/src/state/types.ts`
- Modify: `client/src/state/reducer.ts`
- Modify: `client/src/content.json`
- Modify: `client/src/content.ts`
- Modify: `client/src/components/scene/HeroCharacterViewer.tsx`
- Modify: `client/src/components/scene/HeroCharacterViewer.module.css`
- Modify: `client/src/App.tsx`

**Interfaces:**
- Produces: `State.playing: boolean`; actions `{ type: 'START_PLATFORMER' }` and `{ type: 'STOP_PLATFORMER' }` (both consumed by later tasks' components via `dispatch`).
- Produces: `ui.hero: { statsLabel: string; prevAriaLabel: string; nextAriaLabel: string; startBtn: string }` (replaces the old shape that included `eyebrow`/`nameFirst`/`nameAccent`/`nameLast`/`bio`).

- [ ] **Step 1: Add `playing` to state and the two new actions**

In `client/src/state/types.ts`, add `playing: boolean;` to the `State` interface, right after `familiarHover: boolean;`:

```ts
  navHover: SectionKey | null;
  familiarHover: boolean;
  playing: boolean;
  // Ephemeral, session-only counter — incremented exactly once by OPEN_SECTION when
```

Add two new members to the `Action` union, right after `| { type: 'SET_KONAMI_UNLOCKED' }`:

```ts
  | { type: 'SET_KONAMI_UNLOCKED' }
  | { type: 'START_PLATFORMER' }
  | { type: 'STOP_PLATFORMER' }
  | { type: 'SET_TOAST'; text: string | null }
```

- [ ] **Step 2: Wire the reducer**

In `client/src/state/reducer.ts`, add `playing: false,` to `initialState`, right after `familiarHover: false,`:

```ts
  navHover: null,
  familiarHover: false,
  playing: false,
  levelUpTrigger: 0,
```

Add two cases to the `switch` in `reducer()`, right after the `case 'SET_KONAMI_UNLOCKED':` block:

```ts
    case 'SET_KONAMI_UNLOCKED':
      return state.konamiUnlocked ? state : unlockDiscovery({ ...state, konamiUnlocked: true }, 'konami');
    case 'START_PLATFORMER':
      return { ...state, playing: true };
    case 'STOP_PLATFORMER':
      return { ...state, playing: false };
    case 'SET_TOAST':
```

- [ ] **Step 3: Run the build to confirm the state/reducer changes compile**

Run (from `client/`): `npm run build`
Expected: succeeds (this only adds new, unused-so-far fields/cases — `noUnusedLocals` doesn't flag reducer `case` branches or interface members, only unused local variables/imports, so this compiles even though nothing calls `START_PLATFORMER` yet).

- [ ] **Step 4: Replace `ui.hero` in content.json**

In `client/src/content.json`, replace the `"hero"` block:

```json
    "hero": {
      "eyebrow": "SOFTWARE ENGINEER · AI/ML · FREMONT CA",
      "nameFirst": "Anjoelo Calder",
      "nameAccent": "o",
      "nameLast": "n",
      "statsLabel": "STATS",
      "prevAriaLabel": "Previous character",
      "nextAriaLabel": "Next character",
      "bio": "AI/ML software engineer at UC Irvine, originally from the Philippines."
    },
```

with:

```json
    "hero": {
      "statsLabel": "STATS",
      "prevAriaLabel": "Previous character",
      "nextAriaLabel": "Next character",
      "startBtn": "▶ START"
    },
```

- [ ] **Step 5: Update the `hero` type in content.ts**

In `client/src/content.ts`, replace:

```ts
    hero: { eyebrow: string; nameFirst: string; nameAccent: string; nameLast: string; statsLabel: string; prevAriaLabel: string; nextAriaLabel: string; bio: string };
```

with:

```ts
    hero: { statsLabel: string; prevAriaLabel: string; nextAriaLabel: string; startBtn: string };
```

- [ ] **Step 6: Rewrite HeroCharacterViewer.tsx — remove text, add Start button, hide while playing**

Replace the full contents of `client/src/components/scene/HeroCharacterViewer.tsx` with:

```tsx
import { useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { CHARS } from '../../data/chars';
import { ui } from '../../content';
import styles from './HeroCharacterViewer.module.css';

// Minimum horizontal drag distance (px) to count as a swipe, below which
// a touch is treated as a tap/scroll rather than a character-change gesture.
const SWIPE_THRESHOLD = 40;

export function HeroCharacterViewer() {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const char = CHARS[state.charIdx];
  const prevChar = state.charPrevIdx != null ? CHARS[state.charPrevIdx] : null;

  useEffect(() => {
    if (state.charPrevIdx == null) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_CHAR_PREV' }), 300);
    return () => clearTimeout(timer);
  }, [state.charPrevIdx, state.charIdx, dispatch]);

  const goPrev = () => { tick(); dispatch({ type: 'PREV_CHAR' }); };
  const goNext = () => { tick(); dispatch({ type: 'NEXT_CHAR' }); };
  const handleStart = () => { tick(); dispatch({ type: 'START_PLATFORMER' }); };

  // Mobile replaces the ◀/▶ buttons with a swipe gesture on the portrait/stats row
  // (buttons are hidden via CSS below 768px — see HeroCharacterViewer.module.css .arrow).
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext(); else goPrev();
  };

  // Once playing, the Platformer component (added in Task 2) owns rendering the
  // character — this picker screen disappears entirely rather than sitting hidden
  // underneath it.
  if (state.playing) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.row} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button data-sfx className={styles.arrow} onClick={goPrev}>◀</button>

        <div className={styles.portraitBox}>
          <div className={styles.scanlines} />
          {prevChar && (
            <img
              key={`out-${state.charPrevIdx}`}
              src={prevChar.src}
              alt=""
              className={styles.portraitImg}
              style={{ animation: `${state.charDir === 'prev' ? 'charOutR' : 'charOutL'} .28s steps(6) both` }}
            />
          )}
          <img
            key={`in-${state.charIdx}`}
            src={char.src}
            alt={char.name}
            className={`${styles.portraitImg} ${styles.portraitImgIn}`}
            style={{ animation: `${state.charDir === 'prev' ? 'charInL' : 'charInR'} .28s steps(6) both` }}
          />
          <div className={styles.glow} />
        </div>

        <div className={styles.statPanel}>
          <div className={styles.statsHeader}>
            <span className={styles.statsLabel}>{ui.hero.statsLabel}</span>
          </div>
          {char.stats.map(stat => (
            <div className={styles.statRow} key={stat.name}>
              <div className={styles.statTop}>
                <span>{stat.name}</span>
                <span className={styles.statMod}>{stat.mod}</span>
              </div>
              <div className={styles.statTrough}>
                <div className={styles.statFill} style={{ width: stat.w }} />
                <div className={styles.statSegments} />
              </div>
            </div>
          ))}
        </div>

        <button data-sfx className={styles.arrow} onClick={goNext}>▶</button>
      </div>

      <div className={styles.nameClassRow}>
        <button data-sfx className={styles.mobileArrow} onClick={goPrev} aria-label={ui.hero.prevAriaLabel}>◀</button>
        <div className={styles.nameClassBox}>
          <div className={styles.charName}>{char.name}</div>
          <div className={styles.charClass}>{char.cls}</div>
        </div>
        <button data-sfx className={styles.mobileArrow} onClick={goNext} aria-label={ui.hero.nextAriaLabel}>▶</button>
      </div>

      <button data-sfx className={styles.startBtn} onClick={handleStart}>{ui.hero.startBtn}</button>
    </div>
  );
}
```

- [ ] **Step 7: Update HeroCharacterViewer.module.css — remove dead styles, add `.startBtn`**

In `client/src/components/scene/HeroCharacterViewer.module.css`, delete these now-unused rules (the `.eyebrow`, `.name`, `.accent`, and `.bio` blocks):

```css
.eyebrow {
  font: 400 11px 'Silkscreen', monospace;
  letter-spacing: .12em;
  color: #c25f74;
}

.name {
  margin: 0;
  font: 400 clamp(28px, min(5.4vw, 6vh), 68px)/0.95 'Archivo Black', sans-serif;
  text-transform: uppercase;
  letter-spacing: -.01em;
  text-align: center;
}

.accent {
  color: #c25f74;
}
```

and, further down:

```css
.bio {
  margin: 0;
  font-size: clamp(12px, 1.9vh, 14px);
  line-height: 1.5;
  color: #3a3a40;
  max-width: 480px;
  text-align: center;
  text-wrap: pretty;
}
```

Add a new `.startBtn` rule (placed after `.nameClassBox` is fine):

```css
.startBtn {
  font: 400 13px 'Silkscreen', monospace;
  letter-spacing: .06em;
  background: #2b2b30;
  color: #f5d9dc;
  border: 3px solid #2b2b30;
  padding: 12px 28px;
  cursor: pointer;
}
.startBtn:hover {
  background: #ee9aa3;
  color: #2b2b30;
  border-color: #ee9aa3;
}
```

- [ ] **Step 8: Gate ArrowLeft/ArrowRight and wire ESC in App.tsx**

In `client/src/App.tsx`, replace:

```ts
      if (e.key === 'Escape' && state.familiarOpen) { dispatch({ type: 'CLOSE_FAMILIAR' }); return; }
      trackKonami(e.key);
      if (!state.open) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'PREV_CHAR' }); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'NEXT_CHAR' }); return; }
      }
```

with:

```ts
      if (e.key === 'Escape' && state.familiarOpen) { dispatch({ type: 'CLOSE_FAMILIAR' }); return; }
      if (e.key === 'Escape' && state.playing) { dispatch({ type: 'STOP_PLATFORMER' }); return; }
      trackKonami(e.key);
      if (!state.open && !state.playing) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'PREV_CHAR' }); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'NEXT_CHAR' }); return; }
      }
```

and update that effect's dependency array from:

```ts
  }, [state.discoveriesOpen, state.open, state.familiarOpen, dispatch, trackKonami, toggleFamiliar]);
```

to:

```ts
  }, [state.discoveriesOpen, state.open, state.familiarOpen, state.playing, dispatch, trackKonami, toggleFamiliar]);
```

- [ ] **Step 9: Build, then manually verify**

Run: `npm run build`
Expected: succeeds with no TS errors.

Run: `npm run dev`, open the printed local URL.
Manually verify:
1. Hero zone shows the portrait, ◀/▶ arrows, STATS panel, name/class plate, and a "▶ START" button — no eyebrow line, no big "Anjoelo Calderon" name, no bio paragraph anywhere.
2. Click "▶ START" — the entire hero zone (portrait, arrows, stats, name plate, button) disappears, leaving that area blank. No console errors.
3. Press `Escape` — the hero picker UI reappears exactly as before.
4. Press `Escape` again with nothing open — no error (no-op, matches existing behavior).

- [ ] **Step 10: Commit**

```bash
git add client/src/state/types.ts client/src/state/reducer.ts client/src/content.json client/src/content.ts client/src/components/scene/HeroCharacterViewer.tsx client/src/components/scene/HeroCharacterViewer.module.css client/src/App.tsx
git commit -m "feat: replace hero text with character-select + Start button"
```

---

## Task 2: Core platformer — measurement, physics, controls

**Files:**
- Modify: `client/src/content.json`
- Modify: `client/src/content.ts`
- Create: `client/src/hooks/usePlatformRects.ts`
- Create: `client/src/hooks/useHeldKeys.ts`
- Create: `client/src/hooks/usePlatformerLoop.ts`
- Create: `client/src/components/scene/Platformer.tsx`
- Create: `client/src/components/scene/Platformer.module.css`
- Create: `client/src/components/scene/TouchControls.tsx`
- Create: `client/src/components/scene/TouchControls.module.css`
- Modify: `client/src/components/scene/TopBar.tsx`
- Modify: `client/src/components/scene/KeybindsLegend.tsx`
- Modify: `client/src/components/shared/DiscoveryListPanel.tsx`
- Modify: `client/src/components/scene/PlayerBar.tsx`
- Modify: `client/src/components/scene/GameScene.tsx`

**Interfaces:**
- Consumes: `State.playing`, `START_PLATFORMER`/`STOP_PLATFORMER` actions from Task 1; `SectionKey` from `client/src/data/discoveries.ts`; `CHARS` from `client/src/data/chars.ts`; `ui`/`content` from `client/src/content.ts`.
- Produces: `Platform` interface and `usePlatformRects(platformRefs, recomputeDeps): Platform[]` (imported by `usePlatformerLoop.ts` and `Platformer.tsx`, both later in this same task). `MoveKey` type and `useHeldKeys(): HeldKeysApi` (imported by `usePlatformerLoop.ts` and `TouchControls.tsx`, both later in this same task). `PlatformerPose` and `usePlatformerLoop(params): PlatformerPose` (imported by `Platformer.tsx`). A `setPlatformRef: (key: string) => (el: HTMLElement | null) => void` prop, now required on `TopBar`, `KeybindsLegend`, `DiscoveryListPanel`, and `PlayerBar`, and a `platformRefs` registry passed down from `GameScene`.

- [ ] **Step 1: Add decorative platform data to content.json**

In `client/src/content.json`, insert a new `"platformer"` block right after `"dialogHost"` (i.e. change the end of the `ui` object from ending at `dialogHost` to also include `platformer`):

Replace:

```json
    "dialogHost": {
      "closeGlyph": "✕"
    }
```

with:

```json
    "dialogHost": {
      "closeGlyph": "✕"
    },

    "platformer": {
      "decorativePlatforms": [
        { "top": 18, "left": 8, "width": 11, "height": 3 },
        { "top": 32, "left": 40, "width": 13, "height": 3 },
        { "top": 50, "left": 78, "width": 11, "height": 3 },
        { "top": 66, "left": 22, "width": 10, "height": 3 }
      ],
      "decorativePlatformsMobile": [
        { "top": 22, "left": 8, "width": 30, "height": 2.5 },
        { "top": 40, "left": 52, "width": 32, "height": 2.5 }
      ]
    }
```

(`top`/`left`/`width`/`height` are percentages of the viewport — vh for top/height, vw for left/width.)

- [ ] **Step 2: Add the type in content.ts**

In `client/src/content.ts`, add a new interface right after `export interface SectionCopy { ... }`:

```ts
export interface PlatformRectSpec { top: number; left: number; width: number; height: number; }
```

Then add a `platformer` field to the `ui` shape inside `ContentShape`, right after `dialogHost: { closeGlyph: string };`:

```ts
    dialogHost: { closeGlyph: string };
    platformer: { decorativePlatforms: PlatformRectSpec[]; decorativePlatformsMobile: PlatformRectSpec[] };
```

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Create the platform-measurement hook**

Create `client/src/hooks/usePlatformRects.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { content } from '../content';
import type { SectionKey } from '../data/discoveries';

export interface Platform {
  key: string;
  top: number;
  left: number;
  width: number;
  height: number;
  sectionKey?: SectionKey;
}

const MOBILE_BREAKPOINT = 768;

function decorativePlatforms(): Platform[] {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const specs = isMobile ? content.ui.platformer.decorativePlatformsMobile : content.ui.platformer.decorativePlatforms;
  const vw = window.innerWidth / 100;
  const vh = window.innerHeight / 100;
  return specs.map((p, i) => ({
    key: `decorative-${i}`,
    top: p.top * vh,
    left: p.left * vw,
    width: p.width * vw,
    height: p.height * vh,
  }));
}

// `platformRefs.current` is a registry keyed by an arbitrary string (see GameScene's
// `setPlatformRef`); keys starting with `nav-` carry a SectionKey suffix so landing on
// that rect can trigger opening the matching dialog (wired in usePlatformerLoop).
export function usePlatformRects(
  platformRefs: React.RefObject<Record<string, HTMLElement | null>>,
  recomputeDeps: unknown[],
): Platform[] {
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  const recompute = useCallback(() => {
    const measured: Platform[] = [];
    for (const [key, el] of Object.entries(platformRefs.current)) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // hidden via CSS (e.g. mobile-only/desktop-only elements)
      const sectionKey = key.startsWith('nav-') ? (key.slice(4) as SectionKey) : undefined;
      measured.push({ key, top: rect.top, left: rect.left, width: rect.width, height: rect.height, sectionKey });
    }
    setPlatforms([...measured, ...decorativePlatforms()]);
    // platformRefs is a stable ref object; its .current mutating doesn't need to appear here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformRefs]);

  useEffect(() => {
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
    // recomputeDeps is an intentionally dynamic array of state values the caller wants
    // to force a re-measure on (e.g. a dialog opening changes PlayerBar's mobile layout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recompute, ...recomputeDeps]);

  return platforms;
}
```

- [ ] **Step 5: Create the held-keys hook**

Create `client/src/hooks/useHeldKeys.ts`:

```ts
import { useEffect, useRef } from 'react';

export type MoveKey = 'left' | 'right' | 'jump';

export interface HeldKeysApi {
  heldKeys: React.RefObject<Set<MoveKey>>;
  press: (key: MoveKey) => void;
  release: (key: MoveKey) => void;
}

const KEY_MAP: Record<string, MoveKey> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ' ': 'jump',
  Spacebar: 'jump',
};

export function useHeldKeys(): HeldKeysApi {
  const heldKeys = useRef<Set<MoveKey>>(new Set());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mapped = KEY_MAP[e.key];
      if (!mapped) return;
      e.preventDefault();
      heldKeys.current.add(mapped);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = KEY_MAP[e.key];
      if (!mapped) return;
      heldKeys.current.delete(mapped);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const press = (key: MoveKey) => heldKeys.current.add(key);
  const release = (key: MoveKey) => heldKeys.current.delete(key);

  return { heldKeys, press, release };
}
```

- [ ] **Step 6: Create the physics loop hook**

Create `client/src/hooks/usePlatformerLoop.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import type { SectionKey } from '../data/discoveries';
import type { Platform } from './usePlatformRects';
import type { MoveKey } from './useHeldKeys';

export interface PlatformerPose {
  x: number;
  y: number;
  facing: 'left' | 'right';
  grounded: boolean;
}

const GRAVITY = 1800; // px/s^2
const MOVE_SPEED = 220; // px/s
const JUMP_VELOCITY = -640; // px/s, negative = up

interface Params {
  platforms: Platform[];
  paused: boolean;
  heldKeys: React.RefObject<Set<MoveKey>>;
  spriteWidth: number;
  spriteHeight: number;
  onTriggerSection: (section: SectionKey) => void;
}

function floorTop(platforms: Platform[]): number {
  const navTops = platforms.filter(p => p.sectionKey !== undefined).map(p => p.top);
  if (navTops.length > 0) return Math.min(...navTops);
  return window.innerHeight - 40;
}

export function usePlatformerLoop({ platforms, paused, heldKeys, spriteWidth, spriteHeight, onTriggerSection }: Params): PlatformerPose {
  const poseRef = useRef({
    x: window.innerWidth / 2 - spriteWidth / 2,
    y: floorTop(platforms) - spriteHeight,
    vx: 0,
    vy: 0,
    facing: 'right' as 'left' | 'right',
    grounded: false,
  });
  const lastLandedKeyRef = useRef<string | null>(null);
  const [pose, setPose] = useState<PlatformerPose>({
    x: poseRef.current.x,
    y: poseRef.current.y,
    facing: 'right',
    grounded: false,
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (paused) return;

      const p = poseRef.current;
      const keys = heldKeys.current;
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
      let landedKey: string | null = null;
      for (const plat of platforms) {
        const overlapsHorizontally = p.x + spriteWidth > plat.left && p.x < plat.left + plat.width;
        if (!overlapsHorizontally) continue;
        const crossedTop = prevBottom <= plat.top && newBottom >= plat.top;
        if (crossedTop && p.vy >= 0) {
          p.y = plat.top - spriteHeight;
          p.vy = 0;
          landedKey = plat.key;
          break;
        }
      }
      p.grounded = landedKey !== null;

      // Fell through everything — respawn on the floor (the lowest nav-button platform).
      if (p.y > window.innerHeight) {
        p.x = window.innerWidth / 2 - spriteWidth / 2;
        p.y = floorTop(platforms) - spriteHeight;
        p.vy = 0;
        landedKey = null;
        p.grounded = false;
      }

      // Fire the section trigger exactly once per fresh arrival on a nav-button
      // platform; landing on anything else (or falling off) clears it so walking
      // back onto the same button later re-triggers.
      if (landedKey !== lastLandedKeyRef.current) {
        lastLandedKeyRef.current = landedKey;
        if (landedKey) {
          const plat = platforms.find(pl => pl.key === landedKey);
          if (plat?.sectionKey) onTriggerSection(plat.sectionKey);
        }
      }

      setPose({ x: p.x, y: p.y, facing: p.facing, grounded: p.grounded });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [platforms, paused, heldKeys, spriteWidth, spriteHeight, onTriggerSection]);

  return pose;
}
```

- [ ] **Step 7: Create the sprite component**

Create `client/src/components/scene/Platformer.module.css`:

```css
.sprite {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 66;
  image-rendering: pixelated;
  pointer-events: none;
}
```

(66 sits above every HUD bar this plan measures as a platform — `PlayerBar`'s `.bar` is `z-index: 2`, `TopBar`'s `.systemButtons` is `z-index: 50`, `KeybindsLegend`'s `.legend` is `z-index: 1` — and strictly below `DialogHost`'s scrim, which is `z-index: 70` in `client/src/components/dialogs/WorldMapDialog.module.css`. Don't reuse `70` for the sprite — that would tie with the scrim and rely on DOM-order stacking tiebreaks instead of an explicit order.)

Create `client/src/components/scene/Platformer.tsx`:

```tsx
import { useCallback } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { CHARS } from '../../data/chars';
import type { SectionKey } from '../../data/discoveries';
import { usePlatformRects } from '../../hooks/usePlatformRects';
import { useHeldKeys } from '../../hooks/useHeldKeys';
import { usePlatformerLoop } from '../../hooks/usePlatformerLoop';
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
  const platforms = usePlatformRects(platformRefs, [state.open, state.familiarOpen, state.discoveriesOpen]);
  const { heldKeys, press, release } = useHeldKeys();
  // dispatch's identity is stable (React guarantees this for useReducer), so wrapping in
  // useCallback keeps this stable across renders too — without it, a fresh arrow function
  // every render would appear in usePlatformerLoop's effect deps and tear down/rebuild the
  // whole requestAnimationFrame loop on every single frame.
  const onTriggerSection = useCallback(
    (section: SectionKey) => dispatch({ type: 'OPEN_SECTION', section }),
    [dispatch],
  );
  const pose = usePlatformerLoop({
    platforms,
    paused,
    heldKeys,
    spriteWidth: SPRITE_WIDTH,
    spriteHeight: SPRITE_HEIGHT,
    onTriggerSection,
  });

  return (
    <>
      <img
        src={char.src}
        alt={char.name}
        className={styles.sprite}
        style={{
          width: SPRITE_WIDTH,
          height: SPRITE_HEIGHT,
          transform: `translate3d(${pose.x}px, ${pose.y}px, 0) scaleX(${pose.facing === 'left' ? -1 : 1})`,
        }}
      />
      <TouchControls onPress={press} onRelease={release} />
    </>
  );
}
```

- [ ] **Step 8: Create the mobile touch controls**

Create `client/src/components/scene/TouchControls.module.css`:

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
    justify-content: space-between;
    padding: 0 16px;
    z-index: 65;
    pointer-events: none;
  }
}

.dpad {
  display: flex;
  gap: 10px;
  pointer-events: auto;
}

.btn {
  width: 48px;
  height: 48px;
  font: 400 16px 'Silkscreen', monospace;
  background: rgba(43, 43, 48, .9);
  color: #f5d9dc;
  border: 3px solid #2b2b30;
  cursor: pointer;
  pointer-events: auto;
}

.jump {
  align-self: flex-end;
}
```

Create `client/src/components/scene/TouchControls.tsx`:

```tsx
import type { MoveKey } from '../../hooks/useHeldKeys';
import styles from './TouchControls.module.css';

interface Props {
  onPress: (key: MoveKey) => void;
  onRelease: (key: MoveKey) => void;
}

export function TouchControls({ onPress, onRelease }: Props) {
  const bind = (key: MoveKey) => ({
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); onPress(key); },
    onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); onRelease(key); },
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.dpad}>
        <button type="button" className={styles.btn} {...bind('left')}>◀</button>
        <button type="button" className={styles.btn} {...bind('right')}>▶</button>
      </div>
      <button type="button" className={`${styles.btn} ${styles.jump}`} {...bind('jump')}>⤒</button>
    </div>
  );
}
```

- [ ] **Step 9: Thread `setPlatformRef` through TopBar (and DiscoveryListPanel)**

In `client/src/components/scene/TopBar.tsx`, replace:

```tsx
export function TopBar() {
```

with:

```tsx
interface Props {
  setPlatformRef: (key: string) => (el: HTMLElement | null) => void;
}

export function TopBar({ setPlatformRef }: Props) {
```

Replace:

```tsx
      <DiscoveryListPanel />
      <div className={styles.systemButtons}>
```

with:

```tsx
      <DiscoveryListPanel setPlatformRef={setPlatformRef} />
      <div className={styles.systemButtons} ref={setPlatformRef('topbar-links')}>
```

Replace:

```tsx
          <button
            data-sfx
            className={styles.menuTrigger}
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-label={tb.linksMenuAriaLabel}
          >
```

with:

```tsx
          <button
            data-sfx
            className={styles.menuTrigger}
            ref={setPlatformRef('topbar-hamburger')}
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-label={tb.linksMenuAriaLabel}
          >
```

- [ ] **Step 10: Thread `setPlatformRef` through DiscoveryListPanel**

In `client/src/components/shared/DiscoveryListPanel.tsx`, replace:

```tsx
export function DiscoveryListPanel() {
```

with:

```tsx
interface Props {
  setPlatformRef: (key: string) => (el: HTMLElement | null) => void;
}

export function DiscoveryListPanel({ setPlatformRef }: Props) {
```

Replace:

```tsx
      <button
        data-sfx
        className={styles.trigger}
        onClick={() => dispatch({ type: 'TOGGLE_DISCOVERIES' })}
      >
```

with:

```tsx
      <button
        data-sfx
        className={styles.trigger}
        ref={setPlatformRef('discovery-trigger')}
        onClick={() => dispatch({ type: 'TOGGLE_DISCOVERIES' })}
      >
```

- [ ] **Step 11: Thread `setPlatformRef` through KeybindsLegend**

In `client/src/components/scene/KeybindsLegend.tsx`, replace:

```tsx
export function KeybindsLegend() {
  const { state } = useGameState();
  if (state.familiarOpen) return null;
  return (
    <div className={styles.legend}>
```

with:

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

- [ ] **Step 12: Thread `setPlatformRef` through PlayerBar and attach it to the floor segments**

In `client/src/components/scene/PlayerBar.tsx`, replace:

```tsx
export function PlayerBar({ onSummonFamiliar }: { onSummonFamiliar: () => void }) {
```

with:

```tsx
interface Props {
  onSummonFamiliar: () => void;
  setPlatformRef: (key: string) => (el: HTMLElement | null) => void;
}

export function PlayerBar({ onSummonFamiliar, setPlatformRef }: Props) {
```

Replace:

```tsx
      <div className={styles.playerPlate}>
```

with:

```tsx
      <div className={styles.playerPlate} ref={setPlatformRef('plate')}>
```

Replace:

```tsx
            <button
              key={item.section}
              data-sfx
              className={styles.navBtn}
```

with:

```tsx
            <button
              key={item.section}
              data-sfx
              ref={setPlatformRef(`nav-${item.section}`)}
              className={styles.navBtn}
```

Replace:

```tsx
        <button data-sfx className={styles.familiarBtn} onClick={onSummonFamiliar}>
```

with:

```tsx
        <button data-sfx className={styles.familiarBtn} ref={setPlatformRef('familiar')} onClick={onSummonFamiliar}>
```

- [ ] **Step 13: Wire everything up in GameScene**

Replace the full contents of `client/src/components/scene/GameScene.tsx` with:

```tsx
import { useRef } from 'react';
import { HeroCharacterViewer } from './HeroCharacterViewer';
import { TopBar } from './TopBar';
import { KeybindsLegend } from './KeybindsLegend';
import { PlayerBar } from './PlayerBar';
import { Platformer } from './Platformer';
import { useParticles } from '../../hooks/useParticles';
import { useFamiliarToggle } from '../../hooks/useFamiliarToggle';
import { useGameState } from '../../state/GameStateContext';
import styles from './GameScene.module.css';

export function GameScene() {
  const { state } = useGameState();
  const particleHostRef = useRef<HTMLDivElement>(null);
  const cursorHostRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  useParticles(particleHostRef, cursorHostRef, cursorRef);
  const toggleFamiliar = useFamiliarToggle();

  // Registry of DOM nodes that double as platforms while playing (PlayerBar's nav
  // buttons/plate/familiar button, TopBar's link row/hamburger, KeybindsLegend, the
  // discoveries trigger). Platformer reads this via getBoundingClientRect(); the
  // setter identity per key is cached so passing it down doesn't cause re-attachment
  // on every GameScene render.
  const platformRefs = useRef<Record<string, HTMLElement | null>>({});
  const platformRefSetters = useRef<Record<string, (el: HTMLElement | null) => void>>({});
  const setPlatformRef = (key: string) => {
    if (!platformRefSetters.current[key]) {
      platformRefSetters.current[key] = (el: HTMLElement | null) => { platformRefs.current[key] = el; };
    }
    return platformRefSetters.current[key];
  };

  return (
    <div className={styles.scene}>
      <div ref={particleHostRef} className={styles.particles} aria-hidden />
      <KeybindsLegend setPlatformRef={setPlatformRef} />
      <div className={styles.heroWrap} style={{ transform: state.familiarOpen ? 'translateX(-14vw)' : 'translateX(0)' }}>
        <HeroCharacterViewer />
      </div>
      <TopBar setPlatformRef={setPlatformRef} />
      <PlayerBar onSummonFamiliar={toggleFamiliar} setPlatformRef={setPlatformRef} />
      {state.playing && <Platformer platformRefs={platformRefs} />}
    </div>
  );
}
```

- [ ] **Step 14: Build, then manually verify the full playable loop**

Run: `npm run build`
Expected: succeeds with no TS errors (this is the step most likely to surface prop-type mismatches — fix any and re-run before moving on).

Run: `npm run dev`, open the app in a desktop-width browser window.
Manually verify, in order:
1. Click "▶ START". A small (~32×40px) pixelated character sprite appears standing on top of the bottom bar (`PlayerBar`).
2. Hold the Right arrow key — the sprite walks right and visually flips to face right; hold Left — it walks left and flips to face left.
3. Press Space while standing on the bar — the sprite jumps up and falls back down, landing back on the bar (not falling through it).
4. Walk the sprite left/right along the bottom bar, onto the segment under one of the 5 nav icons (e.g. the world-map/◆ icon) — the World Map dialog opens automatically, the same as clicking that button would.
5. With a dialog open, the sprite stops responding to arrow keys/space (frozen in place). Close the dialog (✕ or Esc) — the sprite resumes exactly where it was and responds to input again.
6. Open the browser dev tools, switch to a mobile viewport width (e.g. 375px) via responsive design mode, reload, click Start — two on-screen buttons (◀▶) and a jump button appear near the bottom of the screen; tapping/clicking and holding them moves and jumps the sprite the same way the keyboard does.
7. Press Escape (no dialog open) — the sprite disappears and the character-picker screen (Step 1's UI) reappears.

- [ ] **Step 15: Commit**

```bash
git add client/src/content.json client/src/content.ts client/src/hooks/usePlatformRects.ts client/src/hooks/useHeldKeys.ts client/src/hooks/usePlatformerLoop.ts client/src/components/scene/Platformer.tsx client/src/components/scene/Platformer.module.css client/src/components/scene/TouchControls.tsx client/src/components/scene/TouchControls.module.css client/src/components/scene/TopBar.tsx client/src/components/scene/KeybindsLegend.tsx client/src/components/shared/DiscoveryListPanel.tsx client/src/components/scene/PlayerBar.tsx client/src/components/scene/GameScene.tsx
git commit -m "feat: playable platformer — HUD bars as platforms, walk-into nav triggers"
```

---

## Task 3: Decorative platforms

**Files:**
- Create: `client/src/components/scene/DecorativePlatforms.tsx`
- Create: `client/src/components/scene/DecorativePlatforms.module.css`
- Modify: `client/src/components/scene/GameScene.tsx`

**Interfaces:**
- Consumes: `content.ui.platformer.decorativePlatforms` / `decorativePlatformsMobile` (added in Task 2, Step 1); already included in `usePlatformRects`'s collision list from Task 2 — this task only adds the *visual* boxes so players can see where those rectangles are.

- [ ] **Step 1: Create the component and its CSS**

Create `client/src/components/scene/DecorativePlatforms.module.css`:

```css
.desktopOnly { display: contents; }
.mobileOnly { display: none; }

@media (max-width: 768px) {
  .desktopOnly { display: none; }
  .mobileOnly { display: contents; }
}

.platform {
  position: fixed;
  z-index: 4;
  background: #2b2b30;
  border: 3px solid #1c1c20;
  box-shadow: 3px 3px 0 rgba(20, 20, 23, .35);
}
```

Create `client/src/components/scene/DecorativePlatforms.tsx`:

```tsx
import { content } from '../../content';
import styles from './DecorativePlatforms.module.css';

export function DecorativePlatforms() {
  return (
    <>
      <div className={styles.desktopOnly}>
        {content.ui.platformer.decorativePlatforms.map((p, i) => (
          <div
            key={i}
            className={styles.platform}
            style={{ top: `${p.top}vh`, left: `${p.left}vw`, width: `${p.width}vw`, height: `${p.height}vh` }}
          />
        ))}
      </div>
      <div className={styles.mobileOnly}>
        {content.ui.platformer.decorativePlatformsMobile.map((p, i) => (
          <div
            key={i}
            className={styles.platform}
            style={{ top: `${p.top}vh`, left: `${p.left}vw`, width: `${p.width}vw`, height: `${p.height}vh` }}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Mount it in GameScene**

In `client/src/components/scene/GameScene.tsx`, add the import alongside the `Platformer` import:

```tsx
import { Platformer } from './Platformer';
import { DecorativePlatforms } from './DecorativePlatforms';
```

and render it alongside `Platformer`:

```tsx
      {state.playing && <DecorativePlatforms />}
      {state.playing && <Platformer platformRefs={platformRefs} />}
```

- [ ] **Step 3: Build, then manually verify**

Run: `npm run build`
Expected: succeeds.

Run: `npm run dev`, click Start.
Manually verify:
1. 4 extra small dark rectangular platforms are visible scattered around the screen (not overlapping the HUD bars), at desktop width.
2. Walk/jump the sprite onto one — it lands and rests on top of it like any other platform.
3. Switch to a mobile viewport width in dev tools and reload — a different (smaller, 2-platform) set appears instead, sized for the narrower screen.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/scene/DecorativePlatforms.tsx client/src/components/scene/DecorativePlatforms.module.css client/src/components/scene/GameScene.tsx
git commit -m "feat: add decorative floating platforms"
```

---

## Task 4: Keybinds legend — playing-mode prompts

**Files:**
- Modify: `client/src/content.json`
- Modify: `client/src/content.ts`
- Modify: `client/src/components/scene/KeybindsLegend.tsx`

**Interfaces:**
- Produces: `ui.keybinds.move`, `ui.keybinds.jump`, `ui.keybinds.stopPlaying` (new strings, consumed only within this task).

- [ ] **Step 1: Add the three new strings to content.json**

In `client/src/content.json`, replace the `"keybinds"` block:

```json
    "keybinds": {
      "heading": "KEYBINDS",
      "changeCharacter": "CHANGE CHARACTER",
      "summonFamiliar": "SUMMON FAMILIAR",
      "close": "CLOSE"
    },
```

with:

```json
    "keybinds": {
      "heading": "KEYBINDS",
      "changeCharacter": "CHANGE CHARACTER",
      "summonFamiliar": "SUMMON FAMILIAR",
      "close": "CLOSE",
      "move": "MOVE",
      "jump": "JUMP",
      "stopPlaying": "STOP PLAYING"
    },
```

- [ ] **Step 2: Update the type in content.ts**

In `client/src/content.ts`, replace:

```ts
    keybinds: { heading: string; changeCharacter: string; summonFamiliar: string; close: string };
```

with:

```ts
    keybinds: { heading: string; changeCharacter: string; summonFamiliar: string; close: string; move: string; jump: string; stopPlaying: string };
```

- [ ] **Step 3: Branch the legend rows on `state.playing`**

In `client/src/components/scene/KeybindsLegend.tsx`, replace the `rows` function:

```tsx
function rows(): Array<{ key: string; label: string } | { keys: [string, string]; label: string }> {
  return [
    { keys: ['←', '→'], label: ui.keybinds.changeCharacter },
    { key: '1', label: ui.sections.journey.navLabel },
    { key: '2', label: ui.sections.quests.navLabel },
    { key: '3', label: ui.sections.experience.navLabel },
    { key: '4', label: ui.sections.hobbies.navLabel },
    { key: '5', label: ui.sections.contact.navLabel },
    { key: 'F', label: ui.keybinds.summonFamiliar },
    { key: 'ESC', label: ui.keybinds.close },
  ];
}
```

with:

```tsx
function rows(playing: boolean): Array<{ key: string; label: string } | { keys: [string, string]; label: string }> {
  if (playing) {
    return [
      { keys: ['←', '→'], label: ui.keybinds.move },
      { key: 'SPACE', label: ui.keybinds.jump },
      { key: 'ESC', label: ui.keybinds.stopPlaying },
    ];
  }
  return [
    { keys: ['←', '→'], label: ui.keybinds.changeCharacter },
    { key: '1', label: ui.sections.journey.navLabel },
    { key: '2', label: ui.sections.quests.navLabel },
    { key: '3', label: ui.sections.experience.navLabel },
    { key: '4', label: ui.sections.hobbies.navLabel },
    { key: '5', label: ui.sections.contact.navLabel },
    { key: 'F', label: ui.keybinds.summonFamiliar },
    { key: 'ESC', label: ui.keybinds.close },
  ];
}
```

and the call site:

```tsx
      {rows().map((row, i) => (
```

becomes:

```tsx
      {rows(state.playing).map((row, i) => (
```

- [ ] **Step 4: Build, then manually verify**

Run: `npm run build`
Expected: succeeds.

Run: `npm run dev`.
Manually verify:
1. Before pressing Start, the keybinds legend (bottom-left-ish, desktop only) shows the original rows: `← → CHANGE CHARACTER`, `1 WORLD MAP`, ... `ESC CLOSE`.
2. Click Start — the legend now shows exactly three rows: `← → MOVE`, `SPACE JUMP`, `ESC STOP PLAYING`.
3. Press Escape — the legend switches back to the original 8 rows.

- [ ] **Step 5: Commit**

```bash
git add client/src/content.json client/src/content.ts client/src/components/scene/KeybindsLegend.tsx
git commit -m "feat: swap keybinds legend to movement prompts while playing"
```

---

## Task 5: Final polish and full QA pass

**Files:** none new — verification and, if needed, small tuning fixes to files already touched in Tasks 1-4 (physics constants in `usePlatformerLoop.ts`, decorative platform coordinates in `content.json`, z-index values).

- [ ] **Step 1: Full desktop manual QA**

Run: `npm run dev`. On a desktop-width window:
1. Cycle through all 5 characters with ◀/▶ before pressing Start — confirm this still works exactly as before (this plan does not touch `PREV_CHAR`/`NEXT_CHAR` logic itself, only when ArrowLeft/Right dispatch it).
2. Press Start with each of the 5 different characters selected at least once — confirm the correct character's sprite (matching `CHARS[state.charIdx].src`) is the one shown walking.
3. Walk into all 5 `PlayerBar` nav buttons one at a time (closing each dialog with Esc before moving to the next) — confirm all 5 dialogs open correctly (World Map, Battle Log, Quest Log, Inventory, Contact) and match what clicking each button does.
4. Stand on the `TopBar` link row, the `KeybindsLegend` box, and the discoveries trigger button — confirm the sprite can stand on each without falling through, and that touching them does **not** open any link, panel, or dialog (only the 5 `PlayerBar` nav buttons should trigger anything).
5. Deliberately walk off the edge of a platform in mid-air (no platform below) and let the character fall — confirm it respawns standing on the bottom bar rather than disappearing or getting stuck off-screen.
6. Open the Familiar chat (`F` key) while playing — confirm the sprite freezes, and resumes when the chat is closed.
7. Open the discoveries panel (top-left compass button) while playing — confirm the sprite freezes, and resumes when it's closed.

- [ ] **Step 2: Full mobile manual QA**

In dev tools' responsive mode at a mobile width (e.g. 375×667):
1. Confirm the `KeybindsLegend` is not shown at all (already hidden below 768px, unaffected by this plan).
2. Press Start — confirm the on-screen ◀▶/jump buttons appear above the bottom nav bar without overlapping it, and moving/jumping works via tap-and-hold.
3. Confirm walking into one of the 5 bottom-bar nav icons still opens its dialog on mobile.
4. Confirm the sprite doesn't visually clip behind the fixed bottom nav bar or the mobile hamburger menu.

- [ ] **Step 3: Tune physics/positions if anything felt off in Steps 1-2**

If movement felt too slow/fast, or the jump too weak/strong, adjust the three constants at the top of `client/src/hooks/usePlatformerLoop.ts` (`GRAVITY`, `MOVE_SPEED`, `JUMP_VELOCITY`) and re-test. If any decorative platform visually overlapped a HUD element awkwardly, adjust its `top`/`left`/`width`/`height` in `client/src/content.json`'s `ui.platformer.decorativePlatforms`/`decorativePlatformsMobile`. These are the only two places tuning should happen — do not change the collision algorithm itself.

- [ ] **Step 4: Run the full build and lint**

Run: `npm run build`
Expected: succeeds with no errors.

Run: `npm run lint`
Expected: no new errors introduced by this feature (pre-existing warnings, if any, are out of scope).

- [ ] **Step 5: Commit (only if Step 3 required changes)**

```bash
git add client/src/hooks/usePlatformerLoop.ts client/src/content.json
git commit -m "fix: tune platformer physics and decorative platform placement"
```

If Step 3 required no changes, skip this commit — there's nothing to commit.
