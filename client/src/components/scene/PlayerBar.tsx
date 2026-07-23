import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { DISCOVERIES } from '../../data/discoveries';
import type { SectionKey } from '../../data/discoveries';
import styles from './PlayerBar.module.css';

const NAV: Array<{ section: SectionKey; num: number; glyph: string; label: string; sublabel: string }> = [
  { section: 'journey', num: 1, glyph: '◆', label: 'WORLD MAP', sublabel: 'THE JOURNEY' },
  { section: 'quests', num: 2, glyph: '⚔', label: 'BATTLE LOG', sublabel: 'PROJECTS' },
  { section: 'experience', num: 3, glyph: '▣', label: 'QUEST LOG', sublabel: 'EXPERIENCE' },
  { section: 'hobbies', num: 4, glyph: '♦', label: 'INVENTORY', sublabel: 'HOBBIES' },
  { section: 'contact', num: 5, glyph: '✉', label: 'CONTACT', sublabel: 'SAY HELLO' },
];

export function PlayerBar({ onSummonFamiliar }: { onSummonFamiliar: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();

  const discoveredCount = Object.keys(state.discoveries).length;
  const xp = Math.round((discoveredCount / DISCOVERIES.length) * 100);
  const xpLabel = xp >= 100
    ? 'LVL UP★ ALL CHAPTERS EXPLORED'
    : `${xp}% XP · ${state.visited.length}/4 CHAPTERS`;

  return (
    <div className={styles.bar}>
      <div className={styles.xpTrack}><div className={styles.xpFill} style={{ width: `${xp}%` }} /></div>

      <div className={styles.playerPlate}>
        <div className={styles.plateTop}>
          <span>P1 · IMAJELLO</span>
          <span className={styles.level}>LVL 21</span>
        </div>
        <div className={styles.meterRow}>
          <span className={styles.meterLabelHp}>HP</span>
          <div className={styles.meterTrough}><div className={styles.meterFillHp} /><div className={styles.meterSegments} /></div>
        </div>
        <div className={styles.meterRow}>
          <span className={styles.meterLabelEn}>EN</span>
          <div className={styles.meterTrough}><div className={styles.meterFillEn} /><div className={styles.meterSegments} /></div>
        </div>
        <span className={styles.konamiHint}>{state.konamiUnlocked ? '★ KONAMI MASTER UNLOCKED' : '▲ ▲ ▼ ▼ ◀ ▶ ◀ ▶ B A'}</span>
        <span className={styles.xpLabel}>{xpLabel}</span>
      </div>

      <div className={styles.nav}>
        {NAV.map(item => {
          const visited = state.visited.includes(item.section);
          const hovering = state.navHover === item.section;
          return (
            <button
              key={item.section}
              data-sfx
              className={styles.navBtn}
              style={{
                background: hovering ? 'rgba(238,154,163,.16)' : 'none',
                borderRight: `3px solid ${visited ? '#ee9aa3' : '#2b2b30'}`,
              }}
              onMouseEnter={() => dispatch({ type: 'SET_NAV_HOVER', section: item.section })}
              onMouseLeave={() => dispatch({ type: 'SET_NAV_HOVER', section: null })}
              onClick={() => { tick(); dispatch({ type: 'OPEN_SECTION', section: item.section }); }}
            >
              <div className={styles.navFill} style={{ transform: hovering ? 'scaleY(1)' : 'scaleY(0)' }} />
              <span className={styles.navBadge}>{item.num}</span>
              <span className={styles.navGlyph}>{item.glyph}</span>
              <span className={styles.navLabel}>{item.label}</span>
              <span className={styles.navSub}>{item.sublabel}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.familiarWrap}>
        {/* onSummonFamiliar is a no-op stub passed from GameScene; Task 16 wires
            it to the real useFamiliarToggle() hook once that hook exists. */}
        <button data-sfx className={styles.familiarBtn} onClick={onSummonFamiliar}>
          <span className={styles.familiarBadge}>F</span>
          <span className={styles.familiarIcon}>🔮</span>
        </button>
        <span className={styles.familiarLabel}>FAMILIAR</span>
      </div>
    </div>
  );
}
