import { useEffect, useRef, useState } from 'react';
import { useGameState } from './state/GameStateContext';
import { useSfx } from './hooks/useSfx';
import { useKonami } from './hooks/useKonami';
import { useFamiliarToggle } from './hooks/useFamiliarToggle';
import { GameScene } from './components/scene/GameScene';
import { DialogHost } from './components/dialogs/DialogHost';
import { FamiliarChat } from './components/familiar/FamiliarChat';
import { Toast } from './components/shared/Toast';
import { KonamiOverlay } from './components/shared/KonamiOverlay';
import { MobileNotice } from './components/shared/MobileNotice';
import { RotateNotice } from './components/shared/RotateNotice';
import { BootScreen } from './components/shared/BootScreen';
import { RoadmapDialog } from './components/shared/RoadmapDialog';
import { SettingsDialog } from './components/shared/SettingsDialog';
import { LeaderboardDialog } from './components/shared/LeaderboardDialog';
import { ui } from './content';
import { randomSeed } from './hooks/levelGenerator';
import styles from './App.module.css';

const SECTION_KEYS: Record<string, 'journey' | 'quests' | 'experience' | 'hobbies' | 'contact'> = {
  '1': 'journey', '2': 'quests', '3': 'experience', '4': 'hobbies', '5': 'contact',
};

export default function App() {
  const { state, dispatch } = useGameState();
  const { tick, chime, fanfare } = useSfx();
  const toggleFamiliar = useFamiliarToggle();
  const [konamiTrigger, setKonamiTrigger] = useState(0);
  const lastSfxRef = useRef<Element | null>(null);

  const trackKonami = useKonami(() => {
    dispatch({ type: 'SET_KONAMI_UNLOCKED' });
    fanfare();
    setKonamiTrigger(t => t + 1);
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      // Roadmap and settings are modal overlays, so they swallow every shortcut while
      // up — otherwise digits/space would drive the HUD behind them.
      if (state.roadmapOpen) {
        if (e.key === 'Escape') dispatch({ type: 'CLOSE_ROADMAP' });
        return;
      }
      if (state.settingsOpen) {
        if (e.key === 'Escape') dispatch({ type: 'CLOSE_SETTINGS' });
        return;
      }
      // Same treatment, and it matters more here: without the early return, ESC over the
      // board would also stop the climb behind it, throwing away the run being claimed.
      if (state.leaderboardOpen) {
        if (e.key === 'Escape') dispatch({ type: 'CLOSE_LEADERBOARD' });
        return;
      }
      if (e.key === 'Escape' && state.discoveriesOpen) { dispatch({ type: 'TOGGLE_DISCOVERIES' }); return; }
      if (e.key === 'Escape' && state.open) { dispatch({ type: 'CLOSE_SECTION' }); return; }
      if (e.key === 'Escape' && state.familiarOpen) { dispatch({ type: 'CLOSE_FAMILIAR' }); return; }
      if (e.key === 'Escape' && state.playing) { dispatch({ type: 'STOP_PLATFORMER' }); return; }
      trackKonami(e.key);
      if (!state.open && !state.playing) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'PREV_CHAR' }); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'NEXT_CHAR' }); return; }
        // Space starts the climb from the character picker. It's free to mean this
        // because the game itself no longer binds it — up doubles as jump in play.
        if ((e.key === ' ' || e.key === 'Spacebar') && !state.familiarOpen) {
          e.preventDefault();
          dispatch({ type: 'START_PLATFORMER', seed: randomSeed() });
          return;
        }
      }
      const section = SECTION_KEYS[e.key];
      if (section) dispatch({ type: 'OPEN_SECTION', section });
      if (e.key === '6' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFamiliar();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.roadmapOpen, state.settingsOpen, state.leaderboardOpen, state.discoveriesOpen, state.open, state.familiarOpen, state.playing, dispatch, trackKonami, toggleFamiliar]);

  useEffect(() => {
    const onHover = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.('[data-sfx]');
      if (t && t !== lastSfxRef.current) { lastSfxRef.current = t; tick(); }
      if (!t) lastSfxRef.current = null;
    };
    document.addEventListener('mouseover', onHover);
    return () => document.removeEventListener('mouseover', onHover);
  }, [tick]);

  useEffect(() => {
    if (!state.toast) return;
    chime();
    const timer = setTimeout(() => dispatch({ type: 'SET_TOAST', text: null }), 3200);
    return () => clearTimeout(timer);
  }, [state.toast, dispatch, chime]);

  // Reference `openSection` (lines 1029-1040): once a live OPEN_SECTION dispatch brings
  // visited.length to exactly 4 (any 4 of the 5 sections), a second toast + fanfare
  // fires 3400ms later. `levelUpTrigger` only increments from that live reducer branch
  // (never from HYDRATE_PERSISTED), so reloading with 4+ sections already visited from
  // localStorage does not re-fire this.
  useEffect(() => {
    if (state.levelUpTrigger === 0) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_TOAST', text: ui.toast.levelUp });
      fanfare();
    }, 3400);
    return () => clearTimeout(timer);
  }, [state.levelUpTrigger, dispatch, fanfare]);

  return (
    <div className={styles.app}>
      <MobileNotice />
      <GameScene />
      <DialogHost />
      <FamiliarChat />
      <Toast />
      <KonamiOverlay trigger={konamiTrigger} />
      <RoadmapDialog />
      <SettingsDialog />
      <LeaderboardDialog />
      <BootScreen />
      {/* Last child so it stacks over everything; its own media query decides whether
          it's visible at all. */}
      <RotateNotice />
    </div>
  );
}
