import { useEffect, useRef, useState } from 'react';
import type { LevelGeometry, PixelRect } from './platformGeometry';
import type { MoveKey } from './useHeldKeys';
import {
  BARREL_VARIANTS, pickBarrelVariant,
  type BarrelVariantId, type Difficulty,
} from './levelGenerator';

export interface Barrel {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  // Which barrel this is — drives its colour as well as its speed and hopping, so the
  // player can read the threat before it reaches them.
  variant: BarrelVariantId;
  // Jumper barrels hop periodically while rolling.
  jumper: boolean;
  // Whether this barrel clears holes in a girder instead of dropping through them. Rolled
  // per barrel from difficulty.gapJumpChance, so from level 3 on a gap is a gamble rather
  // than a guaranteed shelter.
  gapJumper: boolean;
  hopTimer: number;
  // Seconds left before this barrel goes live. While above zero it hangs at the spawn
  // point: no gravity, no movement, and no collision with the player. Gives the player a
  // beat to read the colour and the count of what's about to roll, so a barrel can never
  // appear and kill in the same breath.
  arming: number;
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
  // How long the current run has been climbing for. Advances only during live play, so
  // time spent in a dialog, on a death pause or on the level-cleared banner is not
  // counted — a leaderboard time has to mean the same thing for everyone.
  elapsedMs: number;
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
// The base roll speed, kept below MOVE_SPEED so a plain barrel chasing you from behind
// can still be outrun. Per-level scaling and the faster variants both multiply this, and
// those deliberately do cross MOVE_SPEED — from level 2 on, some barrels have to be
// dodged rather than walked away from.
const BARREL_SPEED = 200; // px/s
// Some barrels hop as they roll, so a single well-timed jump isn't always the answer.
// Peak ~28px puts a hopping barrel's top around 46px up, still clearable under the
// player's ~69px jump but only with real timing.
const BARREL_HOP_VELOCITY = -320; // px/s, negative = up
const BARREL_HOP_INTERVAL = 0.9; // seconds between hops while grounded

export const BARREL_SIZE = 18; // px
// How long a barrel is telegraphed at the spawn point before it starts rolling. Long
// enough to notice and plan around, short enough that it doesn't slow the cascade down.
const BARREL_ARM_TIME = 1.0; // seconds

// Spawn cadence is randomised so the rhythm can't be memorised, and the window itself
// tightens with the level (see difficultyFor).
function randomSpawnDelay(d: Difficulty): number {
  return d.spawnMin + Math.random() * (d.spawnMax - d.spawnMin);
}

interface Params {
  level: LevelGeometry;
  // Bumps when the player clears a level. Used only to detect that the run moved on, so
  // the player and the barrel field are reset onto the new geometry.
  levelIndex: number;
  // Barrel speed, spawn cadence and variant mix for the current level.
  difficulty: Difficulty;
  // Pre-resolved so the climbable region always matches the drawn ladder — see
  // resolveLadderRects in platformGeometry.
  ladders: PixelRect[];
  floor: PixelRect | null;
  paused: boolean;
  status: 'climbing' | 'dead' | 'won' | 'gameover';
  heldKeys: React.RefObject<Set<MoveKey>>;
  spriteWidth: number;
  spriteHeight: number;
  // Given the run's elapsed time so the reducer can record it when the hit is the fatal
  // one; the clock lives in here, so the dispatch site can't read it any other way.
  onHit: (elapsedMs: number) => void;
  onWin: () => void;
}

function overlaps(ax: number, ay: number, aw: number, ah: number, b: PixelRect): boolean {
  return ax < b.left + b.width && ax + aw > b.left && ay < b.top + b.height && ay + ah > b.top;
}

// The steepest launch a barrel will use to clear a hole. Anything that would need a higher
// arc than this drops through instead — which is mostly what happens to the slow barrels,
// since the arc is solved from the barrel's own speed and a slow crossing needs a long
// hang time. Capping it also keeps a hop from ever reaching the girder row above.
const BARREL_GAP_HOP_MAX = 470; // px/s
// Added to the crossing distance so the barrel lands past the far lip, not on top of it.
const BARREL_GAP_HOP_MARGIN = 10; // px

// A barrel rolling at a hole in its own girder hops it rather than falling through, so a
// gap can't be used as a safe pocket to wait out the cascade. Returns the launch velocity,
// or null when the barrel should just keep rolling — it isn't at an edge yet, the edge is
// the end of the row (where dropping to the next row is the whole point of the cascade),
// or the crossing would need a steeper arc than BARREL_GAP_HOP_MAX.
function gapHopVelocity(b: Barrel, surfaces: PixelRect[], dt: number): number | null {
  const speed = Math.abs(b.vx);
  if (speed < 1) return null;
  const dir = Math.sign(b.vx);
  const row = surfaces.filter(s => s.top === b.surfaceTop);
  const here = row.find(s => b.x + BARREL_SIZE > s.left && b.x < s.left + s.width);
  if (!here) return null;

  const edge = dir > 0 ? here.left + here.width : here.left;
  const lead = dir > 0 ? b.x + BARREL_SIZE : b.x;
  // Fire on the frame the barrel would otherwise roll off the edge.
  if ((edge - lead) * dir > speed * dt + 2) return null;

  // Nearest piece of the same girder beyond the edge. None means end of the row.
  let far: number | null = null;
  for (const s of row) {
    if (s === here) continue;
    const near = dir > 0 ? s.left : s.left + s.width;
    if ((near - edge) * dir <= 0) continue;
    if (far === null || (near - far) * dir < 0) far = near;
  }
  if (far === null) return null;

  const crossing = Math.abs(far - edge) + BARREL_SIZE + BARREL_GAP_HOP_MARGIN;
  // Time to cross at the barrel's current speed, then the launch that stays airborne
  // exactly that long: v = g * t / 2.
  const v = (GRAVITY * (crossing / speed)) / 2;
  return v > BARREL_GAP_HOP_MAX ? null : -v;
}

export function useDonkeyKongLoop({
  level, levelIndex, difficulty, ladders, floor, paused, status, heldKeys,
  spriteWidth, spriteHeight, onHit, onWin,
}: Params): DkPose {
  const pRef = useRef({
    x: 0, y: 0, vx: 0, vy: 0,
    facing: 'right' as 'left' | 'right',
    grounded: false,
    climbing: false,
  });
  const barrelsRef = useRef<Barrel[]>([]);
  const spawnTimerRef = useRef(0);
  const nextSpawnRef = useRef(randomSpawnDelay(difficulty));
  const barrelIdRef = useRef(0);
  const hasSpawnedRef = useRef(false);
  const prevStatusRef = useRef(status);
  const prevLevelRef = useRef(levelIndex);
  // Milliseconds of live play in the current run. Carries across levels — the score is
  // how fast the whole climb went, not the current level.
  const elapsedRef = useRef(0);
  const [pose, setPose] = useState<DkPose>({
    x: 0, y: 0, facing: 'right', climbing: false, ready: false, barrels: [], elapsedMs: 0,
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
      const variant = pickBarrelVariant(difficulty.weights, Math.random());
      const v = BARREL_VARIANTS[variant];
      barrelsRef.current.push({
        id: barrelIdRef.current++,
        x: level.barrelSpawn.left + xOffset,
        y: level.barrelSpawn.top,
        vx: BARREL_SPEED * difficulty.speedScale * v.speedMul,
        vy: 0,
        grounded: false,
        variant,
        jumper: v.jumper,
        gapJumper: Math.random() < difficulty.gapJumpChance,
        // Staggered so jumpers spawned together don't hop in lockstep.
        hopTimer: Math.random() * BARREL_HOP_INTERVAL,
        // Velocity is assigned up front but goes unused until the telegraph expires, so a
        // paired spawn arms on the same clock and the two go live together.
        arming: BARREL_ARM_TIME,
        surfaceTop: null,
      });
    };

    const resetField = () => {
      barrelsRef.current = [];
      spawnTimerRef.current = 0;
      nextSpawnRef.current = randomSpawnDelay(difficulty);
    };

    const publish = (ready: boolean) => {
      const p = pRef.current;
      setPose({
        x: p.x, y: p.y, facing: p.facing, climbing: p.climbing, ready,
        // Copied so React sees a new array each frame; barrelsRef holds the live objects.
        barrels: barrelsRef.current.map(b => ({ ...b })),
        elapsedMs: elapsedRef.current,
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
        elapsedRef.current = 0;
        publish(true);
        return;
      }

      // A new level means new geometry under a player who is still standing where the old
      // one left them, and a barrel field aimed at girders that no longer exist. Put both
      // back to a clean start before the first frame of the new layout is simulated.
      if (prevLevelRef.current !== levelIndex) {
        prevLevelRef.current = levelIndex;
        placePlayer(floor);
        resetField();
        publish(true);
        return;
      }

      // Coming back from a win or game over: reset the run before simulating again.
      if (prevStatusRef.current !== status) {
        const prev = prevStatusRef.current;
        const wasFrozen = prev !== 'climbing';
        prevStatusRef.current = status;
        if (status === 'climbing' && wasFrozen) {
          // Leaving game over is the one transition that starts a new run (DK_RESTART);
          // coming back from a death pause or a cleared level continues the current one,
          // so only the former puts the clock back to zero.
          if (prev === 'gameover') elapsedRef.current = 0;
          placePlayer(floor);
          resetField();
          publish(true);
          return;
        }
      }

      // Frozen while the win / game-over banner is up.
      if (status !== 'climbing') return;

      // Past every early return, so this only counts frames of live, unpaused play.
      elapsedRef.current += dt * 1000;

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

      // Mounting is directional: up only grabs when there's ladder above your feet, down
      // only when there's ladder below them. That matters now that up doubles as jump —
      // standing at the very top of a ladder leaves up free to jump rather than
      // re-grabbing a ladder that's already been climbed.
      const canClimbUp = ladder !== null && feet > ladder.top + LADDER_GRAB_EPS;
      const canClimbDown = ladder !== null && feet < ladder.top + ladder.height - LADDER_GRAB_EPS;

      // Entry and exit are checked in the same tick, so keep them mutually exclusive:
      // without justMounted, a player who walks onto a ladder still holding left/right
      // and presses up/down would have climbing set true and then immediately false in
      // the same frame, walking straight past the ladder instead of climbing it.
      let justMounted = false;
      if (!p.climbing && ((keys.has('up') && canClimbUp) || (keys.has('down') && canClimbDown))) {
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
        // Reaching this branch means we're not climbing, so up is free to mean jump.
        // 'jump' itself is still bound for the on-screen touch button.
        if ((keys.has('jump') || keys.has('up')) && p.grounded) {
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
        nextSpawnRef.current = randomSpawnDelay(difficulty);
        spawnBarrel(0);
        // Sometimes a second barrel rolls out right behind the first, so one barrel
        // going past is no guarantee of a clear gap behind it.
        if (Math.random() < difficulty.pairChance) spawnBarrel(-BARREL_SIZE * 1.7);
      }

      const live: Barrel[] = [];
      for (const b of barrelsRef.current) {
        // Telegraphed but not yet live: hold position and skip the whole simulation —
        // gravity, movement, landing and the off-screen cull all wait for it to arm.
        if (b.arming > 0) {
          b.arming -= dt;
          live.push(b);
          continue;
        }
        if (b.jumper && b.grounded) {
          b.hopTimer += dt;
          if (b.hopTimer >= BARREL_HOP_INTERVAL) {
            b.hopTimer = 0;
            b.vy = BARREL_HOP_VELOCITY * BARREL_VARIANTS[b.variant].hopMul;
            b.grounded = false;
          }
        }
        if (b.gapJumper && b.grounded && b.surfaceTop !== null) {
          const hop = gapHopVelocity(b, surfaces, dt);
          if (hop !== null) {
            b.vy = hop;
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

      // An arming barrel is scenery — the whole point of the telegraph is that standing
      // under the spawn while one appears can't cost a life.
      const hit = live.some(b => b.arming <= 0 && overlaps(p.x, p.y, spriteWidth, spriteHeight, {
        top: b.y, left: b.x, width: BARREL_SIZE, height: BARREL_SIZE,
      }));
      if (hit) {
        // Clearing the field and repositioning immediately means the overlap is gone
        // this same frame, so onHit() can't re-fire on the next one.
        resetField();
        placePlayer(floor);
        onHit(elapsedRef.current);
      }

      if (overlaps(p.x, p.y, spriteWidth, spriteHeight, level.goal)) {
        onWin();
      }

      publish(true);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    level, levelIndex, difficulty, ladders, floor, paused, status, heldKeys,
    spriteWidth, spriteHeight, onHit, onWin,
  ]);

  return pose;
}
