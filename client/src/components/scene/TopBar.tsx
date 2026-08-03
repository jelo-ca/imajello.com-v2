import { useState } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { DiscoveryListPanel } from '../shared/DiscoveryListPanel';
import { ui } from '../../content';
import styles from './TopBar.module.css';

export function TopBar() {
  const { state, dispatch } = useGameState();
  const [menuOpen, setMenuOpen] = useState(false);
  const tb = ui.topBar;

  // SFX moved into the settings panel, which is also where dark mode, music and the
  // progress reset live — the top bar just opens it.
  const openSettings = () => dispatch({ type: 'TOGGLE_SETTINGS' });

  return (
    <>
      <DiscoveryListPanel />
      <div className={styles.systemButtons}>
        <button
          data-sfx
          className={`${styles.chip} ${styles.roadmapChip}`}
          onClick={() => dispatch({ type: 'TOGGLE_ROADMAP' })}
          aria-expanded={state.roadmapOpen}
          aria-label={ui.roadmap.openAriaLabel}
        >
          {tb.roadmap}
        </button>
        <a href="/Anjoelo_Calderon_Resume.pdf" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>{tb.resume}</a>
        <a href="https://github.com/jelo-ca" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>{tb.github}</a>
        <a href="https://linkedin.com/in/anjoelo-calderon" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>{tb.linkedin}</a>
        <button
          data-sfx
          className={styles.chip}
          onClick={openSettings}
          aria-expanded={state.settingsOpen}
          aria-label={tb.settingsAriaLabel}
        >
          {tb.settings}
        </button>
      </div>

      {/* Mobile-only: RESUME/GITHUB/LINKEDIN/ROADMAP collapse behind a hamburger menu
          below 768px (see .systemButtons/.mobileControls in TopBar.module.css).
          Settings stays visible since it holds the sound toggle. */}
      <div className={styles.mobileControls}>
        <button
          data-sfx
          className={styles.chip}
          onClick={openSettings}
          aria-expanded={state.settingsOpen}
          aria-label={tb.settingsAriaLabel}
        >
          {tb.settings}
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
              <button
                data-sfx
                className={`${styles.menuItem} ${styles.roadmapChip}`}
                onClick={() => { setMenuOpen(false); dispatch({ type: 'TOGGLE_ROADMAP' }); }}
              >
                {tb.roadmap}
              </button>
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
