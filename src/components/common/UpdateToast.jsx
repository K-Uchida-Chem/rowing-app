import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-sm">
      <div className="glass-card p-4 flex flex-col gap-3 shadow-xl border border-[rgba(56,189,248,0.3)] bg-[rgba(17,24,39,0.95)]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚀</span>
          <div>
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">新しいバージョン</h4>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">アップデートが利用可能です。データは保持されます。</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => close()}
            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[var(--color-surface-600)] text-[var(--color-text-secondary)]"
          >
            後で
          </button>
          <button 
            onClick={() => updateServiceWorker(true)}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white shadow-lg"
          >
            更新して再読込
          </button>
        </div>
      </div>
    </div>
  );
}
