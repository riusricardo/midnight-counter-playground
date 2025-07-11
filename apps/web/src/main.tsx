import './style.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@repo/ui';

// eslint-disable-next-line no-undef
ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
