/// <reference types="vite-plugin-pwa/client" />

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registro automático do Service Worker pelo plugin PWA
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

if (typeof window !== 'undefined' && 'caches' in window) {
  void window.caches.delete('supabase-api-cache');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);