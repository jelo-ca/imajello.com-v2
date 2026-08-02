import type { SectionKey } from '../data/discoveries';

export interface ChatMessage { text: string; color: string; }

export interface State {
  open: SectionKey | null;
  toast: string | null;
  sound: boolean | null;
  questLogTab: 'main' | 'side' | 'timeline';
  charIdx: number;
  charPrevIdx: number | null;
  charDir: 'prev' | 'next' | null;
  visited: SectionKey[];
  invItem: string | null;
  invPhotoFront: 'first' | 'second';
  konamiUnlocked: boolean;
  familiarOpen: boolean;
  familiarEmoji: string | null;
  discoveries: Record<string, boolean>;
  charsSeen: number[];
  discoveriesOpen: boolean;
  // Dev roadmap overlay. Ephemeral — always closed on load.
  roadmapOpen: boolean;
  chatMessages: ChatMessage[];
  chatInputValue: string;
  chatSending: boolean;
  chatQuestionsAsked: number;
  familiarAsleep: boolean;
  familiarSleepReason: string;
  msgName: string;
  msgEmail: string;
  msgBody: string;
  navHover: SectionKey | null;
  familiarHover: boolean;
  // Whether the hero title currently shows the nickname instead of the first name.
  // Deliberately not persisted: the `nickname` discovery is permanent, but the swap
  // itself resets on reload so the toggle stays a thing you can play with each visit.
  nicknameOn: boolean;
  playing: boolean;
  // Donkey Kong climb run state. Ephemeral like `playing` — never persisted.
  dkLives: number;
  // 'dead' is the brief pause after losing a life while lives remain, so the player gets
  // told what happened before being dropped back at the bottom.
  dkStatus: 'climbing' | 'dead' | 'won' | 'gameover';
  // Ephemeral, session-only counter — incremented exactly once by OPEN_SECTION when
  // a live dispatch (never HYDRATE_PERSISTED) first brings visited.length to 4, so
  // App.tsx can schedule the delayed "LEVEL UP" toast/fanfare without misfiring on
  // page reloads where visited is already length >=4 from localStorage.
  levelUpTrigger: number;
}

export type Action =
  | { type: 'OPEN_SECTION'; section: SectionKey }
  | { type: 'CLOSE_SECTION' }
  | { type: 'OPEN_FAMILIAR'; emoji: string; greeting: string }
  | { type: 'CLOSE_FAMILIAR' }
  | { type: 'SET_SOUND'; value: boolean }
  | { type: 'SET_QUEST_TAB'; tab: State['questLogTab'] }
  | { type: 'PREV_CHAR' }
  | { type: 'NEXT_CHAR' }
  | { type: 'CLEAR_CHAR_PREV' }
  | { type: 'UNLOCK_DISCOVERY'; key: string }
  | { type: 'SET_INV_ITEM'; key: string }
  | { type: 'INV_BACK' }
  | { type: 'SWAP_PHOTOS' }
  | { type: 'TOGGLE_DISCOVERIES' }
  | { type: 'TOGGLE_ROADMAP' }
  | { type: 'CLOSE_ROADMAP' }
  | { type: 'SET_NAV_HOVER'; section: SectionKey | null }
  | { type: 'SET_FAMILIAR_HOVER'; value: boolean }
  | { type: 'SET_KONAMI_UNLOCKED' }
  | { type: 'TOGGLE_NICKNAME' }
  | { type: 'START_PLATFORMER' }
  | { type: 'STOP_PLATFORMER' }
  | { type: 'DK_HIT' }
  | { type: 'DK_WIN' }
  // Resume the current run after a non-fatal death — lives are left as they are.
  | { type: 'DK_RESUME' }
  // Start a fresh run: lives back to full. Used by the game-over "try again" button.
  | { type: 'DK_RESTART' }
  | { type: 'SET_TOAST'; text: string | null }
  | { type: 'CHAT_SEND_START'; text: string }
  | { type: 'CHAT_SEND_SUCCESS'; reply: string }
  | { type: 'CHAT_SEND_ERROR'; reason: string }
  | { type: 'SET_CHAT_INPUT'; value: string }
  | { type: 'SET_MSG_FIELD'; field: 'msgName' | 'msgEmail' | 'msgBody'; value: string }
  | { type: 'HYDRATE_PERSISTED'; sound: boolean; visited: SectionKey[]; discoveries: Record<string, boolean> };
