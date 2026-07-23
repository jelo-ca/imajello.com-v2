import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { DiscoveryListPanel } from '../shared/DiscoveryListPanel';
import styles from './TopBar.module.css';

export function TopBar() {
  const { state, dispatch } = useGameState();
  const { playNote } = useSfx();

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
      <DiscoveryListPanel />
      <div className={styles.systemButtons}>
        <a href="/Anjoelo_Calderon_Resume.pdf" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>RESUME ↓</a>
        <a href="https://github.com/jelo-ca" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>GITHUB</a>
        <a href="https://linkedin.com/in/anjoelo-calderon" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>LINKEDIN</a>
        <button
          data-sfx
          className={styles.chip}
          onClick={toggleSound}
        >
          {state.sound ? 'SFX ON' : 'SFX OFF'}
        </button>
      </div>
    </>
  );
}
