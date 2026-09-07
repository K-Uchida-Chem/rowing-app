import { useState } from 'react';
import { Save, FileText, Link, Timer, Ruler, HeartPulse, Activity } from 'lucide-react';
import { addCrossTrainingRecord } from '../../db/database';

export default function CrossTrainingLogger() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('running'); // 'running' or 'cycling'
  const [distance, setDistance] = useState('');
  const [time, setTime] = useState('');
  const [avgSpeed, setAvgSpeed] = useState('');
  const [maxSpeed, setMaxSpeed] = useState('');
  const [avgHR, setAvgHR] = useState('');
  const [memo, setMemo] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await addCrossTrainingRecord({
        date,
        type,
        distance: distance ? Number(distance) : null,
        time,
        avgSpeed: avgSpeed ? Number(avgSpeed) : null,
        maxSpeed: maxSpeed ? Number(maxSpeed) : null,
        avgHR: avgHR ? Number(avgHR) : null,
        memo,
        videoUrl,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save cross training record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setType('running');
    setDistance('');
    setTime('');
    setAvgSpeed('');
    setMaxSpeed('');
    setAvgHR('');
    setMemo('');
    setVideoUrl('');
    setSaved(false);
  };

  return (
    <div className="space-y-4" id="crosstraining-logger">
      {/* ─── Type Selector ───────────────────────────────── */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType('running')}
          className={`flex-1 py-3 rounded-xl border text-sm font-bold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 ${
            type === 'running'
              ? 'bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.3)] text-[var(--color-accent-primary)] shadow-[0_0_15px_rgba(56,189,248,0.1)]'
              : 'bg-transparent border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
          }`}
        >
          🏃 ランニング
        </button>
        <button
          onClick={() => setType('cycling')}
          className={`flex-1 py-3 rounded-xl border text-sm font-bold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 ${
            type === 'cycling'
              ? 'bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.3)] text-[var(--color-accent-primary)] shadow-[0_0_15px_rgba(56,189,248,0.1)]'
              : 'bg-transparent border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
          }`}
        >
          🚴 サイクリング
        </button>
      </div>

      {/* ─── Main Info ───────────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4 border-b border-[var(--color-surface-600)] pb-2">
          <Activity size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            トレーニングデータ
          </h3>
        </div>

        <div className="mb-4">
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

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5">
              <Ruler size={10} /> 距離 (km)
            </label>
            <input
              type="number"
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="例: 5.0"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5">
              <Timer size={10} /> 時間
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="例: 30:00"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5">
              <Activity size={10} /> 平均速度 (km/h)
            </label>
            <input
              type="number"
              step="0.1"
              value={avgSpeed}
              onChange={(e) => setAvgSpeed(e.target.value)}
              placeholder="例: 12.5"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5">
              <Activity size={10} /> 最高速度 (km/h)
            </label>
            <input
              type="number"
              step="0.1"
              value={maxSpeed}
              onChange={(e) => setMaxSpeed(e.target.value)}
              placeholder="例: 15.0"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5">
              <HeartPulse size={10} /> 平均心拍数 (bpm)
            </label>
            <input
              type="number"
              value={avgHR}
              onChange={(e) => setAvgHR(e.target.value)}
              placeholder="例: 145"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* ─── Notes & Links ─────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--color-surface-600)] pb-2">
          <FileText size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            振り返り・参考資料
          </h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              振り返りメモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="フォームの意識、疲労感、特記事項など..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] resize-none"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5">
              <Link size={10} /> 動画・画像リンク (任意)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)]"
            />
          </div>
        </div>
      </div>

      {/* ─── Action Buttons ──────────────────────────────── */}
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
              : 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white hover:opacity-90'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSaving ? '保存中...' : saved ? '保存しました' : '記録を保存'}
        </button>
      </div>
    </div>
  );
}
