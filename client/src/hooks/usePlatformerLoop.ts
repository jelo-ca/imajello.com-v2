import { useEffect, useRef, useState } from 'react';
import type { SectionKey } from '../data/discoveries';
import type { Platform } from './usePlatformRects';
import type { MoveKey } from './useHeldKeys';

export interface PlatformerPose {
  x: number;
  y: number;
  facing: 'left' | 'right';
  grounded: boolean;
  // False until the very first frame where real nav-button geometry has been measured
  // (see hasSpawnedRef below). Callers must not render the sprite while this is false —
  // the pose fields are placeholder values that don't correspond to any real platform.
  ready: boolean;
}

const GRAVITY = 1800; // px/s^2
const MOVE_SPEED = 220; // px/s
const JUMP_VELOCITY = -820; // px/s, negative = up — peak height ~187px, enough to reach the decorative-platform staircase

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

// Finds the platform actually underfoot at a given x on the floor row (top === floorTop).
// Used only when *teleporting* the sprite directly onto the floor (initial spawn, or
// respawn after falling through everything) — never during normal per-frame collision,
// which already does its own overlap/crossedTop test. The point of this helper is to seed
// `lastLandedKeyRef` with the correct key *before* the next frame's organic collision
// naturally re-detects "landing" on this same platform, so that re-detection isn't
// mistaken for a brand-new arrival and doesn't re-fire onTriggerSection every time the
// sprite spawns or respawns on top of a nav button (see the two call sites below).
function findRestingPlatformKey(platforms: Platform[], x: number, spriteWidth: number): string | null {
  const floor = floorTop(platforms);
  for (const plat of platforms) {
    if (Math.abs(plat.top - floor) > 0.5) continue;
    const overlapsHorizontally = x + spriteWidth > plat.left && x < plat.left + plat.width;
    if (overlapsHorizontally) return plat.key;
  }
  return null;
}

export function usePlatformerLoop({ platforms, paused, heldKeys, spriteWidth, spriteHeight, onTriggerSection }: Params): PlatformerPose {
  // NOTE: this initializer only ever runs once, on the very first render — at that point
  // usePlatformRects (the caller's `platforms` source) has not measured anything yet (it
  // starts at [] and only populates via its own effect), so `floorTop(platforms)` here
  // would hit the window.innerHeight-40 fallback, not the real bar position. These x/y
  // values are placeholders and are never simulated or rendered — see hasSpawnedRef below,
  // which performs the real spawn placement once real nav-button geometry exists, and
  // `pose.ready`, which callers must check before rendering anything from this hook.
  const poseRef = useRef({
    x: window.innerWidth / 2 - spriteWidth / 2,
    y: floorTop(platforms) - spriteHeight,
    vx: 0,
    vy: 0,
    facing: 'right' as 'left' | 'right',
    grounded: false,
  });
  // Flips true exactly once, the first tick where a real (sectionKey-bearing) platform
  // exists — see the spawn-gate block at the top of tick() below.
  const hasSpawnedRef = useRef(false);
  const lastLandedKeyRef = useRef<string | null>(null);
  const [pose, setPose] = useState<PlatformerPose>({
    x: poseRef.current.x,
    y: poseRef.current.y,
    facing: 'right',
    grounded: false,
    ready: false,
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

      // Spawn gate: decorativePlatforms() (part of `platforms`) is always non-empty
      // regardless of DOM measurement, since it's computed purely from content.json +
      // viewport size — so `platforms.length > 0` alone is not a reliable "measured yet"
      // signal. Wait specifically for a real nav-button (sectionKey-bearing) platform,
      // then perform the one-time spawn placement using accurate floorTop() and mark
      // ready. Skip physics entirely until then so nothing gets simulated (or, via
      // `pose.ready`, rendered) from the placeholder position.
      if (!hasSpawnedRef.current) {
        const hasRealFloor = platforms.some(pl => pl.sectionKey !== undefined);
        if (!hasRealFloor) return;
        p.x = window.innerWidth / 2 - spriteWidth / 2;
        p.y = floorTop(platforms) - spriteHeight;
        p.vx = 0;
        p.vy = 0;
        p.grounded = false;
        hasSpawnedRef.current = true;
        // Seed lastLandedKeyRef to whatever platform we're actually spawning on top of
        // (viewport-center x is architecturally guaranteed to land on one of the nav
        // buttons — see PlayerBar's grid/flex layout) so next frame's organic collision,
        // which will naturally re-detect landing on this same platform, doesn't treat it
        // as a fresh arrival and open that section's dialog before the player has done
        // anything.
        lastLandedKeyRef.current = findRestingPlatformKey(platforms, p.x, spriteWidth);
        setPose({ x: p.x, y: p.y, facing: p.facing, grounded: p.grounded, ready: true });
        return; // spawn placement only this frame; normal physics/collision begins next frame
      }

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
      // This is a teleport, not an organic landing, so (mirroring the initial-spawn gate
      // above) seed lastLandedKeyRef to the platform we're actually being placed on and
      // return immediately — skip this frame's trigger-check entirely and let the *next*
      // frame's organic collision re-detect landing on this same platform, which (with
      // the seed matching) correctly does not re-fire onTriggerSection. Previously this
      // branch fell through into the trigger-check below with landedKey reset to null,
      // which only suppressed the trigger for this one frame; the very next frame's
      // genuine landing detection would then see a mismatch against the stale
      // lastLandedKeyRef and re-fire the trigger on every single fall-and-respawn.
      if (p.y > window.innerHeight) {
        p.x = window.innerWidth / 2 - spriteWidth / 2;
        p.y = floorTop(platforms) - spriteHeight;
        p.vy = 0;
        p.grounded = false;
        lastLandedKeyRef.current = findRestingPlatformKey(platforms, p.x, spriteWidth);
        setPose({ x: p.x, y: p.y, facing: p.facing, grounded: p.grounded, ready: true });
        return;
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

      setPose({ x: p.x, y: p.y, facing: p.facing, grounded: p.grounded, ready: true });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [platforms, paused, heldKeys, spriteWidth, spriteHeight, onTriggerSection]);

  return pose;
}
