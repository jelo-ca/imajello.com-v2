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
