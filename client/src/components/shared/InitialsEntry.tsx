import { useEffect, useRef, useState } from 'react';
import { ui } from '../../content';
import styles from './InitialsEntry.module.css';

// A cabinet-style three-letter name entry. Presentation plus one piece of state (which
// reel is turning) — it knows nothing about scores, submission or the board, so the value
// it produces is always exactly three A-Z characters and nothing else has to guard it.
export interface InitialsEntryProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

const SLOTS = [0, 1, 2] as const;
const A = 'A'.charCodeAt(0);

// Wrapping in both directions is what makes it read as a reel rather than a bounded list:
// holding up past Z lands back on A instead of stalling.
function step(letter: string, delta: number): string {
  const index = (letter.charCodeAt(0) - A + delta + 26) % 26;
  return String.fromCharCode(A + index);
}

export function InitialsEntry({ value, onChange, disabled = false }: InitialsEntryProps) {
  const copy = ui.leaderboard.form;
  const [slot, setSlot] = useState(0);
  const groupRef = useRef<HTMLDivElement>(null);

  // The component only mounts once there is a run to claim, so mount is exactly the moment
  // GAME OVER comes up — take focus then and the arrow keys work without a click first.
  useEffect(() => { groupRef.current?.focus(); }, []);

  const setLetter = (index: number, letter: string) => {
    onChange(value.slice(0, index) + letter + value.slice(index + 1));
  };

  // Safari doesn't focus a button on click, so without this a player who taps a chevron
  // and then reaches for the arrow keys would find them dead. Pulling focus back to the
  // group after every pointer interaction keeps the two input styles interchangeable.
  const focusGroup = () => groupRef.current?.focus();

  const turn = (index: number, delta: number) => {
    if (disabled) return;
    setSlot(index);
    setLetter(index, step(value[index], delta));
    focusGroup();
  };

  const selectSlot = (index: number) => {
    if (disabled) return;
    setSlot(index);
    focusGroup();
  };

  // One handler for the whole group rather than one per slot: three reels are a single
  // dial, so they share a single tab stop. Keydown bubbling means this still fires when
  // focus has landed on one of the chevron buttons after a click.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowUp':
        turn(slot, 1);
        break;
      case 'ArrowDown':
        turn(slot, -1);
        break;
      case 'ArrowLeft':
        setSlot((slot + 2) % 3);
        break;
      case 'ArrowRight':
        setSlot((slot + 1) % 3);
        break;
      default: {
        // Typing beats scrolling for anyone on a keyboard, so a letter sets the slot and
        // moves on. It stops at the third rather than wrapping — typing a fourth letter
        // should overwrite the last one, not silently clobber the first.
        if (e.key.length !== 1) return;
        const letter = e.key.toUpperCase();
        if (letter < 'A' || letter > 'Z') return;
        setLetter(slot, letter);
        setSlot(Math.min(slot + 1, 2));
        break;
      }
    }
    // Only reached for keys we handled — everything else returned above, so Escape still
    // reaches the window handler that closes the board.
    e.preventDefault();
  };

  return (
    <div className={styles.wrap}>
      <div
        ref={groupRef}
        className={styles.reels}
        role="group"
        aria-label={copy.initialsAriaLabel}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
      >
        {SLOTS.map(index => {
          const letter = value[index];
          const active = index === slot;
          return (
            <div key={index} className={styles.slot}>
              <button
                type="button"
                data-sfx
                className={styles.chevron}
                disabled={disabled}
                // Roving focus: the group owns the only tab stop, so the chevrons stay
                // clickable for touch without adding nine more stops to the form.
                tabIndex={-1}
                aria-label={copy.letterUpAriaLabel}
                onClick={() => turn(index, 1)}
              >
                ▲
              </button>
              {/* The dim letters either side are what make three boxes read as a physical
                  reel. They are decoration only — the live value is on the button below. */}
              <span className={styles.ghost} aria-hidden="true">{step(letter, -1)}</span>
              <button
                type="button"
                className={`${styles.letter} ${active ? styles.letterActive : ''}`}
                disabled={disabled}
                tabIndex={-1}
                aria-label={copy.slotAriaLabel.replace('{n}', String(index + 1))}
                onClick={() => selectSlot(index)}
              >
                {letter}
              </button>
              <span className={styles.ghost} aria-hidden="true">{step(letter, 1)}</span>
              <button
                type="button"
                data-sfx
                className={styles.chevron}
                disabled={disabled}
                tabIndex={-1}
                aria-label={copy.letterDownAriaLabel}
                onClick={() => turn(index, -1)}
              >
                ▼
              </button>
            </div>
          );
        })}
      </div>
      <div className={styles.hint}>{copy.initialsHint}</div>
    </div>
  );
}
