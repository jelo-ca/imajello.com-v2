import { ui } from '../../content';
import type { LevelGeometry } from '../../hooks/platformGeometry';
import styles from './DkLevel.module.css';

// Structural type rather than an import, so this component stays presentational and
// doesn't depend on the physics hook. Task 3's Barrel satisfies it.
interface RenderableBarrel {
  id: number;
  x: number;
  y: number;
}

interface Props {
  level: LevelGeometry;
  barrels: RenderableBarrel[];
  barrelSize: number;
}

// Pure presentation: every rectangle is handed in already converted to pixels
// (see platformGeometry.ts). No state, no simulation.
export function DkLevel({ level, barrels, barrelSize }: Props) {
  return (
    <>
      {level.girders.map((g, i) => (
        <div key={`girder-${i}`} className={styles.girder} style={{ top: g.top, left: g.left, width: g.width, height: g.height }} />
      ))}
      {level.ladders.map((l, i) => (
        <div key={`ladder-${i}`} className={styles.ladder} style={{ top: l.top, left: l.left, width: l.width, height: l.height }} />
      ))}
      <div
        className={styles.goal}
        style={{ top: level.goal.top, left: level.goal.left, width: level.goal.width, height: level.goal.height }}
      >
        {ui.platformer.goalGlyph}
      </div>
      {barrels.map(b => (
        <div key={b.id} className={styles.barrel} style={{ top: b.y, left: b.x, width: barrelSize, height: barrelSize }} />
      ))}
    </>
  );
}
