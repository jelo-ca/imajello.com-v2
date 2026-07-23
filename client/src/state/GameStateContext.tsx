import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react';
import { reducer, initialState } from './reducer';
import type { State, Action } from './types';

interface Ctx { state: State; dispatch: React.Dispatch<Action>; }

const GameStateContext = createContext<Ctx | null>(null);

const SOUND_KEY = 'imajello-sfx';
const VISITED_KEY = 'imajello-visited';
const DISCOVERIES_KEY = 'imajello-discoveries';

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let sound = true;
    let visited: State['visited'] = [];
    let discoveries: State['discoveries'] = {};
    try {
      const storedSound = localStorage.getItem(SOUND_KEY);
      if (storedSound !== null) sound = storedSound === 'on';
      const storedVisited = localStorage.getItem(VISITED_KEY);
      if (storedVisited) visited = JSON.parse(storedVisited);
      const storedDiscoveries = localStorage.getItem(DISCOVERIES_KEY);
      if (storedDiscoveries) discoveries = JSON.parse(storedDiscoveries);
    } catch {
      // localStorage unavailable (private browsing, etc.) - fall back to defaults
    }
    dispatch({ type: 'HYDRATE_PERSISTED', sound, visited, discoveries });
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (state.sound === null) return;
    try { localStorage.setItem(SOUND_KEY, state.sound ? 'on' : 'off'); } catch { /* ignore */ }
  }, [state.sound]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try { localStorage.setItem(VISITED_KEY, JSON.stringify(state.visited)); } catch { /* ignore */ }
  }, [state.visited]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try { localStorage.setItem(DISCOVERIES_KEY, JSON.stringify(state.discoveries)); } catch { /* ignore */ }
  }, [state.discoveries]);

  return <GameStateContext.Provider value={{ state, dispatch }}>{children}</GameStateContext.Provider>;
}

export function useGameState(): Ctx {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}
