import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { WorldMapDialog } from './WorldMapDialog';
import { BattleLogDialog } from './BattleLogDialog';
import { QuestLogDialog } from './QuestLogDialog';
import { InventoryDialog } from './InventoryDialog';
import { ContactDialog } from './ContactDialog';
import type { SectionKey } from '../../data/discoveries';
import styles from './DialogHost.module.css';

const HOTBAR: Array<{ section: SectionKey; glyph: string; num: string }> = [
  { section: 'journey', glyph: '◆', num: '1' },
  { section: 'quests', glyph: '⚔', num: '2' },
  { section: 'experience', glyph: '▣', num: '3' },
  { section: 'hobbies', glyph: '♦', num: '4' },
  { section: 'contact', glyph: '✉', num: '5' },
];

export function DialogHost() {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const anyOpen = !!state.open;
  if (!anyOpen) return null;

  const close = () => { tick(); dispatch({ type: 'CLOSE_SECTION' }); };

  return (
    <>
      {state.open === 'journey' && <WorldMapDialog onClose={close} />}
      {state.open === 'quests' && <BattleLogDialog onClose={close} />}
      {state.open === 'experience' && <QuestLogDialog onClose={close} />}
      {state.open === 'hobbies' && <InventoryDialog onClose={close} />}
      {state.open === 'contact' && <ContactDialog onClose={close} />}

      <div className={styles.hotbar}>
        {HOTBAR.map(item => (
          <button
            key={item.section}
            data-sfx
            className={styles.hotbarBtn}
            style={{ background: state.open === item.section ? 'rgba(245,217,220,.14)' : 'none' }}
            onClick={() => dispatch({ type: 'OPEN_SECTION', section: item.section })}
          >
            <span>[<span>{item.glyph}</span>]</span>
            <span className={styles.hotbarNum}>{item.num}</span>
          </button>
        ))}
        <button data-sfx className={styles.hotbarBtn} onClick={close}>
          <span>[<span>✕</span>]</span>
          <span className={styles.hotbarNum}>ESC</span>
        </button>
      </div>

      <div className={styles.scrim} onClick={close}>
        <div className={styles.cursorHost}>
          <div className={styles.cursor}><div className={styles.cursorRing} /></div>
        </div>
      </div>
    </>
  );
}
