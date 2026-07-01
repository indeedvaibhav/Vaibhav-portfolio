import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress THREE.Clock deprecation warning (caused by @react-three/fiber using it internally)
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock:')) return;
  originalWarn(...args);
};
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
