import { useRef } from 'react';
import { HeroCharacterViewer } from './HeroCharacterViewer';
import { TopBar } from './TopBar';
import { KeybindsLegend } from './KeybindsLegend';
import { PlayerBar } from './PlayerBar';
import { Platformer } from './Platformer';
import { useParticles } from '../../hooks/useParticles';
import { useFamiliarToggle } from '../../hooks/useFamiliarToggle';
import { useGameState } from '../../state/GameStateContext';
import styles from './GameScene.module.css';

export function GameScene() {
  const { state } = useGameState();
  const particleHostRef = useRef<HTMLDivElement>(null);
  const cursorHostRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  useParticles(particleHostRef, cursorHostRef, cursorRef);
  const toggleFamiliar = useFamiliarToggle();

  // Registry of the DOM nodes that make up the climb's ground floor — PlayerBar's whole
  // bar on desktop, and its nav/familiar strips on mobile where that bar collapses (see
  // useFloorRect's FLOOR_KEYS). Nothing else in the HUD is a platform. The setter
  // identity per key is cached so passing it down doesn't re-attach refs on every render.
  const platformRefs = useRef<Record<string, HTMLElement | null>>({});
  const platformRefSetters = useRef<Record<string, (el: HTMLElement | null) => void>>({});
  const setPlatformRef = (key: string) => {
    if (!platformRefSetters.current[key]) {
      platformRefSetters.current[key] = (el: HTMLElement | null) => { platformRefs.current[key] = el; };
    }
    return platformRefSetters.current[key];
  };

  return (
    <div className={styles.scene}>
      <div ref={particleHostRef} className={styles.particles} aria-hidden />
      <KeybindsLegend />
      <div className={styles.heroWrap} style={{ transform: state.familiarOpen ? 'translateX(-14vw)' : 'translateX(0)' }}>
        <HeroCharacterViewer />
      </div>
      <TopBar />
      <PlayerBar onSummonFamiliar={toggleFamiliar} setPlatformRef={setPlatformRef} />
      {state.playing && <Platformer platformRefs={platformRefs} />}
    </div>
  );
}
