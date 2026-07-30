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

// Ported from design_handoff_portfolio_game_hud/design/Imajello Site v4b - Game HUD.dc.html
// lines 62-145 ("Template A" — heroA, the only variant with hint-placeholder-val {{ true }},
// so it's the one actually shown). The reference's single flex container (line 63) holds five
// direct children in this order: eyebrow (64), name h1 (65), the ◀ [portrait] [stats] ▶ row
// (69-85, one flex row — the arrows flank the portrait box + stat panel, they are not split
// across an outer wrapper), the name/class plate (136-139), and the bio paragraph (142).
// HeroCharacterViewer.module.css's `.wrap` is `display:contents` so those five elements become
// direct flex children of GameScene's `.heroWrap` (which owns the flex/gap/padding from line 63),
// reproducing that flat structure exactly instead of nesting an extra box around them.

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

  return (
    <div className={styles.wrap}>
      <div className={styles.eyebrow}>{ui.hero.eyebrow}</div>
      <h1 className={styles.name}>{ui.hero.nameFirst}<span className={styles.accent}>{ui.hero.nameAccent}</span>{ui.hero.nameLast}</h1>

      {/* reference lines 69-85: one flex row, arrows flanking portrait box + stat panel */}
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

      {/* reference lines 136-139: character name/class plate, always shown (not template-gated).
          Below 768px the .row arrows are hidden in favor of swipe (see onTouchStart/onTouchEnd
          above); .mobileArrow gives mobile users a visible, discoverable way to rotate characters
          too, since swipe alone isn't obvious. Desktop keeps using the .row arrows only. */}
      <div className={styles.nameClassRow}>
        <button data-sfx className={styles.mobileArrow} onClick={goPrev} aria-label={ui.hero.prevAriaLabel}>◀</button>
        <div className={styles.nameClassBox}>
          <div className={styles.charName}>{char.name}</div>
          <div className={styles.charClass}>{char.cls}</div>
        </div>
        <button data-sfx className={styles.mobileArrow} onClick={goNext} aria-label={ui.hero.nextAriaLabel}>▶</button>
      </div>

      {/* reference line 142: static bio, [data-hero-bio] hidden on short viewports via global.css. */}
      <p data-hero-bio className={styles.bio}>
        {ui.hero.bio}
      </p>
    </div>
  );
}
