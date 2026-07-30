import type { MoveKey } from '../../hooks/useHeldKeys';
import styles from './TouchControls.module.css';

interface Props {
  onPress: (key: MoveKey) => void;
  onRelease: (key: MoveKey) => void;
}

export function TouchControls({ onPress, onRelease }: Props) {
  const bind = (key: MoveKey) => ({
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); onPress(key); },
    onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); onRelease(key); },
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.dpad}>
        <button type="button" className={styles.btn} {...bind('left')}>◀</button>
        <button type="button" className={styles.btn} {...bind('right')}>▶</button>
      </div>
      <button type="button" className={`${styles.btn} ${styles.jump}`} {...bind('jump')}>⤒</button>
    </div>
  );
}
