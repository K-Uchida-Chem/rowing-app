const sidebarItems = [
  {
    id: 'home',
    label: 'ホーム',
    labelEn: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'logger',
    label: 'ログ入力',
    labelEn: 'Logger',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'アナリティクス',
    labelEn: 'Analytics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'データベース',
    labelEn: 'History',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
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
      {/* Logo / App Name */}
      <div className="px-6 py-6 mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
            }}
          >
            🚣
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-primary)] leading-tight">
              RowPro
            </h1>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wider uppercase">
              Athlete Manager
            </p>
          </div>
        </div>
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
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    border-none cursor-pointer transition-all duration-200
                    text-sm font-medium
                    ${isActive
                      ? 'bg-[rgba(56,189,248,0.12)] text-[var(--color-accent-primary)]'
                      : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[rgba(56,189,248,0.05)] hover:text-[var(--color-text-primary)]'
                    }
                  `}
                >
                  <span className={`transition-colors duration-200 ${isActive ? 'text-[var(--color-accent-primary)]' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
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
