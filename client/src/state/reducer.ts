import type { State, Action } from './types';
import { CHARS } from '../data/chars';
import { DISCOVERIES, CHAT_QUESTION_LIMIT } from '../data/discoveries';
import { ui } from '../content';

export const initialState: State = {
  open: null,
  toast: null,
  sound: null,
  questLogTab: 'main',
  charIdx: 0,
  charPrevIdx: null,
  charDir: null,
  visited: [],
  invItem: null,
  invPhotoFront: 'first',
  konamiUnlocked: false,
  familiarOpen: false,
  familiarEmoji: null,
  discoveries: {},
  charsSeen: [],
  discoveriesOpen: false,
  chatMessages: [],
  chatInputValue: '',
  chatSending: false,
  chatQuestionsAsked: 0,
  familiarAsleep: false,
  familiarSleepReason: '',
  msgName: '',
  msgEmail: '',
  msgBody: '',
  navHover: null,
  familiarHover: false,
  playing: false,
  dkLives: ui.platformer.maxLives,
  dkStatus: 'climbing',
  levelUpTrigger: 0,
};

function unlockDiscovery(state: State, key: string): State {
  if (state.discoveries[key]) return state;
  const entry = DISCOVERIES.find(d => d.key === key);
  return {
    ...state,
    discoveries: { ...state.discoveries, [key]: true },
    toast: entry ? entry.name : state.toast,
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'OPEN_SECTION': {
      const alreadyVisited = state.visited.includes(action.section);
      const visited = alreadyVisited ? state.visited : [...state.visited, action.section];
      let next: State = { ...state, open: action.section, visited };
      if (!alreadyVisited) {
        const { SECTIONS } = requireSections();
        next = { ...next, toast: SECTIONS[action.section] };
        // Reference `openSection` (lines 1029-1040): visiting a 4th distinct section
        // (any 4 of the 5 — the exact condition is visited.length === 4, not a fixed
        // set) queues a delayed "LEVEL UP" toast + fanfare. The delayed dispatch/sound
        // itself lives in App.tsx (reducers can't schedule timers); this just signals it.
        if (visited.length === 4) next = { ...next, levelUpTrigger: next.levelUpTrigger + 1 };
      }
      const { SECTION_TO_DISCOVERY } = requireSections();
      const dKey = SECTION_TO_DISCOVERY[action.section];
      if (dKey) next = unlockDiscovery(next, dKey);
      return next;
    }
    case 'CLOSE_SECTION':
      return { ...state, open: null };
    case 'OPEN_FAMILIAR':
      return {
        ...state,
        familiarOpen: true,
        familiarEmoji: action.emoji,
        chatMessages: [{ text: ui.familiarChat.chatPrefixes.familiar + action.greeting, color: '#ee9aa3' }],
        chatQuestionsAsked: 0,
        familiarAsleep: false,
        familiarSleepReason: '',
      };
    case 'CLOSE_FAMILIAR':
      return { ...state, familiarOpen: false };
    case 'SET_SOUND':
      return { ...state, sound: action.value };
    case 'SET_QUEST_TAB':
      return { ...state, questLogTab: action.tab };
    case 'PREV_CHAR': {
      const prevIdx = (state.charIdx + CHARS.length - 1) % CHARS.length;
      const charsSeen = state.charsSeen.includes(prevIdx) ? state.charsSeen : [...state.charsSeen, prevIdx];
      let next: State = { ...state, charDir: 'prev', charPrevIdx: state.charIdx, charIdx: prevIdx, charsSeen };
      if (charsSeen.length === CHARS.length) next = unlockDiscovery(next, 'allchars');
      return next;
    }
    case 'NEXT_CHAR': {
      const nextIdx = (state.charIdx + 1) % CHARS.length;
      const charsSeen = state.charsSeen.includes(nextIdx) ? state.charsSeen : [...state.charsSeen, nextIdx];
      let next: State = { ...state, charDir: 'next', charPrevIdx: state.charIdx, charIdx: nextIdx, charsSeen };
      if (charsSeen.length === CHARS.length) next = unlockDiscovery(next, 'allchars');
      return next;
    }
    case 'CLEAR_CHAR_PREV':
      return { ...state, charPrevIdx: null };
    case 'UNLOCK_DISCOVERY':
      return unlockDiscovery(state, action.key);
    case 'SET_INV_ITEM':
      return unlockDiscovery({ ...state, invItem: action.key, invPhotoFront: 'first' }, 'item');
    case 'INV_BACK':
      return { ...state, invItem: null, invPhotoFront: 'first' };
    case 'SWAP_PHOTOS':
      return { ...state, invPhotoFront: state.invPhotoFront === 'first' ? 'second' : 'first' };
    case 'TOGGLE_DISCOVERIES':
      return { ...state, discoveriesOpen: !state.discoveriesOpen };
    case 'SET_NAV_HOVER':
      return { ...state, navHover: action.section };
    case 'SET_FAMILIAR_HOVER':
      return { ...state, familiarHover: action.value };
    case 'SET_KONAMI_UNLOCKED':
      return state.konamiUnlocked ? state : unlockDiscovery({ ...state, konamiUnlocked: true }, 'konami');
    case 'START_PLATFORMER':
      // Every run starts clean, so a previous game-over or win never leaks into the next.
      return { ...state, playing: true, dkLives: ui.platformer.maxLives, dkStatus: 'climbing' };
    case 'STOP_PLATFORMER':
      return { ...state, playing: false };
    case 'DK_HIT': {
      // Idempotent, same reason as DK_WIN: the loop can call onHit() on several frames
      // before this state change propagates back to it. Without this guard, a barrel
      // that overlaps the player right as they reach the goal could fire after dkStatus
      // is already 'won' (or 'gameover') and stomp it back to 'gameover'.
      if (state.dkStatus !== 'climbing') return state;
      const dkLives = state.dkLives - 1;
      return dkLives <= 0
        ? { ...state, dkLives: 0, dkStatus: 'gameover' }
        : { ...state, dkLives };
    }
    case 'DK_WIN': {
      // Idempotent, same reason as DK_HIT: the loop can call onWin() on several frames
      // before this state change propagates back to it. Both resolution paths must be
      // idempotent against any already-resolved state, not just against a repeat win.
      if (state.dkStatus !== 'climbing') return state;
      return unlockDiscovery({ ...state, dkStatus: 'won' }, 'summit');
    }
    case 'DK_RESTART':
      return { ...state, dkLives: ui.platformer.maxLives, dkStatus: 'climbing' };
    case 'SET_TOAST':
      return { ...state, toast: action.text };
    case 'CHAT_SEND_START':
      return {
        ...state,
        chatMessages: [...state.chatMessages, { text: ui.familiarChat.chatPrefixes.you + action.text, color: '#f5d9dc' }],
        chatInputValue: '',
        chatSending: true,
        chatQuestionsAsked: state.chatQuestionsAsked + 1,
      };
    case 'CHAT_SEND_SUCCESS':
      return {
        ...state,
        chatMessages: [...state.chatMessages, { text: ui.familiarChat.chatPrefixes.familiar + action.reply, color: '#ee9aa3' }],
        chatSending: false,
      };
    case 'CHAT_SEND_ERROR':
      return { ...state, familiarAsleep: true, familiarSleepReason: action.reason, chatSending: false };
    case 'SET_CHAT_INPUT':
      return { ...state, chatInputValue: action.value };
    case 'SET_MSG_FIELD':
      return { ...state, [action.field]: action.value };
    case 'HYDRATE_PERSISTED':
      return { ...state, sound: action.sound, visited: action.visited, discoveries: action.discoveries };
    default:
      return state;
  }
}

// Local import indirection to avoid a require() in an ESM file while keeping this
// block visually adjacent to its only two call sites above.
import { SECTIONS, SECTION_TO_DISCOVERY } from '../data/discoveries';
function requireSections() { return { SECTIONS, SECTION_TO_DISCOVERY }; }

export { CHAT_QUESTION_LIMIT };
