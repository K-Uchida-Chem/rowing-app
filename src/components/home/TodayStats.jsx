import { useState, useEffect } from 'react';
import { Activity, HeartPulse, Brain, Bed, Scale, Trophy } from 'lucide-react';
import { STRENGTH_EXERCISES } from '../../db/masterData';
import db, { getBest2kTT } from '../../db/database';

/**
 * Today's summary stats — Shows objective, subjective, and physical data.
 * Shows live data from IndexedDB.
 */
export default function TodayStats() {
  const [data, setData] = useState({
    ergo: [],
    strength: [],
    condition: null,
    bodyWeight: null,
    best2kTT: null,
  });

  useEffect(() => {
    const fetchTodayData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const ergo = await db.ergoRecords.where('date').equals(today).toArray();
      const strength = await db.strengthRecords.where('date').equals(today).toArray();
      const bodyWeightList = await db.bodyWeightRecords.where('date').equals(today).toArray();
      const conditionList = await db.conditionRecords.where('date').equals(today).toArray();
      const bestTT = await getBest2kTT();
      
      setData({
        ergo,
        strength,
        condition: conditionList.length > 0 ? conditionList[0] : null,
        bodyWeight: bodyWeightList.length > 0 ? bodyWeightList[0].weight : null,
        best2kTT: bestTT,
      });
    };
    
    fetchTodayData();
  }, []);

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

  // Calculate 2k TT Diff
  const today2k = data.ergo.find(r => r.type === '2kTT');
  let ttDiff = null;
  if (today2k && data.best2kTT && today2k.time) {
    const parseSecs = (str) => {
      if (!str) return 0;
      const parts = str.split(':');
      if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
      if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
      return 0;
    };
    const todaySecs = parseSecs(today2k.time);
    const bestSecs = parseSecs(data.best2kTT.time);
    
    if (todaySecs > 0 && bestSecs > 0 && today2k.id !== data.best2kTT.id) {
      const diff = todaySecs - bestSecs;
      ttDiff = {
        diffStr: diff > 0 ? `+${diff.toFixed(1)}s` : `${diff.toFixed(1)}s`,
        isPB: diff < 0,
        bestTime: data.best2kTT.time
      };
    } else if (today2k.id === data.best2kTT.id) {
      ttDiff = { diffStr: 'New PB!', isPB: true, bestTime: today2k.time };
    }
  }

  // Combine Memos
  const memos = [];
  if (data.condition?.memo) memos.push(`【体調】${data.condition.memo}`);
  data.ergo.forEach((r, i) => { if (r.memo) memos.push(`【エルゴ${i+1}】${r.memo}`); });
  data.strength.forEach((r, i) => { if (r.memo) memos.push(`【ウェイト${i+1}】${r.memo}`); });

  return (
    <div className="space-y-4">
      {/* 1. 客観データ (Objective Data) */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-5 border-b border-[var(--color-surface-600)] pb-2">
          <Activity size={16} className="text-[var(--color-accent-primary)]" />
          <h2 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            Objective Data (客観データ)
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5 px-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)] mb-1">
              <HeartPulse size={12} /> 安静時心拍数
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono tracking-tighter text-[var(--color-text-primary)] leading-none">
                {data.condition?.restingHR || '--'}
              </span>
              <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">bpm</span>
            </div>
          </div>

          {today2k && ttDiff && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)] mb-1">
                <Trophy size={12} /> 2k TT 差分
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold font-mono tracking-tighter leading-none ${ttDiff.isPB ? 'text-[var(--color-accent-success)]' : 'text-[var(--color-accent-warning)]'}`}>
                  {ttDiff.diffStr}
                </span>
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase ml-1">
                  (PB: {ttDiff.bestTime})
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {data.ergo.length === 0 && Object.keys(strengthSummary).length === 0 && (
             <p className="text-xs text-[var(--color-text-muted)]">本日のトレーニング記録はありません。</p>
          )}

          {data.ergo.length > 0 && (
            <div className="p-3 rounded-xl bg-[var(--color-surface-600)] border border-[rgba(226,232,240,0.08)]">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-primary)] mb-2">エルゴ</p>
              {data.ergo.map((r, i) => (
                <div key={i} className="text-xs text-[var(--color-text-secondary)] mt-1.5 flex flex-wrap gap-x-2.5 items-center">
                  <span className="font-bold text-[var(--color-text-primary)] inline-block min-w-[36px]">{r.type}</span>
                  {r.distance && <span>{r.distance}m</span>}
                  {r.time && <span>{r.time}</span>}
                  {r.split && <span>({r.split}/500m)</span>}
                  {r.rate && <span>SR{r.rate}</span>}
                  {r.intervals && r.intervals.length > 0 && (
                    <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                      {r.intervals.length} sets
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {Object.keys(strengthSummary).length > 0 && (
            <div className="p-3 rounded-xl bg-[var(--color-surface-600)] border border-[rgba(226,232,240,0.08)]">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-primary)] mb-2">ウェイト</p>
              {Object.entries(strengthSummary).map(([exerciseId, s], i) => {
                const exerciseName = STRENGTH_EXERCISES[exerciseId]?.name || exerciseId;
                return (
                  <div key={i} className="text-xs text-[var(--color-text-primary)] mt-1.5 flex justify-between">
                    <span>{exerciseName}</span>
                    <span className="text-[var(--color-text-secondary)]">{s.maxWeight}kg / {s.sets} sets</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. 主観データ (Subjective Data) */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-5 border-b border-[var(--color-surface-600)] pb-2">
          <Brain size={16} className="text-[var(--color-accent-purple)]" />
          <h2 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            Subjective Data (主観データ)
          </h2>
        </div>
        
        <div className="flex flex-col mb-5 px-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)] mb-1">
            疲労度スコア
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-mono tracking-tighter text-[var(--color-text-primary)] leading-none">
              {data.condition?.fatigueScore || '--'}
            </span>
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">/ 5</span>
          </div>
        </div>

        <div className="px-1">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)] mb-2">
            振り返り・感想
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed space-y-2 bg-[var(--color-surface-700)] p-3 rounded-xl border border-[rgba(226,232,240,0.04)]">
            {memos.length > 0 ? (
              memos.map((m, i) => <p key={i}>{m}</p>)
            ) : (
              <p className="text-[var(--color-text-muted)] text-center py-2">記録がありません</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. 身体データ (Physical Data) */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-5 border-b border-[var(--color-surface-600)] pb-2">
          <Bed size={16} className="text-[var(--color-accent-success)]" />
          <h2 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            Physical Data (身体データ)
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 px-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)] mb-1">
              <Bed size={12} /> 睡眠時間
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono tracking-tighter text-[var(--color-text-primary)] leading-none">
                {data.condition?.sleepHours || '--'}
              </span>
              <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">h</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)] mb-1">
              <Scale size={12} /> 体重
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono tracking-tighter text-[var(--color-text-primary)] leading-none">
                {data.bodyWeight || '--'}
              </span>
              <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">kg</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
