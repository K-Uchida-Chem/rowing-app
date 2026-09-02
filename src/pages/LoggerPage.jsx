import { useState } from 'react';
import { Activity, Dumbbell, Utensils, HeartPulse, Edit2 } from 'lucide-react';
import ErgoLogger from '../components/logger/ErgoLogger';
import StrengthLogger from '../components/logger/StrengthLogger';
import NutritionLogger from '../components/logger/NutritionLogger';
import ConditionLogger from '../components/logger/ConditionLogger';

const MODES = [
  {
    id: 'ergo',
    label: 'エルゴ / 水上',
    icon: <Activity size={18} />,
    color: '#e2e8f0',
    description: 'エルゴメーター・水上練習記録',
  },
  {
    id: 'strength',
    label: '筋トレ',
    icon: <Dumbbell size={18} />,
    color: '#e2e8f0',
    description: 'BIG3・補助・体幹トレーニング',
  },
  {
    id: 'nutrition',
    label: '食事 / 体重',
    icon: <Utensils size={18} />,
    color: '#e2e8f0',
    description: '栄養PFC・体重記録',
  },
  {
    id: 'condition',
    label: 'コンディション',
    icon: <HeartPulse size={18} />,
    color: '#e2e8f0',
    description: '天気・風・睡眠・疲労度',
  },
];

export default function LoggerPage() {
  const [mode, setMode] = useState('ergo');
  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <div id="logger-page">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2 tracking-wide">
          <Edit2 size={20} className="text-[var(--color-accent-secondary)]" /> ログ入力
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Logger — トレーニング・食事データを記録
        </p>
      </div>

      {/* ─── Mode Selector Tabs ──────────────────────────── */}
      <div
        className="flex gap-1.5 p-1.5 rounded-2xl mb-5"
        style={{
          background: 'rgba(17, 24, 39, 0.6)',
          border: '1px solid rgba(56, 189, 248, 0.06)',
        }}
        id="mode-selector"
      >
        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              id={`mode-${m.id}`}
              onClick={() => setMode(m.id)}
              className={`
                flex-1 flex items-center justify-center gap-1.5
                px-3 py-2.5 rounded-xl border-none cursor-pointer
                transition-all duration-250 text-xs font-semibold
                ${isActive
                  ? 'text-[var(--color-text-primary)] shadow-lg'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] bg-transparent'
                }
              `}
              style={isActive ? {
                background: `linear-gradient(135deg, ${m.color}18, ${m.color}08)`,
                boxShadow: `0 2px 12px ${m.color}15`,
              } : {}}
            >
              <span className="flex items-center justify-center opacity-80">{m.icon}</span>
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Active mode description */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <div
          className="w-1.5 h-1.5 rounded-full pulse-dot"
          style={{ background: activeMode.color }}
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          {activeMode.description}
        </span>
      </div>

      {/* ─── Logger Content ──────────────────────────────── */}
      {mode === 'ergo' && <ErgoLogger />}
      {mode === 'strength' && <StrengthLogger />}
      {mode === 'nutrition' && <NutritionLogger />}
      {mode === 'condition' && <ConditionLogger />}
    </div>
  );
}
