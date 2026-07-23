import { useGameState } from '../../state/GameStateContext';
import { DISCOVERIES } from '../../data/discoveries';
import styles from './DiscoveryListPanel.module.css';

export function DiscoveryListPanel() {
  const { state, dispatch } = useGameState();
  const discoveredCount = Object.keys(state.discoveries).length;

  return (
    <div className={styles.wrap}>
      <button
        data-sfx
        className={styles.trigger}
        onClick={() => dispatch({ type: 'TOGGLE_DISCOVERIES' })}
      >
        <span>🧭</span> DISCOVERIES {discoveredCount}/{DISCOVERIES.length}
      </button>
      {state.discoveriesOpen && (
        <div className={styles.panel}>
          <div className={styles.intro}>
            <p>Poke around the site to find them all — some are in plain sight, some are secrets.</p>
          </div>
          <div className={styles.rows}>
            {discoveredCount > 0 && (
              <>
                <div className={styles.groupLabel}>FOUND</div>
                <div className={styles.groupList}>
                  {DISCOVERIES.filter(d => state.discoveries[d.key]).map(d => (
                    <div key={d.key} className={styles.row}>
                      <span className={styles.icon}>★</span>
                      <span className={styles.name} style={{ color: '#f5d9dc' }}>{d.name}</span>
                      <span className={styles.how} style={{ color: '#ee9aa3' }}>{d.how}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className={styles.groupLabel}>UNDISCOVERED</div>
            <div className={styles.groupList}>
              {DISCOVERIES.filter(d => !state.discoveries[d.key]).map(d => (
                <div key={d.key} className={styles.row}>
                  <span className={styles.icon}>🔒</span>
                  <span className={styles.name} style={{ color: '#a8a5ac' }}>{d.name}</span>
                  <span className={styles.how} style={{ color: '#4a4a52' }}>???</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
