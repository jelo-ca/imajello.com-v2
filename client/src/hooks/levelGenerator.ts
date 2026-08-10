import { content } from '../content';
import type { LevelSpec, PlatformRectSpec } from '../content';

// Procedural levels for the climb. Level 1 is the hand-authored layout from content.json
// and is returned untouched; every level after it is generated here, getting taller,
// gappier and faster as the player keeps reaching the top.
//
// Everything is authored back out in the same vh/vw units content.json uses, so the rest
// of the pipeline (platformGeometry -> DkLevel + useDonkeyKongLoop) is unchanged and the
// drawn level and the collided level still come from one spec. The pixel-sized rules
// below (row spacing, gap widths, minimum standing room) are checked against the *live*
// viewport before being converted, because a constant like "12vh" is a comfortable step
// on a tall monitor and a jumpable one on a short laptop — and a jumpable step would
// break the rule that ladders are the only way up.

// ---- tuning ----

export const MAX_ROWS = 5;
// Must stay above the player's ~69px jump peak, or a row could be jumped instead of
// climbed. Rows are dropped rather than squeezed below this.
const MIN_ROW_GAP_PX = 84;
// Narrow enough to clear with a running jump (~122px of travel), wide enough to fall
// through if you walk off it. The upper bound is also what keeps the barrel gap-hop
// honest: at 70px even the slowest barrel that hops at all clears with margin, and its
// arc peaks below the player's jump height, so a hopping barrel is always jumpable.
const GAP_MIN_PX = 46;
const GAP_MAX_PX = 70;
// Standing room that has to survive on either side of a gap.
const MIN_SEGMENT_PX = 96;
// Room kept solid around a ladder column so you can always step on and off it.
const LADDER_CLEAR_PX = 30;
// Keeps ladders off the very ends of a girder, where there'd be nowhere to stand.
const EDGE_MARGIN_VW = 3;

// ---- rng ----

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

// mulberry32. The layout has to be a pure function of (seed, level): useLevelGeometry
// regenerates on every resize, and a level that reshuffled itself mid-climb because the
// window moved would be unplayable.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- barrels ----

export type BarrelVariantId = 'classic' | 'swift' | 'lazy' | 'hopper' | 'wild';

export interface BarrelVariant {
  // Multiplies the base roll speed. Anything at or above 1.1 outruns the player, so the
  // fast variants can only be dodged, never simply walked away from.
  speedMul: number;
  jumper: boolean;
  hopMul: number;
}

export const BARREL_VARIANTS: Record<BarrelVariantId, BarrelVariant> = {
  classic: { speedMul: 1, jumper: false, hopMul: 1 },
  swift: { speedMul: 1.5, jumper: false, hopMul: 1 },
  lazy: { speedMul: 0.62, jumper: false, hopMul: 1 },
  hopper: { speedMul: 1, jumper: true, hopMul: 1 },
  wild: { speedMul: 1.35, jumper: true, hopMul: 1.15 },
};

type Weights = [BarrelVariantId, number][];

// One new idea per level rather than all of them at once. Level 1 is exactly the old
// behaviour (plain barrels, 30% hoppers). Level 2 introduces the fast barrel and nothing
// else. The slow barrel arrives at 3 and the fast hopper at 4, by which point the player
// has learned to read the colours.
const VARIANT_TIERS: { upTo: number; weights: Weights }[] = [
  { upTo: 1, weights: [['classic', 70], ['hopper', 30]] },
  { upTo: 2, weights: [['classic', 55], ['hopper', 25], ['swift', 20]] },
  { upTo: 3, weights: [['classic', 42], ['hopper', 24], ['swift', 24], ['lazy', 10]] },
  { upTo: 5, weights: [['classic', 30], ['hopper', 24], ['swift', 26], ['lazy', 8], ['wild', 12]] },
  { upTo: Infinity, weights: [['classic', 20], ['hopper', 24], ['swift', 30], ['lazy', 6], ['wild', 20]] },
];

export interface Difficulty {
  speedScale: number;
  spawnMin: number;
  spawnMax: number;
  pairChance: number;
  // Odds that a given barrel hops a hole in the girder instead of dropping through it.
  // Barrels that always fall through would make every gap a safe pocket to wait in, so on
  // the level gaps are introduced every barrel clears them; from level 3 it becomes a coin
  // toss you have to watch, which is what makes a gap worth thinking about.
  gapJumpChance: number;
  weights: Weights;
}

// Level 1 reproduces the previous constants exactly (1x speed, 1.1-2.6s spawns, 25%
// pairs); the ramp only starts biting from level 2. Each curve is clamped so a player
// who keeps winning ends up at a hard but finite ceiling rather than an impossible one.
export function difficultyFor(level: number): Difficulty {
  const step = Math.max(0, level - 1);
  const pace = 1 + 0.07 * step;
  return {
    speedScale: Math.min(1.5, 1 + 0.05 * step),
    spawnMin: Math.max(0.55, 1.1 / pace),
    spawnMax: Math.max(1.2, 2.6 / pace),
    pairChance: Math.min(0.55, 0.25 + 0.04 * step),
    gapJumpChance: level <= 2 ? 1 : Math.max(0.55, 0.85 - 0.15 * (level - 2)),
    weights: (VARIANT_TIERS.find(t => level <= t.upTo) ?? VARIANT_TIERS[VARIANT_TIERS.length - 1]).weights,
  };
}

