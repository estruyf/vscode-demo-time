import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

(() => {
  Office.onReady((info) => {
    if (info.host !== Office.HostType.PowerPoint) {
      return;
    }

    // Initialize the React application
    const container = document.getElementById('app');
    if (container) {
      const root = createRoot(container);
      root.render(<App />);
    }
  });
})();
