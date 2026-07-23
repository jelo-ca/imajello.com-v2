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
  | { type: 'SET_NAV_HOVER'; section: SectionKey | null }
  | { type: 'SET_FAMILIAR_HOVER'; value: boolean }
  | { type: 'SET_KONAMI_UNLOCKED' }
  | { type: 'SET_TOAST'; text: string | null }
  | { type: 'CHAT_SEND_START'; text: string }
  | { type: 'CHAT_SEND_SUCCESS'; reply: string }
  | { type: 'CHAT_SEND_ERROR'; reason: string }
  | { type: 'SET_CHAT_INPUT'; value: string }
  | { type: 'SET_MSG_FIELD'; field: 'msgName' | 'msgEmail' | 'msgBody'; value: string }
  | { type: 'HYDRATE_PERSISTED'; sound: boolean; visited: SectionKey[]; discoveries: Record<string, boolean> };
