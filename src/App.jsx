import { useState } from 'react';
import TodayPage from './pages/TodayPage.jsx';
import LogPage from './pages/LogPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import DayPage from './pages/DayPage.jsx';
import { today } from './lib.js';

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
  const [editing, setEditing] = useState(null); // 編集中の記録 ({kind, id, ...})
  const [editFrom, setEditFrom] = useState('history'); // 編集を終えたあと戻る画面
  const [dayDate, setDayDate] = useState(today()); // 1日のまとめで開いている日
  const [flash, setFlash] = useState(''); // 保存直後に今日の画面へ出す一言(自己ベストなど)

  const go = (id) => {
    if (id !== 'log') setEditing(null);
    setTab(id);
  };

  const openLog = (kind) => {
    setEditing(null);
    setLogKind(kind);
    setTab('log');
  };

  const openDay = (date) => {
    setDayDate(date);
    setTab('day');
  };

  const openEdit = (entry, from = 'history') => {
    setEditFrom(from);
    setEditing(entry);
    setLogKind(entry.kind);
    setTab('log');
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <main className="space-y-5 p-5">
        {tab === 'today' && <TodayPage onAdd={openLog} onGo={go} onOpenDay={openDay} flash={flash} onDismissFlash={() => setFlash('')} />}
        {tab === 'log' && (
          <LogPage
            key={editing ? `${editing.kind}-${editing.id}` : 'new'}
            kind={logKind}
            onKind={setLogKind}
            editing={editing}
            onSaved={(msg) => {
              setFlash(msg || '');
              go(editing ? editFrom : 'today');
            }}
          />
        )}
        {tab === 'history' && <HistoryPage onEdit={openEdit} onOpenDay={openDay} />}
        {tab === 'day' && <DayPage key={dayDate} date={dayDate} onDate={setDayDate} onEdit={openEdit} />}
        {tab === 'analytics' && <AnalyticsPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`flex-1 border-t-2 py-3.5 text-sm ${
                (tab === id || (tab === 'day' && id === 'history')) ? 'border-brand font-bold text-brand' : 'border-transparent text-mute'
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
