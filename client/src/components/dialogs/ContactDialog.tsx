import { useState } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { ui } from '../../content';
import styles from './ContactDialog.module.css';

export function ContactDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const [statusOpen, setStatusOpen] = useState(true);
  const c = ui.contact;

  const setField = (field: 'msgName' | 'msgEmail' | 'msgBody', value: string) =>
    dispatch({ type: 'SET_MSG_FIELD', field, value });

  const sendMessage = () => {
    tick();
    const { msgName, msgEmail, msgBody } = state;
    const subject = `${c.mailto.subjectPrefix}${msgName || c.mailto.subjectFallback}`;
    const body = (msgBody || '') + (msgEmail ? `${c.mailto.signaturePrefix}${msgName} (${msgEmail})` : `${c.mailto.signaturePrefix}${msgName}`);
    window.location.href = `mailto:contact@imajello.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[5]</span>
          <span className={styles.title}>{ui.sections.contact.dialogTitle}</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>{ui.misc.closeGlyph} <span className={styles.escHint}>{ui.misc.escHint}</span></button>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.left}>
            <div>
              <div className={styles.continueTag}>{c.continueTag}</div>
              <h2 className={styles.heading}>{c.headingPrefix}<span className={styles.accent}>{c.headingAccent}</span></h2>
            </div>
            <p className={styles.intro}>{c.intro}</p>
            <div className={styles.linkGrid}>
              <a href="mailto:contact@imajello.com" className={styles.link}><span className={styles.arrow}>▸</span>{c.links.email}</a>
              <a href="https://github.com/jelo-ca" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>{c.links.github}</a>
              <a href="https://linkedin.com/in/anjoelo-calderon" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>{c.links.linkedin}</a>
              <a href="/Anjoelo_Calderon_Resume.pdf" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>{c.links.resume}</a>
            </div>
            <div className={styles.statusGrid}>
              <button
                type="button"
                data-sfx
                className={styles.statusHeading}
                onClick={() => setStatusOpen(o => !o)}
                aria-expanded={statusOpen}
              >
                {c.statusHeading} <span className={styles.statusToggle}>{statusOpen ? '▾' : '▸'}</span>
              </button>
              {statusOpen && (
                <>
                  {c.status.map(s => (
                    <div className={styles.statusItem} key={s.label}><span>{s.label}</span><span>{s.value}</span></div>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className={styles.formCard}>
            <span className={styles.formLabel}>{c.formLabel}</span>
            <input type="text" placeholder={c.placeholders.name} value={state.msgName} onChange={e => setField('msgName', e.target.value)} className={styles.input} />
            <input type="email" placeholder={c.placeholders.email} value={state.msgEmail} onChange={e => setField('msgEmail', e.target.value)} className={styles.input} />
            <textarea placeholder={c.placeholders.message} value={state.msgBody} onChange={e => setField('msgBody', e.target.value)} className={styles.textarea} />
            <button data-sfx className={styles.sendBtn} onClick={sendMessage}>{c.sendBtn}</button>
            <span className={styles.finePrint}>{c.finePrint}</span>
          </div>
        </div>
        <div className={styles.footer}>
          <span>{c.footer}</span>
        </div>
      </div>
    </div>
  );
}
