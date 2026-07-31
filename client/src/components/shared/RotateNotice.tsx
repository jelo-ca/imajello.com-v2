import { ui } from '../../content';
import styles from './RotateNotice.module.css';

// Phone landscape is too short for the climb to work: the girder rows compress to roughly
// the player's jump height, so ladders stop being the only way up and the level can be
// skipped. Rather than special-case the physics for a viewport nobody plays on
// deliberately, landscape is blocked outright until the phone is turned upright.
//
// Always rendered; visibility is entirely a media query (see the stylesheet) so rotating
// the device reveals or hides it immediately with no listener or re-render involved.
export function RotateNotice() {
  const r = ui.rotateNotice;
  return (
    <div className={styles.overlay} role="alertdialog" aria-label={r.heading}>
      <span className={styles.glyph} aria-hidden>{r.glyph}</span>
      <span className={styles.heading}>{r.heading}</span>
      <p className={styles.text}>{r.text}</p>
    </div>
  );
}
