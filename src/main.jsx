import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { migrateFromLegacy } from './db.js';

// 旧アプリのデータがあれば引き継いでから画面を出す
migrateFromLegacy().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
