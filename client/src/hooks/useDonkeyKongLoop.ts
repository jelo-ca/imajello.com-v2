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
  // Jumper barrels hop periodically while rolling.
  jumper: boolean;
  hopTimer: number;
  // `top` of the surface this barrel last came to rest on, or null before its first
  // landing. The cascade's direction flip fires only when a barrel arrives on a
  // *different* surface than it was resting on — i.e. an actual row-to-row step. Both
  // the spawn arrival (nothing to compare against) and a jumper's hop-in-place (same
  // surface) must leave direction untouched, or barrels reverse on the spot and roll
  // straight back off the edge they came from.
  surfaceTop: number | null;
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
// ~20vh gap between girder rows. Ladders are the only way up, as in the original.
const JUMP_VELOCITY = -500; // px/s, negative = up
const CLIMB_SPEED = 150; // px/s
// Slack on the ladder grab test so standing exactly on a girder still counts as being
// at the head of the ladder that descends from it.
const LADDER_GRAB_EPS = 1;
// Kept below MOVE_SPEED so a barrel chasing you from behind can still be outrun.
const BARREL_SPEED = 200; // px/s
// Randomised so the rhythm can't be memorised; occasionally two roll out together.
const BARREL_INTERVAL_MIN = 1.1; // seconds
const BARREL_INTERVAL_MAX = 2.6; // seconds
const BARREL_PAIR_CHANCE = 0.25;
// Some barrels hop as they roll, so a single well-timed jump isn't always the answer.
// Peak ~28px puts a hopping barrel's top around 46px up, still clearable under the
// player's ~69px jump but only with real timing.
const BARREL_JUMPER_CHANCE = 0.3;
const BARREL_HOP_VELOCITY = -320; // px/s, negative = up
const BARREL_HOP_INTERVAL = 0.9; // seconds between hops while grounded

export const BARREL_SIZE = 18; // px

function randomSpawnDelay(): number {
  return BARREL_INTERVAL_MIN + Math.random() * (BARREL_INTERVAL_MAX - BARREL_INTERVAL_MIN);
}

