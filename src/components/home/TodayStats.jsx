import { useState, useEffect } from 'react';
import { NUTRITION_TARGETS, STRENGTH_EXERCISES } from '../../db/masterData';
import db from '../../db/database';

/**
 * Today's summary stats — shows nutrition progress and recent training stats.
 * Shows live data from IndexedDB.
 */
export default function TodayStats() {
  const [data, setData] = useState({
    ergo: [],
    strength: [],
    nutrition: [],
    bodyWeight: null,
    sleepHours: null,
  });

  useEffect(() => {
    const fetchTodayData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const ergo = await db.ergoRecords.where('date').equals(today).toArray();
      const strength = await db.strengthRecords.where('date').equals(today).toArray();
      const nutrition = await db.nutritionRecords.where('date').equals(today).toArray();
      const bodyWeightList = await db.bodyWeightRecords.where('date').equals(today).toArray();
      const conditionList = await db.conditionRecords.where('date').equals(today).toArray();
      
      setData({
        ergo,
        strength,
        nutrition,
        bodyWeight: bodyWeightList.length > 0 ? bodyWeightList[0].weight : null,
        sleepHours: conditionList.length > 0 ? conditionList[0].sleepHours : null,
      });
    };
    
    fetchTodayData();
  }, []);

  // Calculate nutrition totals
  const nutritionToday = data.nutrition.reduce(
    (acc, curr) => {
      acc.calories += curr.calories || 0;
      acc.protein += curr.protein || 0;
      acc.fat += curr.fat || 0;
      acc.carbs += curr.carbs || 0;
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  // Strength details logic: group by exercise and find max weight
  const strengthSummary = data.strength.reduce((acc, curr) => {
    if (!acc[curr.exercise]) {
      acc[curr.exercise] = { maxWeight: 0, sets: 0 };
    }
    if (curr.weight > acc[curr.exercise].maxWeight) {
      acc[curr.exercise].maxWeight = curr.weight;
    }
    acc[curr.exercise].sets += 1;
    return acc;
  }, {});

  const targets = NUTRITION_TARGETS;

  const macros = [
    {
      label: 'カロリー',
      current: nutritionToday.calories,
      target: targets.calories,
      unit: 'kcal',
      color: '#38bdf8',
      gradient: 'linear-gradient(90deg, #38bdf8, #818cf8)',
    },
    {
      label: 'タンパク質',
      current: nutritionToday.protein,
      target: targets.protein,
      unit: 'g',
      color: '#f87171',
      gradient: 'linear-gradient(90deg, #f87171, #fb923c)',
    },
    {
      label: '脂質',
      current: nutritionToday.fat,
      target: targets.fat,
      unit: 'g',
      color: '#fbbf24',
      gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
    },
    {
      label: '炭水化物',
      current: nutritionToday.carbs,
      target: targets.carbs,
      unit: 'g',
      color: '#34d399',
      gradient: 'linear-gradient(90deg, #34d399, #10b981)',
    },
  ];

  return (
    <div className="glass-card p-5 mb-4" id="today-stats">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            今日のサマリー
          </h2>
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
          Today&apos;s Summary
        </span>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="text-center p-3 rounded-xl bg-[rgba(56,189,248,0.06)] border border-[rgba(56,189,248,0.08)]">
          <p className="text-xl font-bold text-[var(--color-accent-primary)] tabular-nums">{data.ergo.length}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">エルゴ (本数)</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-[rgba(255,167,38,0.06)] border border-[rgba(255,167,38,0.08)]">
          <p className="text-xl font-bold text-[var(--color-accent-warning)] tabular-nums">{Object.keys(strengthSummary).length}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">ウェイト (種目)</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-[rgba(167,139,250,0.06)] border border-[rgba(167,139,250,0.08)]">
          <p className="text-xl font-bold text-[var(--color-accent-purple)] tabular-nums">
            {data.bodyWeight ? data.bodyWeight : '—'}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">体重 (kg)</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-[rgba(52,211,153,0.06)] border border-[rgba(52,211,153,0.08)]">
          <p className="text-xl font-bold text-[var(--color-accent-success)] tabular-nums">
            {data.sleepHours ? data.sleepHours : '—'}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">睡眠 (h)</p>
        </div>
      </div>

      {/* Detailed Training Summary */}
      {(data.ergo.length > 0 || Object.keys(strengthSummary).length > 0) && (
        <div className="mb-5 space-y-3">
          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
            トレーニング内容
          </p>
          
          {data.ergo.length > 0 && (
            <div className="p-3 rounded-xl bg-[var(--color-surface-600)] border border-[rgba(56,189,248,0.08)]">
              <p className="text-xs font-bold text-[var(--color-accent-primary)] mb-1">🚣 エルゴ</p>
              {data.ergo.map((r, i) => (
                <div key={i} className="text-xs text-[var(--color-text-primary)] mt-1">
                  <span className="inline-block w-8 text-[var(--color-text-muted)]">{r.type}</span>
                  {r.time && r.distance ? `${r.time} (${r.distance}m)` : (r.time || `${r.distance}m`)}
                  {r.intervals && r.intervals.length > 0 && (
                    <span className="text-[var(--color-text-secondary)] ml-1">
                      {` - ${r.intervals.length} intervals`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {Object.keys(strengthSummary).length > 0 && (
            <div className="p-3 rounded-xl bg-[var(--color-surface-600)] border border-[rgba(255,167,38,0.08)]">
              <p className="text-xs font-bold text-[var(--color-accent-warning)] mb-1">🏋️ ウェイト</p>
              {Object.entries(strengthSummary).map(([exerciseId, stats], i) => {
                const exerciseName = STRENGTH_EXERCISES[exerciseId]?.name || exerciseId;
                return (
                  <div key={i} className="text-xs text-[var(--color-text-primary)] mt-1 flex justify-between">
                    <span>{exerciseName}</span>
                    <span className="text-[var(--color-text-secondary)]">{stats.maxWeight}kg / {stats.sets} sets</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PFC Progress */}
      <div className="space-y-3">
        <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
          栄養バランス（PFC）
        </p>
        {macros.map((macro) => {
          const pct = Math.min(100, Math.round((macro.current / macro.target) * 100));
          return (
            <div key={macro.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {macro.label}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                  <span className="font-bold text-[var(--color-text-primary)]">{macro.current.toLocaleString()}</span>
                  {' / '}
                  {macro.target.toLocaleString()} {macro.unit}
                  <span className="ml-1.5 text-[10px]" style={{ color: macro.color }}>
                    {pct}%
                  </span>
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: macro.gradient,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
