import { useState } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { DiscoveryListPanel } from '../shared/DiscoveryListPanel';
import { ui } from '../../content';
import styles from './TopBar.module.css';

interface Props {
  setPlatformRef: (key: string) => (el: HTMLElement | null) => void;
}

export function TopBar({ setPlatformRef }: Props) {
  const { state, dispatch } = useGameState();
  const { playNote } = useSfx();
  const [menuOpen, setMenuOpen] = useState(false);
  const tb = ui.topBar;

  const toggleSound = () => {
    const next = !state.sound;
    dispatch({ type: 'SET_SOUND', value: next });
    // Reference toggleSound (lines 1356-1362): only play the confirmation
    // note + unlock the 'sound' discovery when turning sound ON.
    if (next) {
      playNote(660, 0, 0.12, 0.05);
      dispatch({ type: 'UNLOCK_DISCOVERY', key: 'sound' });
    }
  };

  return (
    <>
      <DiscoveryListPanel setPlatformRef={setPlatformRef} />
      <div className={styles.systemButtons} ref={setPlatformRef('topbar-links')}>
        <a href="/Anjoelo_Calderon_Resume.pdf" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>{tb.resume}</a>
        <a href="https://github.com/jelo-ca" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>{tb.github}</a>
        <a href="https://linkedin.com/in/anjoelo-calderon" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>{tb.linkedin}</a>
        <button
          data-sfx
          className={styles.chip}
          onClick={toggleSound}
        >
          {state.sound ? tb.sfxOn : tb.sfxOff}
        </button>
      </div>

      {/* Mobile-only: RESUME/GITHUB/LINKEDIN collapse behind a hamburger menu
          below 768px (see .systemButtons/.mobileControls in TopBar.module.css).
          SFX stays visible since it's a frequent toggle, not a link-out. */}
      <div className={styles.mobileControls} ref={setPlatformRef('topbar-mobile')}>
        <button data-sfx className={styles.chip} onClick={toggleSound}>
          {state.sound ? tb.sfxOn : tb.sfxOff}
        </button>
        <div className={styles.menuWrap}>
          <button
            data-sfx
            className={styles.menuTrigger}
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-label={tb.linksMenuAriaLabel}
          >
            {tb.hamburgerGlyph}
          </button>
          {menuOpen && (
            <div className={styles.menuPanel}>
              <a href="/Anjoelo_Calderon_Resume.pdf" target="_blank" rel="noreferrer" data-sfx className={styles.menuItem}>{tb.resume}</a>
              <a href="https://github.com/jelo-ca" target="_blank" rel="noreferrer" data-sfx className={styles.menuItem}>{tb.github}</a>
              <a href="https://linkedin.com/in/anjoelo-calderon" target="_blank" rel="noreferrer" data-sfx className={styles.menuItem}>{tb.linkedin}</a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
