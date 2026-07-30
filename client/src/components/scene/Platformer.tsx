import { useCallback, useEffect, useMemo } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { CHARS } from '../../data/chars';
import { ui } from '../../content';
import { useFloorRect } from '../../hooks/useFloorRect';
import { useLevelGeometry } from '../../hooks/useLevelGeometry';
import { useHeldKeys } from '../../hooks/useHeldKeys';
import { useDonkeyKongLoop, BARREL_SIZE } from '../../hooks/useDonkeyKongLoop';
import { resolveLadderRects } from '../../hooks/platformGeometry';
import { DkLevel } from './DkLevel';
import { TouchControls } from './TouchControls';
import styles from './Platformer.module.css';

const SPRITE_WIDTH = 40;
const SPRITE_HEIGHT = 50;

// How long the "N lives left" pause lasts before the climb picks back up.
const DEATH_PAUSE_MS = 1400;
// The win banner clears itself; game over waits for the player to hit TRY AGAIN.
const WIN_PAUSE_MS = 3200;

interface Props {
  platformRefs: React.RefObject<Record<string, HTMLElement | null>>;
}

export function Platformer({ platformRefs }: Props) {
  const { state, dispatch } = useGameState();
  const char = CHARS[state.charIdx];
  const paused = state.open != null || state.familiarOpen || state.discoveriesOpen;
  const floor = useFloorRect(platformRefs, [state.open, state.familiarOpen, state.discoveriesOpen]);
  const level = useLevelGeometry();
  // Resolved once here and handed to both the physics loop and the renderer, so the
  // climbable region and the drawn ladder are always the same rectangle. Memoised
  // because the loop lists it as an effect dependency.
  const ladders = useMemo(() => resolveLadderRects(level, floor), [level, floor]);
  const { heldKeys, press, release } = useHeldKeys(paused);

  // dispatch's identity is stable (React guarantees it for useReducer), so these stay
  // stable too. That matters: useDonkeyKongLoop lists them as effect dependencies and
  // calls setPose every frame, so unstable callbacks would rebuild the rAF loop 60x/sec.
  const onHit = useCallback(() => dispatch({ type: 'DK_HIT' }), [dispatch]);
  const onWin = useCallback(() => dispatch({ type: 'DK_WIN' }), [dispatch]);

  // 'dead' and 'won' clear themselves after a beat; 'gameover' deliberately does not —
  // it waits for the player to press TRY AGAIN. Play mode is never exited here, ESC
  // remains the only way out.
  useEffect(() => {
    if (state.dkStatus !== 'dead' && state.dkStatus !== 'won') return;
    const dead = state.dkStatus === 'dead';
    const timer = setTimeout(
      () => dispatch({ type: dead ? 'DK_RESUME' : 'DK_RESTART' }),
      dead ? DEATH_PAUSE_MS : WIN_PAUSE_MS,
    );
    return () => clearTimeout(timer);
  }, [state.dkStatus, dispatch]);

  const pose = useDonkeyKongLoop({
    level,
    ladders,
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

  const b = ui.platformer.banners;
  const livesWord = state.dkLives === 1 ? b.lifeSingular : b.lifePlural;

  return (
    <>
      <DkLevel level={level} ladders={ladders} barrels={pose.barrels} barrelSize={BARREL_SIZE} />
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
      {state.dkStatus === 'dead' && (
        <div className={styles.banner}>
          <span className={styles.bannerCount}>{state.dkLives}</span> {livesWord}
        </div>
      )}
      {state.dkStatus === 'won' && <div className={styles.banner}>{b.win}</div>}
      {state.dkStatus === 'gameover' && (
        <div className={styles.banner}>
          {b.gameOver}
          <button
            type="button"
            data-sfx
            className={styles.tryAgain}
            onClick={() => dispatch({ type: 'DK_RESTART' })}
          >
            {b.tryAgain}
          </button>
        </div>
      )}
      <TouchControls onPress={press} onRelease={release} />
    </>
  );
}
