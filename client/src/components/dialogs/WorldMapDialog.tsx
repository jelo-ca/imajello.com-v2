import { JOURNEY_STOPS } from '../../data/journey';
import { ImageSlot } from '../shared/ImageSlot';
import styles from './WorldMapDialog.module.css';

export function WorldMapDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[1]</span>
          <span className={styles.title}>World Map</span>
          <span className={styles.sub}>PH → CA → UCI</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ ESC</button>
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
                <ImageSlot placeholder={`photo: ${stop.title}`} fit="contain" />
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
