import { useCallback } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { CHARS } from '../../data/chars';
import type { SectionKey } from '../../data/discoveries';
import { usePlatformRects } from '../../hooks/usePlatformRects';
import { useHeldKeys } from '../../hooks/useHeldKeys';
import { usePlatformerLoop } from '../../hooks/usePlatformerLoop';
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
  const platforms = usePlatformRects(platformRefs, [state.open, state.familiarOpen, state.discoveriesOpen]);
  const { heldKeys, press, release } = useHeldKeys();
  // dispatch's identity is stable (React guarantees this for useReducer), so wrapping in
  // useCallback keeps this stable across renders too — without it, a fresh arrow function
  // every render would appear in usePlatformerLoop's effect deps and tear down/rebuild the
  // whole requestAnimationFrame loop on every single frame.
  const onTriggerSection = useCallback(
    (section: SectionKey) => dispatch({ type: 'OPEN_SECTION', section }),
    [dispatch],
  );
  const pose = usePlatformerLoop({
    platforms,
    paused,
    heldKeys,
    spriteWidth: SPRITE_WIDTH,
    spriteHeight: SPRITE_HEIGHT,
    onTriggerSection,
  });

  // usePlatformerLoop's pose fields are placeholder values (computed from an empty
  // platforms array) until it has measured a real nav-button platform and performed its
  // one-time spawn placement. Render nothing until then, so the sprite never appears at
  // (and never visibly falls from) that placeholder position.
  if (!pose.ready) return null;

  return (
    <>
      <img
        src={char.src}
        alt={char.name}
        className={styles.sprite}
        style={{
          width: SPRITE_WIDTH,
          height: SPRITE_HEIGHT,
          transform: `translate3d(${pose.x}px, ${pose.y}px, 0) scaleX(${pose.facing === 'left' ? -1 : 1})`,
        }}
      />
      <TouchControls onPress={press} onRelease={release} />
    </>
  );
}
