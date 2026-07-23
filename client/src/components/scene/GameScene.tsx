import { useRef } from 'react';
import { HeroCharacterViewer } from './HeroCharacterViewer';
import { TopBar } from './TopBar';
import { KeybindsLegend } from './KeybindsLegend';
import { PlayerBar } from './PlayerBar';
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

  return (
    <div className={styles.scene}>
      <div ref={particleHostRef} className={styles.particles} aria-hidden />
      <KeybindsLegend />
      <div className={styles.heroWrap} style={{ transform: state.familiarOpen ? 'translateX(-14vw)' : 'translateX(0)' }}>
        <HeroCharacterViewer />
      </div>
      <TopBar />
      <PlayerBar onSummonFamiliar={toggleFamiliar} />
    </div>
  );
}
