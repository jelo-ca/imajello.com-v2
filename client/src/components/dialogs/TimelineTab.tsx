import { useMemo } from 'react';
import { TIMELINE_BARS } from '../../data/quests';
import { ui } from '../../content';
import { layoutTimeline } from '../../hooks/timelineLayout';
import styles from './TimelineTab.module.css';

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
  // Rebuild from the clock whenever this tab mounts (opening Quest Log / switching tabs).
  const { trackHeight, labels, bars } = useMemo(
    () => layoutTimeline(TIMELINE_BARS, new Date()),
    [],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.introRow}>
        <p className={styles.intro}>{ui.timeline.intro}</p>
        <Legend />
      </div>
      <div className={styles.chartScroll}>
        <div className={styles.chartRow}>
          <div className={styles.axis} style={{ height: trackHeight }}>
            {labels.map(y => (
              <div
                key={`${y.text}-${Math.round(y.top)}`}
                className={y.now ? styles.axisLabelNow : styles.axisLabel}
                style={{ top: y.top }}
              >
                {y.text}
              </div>
            ))}
          </div>
          <div className={styles.track} style={{ height: trackHeight }}>
            <div className={styles.futureLabel}>{ui.timeline.futureLabel}</div>
            {labels.map(y => (
              <div
                key={`grid-${y.text}-${Math.round(y.top)}`}
                className={y.now ? styles.gridlineNow : styles.gridline}
                style={{ top: y.top }}
              />
            ))}
            {bars.map((bar, i) => (
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
