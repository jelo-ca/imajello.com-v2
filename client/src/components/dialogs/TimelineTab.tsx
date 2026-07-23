import { TIMELINE_BARS } from '../../data/quests';
import styles from './TimelineTab.module.css';

const YEAR_LABELS: Array<{ top: number; text: string; now?: boolean }> = [
  { top: 44, text: '2027' },
  { top: 128, text: 'NOW', now: true },
  { top: 212, text: '2026' },
  { top: 380, text: '2025' },
  { top: 548, text: '2024' },
  { top: 716, text: '2023' },
  { top: 884, text: '2022' },
];

const VARIANT_CLASS: Record<string, string> = {
  'education-pink': styles.barEducationPink,
  'education-uci': styles.barEducationUci,
  main: styles.barMain,
  side: styles.barSide,
};

function Legend() {
  return (
    <div className={styles.legend}>
      <span><span className={styles.swatchMain} /> Main quest</span>
      <span><span className={styles.swatchSide} /> Side quest</span>
      <span><span className={styles.swatchEduPink} /> Education (De Anza)</span>
      <span><span className={styles.swatchEduUci} /> Education (UCI)</span>
    </div>
  );
}

export function TimelineTab() {
  return (
    <div className={styles.wrap}>
      <div className={styles.introRow}>
        <p className={styles.intro}>Everything, side by side — main quests, side quests, and school, in the order they actually happened. Recent at the top.</p>
        <Legend />
      </div>
      <div className={styles.chartRow}>
        <div className={styles.axis}>
          {YEAR_LABELS.map(y => (
            <div key={y.text} className={y.now ? styles.axisLabelNow : styles.axisLabel} style={{ top: y.top }}>{y.text}</div>
          ))}
        </div>
        <div className={styles.track}>
          <div className={styles.futureLabel}>↑ future</div>
          {YEAR_LABELS.map(y => (
            <div
              key={y.text}
              className={y.now ? styles.gridlineNow : styles.gridline}
              style={{ top: y.top }}
            />
          ))}
          {TIMELINE_BARS.map((bar, i) => (
            <div
              key={i}
              className={VARIANT_CLASS[bar.variant]}
              style={{ top: bar.top, left: bar.left, width: bar.width, height: bar.height, padding: bar.padding }}
            >
              {bar.tag && <span className={styles.barTag}>{bar.tag}</span>}
              <span className={styles.barTitle} style={{ fontSize: bar.titleSize }}>{bar.title}</span>
              {bar.org && <span className={styles.barOrg}>{bar.org}</span>}
            </div>
          ))}
        </div>
      </div>
      <Legend />
    </div>
  );
}
