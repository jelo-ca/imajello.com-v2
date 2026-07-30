import { content } from '../content';
import type { PlatformRectSpec } from '../content';

// Shared by usePlatformRects.ts (collision geometry, in JS px) and DecorativePlatforms.tsx
// (visual rendering, also now in JS px instead of CSS vh/vw) so the drawn box and the
// collidable rectangle can never diverge again. CSS vh/vw resolve against the *large*
// viewport per spec (URL-bar-collapsed height on mobile), while window.innerHeight/Width
// reflect the *current* viewport (URL-bar-included) — these differ by 60-100px on mobile
// while the URL bar is visible, more than half the sprite's height, which used to make the
// drawn decorative platforms visibly disagree with where the sprite would actually land.
export const MOBILE_BREAKPOINT = 768;

export interface PixelRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function decorativePlatformSpecs(): PlatformRectSpec[] {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  return isMobile ? content.ui.platformer.decorativePlatformsMobile : content.ui.platformer.decorativePlatforms;
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

export function decorativePlatformPixelRects(): PixelRect[] {
  return decorativePlatformSpecs().map(specToPixelRect);
}
