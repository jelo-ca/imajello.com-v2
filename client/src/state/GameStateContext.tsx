import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import { reducer, initialState } from './reducer';
import type { State, Action } from './types';

interface Ctx { state: State; dispatch: React.Dispatch<Action>; }

const GameStateContext = createContext<Ctx | null>(null);

const SOUND_KEY = 'imajello-sfx';
const VISITED_KEY = 'imajello-visited';
const DISCOVERIES_KEY = 'imajello-discoveries';
// Also read by the inline script in index.html, which applies the theme before the
// first paint so dark-mode visitors never see a flash of the cream page.
const THEME_KEY = 'imajello-theme';

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let sound = true;
    let visited: State['visited'] = [];
    let discoveries: State['discoveries'] = {};
    // No stored preference falls back to the OS setting, then to light.
    let theme: State['theme'] =
      window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const storedSound = localStorage.getItem(SOUND_KEY);
      if (storedSound !== null) sound = storedSound === 'on';
      const storedVisited = localStorage.getItem(VISITED_KEY);
      if (storedVisited) visited = JSON.parse(storedVisited);
      const storedDiscoveries = localStorage.getItem(DISCOVERIES_KEY);
      if (storedDiscoveries) discoveries = JSON.parse(storedDiscoveries);
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme === 'dark' || storedTheme === 'light') theme = storedTheme;
    } catch {
      // localStorage unavailable (private browsing, etc.) - fall back to defaults
    }
    dispatch({ type: 'HYDRATE_PERSISTED', sound, visited, discoveries, theme });
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || state.sound === null) return;
    try { localStorage.setItem(SOUND_KEY, state.sound ? 'on' : 'off'); } catch { /* ignore */ }
  }, [hydrated, state.sound]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(VISITED_KEY, JSON.stringify(state.visited)); } catch { /* ignore */ }
  }, [hydrated, state.visited]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(DISCOVERIES_KEY, JSON.stringify(state.discoveries)); } catch { /* ignore */ }
  }, [hydrated, state.discoveries]);

  // The attribute drives every themed token in styles/tokens.css. Applied even before
  // hydration finishes so the initial paint matches what index.html already set.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(THEME_KEY, state.theme); } catch { /* ignore */ }
  }, [hydrated, state.theme]);

  return <GameStateContext.Provider value={{ state, dispatch }}>{children}</GameStateContext.Provider>;
}

export function useGameState(): Ctx {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}
