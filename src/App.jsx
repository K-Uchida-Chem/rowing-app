import { useState } from 'react';
import TodayPage from './pages/TodayPage.jsx';
import LogPage from './pages/LogPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const TABS = [
  { id: 'today', label: '今日' },
  { id: 'log', label: '記録' },
  { id: 'history', label: '履歴' },
  { id: 'analytics', label: '分析' },
  { id: 'settings', label: '設定' },
];

export default function App() {
  const [tab, setTab] = useState('today');
  const [logKind, setLogKind] = useState('ergo');

  const openLog = (kind) => {
    setLogKind(kind);
    setTab('log');
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <main className="space-y-5 p-5">
        {tab === 'today' && <TodayPage onAdd={openLog} />}
        {tab === 'log' && <LogPage kind={logKind} onKind={setLogKind} onSaved={() => setTab('today')} />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'analytics' && <AnalyticsPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 border-t-2 py-3.5 text-sm ${
                tab === id ? 'border-brand font-bold text-brand' : 'border-transparent text-mute'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
