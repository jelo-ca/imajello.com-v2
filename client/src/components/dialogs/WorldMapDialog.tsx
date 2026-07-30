import { JOURNEY_STOPS } from '../../data/journey';
import { ui } from '../../content';
import { ImageSlot } from '../shared/ImageSlot';
import styles from './WorldMapDialog.module.css';

export function WorldMapDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[1]</span>
          <span className={styles.title}>{ui.sections.journey.dialogTitle}</span>
          <span className={styles.sub}>{ui.sections.journey.dialogSub}</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>{ui.misc.closeGlyph} <span className={styles.escHint}>{ui.misc.escHint}</span></button>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          {JOURNEY_STOPS.map(stop => (
            <div key={stop.id} className={stop.current ? styles.cardCurrent : styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.worldLabel}>{stop.worldLabel}</div>
                <span className={stop.current ? styles.statusNow : styles.statusCleared}>{stop.statusLabel}</span>
              </div>
              <div className={styles.photoBox}>
                <ImageSlot placeholder={`${ui.worldMap.photoPrefix} ${stop.title}`} fit="contain" />
              </div>
              <div className={stop.current ? styles.cardTitleCurrent : styles.cardTitle}>{stop.title}</div>
              <p className={stop.current ? styles.bodyCurrent : styles.bodyText}>{stop.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
