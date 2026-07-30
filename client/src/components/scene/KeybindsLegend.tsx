import { useGameState } from '../../state/GameStateContext';
import { ui } from '../../content';
import styles from './KeybindsLegend.module.css';

// Reference lines 48-60: ← → and ESC use the narrower key-chip padding
// (3px 7px); digit keys 1-5 and F use the wider padding (3px 8px).
function rows(playing: boolean): Array<{ key: string; label: string } | { keys: [string, string]; label: string }> {
  if (playing) {
    return [
      { keys: ['←', '→'], label: ui.keybinds.move },
      { keys: ['↑', '↓'], label: ui.keybinds.climb },
      { key: 'SPACE', label: ui.keybinds.jump },
      { key: 'ESC', label: ui.keybinds.stopPlaying },
    ];
  }
  return [
    { keys: ['←', '→'], label: ui.keybinds.changeCharacter },
    { key: '1', label: ui.sections.journey.navLabel },
    { key: '2', label: ui.sections.quests.navLabel },
    { key: '3', label: ui.sections.experience.navLabel },
    { key: '4', label: ui.sections.hobbies.navLabel },
    { key: '5', label: ui.sections.contact.navLabel },
    { key: 'F', label: ui.keybinds.summonFamiliar },
    { key: 'ESC', label: ui.keybinds.close },
  ];
}

export function KeybindsLegend() {
  const { state } = useGameState();
  if (state.familiarOpen) return null;
  return (
    <div className={styles.legend}>
      <div className={styles.heading}>{ui.keybinds.heading}</div>
      {rows(state.playing).map((row, i) => (
        <div className={styles.row} key={i}>
          {'keys' in row
            ? row.keys.map(k => <span className={styles.keyNarrow} key={k}>{k}</span>)
            : <span className={row.key === 'ESC' ? styles.keyNarrow : styles.keyWide}>{row.key}</span>}
          <span className={styles.label}>{row.label}</span>
        </div>
      ))}
    </div>
  );
}
