import { TIMELINE_BARS } from '../../data/quests';
import { ui } from '../../content';
import styles from './TimelineTab.module.css';

const YEAR_LABELS = ui.timeline.yearLabels;

const VARIANT_CLASS: Record<string, string> = {
  'education-pink': styles.barEducationPink,
  'education-uci': styles.barEducationUci,
  main: styles.barMain,
  side: styles.barSide,
};

function Legend() {
  const t = ui.timeline.legend;
  return (
    <div className={styles.legend}>
      <span><span className={styles.swatchMain} /> {t.main}</span>
      <span><span className={styles.swatchSide} /> {t.side}</span>
      <span><span className={styles.swatchEduPink} /> {t.eduPink}</span>
      <span><span className={styles.swatchEduUci} /> {t.eduUci}</span>
    </div>
  );
}

export function TimelineTab() {
  return (
    <div className={styles.wrap}>
      <div className={styles.introRow}>
        <p className={styles.intro}>{ui.timeline.intro}</p>
        <Legend />
      </div>
      <div className={styles.chartScroll}>
        <div className={styles.chartRow}>
          <div className={styles.axis}>
            {YEAR_LABELS.map(y => (
              <div key={y.text} className={y.now ? styles.axisLabelNow : styles.axisLabel} style={{ top: y.top }}>{y.text}</div>
            ))}
          </div>
          <div className={styles.track}>
            <div className={styles.futureLabel}>{ui.timeline.futureLabel}</div>
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
      </div>
      <Legend />
    </div>
  );
}
