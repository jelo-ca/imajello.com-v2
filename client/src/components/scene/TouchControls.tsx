import type { MoveKey } from '../../hooks/useHeldKeys';
import { ui } from '../../content';
import styles from './TouchControls.module.css';

interface Props {
  onPress: (key: MoveKey) => void;
  onRelease: (key: MoveKey) => void;
}

export function TouchControls({ onPress, onRelease }: Props) {
  const c = ui.platformer.controls;
  // Note: React's touch listeners are passive by default, so calling preventDefault()
  // here would be a no-op (and logs a console warning) — omitted rather than kept as
  // dead code.
  const bind = (key: MoveKey) => ({
    onTouchStart: () => onPress(key),
    onTouchEnd: () => onRelease(key),
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.dpad}>
        <button type="button" className={styles.btn} aria-label={c.leftAriaLabel} {...bind('left')}>{c.leftGlyph}</button>
        <button type="button" className={styles.btn} aria-label={c.rightAriaLabel} {...bind('right')}>{c.rightGlyph}</button>
      </div>
      <button type="button" className={`${styles.btn} ${styles.jump}`} aria-label={c.jumpAriaLabel} {...bind('jump')}>{c.jumpGlyph}</button>
    </div>
  );
}
