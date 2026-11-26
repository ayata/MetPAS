import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
// @ts-expect-error CSS imports are handled by the bundler.
import './styles/tokens.css';
// @ts-expect-error CSS imports are handled by the bundler.
import './styles/app.css';
// @ts-expect-error CSS imports are handled by the bundler.
import './styles/modules.css';
// @ts-expect-error CSS imports are handled by the bundler.
import './styles/dashboard.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
