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

  // Registry of DOM nodes that double as platforms while playing (PlayerBar's nav
  // buttons/plate/familiar button, TopBar's link row/hamburger, KeybindsLegend, the
  // discoveries trigger). Platformer reads this via getBoundingClientRect(); the
  // setter identity per key is cached so passing it down doesn't cause re-attachment
  // on every GameScene render.
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
      <KeybindsLegend setPlatformRef={setPlatformRef} />
      <div className={styles.heroWrap} style={{ transform: state.familiarOpen ? 'translateX(-14vw)' : 'translateX(0)' }}>
        <HeroCharacterViewer />
      </div>
      <TopBar setPlatformRef={setPlatformRef} />
      <PlayerBar onSummonFamiliar={toggleFamiliar} setPlatformRef={setPlatformRef} />
      {state.playing && <Platformer platformRefs={platformRefs} />}
    </div>
  );
}
