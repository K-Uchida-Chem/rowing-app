import { useState, useEffect } from 'react';
import { WEATHER_OPTIONS, CONDITION_OPTIONS } from '../../db/masterData';

export default function WeatherConditionCard() {
  const [weather, setWeather] = useState('sunny');
  const [condition, setCondition] = useState('good');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const selectedWeather = WEATHER_OPTIONS.find((w) => w.id === weather);
  const selectedCondition = CONDITION_OPTIONS.find((c) => c.id === condition);

  const dateStr = currentTime.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  const timeStr = currentTime.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const canRow = selectedWeather?.canRow ?? true;

  return (
    <div className="glass-card p-5 mb-4" id="weather-condition-card">
      {/* Header: Date & Time */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] font-medium tracking-wider uppercase mb-0.5">
            Today
          </p>
          <p className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">
            {dateStr}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">
            {timeStr}
          </p>
        </div>
      </div>

      {/* Weather & Condition Selectors */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Weather */}
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-2 block">
            天候
          </label>
          <div className="flex flex-wrap gap-1.5">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w.id}
                id={`weather-${w.id}`}
                onClick={() => setWeather(w.id)}
                className={`
                  px-2.5 py-1.5 rounded-lg border cursor-pointer
                  text-xs font-medium transition-all duration-200
                  ${weather === w.id
                    ? 'bg-[rgba(56,189,248,0.15)] border-[rgba(56,189,248,0.3)] text-[var(--color-accent-primary)]'
                    : 'bg-transparent border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
                  }
                `}
                title={w.label}
              >
                {w.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-2 block">
            コンディション
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CONDITION_OPTIONS.map((c) => (
              <button
                key={c.id}
                id={`condition-${c.id}`}
                onClick={() => setCondition(c.id)}
                className={`
                  px-2.5 py-1.5 rounded-lg border cursor-pointer
                  text-xs font-medium transition-all duration-200
                  ${condition === c.id
                    ? 'bg-[rgba(52,211,153,0.15)] border-[rgba(52,211,153,0.3)] text-[var(--color-accent-success)]'
                    : 'bg-transparent border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
                  }
                `}
                title={c.label}
              >
                {c.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
          ${canRow
            ? 'bg-[rgba(52,211,153,0.1)] text-[var(--color-accent-success)] border border-[rgba(52,211,153,0.2)]'
            : 'bg-[rgba(251,191,36,0.1)] text-[var(--color-accent-warning)] border border-[rgba(251,191,36,0.2)]'
          }
        `}
        id="rowing-status"
      >
        <span className={`w-2 h-2 rounded-full pulse-dot ${canRow ? 'bg-[var(--color-accent-success)]' : 'bg-[var(--color-accent-warning)]'}`} />
        <span>
          {selectedWeather?.emoji} {selectedWeather?.label} / {selectedCondition?.emoji} {selectedCondition?.label}
        </span>
        <span className="ml-auto text-xs opacity-80">
          {canRow ? '水上練習 OK 🚣' : '陸上トレ推奨 🏋️'}
        </span>
      </div>
    </div>
  );
}
