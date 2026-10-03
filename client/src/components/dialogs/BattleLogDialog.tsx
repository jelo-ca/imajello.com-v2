import { PROJECTS } from '../../data/projects';
import { ui } from '../../content';
import { ImageSlot } from '../shared/ImageSlot';
import styles from './BattleLogDialog.module.css';

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
            <a href={p.liveUrl ?? p.repoUrl} target="_blank" rel="noreferrer" data-sfx className={styles.repoLink}>
              {p.liveUrl ? (
                <>
                  <svg className={styles.playIcon} viewBox="0 0 8 8" aria-hidden="true"><path d="M1 0h2v1h2v1h2v1h1v2H7v1H5v1H3v1H1z" /></svg>
                  {ui.battleLog.liveLink}
                </>
              ) : ui.battleLog.repoLink}
            </a>
            <div className={styles.shotWrap}>
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
