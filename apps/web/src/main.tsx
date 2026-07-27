import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './app.css';

const root = document.getElementById('root');
if (root === null) throw new Error('#root が見つかりません');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