export function pickBarrelVariant(weights: Weights, roll: number): BarrelVariantId {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let acc = roll * total;
  for (const [id, w] of weights) {
    acc -= w;
    if (acc <= 0) return id;
  }
  return weights[weights.length - 1][0];
}

// ---- layout ----

interface Row {
  topVh: number;
  leftVw: number;
  widthVw: number;
}

interface Span {
  a: number;
  b: number;
}

function overlapsAny(a: number, b: number, blocked: Span[]): boolean {
  return blocked.some(z => a < z.b && b > z.a);
}

// Cuts `count` gaps out of one girder row, widest-remaining-segment first so the holes
// spread out instead of clustering. A gap is only accepted if it leaves MIN_SEGMENT_PX
// of standing room on both sides and misses every blocked column (ladder feet, ladder
// heads, and the goal/spawn shelf on the top row) — that's what guarantees a generated
// level stays connected: you can always reach every ladder, even if you have to jump a
// gap or fall a row and climb back.
function cutGaps(row: Span, count: number, blocked: Span[], rng: () => number): Span[] {
  const segments: Span[] = [{ ...row }];
  for (let n = 0; n < count; n++) {
    let idx = 0;
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].b - segments[i].a > segments[idx].b - segments[idx].a) idx = i;
    }
    const seg = segments[idx];
    const gapW = GAP_MIN_PX + rng() * (GAP_MAX_PX - GAP_MIN_PX);
    const lo = seg.a + MIN_SEGMENT_PX;
    const hi = seg.b - MIN_SEGMENT_PX - gapW;
    if (hi <= lo) break; // nothing left wide enough to cut
    let placed = false;
    for (let attempt = 0; attempt < 14; attempt++) {
      const start = lo + rng() * (hi - lo);
      if (overlapsAny(start, start + gapW, blocked)) continue;
      segments.splice(idx, 1, { a: seg.a, b: start }, { a: start + gapW, b: seg.b });
      placed = true;
      break;
    }
    if (!placed) break;
  }
  return segments;
}

// Gaps are budgeted for the whole map, not per row, so level 2 is the authored level with
// a single hole punched in it rather than a hole in every girder. Indexed by level; levels
// past the table sit at the cap.
const GAP_BUDGET = [0, 0, 1, 2, 4, 6, 8];
const GAP_BUDGET_MAX = 9;
// However rich the budget gets, one girder never turns into more holes than girder.
const MAX_GAPS_PER_ROW = 3;

function gapBudget(level: number): number {
  return level < GAP_BUDGET.length ? GAP_BUDGET[level] : GAP_BUDGET_MAX;
}

