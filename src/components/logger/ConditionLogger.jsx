import { useState } from 'react';
import { Calendar, Save, CloudSun, Smile, FileText } from 'lucide-react';
import { WEATHER_OPTIONS, CONDITION_OPTIONS } from '../../db/masterData';
import { addConditionRecord } from '../../db/database';

const WIND_DIRECTIONS = [
  { id: 'none', label: '無風' },
  { id: 'headwind', label: '向かい風' },
  { id: 'tailwind', label: '追い風' },
  { id: 'crosswind', label: '横風' },
];

export default function ConditionLogger() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('');
  const [windDirection, setWindDirection] = useState('none');
  const [windSpeed, setWindSpeed] = useState('');
  const [condition, setCondition] = useState('');
  const [fatigueScore, setFatigueScore] = useState(3);
  const [restingHR, setRestingHR] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [overallRPE, setOverallRPE] = useState(5);
  const [memo, setMemo] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await addConditionRecord({
        date,
        weather,
        windDirection,
        windSpeed,
        condition,
        fatigueScore,
        restingHR: restingHR ? Number(restingHR) : null,
        sleepHours: sleepHours ? Number(sleepHours) : null,
        overallRPE,
        memo,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save condition:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setWeather('');
    setWindDirection('none');
    setWindSpeed('');
    setWindSpeed('');
    setCondition('');
    setFatigueScore(3);
    setRestingHR('');
    setSleepHours('');
    setOverallRPE(5);
    setMemo('');
    setSaved(false);
  };

  return (
    <div className="space-y-4" id="condition-logger">
      {/* Date */}
      <div className="glass-card p-4">
        <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
          日付
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setSaved(false); }}
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)]"
        />
      </div>

      {/* Weather & Wind */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--color-surface-600)] pb-2">
          <CloudSun size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            環境情報
          </h3>
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
            天気
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {WEATHER_OPTIONS.map((w) => {
              const isActive = weather === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setWeather(w.id)}
                  className={`
                    flex-shrink-0 px-3 py-2 rounded-xl border cursor-pointer
                    transition-all duration-200 text-xs font-medium whitespace-nowrap
                    ${isActive
                      ? 'bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.25)] text-[var(--color-accent-primary)]'
                      : 'bg-transparent border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
                    }
                  `}
                >
                  {w.emoji} {w.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              風向き
            </label>
            <select
              value={windDirection}
              onChange={(e) => setWindDirection(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] appearance-none cursor-pointer"
            >
              {WIND_DIRECTIONS.map(d => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              風速
            </label>
            <input
              type="text"
              value={windSpeed}
              onChange={(e) => setWindSpeed(e.target.value)}
              placeholder="例: 2m/s"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </div>
      </div>

      {/* Body Condition */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--color-surface-600)] pb-2">
          <Smile size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            主観的コンディション
          </h3>
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
            状態
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CONDITION_OPTIONS.map((c) => {
              const isActive = condition === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCondition(c.id)}
                  className={`
                    flex-shrink-0 px-3 py-2 rounded-xl border cursor-pointer
                    transition-all duration-200 text-xs font-medium whitespace-nowrap
                    ${isActive
                      ? 'bg-[rgba(52,211,153,0.12)] border-[rgba(52,211,153,0.25)] text-[var(--color-accent-success)]'
                      : 'bg-transparent border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
                    }
                  `}
                >
                  {c.emoji} {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
            主観的疲労度 (1:絶好調 〜 5:激しい疲労)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(score => (
              <button
                key={score}
                onClick={() => setFatigueScore(score)}
                className={`
                  flex-1 py-2 rounded-xl border text-sm font-bold cursor-pointer transition-colors duration-200
                  ${fatigueScore === score
                    ? 'bg-[rgba(56,189,248,0.12)] border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]'
                    : 'bg-transparent border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
                  }
                `}
              >
                {score}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              安静時心拍数 (bpm)
            </label>
            <input
              type="number"
              value={restingHR}
              onChange={(e) => setRestingHR(e.target.value)}
              placeholder="例: 45"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              睡眠時間 (h)
            </label>
            <input
              type="number"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="例: 7.5"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Memo */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--color-surface-600)] pb-2">
          <FileText size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            体調メモ・怪我
          </h3>
        </div>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="今日の疲労度や特記事項..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-[var(--color-surface-600)] text-[var(--color-text-secondary)] border border-[rgba(56,189,248,0.06)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface-500)]"
        >
          リセット
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`
            flex-[2] px-4 py-3 rounded-xl text-sm font-bold border-none cursor-pointer
            transition-all duration-200 flex items-center justify-center gap-2
            ${saved
              ? 'bg-[var(--color-accent-success)] text-white'
              : 'bg-[var(--color-surface-700)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-600)]'
            }
          `}
          id="condition-save-btn"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSaving ? '保存中...' : saved ? '保存しました' : '記録を保存'}
        </button>
      </div>
    </div>
  );
}
