import { ui } from '../../content';
import styles from './PlaySizeNotice.module.css';

// Blocks play on viewports that are too short for fair girder spacing. Portrait phones
// clear the bar; landscape phones are covered by RotateNotice. Visibility is CSS-only so
// resize/orientation reacts without a React listener.
export function PlaySizeNotice() {
  const n = ui.playSizeNotice ?? {
    glyph: '⬜',
    heading: 'WINDOW TOO SMALL',
    text: 'The climb needs a taller view — stretch this window or switch to a larger screen. Phones work in portrait.',
  };
  return (
    <div className={styles.overlay} role="alertdialog" aria-label={n.heading}>
      <span className={styles.glyph} aria-hidden>{n.glyph}</span>
      <span className={styles.heading}>{n.heading}</span>
      <p className={styles.text}>{n.text}</p>
    </div>
  );
}
