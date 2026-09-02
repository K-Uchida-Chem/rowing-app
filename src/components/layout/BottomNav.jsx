import { useState } from 'react';

const navItems = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  { id: 'home', icon: <LayoutDashboard size={20} />, label: 'Home' },
  { id: 'logger', icon: <Activity size={20} />, label: 'Logger' },
  { id: 'analytics', icon: <BarChart2 size={20} />, label: 'Analytics' },
  { id: 'history', icon: <History size={20} />, label: 'History' },
];

export default function BottomNav({ activeTab, onTabChange, onOpenSettings }) {
  return (
    <nav className="bottom-nav" id="bottom-nav">
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ease-out border-none bg-transparent cursor-pointer min-w-[60px] group"
            >
              <div className={`text-lg mb-1 transition-transform duration-200 ${isActive ? 'scale-110 text-[var(--color-accent-primary)]' : 'opacity-70 group-hover:scale-110 group-hover:opacity-100'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ease-out border-none bg-transparent cursor-pointer min-w-[60px] group"
        >
          <div className="text-lg mb-1 opacity-70 group-hover:scale-110 group-hover:opacity-100 transition-all duration-200">
            <Settings size={20} />
          </div>
          <span className="text-[10px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors duration-200">
            Settings
          </span>
        </button>
      </div>
    </nav>
  );
}
