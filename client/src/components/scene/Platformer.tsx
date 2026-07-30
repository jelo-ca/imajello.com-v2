import { useCallback } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { CHARS } from '../../data/chars';
import { ui } from '../../content';
import { useFloorRect } from '../../hooks/useFloorRect';
import { useLevelGeometry } from '../../hooks/useLevelGeometry';
import { useHeldKeys } from '../../hooks/useHeldKeys';
import { useDonkeyKongLoop, BARREL_SIZE } from '../../hooks/useDonkeyKongLoop';
import { DkLevel } from './DkLevel';
import { TouchControls } from './TouchControls';
import styles from './Platformer.module.css';

const SPRITE_WIDTH = 32;
const SPRITE_HEIGHT = 40;

interface Props {
  platformRefs: React.RefObject<Record<string, HTMLElement | null>>;
}

export function Platformer({ platformRefs }: Props) {
  const { state, dispatch } = useGameState();
  const char = CHARS[state.charIdx];
  const paused = state.open != null || state.familiarOpen || state.discoveriesOpen;
  const floor = useFloorRect(platformRefs, [state.open, state.familiarOpen, state.discoveriesOpen]);
  const level = useLevelGeometry();
  const { heldKeys, press, release } = useHeldKeys(paused);

  // dispatch's identity is stable (React guarantees it for useReducer), so these stay
  // stable too. That matters: useDonkeyKongLoop lists them as effect dependencies and
  // calls setPose every frame, so unstable callbacks would rebuild the rAF loop 60x/sec.
  const onHit = useCallback(() => dispatch({ type: 'DK_HIT' }), [dispatch]);
  const onWin = useCallback(() => dispatch({ type: 'DK_WIN' }), [dispatch]);

  const pose = useDonkeyKongLoop({
    level,
    floor,
    paused,
    status: state.dkStatus,
    heldKeys,
    spriteWidth: SPRITE_WIDTH,
    spriteHeight: SPRITE_HEIGHT,
    onHit,
    onWin,
  });

  if (!pose.ready) return null;

  return (
    <>
      <DkLevel level={level} barrels={pose.barrels} barrelSize={BARREL_SIZE} />
      <img
        src={char.src}
        alt=""
        className={styles.sprite}
        style={{
          width: SPRITE_WIDTH,
          height: SPRITE_HEIGHT,
          transform: `translate3d(${pose.x}px, ${pose.y}px, 0) scaleX(${pose.facing === 'left' ? -1 : 1})`,
        }}
      />
      {state.dkStatus === 'won' && <div className={styles.banner}>{ui.platformer.banners.win}</div>}
      {state.dkStatus === 'gameover' && <div className={styles.banner}>{ui.platformer.banners.gameOver}</div>}
      <TouchControls onPress={press} onRelease={release} />
    </>
  );
}