// Spreads the map's gap budget over its rows: shuffled round-robin, so a budget of 1 lands
// on a random row and a bigger budget spreads out instead of gutting one girder.
function shareGaps(budget: number, rows: number, rng: () => number): number[] {
  const order = Array.from({ length: rows }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const counts = new Array<number>(rows).fill(0);
  let left = budget;
  while (left > 0) {
    const before = left;
    for (const i of order) {
      if (left === 0) break;
      if (counts[i] >= MAX_GAPS_PER_ROW) continue;
      counts[i] += 1;
      left -= 1;
    }
    // Every row is full — the rest of the budget has nowhere to go.
    if (left === before) break;
  }
  return counts;
}

// Rows grow to MAX_ROWS as the level climbs, but only as far as MIN_ROW_GAP_PX allows on
// the current viewport — on a short window the count is walked back down rather than
// packing the rows close enough to jump between.
function rowPlan(level: number, spanVh: number, maxSpacingVh: number, vhPx: number) {
  const minSpacingVh = MIN_ROW_GAP_PX / vhPx;
  let rows = Math.min(MAX_ROWS, 2 + Math.ceil(level / 2));
  let spacingVh = Math.min(maxSpacingVh, spanVh / (rows - 1));
  while (rows > 3 && spacingVh < minSpacingVh) {
    rows -= 1;
    spacingVh = Math.min(maxSpacingVh, spanVh / (rows - 1));
  }
  return { rows, spacingVh };
}

export function generateLevelSpec(
  level: number,
  seed: number,
  isMobile: boolean,
  vwPx: number,
  vhPx: number,
): LevelSpec {
  const base = isMobile ? content.ui.platformer.levelMobile : content.ui.platformer.level;
  // Level 1 is the authored level, untouched.
  if (level <= 1) return base;

  // Mixing the level in means consecutive levels of one run look unrelated, while a
  // given (seed, level) pair always rebuilds identically.
  const rng = mulberry32((seed ^ (level * 0x9e3779b1)) >>> 0);

  // Proportions are lifted from the authored level rather than hardcoded, so the
  // desktop/mobile differences (thicker ladders, squarer goal, higher floor) carry
  // straight over to the generated ones.
  const bottomRowVh = base.girders[0].top;
  const rowHeightVh = base.girders[0].height;
  const authoredSpacingVh = base.girders[0].top - base.girders[1].top;
  const baseRowWidthVw = base.girders[0].width;
  const ladderWidthVw = base.ladders[0].width;
  const goalHeightVh = base.goal.height;
  const authoredTopVh = base.girders[base.girders.length - 1].top;
  const spawnRiseVh = authoredTopVh - base.barrelSpawn.top;
  const spawnLeftVw = base.barrelSpawn.left;

  // The goal needs clear air above the top row; below this the trophy would be drawn off
  // the top of the viewport.
  const topLimitVh = goalHeightVh + 14;
  const { rows, spacingVh } = rowPlan(level, bottomRowVh - topLimitVh, authoredSpacingVh, vhPx);
  const topRowVh = bottomRowVh - spacingVh * (rows - 1);

  // Index 0 is the top row and is always left-anchored, because the goal and the barrel
  // spawn live at its left end. Anchors then alternate downwards, which is what gives the
  // barrel cascade its zig-zag: a barrel rolls off the open end of one row and lands on
  // the next, where the direction flip sends it back the other way.
  const plan: Row[] = [];
  for (let i = 0; i < rows; i++) {
    const widthVw = Math.min(94, baseRowWidthVw - 3 + rng() * 11);
    plan.push({
      topVh: topRowVh + i * spacingVh,
      leftVw: i % 2 === 0 ? 0 : 100 - widthVw,
      widthVw,
    });
  }

  // A ladder standing on row i descends to row i+1 (or to the floor from the bottom row),
  // so its column has to be solid on both rows. Placing every ladder before any gap is
  // cut, then treating the ladder columns as blocked, is what keeps that true.
  const ladders: PlatformRectSpec[] = [];
  const blocked: Span[][] = plan.map(() => []);
  for (let i = 0; i < rows; i++) {
    const row = plan[i];
    // The floor spans the whole viewport, so the bottom row's ladder is unconstrained
    // from below.
    const below = i === rows - 1 ? { leftVw: 0, widthVw: 100 } : plan[i + 1];
    let lo = Math.max(row.leftVw, below.leftVw) + EDGE_MARGIN_VW;
    const hi = Math.min(row.leftVw + row.widthVw, below.leftVw + below.widthVw)
      - EDGE_MARGIN_VW - ladderWidthVw;
    // Keep the top row's ladders clear of the goal/spawn shelf.
    if (i === 0) lo = Math.max(lo, spawnLeftVw + 12);

    const span = hi - lo;
    const xs: number[] = [];
    if (span <= 0) {
      // Degenerate overlap (very narrow viewport): fall back to the middle of whatever
      // the two rows share, so the level still connects.
      xs.push(Math.max(row.leftVw, below.leftVw));
    } else if (rng() < Math.min(0.55, 0.15 * (level - 1)) && span > 34) {
      // A second ladder gives an alternate route up — useful when a barrel is sitting on
      // the first one.
      xs.push(lo + rng() * span * 0.34, hi - rng() * span * 0.34);
    } else {
      xs.push(lo + rng() * span);
    }

    for (const xVw of xs) {
      ladders.push({
        top: row.topVh,
        left: xVw,
        width: ladderWidthVw,
        // resolveLadderRects re-derives the real height from the surface below; this is
        // only a sane authored fallback.
        height: spacingVh + 2,
      });
      const zone: Span = {
        a: xVw * vwPx - LADDER_CLEAR_PX,
        b: (xVw + ladderWidthVw) * vwPx + LADDER_CLEAR_PX,
      };
      blocked[i].push(zone);
      // The same column has to be solid on the row this ladder lands on.
      if (i + 1 < rows) blocked[i + 1].push(zone);
    }
  }

  // The goal tile is drawn as a square whose side comes from its authored height (see
  // goalSquareRect), so its footprint in vw depends on the viewport's aspect ratio.
  const goalSideVw = (goalHeightVh * vhPx) / vwPx;
  blocked[0].push({
    a: 0,
    b: Math.max((spawnLeftVw + 12) * vwPx, (base.goal.left + goalSideVw) * vwPx + 20),
  });

  const gapCounts = shareGaps(gapBudget(level), rows, rng);
  const girders: PlatformRectSpec[] = [];
  for (let i = 0; i < rows; i++) {
    const row = plan[i];
    const segments = cutGaps(
      { a: row.leftVw * vwPx, b: (row.leftVw + row.widthVw) * vwPx },
      gapCounts[i],
      blocked[i],
      rng,
    );
    for (const s of segments) {
      girders.push({
        top: row.topVh,
        left: s.a / vwPx,
        width: (s.b - s.a) / vwPx,
        height: rowHeightVh,
      });
    }
  }

  return {
    girders,
    ladders,
    goal: { ...base.goal, top: topRowVh - goalHeightVh },
    barrelSpawn: { top: topRowVh - spawnRiseVh, left: spawnLeftVw },
  };
}
