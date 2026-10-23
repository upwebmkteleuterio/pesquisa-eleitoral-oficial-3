/// <reference types="vite-plugin-pwa/client" />

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const RELOAD_GUARD_KEY = 'pwa-controller-reload-at';
const RELOAD_GUARD_WINDOW_MS = 10000;
const serviceWorkerContainer = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
let hadController = Boolean(serviceWorkerContainer?.controller);
let reloadStarted = false;

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const updateRegisteredServiceWorker = () => {
  if (navigator.onLine) {
    void serviceWorkerRegistration?.update().catch(() => undefined);
  }
};

window.addEventListener('online', updateRegisteredServiceWorker);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') updateRegisteredServiceWorker();
});

window.setInterval(updateRegisteredServiceWorker, UPDATE_CHECK_INTERVAL_MS);

serviceWorkerContainer?.addEventListener('controllerchange', () => {
  if (!hadController) {
    hadController = true;
    return;
  }
  if (reloadStarted) return;

  const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY));
  if (lastReload && Date.now() - lastReload < RELOAD_GUARD_WINDOW_MS) return;

  reloadStarted = true;
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  window.location.reload();
});

let updateSW: (reloadPage?: boolean) => Promise<void>;
updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => {
    void updateSW(true);
  },
  onRegisteredSW: (_swScriptUrl, registration) => {
    serviceWorkerRegistration = registration;
    updateRegisteredServiceWorker();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
