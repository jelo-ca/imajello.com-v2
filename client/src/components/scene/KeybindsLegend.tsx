import { useGameState } from '../../state/GameStateContext';
import styles from './KeybindsLegend.module.css';

// Reference lines 48-60: ← → and ESC use the narrower key-chip padding
// (3px 7px); digit keys 1-5 and F use the wider padding (3px 8px).
const ROWS: Array<{ key: string; label: string } | { keys: [string, string]; label: string }> = [
  { keys: ['←', '→'], label: 'CHANGE CHARACTER' },
  { key: '1', label: 'WORLD MAP' },
  { key: '2', label: 'BATTLE LOG' },
  { key: '3', label: 'QUEST LOG' },
  { key: '4', label: 'INVENTORY' },
  { key: '5', label: 'CONTACT' },
  { key: 'F', label: 'SUMMON FAMILIAR' },
  { key: 'ESC', label: 'CLOSE' },
];

export function KeybindsLegend() {
  const { state } = useGameState();
  if (state.familiarOpen) return null;
  return (
    <div className={styles.legend}>
      <div className={styles.heading}>KEYBINDS</div>
      {ROWS.map((row, i) => (
        <div className={styles.row} key={i}>
          {'keys' in row
            ? row.keys.map(k => <span className={styles.keyNarrow} key={k}>{k}</span>)
            : <span className={row.key === 'ESC' ? styles.keyNarrow : styles.keyWide}>{row.key}</span>}
          <span className={styles.label}>{row.label}</span>
        </div>
      ))}
    </div>
  );
}
