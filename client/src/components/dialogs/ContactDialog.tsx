import { useState } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import styles from './ContactDialog.module.css';

export function ContactDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const [statusOpen, setStatusOpen] = useState(true);

  const setField = (field: 'msgName' | 'msgEmail' | 'msgBody', value: string) =>
    dispatch({ type: 'SET_MSG_FIELD', field, value });

  const sendMessage = () => {
    tick();
    const { msgName, msgEmail, msgBody } = state;
    const subject = `Hello from ${msgName || 'a visitor'}`;
    const body = (msgBody || '') + (msgEmail ? `\n\n— ${msgName} (${msgEmail})` : `\n\n— ${msgName}`);
    window.location.href = `mailto:contact@imajello.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[5]</span>
          <span className={styles.title}>Contact</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ ESC</button>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.left}>
            <div>
              <div className={styles.continueTag}>CONTINUE?</div>
              <h2 className={styles.heading}>Ready for the next <span className={styles.accent}>quest?</span></h2>
            </div>
            <p className={styles.intro}>Open to Summer 2027 internships and interesting collaborations in AI/ML and full-stack engineering.</p>
            <div className={styles.linkGrid}>
              <a href="mailto:contact@imajello.com" className={styles.link}><span className={styles.arrow}>▸</span>EMAIL</a>
              <a href="https://github.com/jelo-ca" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>GITHUB</a>
              <a href="https://linkedin.com/in/anjoelo-calderon" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>LINKEDIN</a>
              <a href="/Anjoelo_Calderon_Resume.pdf" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>RESUME</a>
            </div>
            <div className={styles.statusGrid}>
              <button
                type="button"
                data-sfx
                className={styles.statusHeading}
                onClick={() => setStatusOpen(o => !o)}
                aria-expanded={statusOpen}
              >
                PLAYER STATUS <span className={styles.statusToggle}>{statusOpen ? '▾' : '▸'}</span>
              </button>
              {statusOpen && (
                <>
                  <div className={styles.statusItem}><span>AVAILABILITY</span><span>NOW · FALL/SPRING/SUMMER</span></div>
                  <div className={styles.statusItem}><span>FOCUS</span><span>AI/ML · FULL-STACK</span></div>
                  <div className={styles.statusItem}><span>RESPONSE TIME</span><span>&lt; 24 HRS</span></div>
                  <div className={styles.statusItem}><span>LOCATION</span><span>OPEN TO RELOCATE</span></div>
                </>
              )}
            </div>
          </div>
          <div className={styles.formCard}>
            <span className={styles.formLabel}>SEND A MESSAGE</span>
            <input type="text" placeholder="YOUR NAME" value={state.msgName} onChange={e => setField('msgName', e.target.value)} className={styles.input} />
            <input type="email" placeholder="YOUR EMAIL" value={state.msgEmail} onChange={e => setField('msgEmail', e.target.value)} className={styles.input} />
            <textarea placeholder="YOUR MESSAGE" value={state.msgBody} onChange={e => setField('msgBody', e.target.value)} className={styles.textarea} />
            <button data-sfx className={styles.sendBtn} onClick={sendMessage}>▶ SAY HELLO</button>
            <span className={styles.finePrint}>Opens your email app pre-filled — nothing sends until you hit send there.</span>
          </div>
        </div>
        <div className={styles.footer}>
          <span>© 2026 · INSERT COIN</span>
        </div>
      </div>
    </div>
  );
}
