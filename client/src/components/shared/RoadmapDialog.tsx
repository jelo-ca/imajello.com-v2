import { useGameState } from '../../state/GameStateContext';
import { ui } from '../../content';
import styles from './RoadmapDialog.module.css';

export function RoadmapDialog() {
  const { state, dispatch } = useGameState();
  const r = ui.roadmap;

  if (!state.roadmapOpen) return null;

  const close = () => dispatch({ type: 'CLOSE_ROADMAP' });

  return (
    <div className={styles.backdrop} onClick={close}>
      {/* Clicks inside the panel must not reach the backdrop's close handler. */}
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={r.title}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{r.title}</div>
            <div className={styles.sub}>{r.sub}</div>
          </div>
          <button data-sfx className={styles.closeBtn} onClick={close} aria-label={r.closeAriaLabel}>
            {ui.misc.closeGlyph}
          </button>
        </div>

        <p className={styles.intro}>{r.intro}</p>

        <ul className={styles.list}>
          {r.items.map(item => (
            <li key={item.title} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.itemTitle}>{item.title}</span>
                <span className={item.state === 'active' ? styles.statusActive : styles.statusQueued}>
                  {item.status}
                </span>
              </div>
              <p className={styles.desc}>{item.desc}</p>
            </li>
          ))}
        </ul>

        <div className={styles.footer}>
          <span>{r.footer}</span>
          <span className={styles.escHint}>{ui.misc.escHint}</span>
        </div>
      </div>
    </div>
  );
}
