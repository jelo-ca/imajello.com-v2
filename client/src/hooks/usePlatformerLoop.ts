import { useEffect, useRef, useState } from 'react';
import type { Platform } from './usePlatformRects';
import type { MoveKey } from './useHeldKeys';

export interface PlatformerPose {
  x: number;
  y: number;
  facing: 'left' | 'right';
  grounded: boolean;
  // False until the very first frame where the real PlayerBar geometry has been measured
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
}

// PlayerBar's entire bar (GameScene registers it under the fixed key 'bar' — see
// PlayerBar.tsx) is the floor on desktop: one continuous strip spanning its full width,
// so there's no gap to fall through between the player plate, nav buttons, and familiar
// button. Below 768px the bar itself collapses to zero height (PlayerBar.module.css
// pulls .nav/.familiarWrap out to fixed-bottom instead), so the floor there is
// nav.top === familiarWrap.top (the two sit flush against each other with no gap —
// .nav is `right: 64px`, .familiarWrap is `width: 64px` at `right: 0`).
function hasFloor(platforms: Platform[]): boolean {
  return platforms.some(p => p.key === 'bar' || p.key === 'nav' || p.key === 'familiar');
}

function floorTop(platforms: Platform[]): number {
  const bar = platforms.find(p => p.key === 'bar');
  if (bar) return bar.top;
  const mobileFloorTops = platforms.filter(p => p.key === 'nav' || p.key === 'familiar').map(p => p.top);
  if (mobileFloorTops.length > 0) return Math.min(...mobileFloorTops);
  return window.innerHeight - 40;
}

export function usePlatformerLoop({ platforms, paused, heldKeys, spriteWidth, spriteHeight }: Params): PlatformerPose {
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
  // Flips true exactly once, the first tick where a real floor platform exists — see
  // the spawn-gate block at the top of tick() below.
  const hasSpawnedRef = useRef(false);
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
      // signal. Wait specifically for the real floor (desktop's 'bar', or mobile's
      // 'nav'/'familiar'), then perform the one-time spawn placement using accurate
      // floorTop() and mark ready. Skip physics entirely until then so nothing gets
      // simulated (or, via `pose.ready`, rendered) from the placeholder position.
      if (!hasSpawnedRef.current) {
        if (!hasFloor(platforms)) return;
        p.x = window.innerWidth / 2 - spriteWidth / 2;
        p.y = floorTop(platforms) - spriteHeight;
        p.vx = 0;
        p.vy = 0;
        p.grounded = false;
        hasSpawnedRef.current = true;
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

      // Fell through everything — respawn on the floor (PlayerBar's 'bar' platform).
      if (p.y > window.innerHeight) {
        p.x = window.innerWidth / 2 - spriteWidth / 2;
        p.y = floorTop(platforms) - spriteHeight;
        p.vy = 0;
        p.grounded = false;
      }

      setPose({ x: p.x, y: p.y, facing: p.facing, grounded: p.grounded, ready: true });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [platforms, paused, heldKeys, spriteWidth, spriteHeight]);

  return pose;
}
