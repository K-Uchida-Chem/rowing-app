import { Dumbbell, Utensils, Camera, Scale, TrendingUp } from 'lucide-react';

export default function QuickActions({ onTabChange }) {
  const actions = [
    {
      id: 'ocr',
      label: 'エルゴ OCR',
      sublabel: '画像から自動入力',
      icon: <Camera size={20} className="text-[var(--color-accent-info)]" />,
      gradient: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.05))',
      borderColor: 'rgba(56,189,248,0.15)',
      tab: 'logger',
    },
    {
      id: 'weight',
      label: 'ウェイト記録',
      sublabel: 'BIG3 / 補助',
      icon: <Dumbbell size={20} className="text-[var(--color-accent-warning)]" />,
      gradient: 'linear-gradient(135deg, rgba(255,167,38,0.2), rgba(255,167,38,0.05))',
      borderColor: 'rgba(255,167,38,0.15)',
      tab: 'logger',
    },
    {
      id: 'nutrition',
      label: '食事 PFC',
      sublabel: 'カロリー & 栄養',
      icon: <Utensils size={20} className="text-[var(--color-accent-success)]" />,
      gradient: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.05))',
      borderColor: 'rgba(52,211,153,0.15)',
      tab: 'logger',
    },
    {
      id: 'body-weight',
      label: '体重記録',
      sublabel: '毎日のトラッキング',
      icon: <Scale size={20} className="text-[var(--color-accent-purple)]" />,
      gradient: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(167,139,250,0.05))',
      borderColor: 'rgba(167,139,250,0.15)',
      tab: 'logger',
    },
  ];

  return (
    <div className="mb-4" id="quick-actions">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
          クイック入力
        </h2>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          Quick Actions
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            id={`quick-action-${action.id}`}
            onClick={() => onTabChange?.(action.tab)}
            className="quick-action-btn"
            style={{
              background: action.gradient,
              borderColor: action.borderColor,
            }}
          >
            <div
              className="icon-wrapper"
              style={{
                background: action.gradient,
              }}
            >
              {action.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">
                {action.label}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                {action.sublabel}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
