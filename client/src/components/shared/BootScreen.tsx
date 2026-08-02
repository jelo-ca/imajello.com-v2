import { useEffect, useRef, useState } from 'react';
import { ui } from '../../content';
import styles from './BootScreen.module.css';

// Length of the exit fade in BootScreen.module.css (.overlayExiting). Kept in sync by
// hand so the node is unmounted exactly when the fade ends rather than mid-fade.
const EXIT_MS = 260;

export function BootScreen() {
  const b = ui.boot;
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);
  const exitTimerRef = useRef<number | null>(null);

  // Drive the bar off timestamps rather than a fixed tick count so the fill takes
  // b.durationMs whatever the frame rate is, and a throttled background tab doesn't
  // leave the visitor stuck on a half-full bar when they come back.
  useEffect(() => {
    if (exiting) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const pct = Math.min(100, ((now - start) / b.durationMs) * 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(step);
      else setExiting(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [b.durationMs, exiting]);

  // Any key or click skips ahead. Capture phase + stopImmediatePropagation so the
  // skip keypress is consumed here and never reaches App's shortcut handler — without
  // it, skipping with Space would also start the platformer underneath.
  useEffect(() => {
    if (exiting) return;
    const skip = (e: Event) => {
      e.stopImmediatePropagation();
      setExiting(true);
    };
    window.addEventListener('keydown', skip, true);
    window.addEventListener('pointerdown', skip, true);
    return () => {
      window.removeEventListener('keydown', skip, true);
      window.removeEventListener('pointerdown', skip, true);
    };
  }, [exiting]);

  useEffect(() => {
    if (!exiting) return;
    exitTimerRef.current = window.setTimeout(() => setGone(true), EXIT_MS);
    return () => {
      if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current);
    };
  }, [exiting]);

  if (gone) return null;

  // The last step ("READY") is only reached at a full bar; the ones before it split the
  // remaining span evenly.
  const stepIdx = Math.min(b.steps.length - 1, Math.floor((progress / 100) * (b.steps.length - 1)));

  return (
    <div
      className={`${styles.overlay} ${exiting ? styles.overlayExiting : ''}`}
      role="status"
      aria-live="polite"
      aria-label={b.skipAriaLabel}
    >
      <div className={styles.panel}>
        <div className={styles.badge}>{b.badge}</div>
        <h1 className={styles.title}>{b.title}</h1>
        <div className={styles.subtitle}>{b.subtitle}</div>

        <div className={styles.warning}>
          <div className={styles.warningHeading}>⚠ {b.heading}</div>
          <p className={styles.warningText}>{b.text}</p>
        </div>

        <div className={styles.barWrap}>
          <div className={styles.bar}>
            <div className={styles.fill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.barMeta}>
            <span className={styles.step}>{b.steps[stepIdx]}</span>
            <span className={styles.pct}>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className={styles.skip}>{b.skipHint}</div>
      </div>
    </div>
  );
}
