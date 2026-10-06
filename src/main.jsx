import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.jsx';
import { migrateFromLegacy } from './db.js';

registerSW({ immediate: true });

// ブラウザに「このデータは消さないで」と要求する(許可されれば、容量不足や長期間未使用での自動削除を受けにくくなる)
navigator.storage?.persist?.();

// 旧アプリのデータがあれば引き継いでから画面を出す。
// ブラウザの IndexedDB が応答しなくても画面は出せるよう、3秒で待つのをやめる。
const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
Promise.race([migrateFromLegacy(), timeout]).finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
