import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { DesktopIslandApp } from './DesktopIslandApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopIslandApp />
  </StrictMode>
);
