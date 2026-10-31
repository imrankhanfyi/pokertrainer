import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support: precache the app shell. Updates install silently on next launch.
registerSW({ immediate: true });
// Ask the browser not to evict our localStorage (progress) under storage pressure.
navigator.storage?.persist?.().catch(() => {});
