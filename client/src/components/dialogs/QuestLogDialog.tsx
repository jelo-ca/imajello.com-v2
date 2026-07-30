import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { MAIN_QUESTS, SIDE_QUESTS, ACHIEVEMENTS, EDUCATION } from '../../data/quests';
import { ui } from '../../content';
import { TimelineTab } from './TimelineTab';
import styles from './QuestLogDialog.module.css';

const TAB_ORDER = ['main', 'side', 'timeline'] as const;

export function QuestLogDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const tab = state.questLogTab;
  const setTab = (t: typeof tab) => { tick(); dispatch({ type: 'SET_QUEST_TAB', tab: t }); };
  const q = ui.questLog;

  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[3]</span>
          <span className={styles.title}>{ui.sections.experience.dialogTitle}</span>
          <span className={styles.sub}>{ui.sections.experience.dialogSub}</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>{ui.misc.closeGlyph} <span className={styles.escHint}>{ui.misc.escHint}</span></button>
      </div>
      <div className={styles.body}>
        <div className={styles.tabs}>
          <button data-sfx className={tab === 'main' ? styles.tabActive : styles.tab} onClick={() => setTab('main')}>{q.tabs.main}</button>
          <button data-sfx className={tab === 'side' ? styles.tabActive : styles.tab} onClick={() => setTab('side')}>{q.tabs.side} <span className={styles.tabCount}>+{SIDE_QUESTS.length}</span></button>
          <button data-sfx className={tab === 'timeline' ? styles.tabActive : styles.tab} onClick={() => setTab('timeline')}>{q.tabs.timeline}</button>
        </div>

        {/* Mobile-only: the 3-button tab row above is replaced by this compact dropdown
            below 768px (see .tabs/.tabSelect in QuestLogDialog.module.css) — same state,
            no duplicate logic, just a narrower control on small screens. */}
        <select
          className={styles.tabSelect}
          value={tab}
          onChange={e => setTab(e.target.value as typeof tab)}
          aria-label={q.mobileSelectAriaLabel}
        >
          {TAB_ORDER.map(t => (
            <option key={t} value={t}>{q.tabs[t]}{t === 'side' ? ` (+${SIDE_QUESTS.length})` : ''}</option>
          ))}
        </select>

        {tab === 'main' && (
          <>
            <p className={styles.intro}>{q.mainIntro}</p>
            <div className={styles.jobGrid}>
              {MAIN_QUESTS.map(job => (
                <div className={styles.jobCard} key={job.title}>
                  <div className={styles.jobDate}>{job.dateRange}</div>
                  <div className={styles.jobHeading}><h3>{job.title}</h3><span>{job.org}</span></div>
                  <ul>{job.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'side' && (
          <div className={styles.sideWrap}>
            <p className={styles.introSide}>{q.sideIntro}</p>
            <div className={styles.sideGrid}>
              {SIDE_QUESTS.map(job => (
                <div className={styles.sideCard} key={job.title}>
                  <div className={styles.sideTop}><span className={styles.sideTag}>{q.sideTag}</span><span className={styles.sideDate}>{job.dateRange}</span></div>
                  <div className={styles.sideTitle}>{job.title}</div>
                  <div className={styles.sideOrg}>{job.org}</div>
                  <ul>{job.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  {job.skills && (
                    <div className={styles.skillsRow}>
                      <span className={styles.skillsLabel}>{q.skillsLabel}</span>
                      {job.skills.map(s => <span className={styles.skillChip} key={s}>{s}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab !== 'timeline' && (
          <>
            <div className={styles.achHeading}>
              <h2>{q.achievementsHeading}</h2>
              <span className={styles.achTag}>{q.achievementsTag}</span>
            </div>
            <div className={styles.achGrid}>
              {ACHIEVEMENTS.map(a => (
                <div className={styles.achCard} key={a.title}>
                  <span className={styles.achIcon}>{a.icon}</span>
                  <div className={styles.achTitle}>{a.title}</div>
                  <div className={styles.achDesc}>{a.desc}</div>
                </div>
              ))}
            </div>
            <div className={styles.eduRow}>
              <div className={styles.eduLabel}>{q.educationLabel}</div>
              <div className={styles.eduList}>
                {EDUCATION.map(e => (
                  <div key={e.title}>
                    <div className={styles.eduTitle}>{e.title}</div>
                    <div className={styles.eduMeta}>{e.meta}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'timeline' && <TimelineTab />}
      </div>
    </div>
  );
}
