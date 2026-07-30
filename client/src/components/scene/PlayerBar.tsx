import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { DISCOVERIES } from '../../data/discoveries';
import type { SectionKey } from '../../data/discoveries';
import { ui } from '../../content';
import styles from './PlayerBar.module.css';

const NAV: Array<{ section: SectionKey; num: number; glyph: string }> = [
  { section: 'journey', num: 1, glyph: '◆' },
  { section: 'quests', num: 2, glyph: '⚔' },
  { section: 'experience', num: 3, glyph: '▣' },
  { section: 'hobbies', num: 4, glyph: '♦' },
  { section: 'contact', num: 5, glyph: '✉' },
];

interface Props {
  onSummonFamiliar: () => void;
  setPlatformRef: (key: string) => (el: HTMLElement | null) => void;
}

export function PlayerBar({ onSummonFamiliar, setPlatformRef }: Props) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const pb = ui.playerBar;

  const discoveredCount = Object.keys(state.discoveries).length;
  const xp = Math.round((discoveredCount / DISCOVERIES.length) * 100);
  const xpLabel = xp >= 100
    ? pb.xpMaxLabel
    : `${xp}% XP · ${state.visited.length}/4 CHAPTERS`;

  return (
    <div className={styles.bar}>
      <div className={styles.xpTrack}><div className={styles.xpFill} style={{ width: `${xp}%` }} /></div>

      <div className={styles.playerPlate} ref={setPlatformRef('plate')}>
        <div className={styles.plateTop}>
          <span>{pb.playerPlate}</span>
          <span className={styles.level}>{pb.level}</span>
        </div>
        <div className={styles.meterRow}>
          <span className={styles.meterLabelHp}>{pb.hp}</span>
          <div className={styles.meterTrough}><div className={styles.meterFillHp} /><div className={styles.meterSegments} /></div>
        </div>
        <div className={styles.meterRow}>
          <span className={styles.meterLabelEn}>{pb.en}</span>
          <div className={styles.meterTrough}><div className={styles.meterFillEn} /><div className={styles.meterSegments} /></div>
        </div>
        <span className={styles.konamiHint}>{state.konamiUnlocked ? pb.konamiUnlocked : pb.konamiHint}</span>
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
              ref={setPlatformRef(`nav-${item.section}`)}
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
              <span className={styles.navLabel}>{ui.sections[item.section].navLabel}</span>
              <span className={styles.navSub}>{ui.sections[item.section].navSublabel}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.familiarWrap}>
        <button data-sfx className={styles.familiarBtn} ref={setPlatformRef('familiar')} onClick={onSummonFamiliar}>
          <span className={styles.familiarBadge}>F</span>
          <span className={styles.familiarIcon}>🔮</span>
        </button>
        <span className={styles.familiarLabel}>{pb.familiarLabel}</span>
      </div>
    </div>
  );
}
