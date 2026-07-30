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
