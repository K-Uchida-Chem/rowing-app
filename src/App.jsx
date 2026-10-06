import { useState } from 'react';
import { Home, PlusCircle, CalendarDays, BarChart3, Settings } from 'lucide-react';
import TodayPage from './pages/TodayPage.jsx';
import LogPage from './pages/LogPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const TABS = [
  { id: 'today', label: '今日', Icon: Home },
  { id: 'log', label: '記録', Icon: PlusCircle },
  { id: 'history', label: '履歴', Icon: CalendarDays },
  { id: 'analytics', label: '分析', Icon: BarChart3 },
  { id: 'settings', label: '設定', Icon: Settings },
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
      <main className="space-y-4 p-4">
        {tab === 'today' && <TodayPage onAdd={openLog} />}
        {tab === 'log' && <LogPage kind={logKind} onKind={setLogKind} onSaved={() => setTab('today')} />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'analytics' && <AnalyticsPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                tab === id ? 'font-semibold text-brand' : 'text-slate-400'
              }`}
            >
              <Icon size={22} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
