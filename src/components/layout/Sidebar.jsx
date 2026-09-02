import { Activity, LayoutDashboard, BarChart2, History, Settings, Anchor } from 'lucide-react';

const sidebarItems = [
  { id: 'home', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { id: 'logger', label: 'Logger', icon: <Activity size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={20} /> },
  { id: 'history', label: 'History', icon: <History size={20} /> },
];

export default function Sidebar({ activeTab, onTabChange, onOpenSettings }) {
  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-40"
      style={{
        background: 'rgba(10, 14, 26, 0.95)',
        borderRight: '1px solid rgba(56, 189, 248, 0.08)',
        backdropFilter: 'blur(20px)',
      }}
      id="sidebar"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-8 mb-2 text-[var(--color-text-primary)]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-surface-600)] to-[var(--color-surface-700)] flex items-center justify-center shadow-lg border border-[var(--color-surface-600)]">
          <Anchor size={20} className="text-[var(--color-accent-primary)]" />
        </div>
        <span className="text-xl font-bold tracking-widest uppercase">RowPro</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  id={`sidebar-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200 ease-out border-none bg-transparent
                  cursor-pointer w-full text-left group
                  ${isActive
                    ? 'bg-[var(--color-surface-700)] text-[var(--color-accent-primary)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-secondary)]'
                  }
                `}
                >
                  <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'opacity-70 group-hover:scale-110 group-hover:opacity-100'}`}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold tracking-widest uppercase">{item.label}</span>
                  {isActive && (
                    <div
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] pulse-dot"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[rgba(56,189,248,0.06)]">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[rgba(56,189,248,0.15)] bg-[rgba(56,189,248,0.05)] text-[var(--color-text-secondary)] text-xs font-medium cursor-pointer transition-all hover:bg-[rgba(56,189,248,0.1)] hover:text-[var(--color-text-primary)] mb-2"
        >
          <span>⚙️</span> 設定 (API Key)
        </button>
        <p className="text-[10px] text-[var(--color-text-muted)] text-center">
          Data stored locally in browser
        </p>
      </div>
    </aside>
  );
}
