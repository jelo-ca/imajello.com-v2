import { useGameState } from '../../state/GameStateContext';
import styles from './Toast.module.css';

export function Toast() {
  const { state } = useGameState();
  if (!state.toast) return null;
  return (
    <div className={styles.toast} key={state.toast}>
      <span className={styles.star}>★</span>
      <div>
        <div className={styles.text}>{state.toast}</div>
        <div className={styles.label}>DISCOVERED</div>
      </div>
    </div>
  );
}
