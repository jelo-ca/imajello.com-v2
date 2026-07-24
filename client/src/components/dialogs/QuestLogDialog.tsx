import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { MAIN_QUESTS, SIDE_QUESTS, ACHIEVEMENTS, EDUCATION } from '../../data/quests';
import { TimelineTab } from './TimelineTab';
import styles from './QuestLogDialog.module.css';

export function QuestLogDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const tab = state.questLogTab;
  const setTab = (t: typeof tab) => { tick(); dispatch({ type: 'SET_QUEST_TAB', tab: t }); };

  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[3]</span>
          <span className={styles.title}>Quest Log</span>
          <span className={styles.sub}>EXPERIENCE</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ <span className={styles.escHint}>ESC</span></button>
      </div>
      <div className={styles.body}>
        <div className={styles.tabs}>
          <button data-sfx className={tab === 'main' ? styles.tabActive : styles.tab} onClick={() => setTab('main')}>MAIN QUESTS</button>
          <button data-sfx className={tab === 'side' ? styles.tabActive : styles.tab} onClick={() => setTab('side')}>SIDE QUESTS <span className={styles.tabCount}>+4</span></button>
          <button data-sfx className={tab === 'timeline' ? styles.tabActive : styles.tab} onClick={() => setTab('timeline')}>TIMELINE</button>
        </div>

        {/* Mobile-only: the 3-button tab row above is replaced by this compact dropdown
            below 768px (see .tabs/.tabSelect in QuestLogDialog.module.css) — same state,
            no duplicate logic, just a narrower control on small screens. */}
        <select
          className={styles.tabSelect}
          value={tab}
          onChange={e => setTab(e.target.value as typeof tab)}
          aria-label="Quest log section"
        >
          <option value="main">MAIN QUESTS</option>
          <option value="side">SIDE QUESTS (+4)</option>
          <option value="timeline">TIMELINE</option>
        </select>

        {tab === 'main' && (
          <>
            <p className={styles.intro}>I find the edge cases more interesting than the happy path — reliable evaluation, honest failure modes, real constraints around latency and cost. That's the terrain I enjoy.</p>
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
            <p className={styles.introSide}>Not everything is in a terminal. These jobs taught me the stuff that doesn't show up in a commit log.</p>
            <div className={styles.sideGrid}>
              {SIDE_QUESTS.map(job => (
                <div className={styles.sideCard} key={job.title}>
                  <div className={styles.sideTop}><span className={styles.sideTag}>⚔ SIDE QUEST</span><span className={styles.sideDate}>{job.dateRange}</span></div>
                  <div className={styles.sideTitle}>{job.title}</div>
                  <div className={styles.sideOrg}>{job.org}</div>
                  <ul>{job.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  {job.skills && (
                    <div className={styles.skillsRow}>
                      <span className={styles.skillsLabel}>SKILLS GAINED:</span>
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
              <h2>Achievements Unlocked</h2>
              <span className={styles.achTag}>LEADERSHIP</span>
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
              <div className={styles.eduLabel}>EDUCATION</div>
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
