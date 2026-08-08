import type { PlatformRectSpec, LevelSpec } from '../content';
import { generateLevelSpec } from './levelGenerator';

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

function goalSquareRect(spec: PlatformRectSpec, vw: number, vh: number): PixelRect {
  const side = spec.height * vh;
  return { top: spec.top * vh, left: spec.left * vw, width: side, height: side };
}

// Level 1 hands back the authored layout untouched; everything above it is generated
// from (seed, level) — see levelGenerator. The seed lives in game state so the layout is
// stable for the whole run: this is re-called on every resize, and a level that
// reshuffled itself when the window changed size would be unplayable.
export function levelSpec(level: number, seed: number): LevelSpec {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  return generateLevelSpec(level, seed, isMobile, window.innerWidth / 100, window.innerHeight / 100);
}

// A ladder runs from the girder it stands on down to whatever surface is next below it.
// Resolving that here — rather than trusting the vh-authored height from content.json —
// serves two purposes. Girder positions are vh-scaled but PlayerBar's height is very
// nearly fixed in pixels, so the two drift apart as the viewport grows: an authored
// bottom can fall short of the real floor (leaving the ground ladder ungrabbable) or
// overshoot it (drawing the ladder down through the HUD). And because both the physics
// loop and the renderer consume this same result, the climbable region and the drawn
// ladder can never disagree.
const LADDER_EPS = 0.5;

export function resolveLadderRects(level: LevelGeometry, floor: PixelRect | null): PixelRect[] {
  const surfaces = floor ? [floor, ...level.girders] : level.girders;
  return level.ladders.map(l => {
    let nearestBelow: number | null = null;
    for (const s of surfaces) {
      // EPS excludes the girder the ladder itself stands on.
      if (s.top > l.top + LADDER_EPS && (nearestBelow === null || s.top < nearestBelow)) {
        nearestBelow = s.top;
      }
    }
    const bottom = nearestBelow ?? l.top + l.height;
    return { top: l.top, left: l.left, width: l.width, height: Math.max(0, bottom - l.top) };
  });
}

export function levelPixelGeometry(level: number, seed: number): LevelGeometry {
  const spec = levelSpec(level, seed);
  const vw = window.innerWidth / 100;
  const vh = window.innerHeight / 100;
  return {
    girders: spec.girders.map(specToPixelRect),
    ladders: spec.ladders.map(specToPixelRect),
    // The goal is a square tile. Authoring width in vw and height in vh would let its
    // proportions swing with the viewport's aspect ratio, so the side is taken from the
    // authored height alone — which also leaves its bottom edge exactly where it was,
    // resting on the top girder. Collision reads this same rect, so the drawn tile and
    // the winning region stay identical.
    goal: goalSquareRect(spec.goal, vw, vh),
    barrelSpawn: { top: spec.barrelSpawn.top * vh, left: spec.barrelSpawn.left * vw },
  };
}
