import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const renderGlobalErrorOverlay = (errorLike) => {
  const error = errorLike instanceof Error ? errorLike : new Error(String(errorLike));
  const overlay = document.createElement('pre');
  overlay.id = '__debug_error_overlay__';
  overlay.style.cssText = [
    'position: fixed',
    'inset: 0',
    'z-index: 2147483647',
    'margin: 0',
    'padding: 16px',
    'overflow: auto',
    'background: #0d1117',
    'color: #58a6ff',
    'font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    'white-space: pre-wrap',
  ].join(';');
  overlay.textContent = `Application crash detected\n\n${error.stack || error.message || String(error)}`;

  const existing = document.getElementById(overlay.id);
  if (existing) {
    existing.replaceWith(overlay);
  } else {
    document.body.appendChild(overlay);
  }
};

window.onerror = (message, source, lineno, colno, error) => {
  renderGlobalErrorOverlay(error || `${message} (${source}:${lineno}:${colno})`);
};

window.addEventListener('error', (event) => {
  renderGlobalErrorOverlay(event.error || event.message);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