interface Params {
  level: LevelGeometry;
  // Pre-resolved so the climbable region always matches the drawn ladder — see
  // resolveLadderRects in platformGeometry.
  ladders: PixelRect[];
  floor: PixelRect | null;
  paused: boolean;
  status: 'climbing' | 'dead' | 'won' | 'gameover';
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
  level, ladders, floor, paused, status, heldKeys, spriteWidth, spriteHeight, onHit, onWin,
}: Params): DkPose {
  const pRef = useRef({
    x: 0, y: 0, vx: 0, vy: 0,
    facing: 'right' as 'left' | 'right',
    grounded: false,
    climbing: false,
  });
  const barrelsRef = useRef<Barrel[]>([]);
  const spawnTimerRef = useRef(0);
  const nextSpawnRef = useRef(randomSpawnDelay());
  const barrelIdRef = useRef(0);
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

    // xOffset trails a paired barrel behind the leader (barrels roll right off the
    // spawn), so the two travel as a close pair rather than overlapping.
    const spawnBarrel = (xOffset: number) => {
      barrelsRef.current.push({
        id: barrelIdRef.current++,
        x: level.barrelSpawn.left + xOffset,
        y: level.barrelSpawn.top,
        vx: BARREL_SPEED,
        vy: 0,
        grounded: false,
        jumper: Math.random() < BARREL_JUMPER_CHANCE,
        // Staggered so jumpers spawned together don't hop in lockstep.
        hopTimer: Math.random() * BARREL_HOP_INTERVAL,
        surfaceTop: null,
      });
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
          spawnTimerRef.current = 0;
          nextSpawnRef.current = randomSpawnDelay();
          publish(true);
          return;
        }
      }

      // Frozen while the win / game-over banner is up.
      if (status !== 'climbing') return;

      const surfaces: PixelRect[] = [floor, ...level.girders];
      const keys = heldKeys.current;

      // `ladders` arrives already resolved (see resolveLadderRects in platformGeometry):
      // each one's height runs exactly to the surface below it, so the climbable region
      // and the drawn ladder are guaranteed to be the same rectangle.
      // The vertical test has to include the boundary. Landing snaps the player to
      // exactly `surface.top - spriteHeight`, so someone standing on a girder has their
      // feet precisely on it — and a ladder leading *down* from that girder has
      // `l.top === girderTop`. A strict `>` would compare girderTop with itself, fail,
      // and make descending a ladder impossible; only climbing up would ever work.
      const centerX = p.x + spriteWidth / 2;
      const feet = p.y + spriteHeight;
      const ladder = ladders.find(l =>
        centerX > l.left && centerX < l.left + l.width &&
        feet >= l.top - LADDER_GRAB_EPS && p.y < l.top + l.height,
      ) ?? null;

      // Entry and exit are checked in the same tick, so keep them mutually exclusive:
      // without justMounted, a player who walks onto a ladder still holding left/right
      // and presses up/down would have climbing set true and then immediately false in
      // the same frame, walking straight past the ladder instead of climbing it.
      let justMounted = false;
      if (!p.climbing && ladder && (keys.has('up') || keys.has('down'))) {
        p.climbing = true;
        p.vy = 0;
        justMounted = true;
      }
      if (!justMounted && p.climbing && (!ladder || keys.has('left') || keys.has('right'))) {
        p.climbing = false;
      }

      if (p.climbing && ladder) {
        const bottom = ladder.top + ladder.height;
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
        } else if (p.y + spriteHeight >= bottom) {
          p.y = bottom - spriteHeight;
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

      // --- barrels ---
      spawnTimerRef.current += dt;
      if (spawnTimerRef.current >= nextSpawnRef.current) {
        // Subtract the interval that was actually waited (not the new random one) so
        // the overshoot carries forward and the cadence doesn't drift late.
        spawnTimerRef.current -= nextSpawnRef.current;
        nextSpawnRef.current = randomSpawnDelay();
        spawnBarrel(0);
        // Sometimes a second barrel rolls out right behind the first, so one barrel
        // going past is no guarantee of a clear gap behind it.
        if (Math.random() < BARREL_PAIR_CHANCE) spawnBarrel(-BARREL_SIZE * 1.7);
      }

      const live: Barrel[] = [];
      for (const b of barrelsRef.current) {
        if (b.jumper && b.grounded) {
          b.hopTimer += dt;
          if (b.hopTimer >= BARREL_HOP_INTERVAL) {
            b.hopTimer = 0;
            b.vy = BARREL_HOP_VELOCITY;
            b.grounded = false;
          }
        }
        b.vy += GRAVITY * dt;
        const bPrevBottom = b.y + BARREL_SIZE;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const bNewBottom = b.y + BARREL_SIZE;

        let landedTop: number | null = null;
        for (const s of surfaces) {
          if (b.x + BARREL_SIZE <= s.left || b.x >= s.left + s.width) continue;
          if (bPrevBottom <= s.top && bNewBottom >= s.top && b.vy >= 0) {
            b.y = s.top - BARREL_SIZE;
            b.vy = 0;
            landedTop = s.top;
            break;
          }
        }
        const bLanded = landedTop !== null;
        // Reverse only when the barrel has arrived on a *different* surface than the one
        // it was resting on — that's the row-to-row step that makes the cascade zig-zag.
        // Rolling along a girder re-lands every frame on the same surface, a jumper's hop
        // comes back down on the same surface, and the spawn arrival has no previous
        // surface at all; none of those should flip direction.
        if (bLanded && b.surfaceTop !== null && landedTop !== b.surfaceTop) b.vx = -b.vx;
        if (bLanded) b.surfaceTop = landedTop;
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
        nextSpawnRef.current = randomSpawnDelay();
        placePlayer(floor);
        onHit();
      }

      if (overlaps(p.x, p.y, spriteWidth, spriteHeight, level.goal)) {
        onWin();
      }

      publish(true);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level, ladders, floor, paused, status, heldKeys, spriteWidth, spriteHeight, onHit, onWin]);

  return pose;
}
