import { useEffect, useRef } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useFamiliarToggle } from '../../hooks/useFamiliarToggle';
import { useSfx } from '../../hooks/useSfx';
import { CHAT_QUESTION_LIMIT } from '../../data/discoveries';
import { ui } from '../../content';
import styles from './FamiliarChat.module.css';

function getSessionId(): string {
  const KEY = 'imajello-chat-session';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function FamiliarChat() {
  const { state, dispatch } = useGameState();
  const toggleFamiliar = useFamiliarToggle();
  const { tick } = useSfx();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state.chatMessages]);

  if (!state.familiarOpen) return null;

  const fc = ui.familiarChat;
  const questionsLeft = CHAT_QUESTION_LIMIT - state.chatQuestionsAsked;
  const sleepy = state.familiarAsleep || questionsLeft <= 0;
  const disabled = state.familiarAsleep || state.chatSending || questionsLeft <= 0;
  const placeholder = state.familiarAsleep ? fc.sleepingPlaceholder : questionsLeft <= 0 ? fc.outOfQuestionsPlaceholder : fc.defaultPlaceholder;
  const questionsLabel = state.familiarAsleep
    ? fc.sleepingLabel
    : `${questionsLeft} ${questionsLeft === 1 ? fc.questionSingular : fc.questionPlural} ${fc.questionsLeftSuffix}`;

  const send = async () => {
    const text = state.chatInputValue.trim();
    if (!text || disabled) return;
    tick();
    dispatch({ type: 'CHAT_SEND_START', text });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? fc.errors.requestFailed);
      if (!data.reply || typeof data.reply !== 'string') throw new Error(fc.errors.malformedResponse);
      dispatch({ type: 'CHAT_SEND_SUCCESS', reply: data.reply });
    } catch (err) {
      const reason = err instanceof Error ? err.message : fc.errors.noCredits;
      dispatch({ type: 'CHAT_SEND_ERROR', reason });
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.emoji}>
        {state.familiarEmoji}
        {sleepy && <span className={styles.sleepBadge}>💤</span>}
      </div>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>{fc.panelHeader}</span>
          <button data-sfx className={styles.closeBtn} onClick={toggleFamiliar}>{ui.misc.closeGlyph}</button>
        </div>
        <div className={styles.body}>
          <div ref={scrollRef} className={styles.scroll}>
            {state.familiarAsleep ? (
              <div>{fc.sleepBannerPrefix}{state.familiarSleepReason}{fc.sleepBannerSuffix}</div>
            ) : (
              state.chatMessages.map((m, i) => <div key={i} style={{ color: m.color }}>{m.text}</div>)
            )}
          </div>
          <div className={styles.inputRow}>
            <input
              type="text"
              value={state.chatInputValue}
              onChange={e => dispatch({ type: 'SET_CHAT_INPUT', value: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder={placeholder}
              disabled={disabled}
              className={styles.input}
            />
            <button data-sfx disabled={disabled} className={styles.sendBtn} onClick={send}>{fc.sendBtn}</button>
          </div>
          <span className={styles.questionsLeft}>{questionsLabel}</span>
        </div>
      </div>
    </div>
  );
}
