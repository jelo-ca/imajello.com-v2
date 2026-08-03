import { useGameState } from '../../state/GameStateContext';
import { DISCOVERIES } from '../../data/discoveries';
import { ui } from '../../content';
import styles from './DiscoveryListPanel.module.css';

export function DiscoveryListPanel() {
  const { state, dispatch } = useGameState();
  const discoveredCount = Object.keys(state.discoveries).length;
  const dp = ui.discoveryPanel;

  return (
    <div className={styles.wrap}>
      <button
        data-sfx
        className={styles.trigger}
        onClick={() => dispatch({ type: 'TOGGLE_DISCOVERIES' })}
      >
        <span>{dp.triggerIcon}</span> {dp.triggerLabel} {discoveredCount}/{DISCOVERIES.length}
      </button>
      {state.discoveriesOpen && (
        <div className={styles.panel}>
          <div className={styles.intro}>
            <p>{dp.intro}</p>
          </div>
          <div className={styles.rows}>
            {discoveredCount > 0 && (
              <>
                <div className={styles.groupLabel}>{dp.foundLabel}</div>
                <div className={styles.groupList}>
                  {DISCOVERIES.filter(d => state.discoveries[d.key]).map(d => (
                    <div key={d.key} className={styles.row}>
                      <span className={styles.icon}>★</span>
                      <span className={styles.name} style={{ color: 'var(--on-panel)' }}>{d.name}</span>
                      <span className={styles.how} style={{ color: 'var(--pink)' }}>{d.how}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className={styles.groupLabel}>{dp.undiscoveredLabel}</div>
            <div className={styles.groupList}>
              {DISCOVERIES.filter(d => !state.discoveries[d.key]).map(d => (
                <div key={d.key} className={styles.row}>
                  <span className={styles.icon}>🔒</span>
                  <span className={styles.name} style={{ color: 'var(--grey-light)' }}>{d.name}</span>
                  <span className={styles.how} style={{ color: 'var(--border-dark)' }}>{dp.hiddenPlaceholder}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
