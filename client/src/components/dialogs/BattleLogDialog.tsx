import { PROJECTS } from '../../data/projects';
import { ui } from '../../content';
import { ImageSlot } from '../shared/ImageSlot';
import styles from './BattleLogDialog.module.css';

const GITHUB_MARK = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

const playIcon = (
  <svg className={styles.playIcon} viewBox="0 0 8 8" aria-hidden="true"><path d="M1 0h2v1h2v1h2v1h1v2H7v1H5v1H3v1H1z" /></svg>
);

export function BattleLogDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[2]</span>
          <span className={styles.title}>{ui.sections.quests.dialogTitle}</span>
          <span className={styles.sub}>{ui.sections.quests.dialogSub}</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>{ui.misc.closeGlyph} <span className={styles.escHint}>{ui.misc.escHint}</span></button>
      </div>
      <div className={styles.body}>
        {PROJECTS.map(p => (
          <div className={styles.card} key={p.id}>
            <div className={styles.links}>
              <a href={p.repoUrl} target="_blank" rel="noreferrer" data-sfx className={styles.linkBtn} aria-label={ui.battleLog.repoAriaLabel} title={ui.battleLog.repoAriaLabel}>
                <svg className={styles.repoIcon} viewBox="0 0 16 16" aria-hidden="true"><path d={GITHUB_MARK} /></svg>
              </a>
              {p.liveUrl ? (
                <a href={p.liveUrl} data-sfx className={styles.linkBtn}>
                  {playIcon}{ui.battleLog.liveLink}
                </a>
              ) : (
                <span className={`${styles.linkBtn} ${styles.linkDisabled}`} aria-disabled="true" title={ui.battleLog.liveUnavailable}>
                  {playIcon}{ui.battleLog.liveLink}
                </span>
              )}
            </div>
            <div className={styles.shotWrap} style={p.imageBg ? { background: p.imageBg } : undefined}>
              <ImageSlot src={p.imageSrc} placeholder={p.imagePlaceholder} />
              <span className={styles.rankBadge}>{ui.battleLog.rankPrefix} {p.rank}</span>
            </div>
            <div className={styles.info}>
              <div className={styles.infoTop}>
                <h3 className={styles.projTitle}>{p.title}</h3>
                <span className={p.status === 'complete' ? styles.statusComplete : styles.statusProgress}>{p.statusLabel}</span>
              </div>
              <div className={styles.meta}>{p.meta}</div>
              <ul className={styles.bullets}>
                {p.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              <div className={styles.lootRow}>
                <span className={styles.lootLabel}>{ui.battleLog.lootLabel}</span>
                {p.loot.map(l => <span className={styles.lootChip} key={l}>{l}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
