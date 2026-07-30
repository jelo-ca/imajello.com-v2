import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameStateProvider } from './state/GameStateContext';
import App from './App';
import { content } from './content';
import './styles/tokens.css';
import './styles/global.css';

document.title = content.meta.pageTitle;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameStateProvider>
      <App />
    </GameStateProvider>
  </StrictMode>,
);
