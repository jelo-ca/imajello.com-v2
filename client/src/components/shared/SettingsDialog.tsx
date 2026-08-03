import { useEffect, useRef, useState } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { ui } from '../../content';
import styles from './SettingsDialog.module.css';

// How long the reset button stays armed before falling back to its idle label.
const CONFIRM_MS = 4000;

export function SettingsDialog() {
  const { state, dispatch } = useGameState();
  const { playNote } = useSfx();
  const s = ui.settings;
  const [confirmingReset, setConfirmingReset] = useState(false);
  const confirmTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!confirmingReset) return;
    confirmTimerRef.current = window.setTimeout(() => setConfirmingReset(false), CONFIRM_MS);
    return () => {
      if (confirmTimerRef.current !== null) clearTimeout(confirmTimerRef.current);
    };
  }, [confirmingReset]);

  // Closing the panel disarms the reset button, so reopening it never starts armed.
  useEffect(() => {
    if (!state.settingsOpen) setConfirmingReset(false);
  }, [state.settingsOpen]);

  if (!state.settingsOpen) return null;

  const close = () => dispatch({ type: 'CLOSE_SETTINGS' });

  const toggleTheme = () => dispatch({ type: 'SET_THEME', value: state.theme === 'dark' ? 'light' : 'dark' });

  const toggleSound = () => {
    const next = !state.sound;
    dispatch({ type: 'SET_SOUND', value: next });
    // Matches TopBar's old toggle: the confirmation note and the 'sound' discovery
    // only fire when turning sound on.
    if (next) {
      playNote(660, 0, 0.12, 0.05);
      dispatch({ type: 'UNLOCK_DISCOVERY', key: 'sound' });
    }
  };

  const onReset = () => {
    if (!confirmingReset) { setConfirmingReset(true); return; }
    setConfirmingReset(false);
    dispatch({ type: 'RESET_DISCOVERIES' });
  };

  const stateLabel = (on: boolean) => (on ? s.onLabel : s.offLabel);

  return (
    <div className={styles.backdrop} onClick={close}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={s.title}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{s.title}</div>
            <div className={styles.sub}>{s.sub}</div>
          </div>
          <button data-sfx className={styles.closeBtn} onClick={close} aria-label={s.closeAriaLabel}>
            {ui.misc.closeGlyph}
          </button>
        </div>

        <div className={styles.rows}>
          <div className={styles.row}>
            <div className={styles.rowText}>
              <div className={styles.rowLabel}>{s.darkMode.label}</div>
              <div className={styles.rowDesc}>{s.darkMode.desc}</div>
            </div>
            <button
              data-sfx
              className={state.theme === 'dark' ? styles.toggleOn : styles.toggleOff}
              onClick={toggleTheme}
              role="switch"
              aria-checked={state.theme === 'dark'}
            >
              {stateLabel(state.theme === 'dark')}
            </button>
          </div>

          <div className={styles.row}>
            <div className={styles.rowText}>
              <div className={styles.rowLabel}>{s.sfx.label}</div>
              <div className={styles.rowDesc}>{s.sfx.desc}</div>
            </div>
            <button
              data-sfx
              className={state.sound ? styles.toggleOn : styles.toggleOff}
              onClick={toggleSound}
              role="switch"
              aria-checked={!!state.sound}
            >
              {stateLabel(!!state.sound)}
            </button>
          </div>

          {/* Disabled until there's a soundtrack to toggle — the roadmap tracks it. */}
          <div className={styles.rowDisabled}>
            <div className={styles.rowText}>
              <div className={styles.rowLabel}>
                {s.music.label} <span className={styles.wipTag}>{s.wipLabel}</span>
              </div>
              <div className={styles.rowDesc}>{s.music.desc}</div>
            </div>
            <button className={styles.toggleDisabled} disabled aria-disabled="true">
              {s.offLabel}
            </button>
          </div>

          <div className={styles.row}>
            <div className={styles.rowText}>
              <div className={styles.rowLabel}>{s.reset.label}</div>
              <div className={styles.rowDesc}>{s.reset.desc}</div>
            </div>
            <button
              data-sfx
              className={confirmingReset ? styles.resetArmed : styles.resetBtn}
              onClick={onReset}
            >
              {confirmingReset ? s.reset.confirm : s.reset.button}
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <span>{s.footer}</span>
          <span className={styles.escHint}>{ui.misc.escHint}</span>
        </div>
      </div>
    </div>
  );
}
