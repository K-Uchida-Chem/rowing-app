import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Bot, Dumbbell, Zap } from 'lucide-react';
import { DAY_PRESETS, HEART_RATE_ZONES, STRENGTH_EXERCISES } from '../../db/masterData';

/**
 * AI Suggestion Card — shows today's recommended training menu.
 * Currently uses rule-based logic; will be replaced with AI engine later.
 */
export default function AISuggestionCard() {
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate AI suggestion generation
    const timer = setTimeout(() => {
      const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...
      const dayPresetKey = (dayOfWeek % 3) + 1; // Cycle Day 1/2/3
      const preset = DAY_PRESETS[dayPresetKey];
      const ergoZone = dayPresetKey === 1 ? HEART_RATE_ZONES[0] : HEART_RATE_ZONES[1]; // UT2 or UT1

      setSuggestion({
        dayPreset: preset,
        dayKey: dayPresetKey,
        ergoZone,
        ergoMenu: dayPresetKey === 1 ? '60min steady state' : '20min × 2',
        reason: dayPresetKey === 1
          ? '週前半のため、SQ系をメインに有酸素ベースも構築'
          : dayPresetKey === 2
            ? 'ヒンジ日のため、上半身プルと乳酸代謝メニューを組み合わせ'
            : '補助種目でリカバリーしつつ、UTベースの有酸素を確保',
      });
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="glass-card p-5 mb-4 glow-purple" id="ai-suggestion-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[rgba(129,140,248,0.2)] flex items-center justify-center">
            <Bot size={18} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
              AI Suggestion
            </p>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              今日の推奨メニュー
            </p>
          </div>
        </div>
        {/* Skeleton loader */}
        <div className="space-y-3">
          <div className="h-12 rounded-xl shimmer" style={{ background: 'var(--color-surface-600)' }} />
          <div className="h-8 rounded-lg shimmer w-3/4" style={{ background: 'var(--color-surface-600)' }} />
          <div className="h-6 rounded-lg shimmer w-1/2" style={{ background: 'var(--color-surface-600)' }} />
        </div>
      </div>
    );
  }

  const { dayPreset, dayKey, ergoZone, ergoMenu, reason } = suggestion;
  const exercises = dayPreset.exercises.map((id) => STRENGTH_EXERCISES[id]);

  return (
    <div className="glass-card p-5 mb-4 glow-purple" id="ai-suggestion-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} className="text-[var(--color-accent-purple)]" />
          <h2 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-primary)]">
            AI Coach Suggestion
          </h2>
        </div>
        <button
          className="
            px-3 py-1.5 rounded-lg text-xs font-medium
            bg-[rgba(129,140,248,0.1)] text-[var(--color-accent-secondary)]
            border border-[rgba(129,140,248,0.2)]
            cursor-pointer transition-all duration-200
            hover:bg-[rgba(129,140,248,0.2)]
          "
          id="change-suggestion-btn"
        >
          変更
        </button>
      </div>

      {/* Suggestion Content */}
      <div className="space-y-3">
        {/* Strength Training */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: `rgba(${dayKey === 1 ? '79,195,247' : dayKey === 2 ? '255,167,38' : '102,187,106'}, 0.08)`,
            border: `1px solid rgba(${dayKey === 1 ? '79,195,247' : dayKey === 2 ? '255,167,38' : '102,187,106'}, 0.15)`,
          }}
        >
          <Dumbbell size={20} className="text-indigo-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              {dayPreset.label}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">
              {exercises.map((e) => e.name).join('・')}
            </p>
          </div>
          <div
            className="w-2 h-8 rounded-full"
            style={{ background: dayPreset.color }}
          />
        </div>

        {/* Ergo Training */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: `rgba(${ergoZone.color.slice(1).match(/.{2}/g).map(h => parseInt(h, 16)).join(',')}, 0.08)`,
            border: `1px solid rgba(${ergoZone.color.slice(1).match(/.{2}/g).map(h => parseInt(h, 16)).join(',')}, 0.15)`,
          }}
        >
          <Zap size={20} className="text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              {ergoZone.fisa} エルゴ — {ergoMenu}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              HR {ergoZone.hrMin}-{ergoZone.hrMax}bpm / {ergoZone.splitMin}-{ergoZone.splitMax} /500m / {ergoZone.wattMin}-{ergoZone.wattMax}W
            </p>
          </div>
          <div
            className="w-2 h-8 rounded-full"
            style={{ background: ergoZone.color }}
          />
        </div>

        {/* Reason */}
        <div className="text-[11px] text-[var(--color-text-muted)] flex items-start gap-2 leading-relaxed bg-[var(--color-surface-700)] p-2 rounded border border-[var(--color-surface-600)]">
          <Sparkles size={14} className="shrink-0 mt-0.5 text-[var(--color-accent-purple)]" />
          {reason}
        </div>
      </div>
    </div>
  );
}
