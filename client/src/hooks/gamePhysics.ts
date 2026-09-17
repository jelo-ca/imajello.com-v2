// Physics constants are authored for a reference viewport. Live speeds are multiplied by
// the current size / reference so a short/narrow window doesn't finish the climb faster
// (geometry is vh/vw, speeds used to be fixed px/s).

export const REF_WIDTH = 1280;
export const REF_HEIGHT = 800;

export const BASE_GRAVITY = 1800; // px/s^2
export const BASE_MOVE_SPEED = 220; // px/s
export const BASE_JUMP_VELOCITY = -500; // px/s, negative = up
export const BASE_CLIMB_SPEED = 150; // px/s
export const BASE_BARREL_SPEED = 200; // px/s
export const BASE_BARREL_HOP_VELOCITY = -320; // px/s
export const BASE_BARREL_GAP_HOP_MAX = 470; // px/s

export const PLAYER_SPRITE_HEIGHT = 50;
export const BARREL_SIZE = 18;

// Peak height of a standing jump at the reference scale: v² / (2g).
export const BASE_JUMP_PEAK_PX =
  (BASE_JUMP_VELOCITY * BASE_JUMP_VELOCITY) / (2 * BASE_GRAVITY);

// Vertical clear space between girder tops so a jump from below can't overlap a resting
// barrel on the row above: jump peak + player height + slack.
export const BASE_MIN_ROW_GAP_PX = Math.ceil(BASE_JUMP_PEAK_PX + PLAYER_SPRITE_HEIGHT + 12);

export interface PhysicsScale {
  x: number;
  y: number;
}

export function physicsScale(width = window.innerWidth, height = window.innerHeight): PhysicsScale {
  return {
    x: width / REF_WIDTH,
    y: height / REF_HEIGHT,
  };
}

export function minRowGapPx(scaleY = physicsScale().y): number {
  return Math.ceil(BASE_MIN_ROW_GAP_PX * scaleY);
}
