import { useCallback, useEffect, useState } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { ui } from '../../content';
import {
  EMPTY_IDENTITY, INITIALS_PATTERN, fetchLeaderboard, formatRunTime, submitScore,
  type Identity, type LeaderboardEntry,
} from '../../api/leaderboard';
import { InitialsEntry } from './InitialsEntry';
import styles from './LeaderboardDialog.module.css';

// The board fetch and the submit form are both transient view state with no other
// consumer, so they live here rather than in the reducer. The reducer only knows the
// panel is open and what the finished run scored.
export function LeaderboardDialog() {
  const { state, dispatch } = useGameState();
  const lb = ui.leaderboard;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set once the run has been dealt with — submitted (with its placement and row id) or
  // skipped. Either way the form comes down and doesn't come back for this run.
  const [placedRank, setPlacedRank] = useState<number | null>(null);
  const [myEntryId, setMyEntryId] = useState<string | null>(null);
  const [runHandled, setRunHandled] = useState(false);

  // A run is claimable exactly while the game-over banner is up and it hasn't already
  // been submitted or skipped. Opening the board mid-climb just shows the board.
  const hasRunToClaim = state.dkStatus === 'gameover' && !runHandled;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setEntries(await fetchLeaderboard());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : lb.loadError);
    } finally {
      setLoading(false);
    }
  }, [lb.loadError]);

  // Fetch on open rather than on mount: the board changes while the page is up, and a
  // stale list is worse than a short spinner.
  useEffect(() => {
    if (!state.leaderboardOpen) return;
    // Every open starts from AAA with the optional fields blank — nothing carries over from
    // the last run or the last player at this keyboard.
    setIdentity(EMPTY_IDENTITY);
    setSubmitError(null);
    void load();
  }, [state.leaderboardOpen, load]);

  // A new run means a new score to claim, so the previous run's outcome is cleared out.
  useEffect(() => {
    if (state.dkStatus === 'climbing') {
      setRunHandled(false);
      setPlacedRank(null);
      setMyEntryId(null);
    }
  }, [state.dkStatus]);

  if (!state.leaderboardOpen) return null;

  const close = () => dispatch({ type: 'CLOSE_LEADERBOARD' });

  const setField = (field: keyof Identity, value: string) =>
    setIdentity(prev => ({ ...prev, [field]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    // The reel can't produce anything else, so this is a belt-and-braces guard against the
    // value being set from somewhere other than the reel — better to fail at the form than
    // to send it and read the server's rejection back.
    if (!INITIALS_PATTERN.test(identity.displayName)) {
      setSubmitError(lb.form.nameRequired);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitScore({
        displayName: identity.displayName.trim(),
        firstName: identity.firstName.trim(),
        lastName: identity.lastName.trim(),
        company: identity.company.trim(),
        level: state.dkLevel,
        timeMs: Math.round(state.dkRunMs),
      });
      setEntries(result.entries);
      setPlacedRank(result.rank);
      setMyEntryId(result.entry.id);
      setRunHandled(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : lb.form.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    setRunHandled(true);
    setSubmitError(null);
  };

  const cell = (value: string) => (value === '' ? lb.emptyCell : value);

  return (
    <div className={styles.backdrop} onClick={close}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={lb.title}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{lb.title}</div>
            <div className={styles.sub}>{lb.sub}</div>
          </div>
          <button data-sfx className={styles.closeBtn} onClick={close} aria-label={lb.closeAriaLabel}>
            {ui.misc.closeGlyph}
          </button>
        </div>

        <p className={styles.intro}>{lb.intro}</p>

        {hasRunToClaim && (
          <div className={styles.runCard}>
            <div className={styles.runHeading}>{lb.runHeading}</div>
            <div className={styles.runStats}>
              <div className={styles.runStat}>
                <span className={styles.runStatLabel}>{lb.runLevelLabel}</span>
                <span className={styles.runStatValue}>
                  {ui.platformer.banners.levelLabel} {state.dkLevel}
                </span>
              </div>
              <div className={styles.runStat}>
                <span className={styles.runStatLabel}>{lb.runTimeLabel}</span>
                <span className={styles.runStatValue}>{formatRunTime(state.dkRunMs)}</span>
              </div>
            </div>

            <form className={styles.form} onSubmit={onSubmit}>
              <div className={styles.initialsBlock}>
                <div className={styles.label}>{lb.form.displayName}</div>
                <InitialsEntry
                  value={identity.displayName}
                  onChange={next => setField('displayName', next)}
                  disabled={submitting}
                />
                {/* The board hides real names, so what the player is actually publishing is
                    these three letters and their company. Showing that as a board row means
                    they see the result before they commit to it. */}
                <div className={styles.previewHeading}>{lb.form.previewHeading}</div>
                <div className={styles.previewRow}>
                  <span className={styles.previewRank}>{lb.form.previewRank}</span>
                  <span className={styles.previewName}>{identity.displayName}</span>
                  <span className={styles.previewCompany}>{cell(identity.company.trim())}</span>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="lb-first-name">
                  {lb.form.firstName} <span className={styles.optional}>{lb.form.optional}</span>
                </label>
                <input
                  id="lb-first-name"
                  className={styles.input}
                  value={identity.firstName}
                  onChange={e => setField('firstName', e.target.value)}
                  maxLength={30}
                  autoComplete="given-name"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="lb-last-name">
                  {lb.form.lastName} <span className={styles.optional}>{lb.form.optional}</span>
                </label>
                <input
                  id="lb-last-name"
                  className={styles.input}
                  value={identity.lastName}
                  onChange={e => setField('lastName', e.target.value)}
                  maxLength={30}
                  autoComplete="family-name"
                />
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className={styles.label} htmlFor="lb-company">
                  {lb.form.company} <span className={styles.optional}>{lb.form.optional}</span>
                </label>
                <input
                  id="lb-company"
                  className={styles.input}
                  value={identity.company}
                  onChange={e => setField('company', e.target.value)}
                  maxLength={40}
                  autoComplete="organization"
                />
              </div>

              {submitError && <div className={styles.error}>{submitError}</div>}

              <div className={styles.formActions}>
                <button type="submit" data-sfx className={styles.submitBtn} disabled={submitting}>
                  {submitting ? lb.form.submitting : lb.form.submit}
                </button>
                <button type="button" data-sfx className={styles.skipBtn} onClick={skip}>
                  {lb.form.skip}
                </button>
              </div>
            </form>
          </div>
        )}

        {myEntryId !== null && (
          <div className={styles.placed}>
            {placedRank === null
              ? lb.unplaced
              : <>{lb.placedPrefix} <span className={styles.placedRank}>#{placedRank}</span></>}
          </div>
        )}

        {loading && <div className={styles.status}>{lb.loading}</div>}

        {!loading && loadError && (
          <div className={styles.statusError}>
            <span>{lb.loadError}</span>
            <button data-sfx className={styles.retryBtn} onClick={() => void load()}>{lb.retry}</button>
          </div>
        )}

        {!loading && !loadError && entries.length === 0 && (
          <div className={styles.status}>{lb.empty}</div>
        )}

        {!loading && !loadError && entries.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{lb.columns.rank}</th>
                  <th>{lb.columns.name}</th>
                  <th>{lb.columns.company}</th>
                  <th>{lb.columns.level}</th>
                  <th>{lb.columns.time}</th>
                </tr>
              </thead>
              <tbody>
                {/* Real names are collected but deliberately not rendered — the board is a
                    public page, and display name plus company is all it needs to say. */}
                {entries.map((entry, index) => (
                  <tr key={entry.id} className={entry.id === myEntryId ? styles.mine : undefined}>
                    <td className={`${styles.rank} ${index < 3 ? styles.rankTop : ''}`}>{index + 1}</td>
                    <td className={styles.name}>{entry.displayName}</td>
                    <td className={styles.company}>{cell(entry.company)}</td>
                    <td className={styles.level}>{entry.level}</td>
                    <td className={styles.time}>{formatRunTime(entry.timeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.footerNote}>{lb.footer}</span>
          <span className={styles.escHint}>{ui.misc.escHint}</span>
        </div>
      </div>
    </div>
  );
}
