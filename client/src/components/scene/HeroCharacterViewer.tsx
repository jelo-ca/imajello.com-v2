import { useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { CHARS } from '../../data/chars';
import { ui } from '../../content';
import styles from './HeroCharacterViewer.module.css';

// Minimum horizontal drag distance (px) to count as a swipe, below which
// a touch is treated as a tap/scroll rather than a character-change gesture.
const SWIPE_THRESHOLD = 40;

export function HeroCharacterViewer() {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const char = CHARS[state.charIdx];
  const prevChar = state.charPrevIdx != null ? CHARS[state.charPrevIdx] : null;

  useEffect(() => {
    if (state.charPrevIdx == null) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_CHAR_PREV' }), 300);
    return () => clearTimeout(timer);
  }, [state.charPrevIdx, state.charIdx, dispatch]);

  const goPrev = () => { tick(); dispatch({ type: 'PREV_CHAR' }); };
  const goNext = () => { tick(); dispatch({ type: 'NEXT_CHAR' }); };
  const handleStart = () => { tick(); dispatch({ type: 'START_PLATFORMER' }); };

  // Mobile replaces the ◀/▶ buttons with a swipe gesture on the portrait/stats row
  // (buttons are hidden via CSS below 768px — see HeroCharacterViewer.module.css .arrow).
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext(); else goPrev();
  };

  // Once playing, the Platformer component (added in Task 2) owns rendering the
  // character — this picker screen disappears entirely rather than sitting hidden
  // underneath it.
  if (state.playing) return null;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>
        <button
          data-sfx
          className={styles.firstName}
          onClick={() => { tick(); dispatch({ type: 'TOGGLE_NICKNAME' }); }}
          aria-label={ui.hero.nameToggleAriaLabel}
        >
          {state.nicknameOn ? ui.hero.name.nickname : ui.hero.name.first}
        </button>
        {' '}
        {ui.hero.name.lastPre}
        <span className={styles.titleAccent}>{ui.hero.name.lastAccent}</span>
        {ui.hero.name.lastPost}
      </h1>
      <div className={styles.eyebrow}>{ui.hero.eyebrow}</div>

      <div className={styles.row} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button data-sfx className={styles.arrow} onClick={goPrev}>◀</button>

        <div className={styles.portraitBox}>
          <div className={styles.scanlines} />
          {prevChar && (
            <img
              key={`out-${state.charPrevIdx}`}
              src={prevChar.src}
              alt=""
              className={styles.portraitImg}
              style={{ animation: `${state.charDir === 'prev' ? 'charOutR' : 'charOutL'} .28s steps(6) both` }}
            />
          )}
          <img
            key={`in-${state.charIdx}`}
            src={char.src}
            alt={char.name}
            className={`${styles.portraitImg} ${styles.portraitImgIn}`}
            style={{ animation: `${state.charDir === 'prev' ? 'charInL' : 'charInR'} .28s steps(6) both` }}
          />
          <div className={styles.glow} />
        </div>

        <div className={styles.statPanel}>
          <div className={styles.statsHeader}>
            <span className={styles.statsLabel}>{ui.hero.statsLabel}</span>
          </div>
          {char.stats.map(stat => (
            <div className={styles.statRow} key={stat.name}>
              <div className={styles.statTop}>
                <span>{stat.name}</span>
                <span className={styles.statMod}>{stat.mod}</span>
              </div>
              <div className={styles.statTrough}>
                <div className={styles.statFill} style={{ width: stat.w }} />
                <div className={styles.statSegments} />
              </div>
            </div>
          ))}
        </div>

        <button data-sfx className={styles.arrow} onClick={goNext}>▶</button>
      </div>

      <div className={styles.nameClassRow}>
        <button data-sfx className={styles.mobileArrow} onClick={goPrev} aria-label={ui.hero.prevAriaLabel}>◀</button>
        <div className={styles.nameClassBox}>
          <div className={styles.charName}>{char.name}</div>
          <div className={styles.charClass}>{char.cls}</div>
        </div>
        <button data-sfx className={styles.mobileArrow} onClick={goNext} aria-label={ui.hero.nextAriaLabel}>▶</button>
      </div>

      <button data-sfx className={styles.startBtn} onClick={handleStart}>{ui.hero.startBtn}</button>
    </div>
  );
}
