import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { akzentSetzen } from './screens/Mehr';
import { lade } from './store';
import './styles.css';

try {
  const a = localStorage.getItem('mili-akzent');
  if (a) akzentSetzen(a);
} catch {
  /* egal */
}

lade();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
