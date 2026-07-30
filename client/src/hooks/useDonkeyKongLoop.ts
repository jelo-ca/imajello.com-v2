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

      // A ladder's authored bottom is vh-scaled (content.json), but the floor it must
      // reach is measured in real pixels from PlayerBar (useFloorRect) — those two don't
      // scale together as the viewport grows, so at tall enough viewports the ground
      // ladder's vh-authored bottom falls short of the actual floor and can never be
      // grabbed. Instead of trusting the authored bottom, extend each ladder down to
      // whichever is lower: its authored bottom, or the top of the nearest surface
      // actually below it (LADDER_EPS excludes the girder the ladder starts on). Ladders
      // that run girder-to-girder are unaffected since their authored bottom already
      // equals the next girder's top.
      const LADDER_EPS = 0.5;
      const ladderBottom = (l: PixelRect): number => {
        let nearestBelow: number | null = null;
        for (const s of surfaces) {
          if (s.top > l.top + LADDER_EPS && (nearestBelow === null || s.top < nearestBelow)) {
            nearestBelow = s.top;
          }
        }
        const authoredBottom = l.top + l.height;
        return nearestBelow === null ? authoredBottom : Math.max(authoredBottom, nearestBelow);
      };

      const centerX = p.x + spriteWidth / 2;
      const ladder = level.ladders.find(l =>
        centerX > l.left && centerX < l.left + l.width &&
        p.y + spriteHeight > l.top && p.y < ladderBottom(l),
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
        const bottom = ladderBottom(ladder);
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
