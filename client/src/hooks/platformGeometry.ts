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
