import { useState, useRef, useEffect } from 'react';
import { HEART_RATE_ZONES, RPE_SCALE } from '../../db/masterData';
import { addErgoRecord } from '../../db/database';
import { extractErgoData, extractWatchData, hasApiKey } from '../../services/ocrService';

// Time formatting helper: 1523 -> 1:52.3, 30000 -> 30:00.0
const formatRowingTime = (val) => {
  if (!val) return '';
  if (val.includes(':') || val.includes('.')) return val; // ユーザーが明示的に打った場合は自動変換をスキップ
  const digits = val.replace(/\D/g, '');
  if (!digits) return val;
  
  const len = digits.length;
  if (len <= 2) return digits;
  if (len === 3) return `${digits.slice(0, 1)}:${digits.slice(1)}`;
  if (len === 4) return `${digits.slice(0, 1)}:${digits.slice(1, 3)}.${digits.slice(3)}`;
  if (len === 5) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}.${digits.slice(4)}`;
  if (len === 6) return `${digits.slice(0, 1)}:${digits.slice(1, 3)}:${digits.slice(3, 5)}.${digits.slice(5)}`;
  if (len === 7) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}.${digits.slice(6)}`;
  return digits;
};

const ERGO_TYPES = [
  { id: 'ut2', label: 'UT2 ロング', zone: 'UT2' },
  { id: 'ut1', label: 'UT1 テンポ', zone: 'UT1' },
  { id: 'at', label: 'AT インターバル', zone: 'AT' },
  { id: 'tr', label: 'TR VO2Max', zone: 'TR' },
  { id: 'an', label: 'AN スプリント', zone: 'AN' },
  { id: '2kTT', label: '2000m TT', zone: 'AT' },
  { id: 'other', label: 'その他', zone: null },
];

export default function ErgoLogger() {
  const fileInputRef = useRef(null);
  const watchInputRef = useRef(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState(null);
  const [ocrError, setOcrError] = useState(null);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'ut2',
    time: '',
    distance: '',
    split: '',
    watts: '',
    rate: '',
    avgHR: '',
    maxHR: '',
    calories: '',
    rpe: 5,
    rpe: 5,
    memo: '',
    videoUrl: '',
    intervals: [],
    session: 'AM', // AM, PM, or Night
  });

  useEffect(() => {
    if (form.split && !form.watts) {
      const splitMatch = form.split.match(/^(\d+):(\d+(\.\d+)?)$/);
      if (splitMatch) {
        const minutes = parseInt(splitMatch[1], 10);
        const seconds = parseFloat(splitMatch[2]);
        const totalSeconds = minutes * 60 + seconds;
        const paceInSecondsPerMeter = totalSeconds / 500;
        const watts = 2.8 / Math.pow(paceInSecondsPerMeter, 3);
        setForm((prev) => ({ ...prev, watts: Math.round(watts).toString() }));
      }
    }
  }, [form.split, form.watts]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const selectedType = ERGO_TYPES.find((t) => t.id === form.type);
  const zoneData = selectedType?.zone
    ? HEART_RATE_ZONES.find((z) => z.fisa === selectedType.zone)
    : null;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setOcrPreviewUrl(url);
    setIsOcrProcessing(true);
    setOcrError(null);
    setOcrSuccess(false);

    if (!hasApiKey()) {
      setOcrError('Gemini APIキーが未設定です。OCR機能を使うにはAPIキーを設定してください。');
      setIsOcrProcessing(false);
      return;
    }

    try {
      const data = await extractErgoData(file);
      setForm((prev) => ({
        ...prev,
        time: data.time || prev.time,
        distance: data.distance || prev.distance,
        split: data.split || prev.split,
        watts: data.watts || prev.watts,
        rate: data.rate || prev.rate,
      }));
      setOcrSuccess(true);
    } catch (err) {
      setOcrError(err.message || 'OCR解析に失敗しました');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleWatchUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!hasApiKey()) {
      setOcrError('Gemini APIキーが未設定です。');
      return;
    }

    setIsOcrProcessing(true);
    setOcrError(null);

    try {
      const data = await extractWatchData(file);
      setForm((prev) => ({
        ...prev,
        avgHR: data.avgHR || prev.avgHR,
        maxHR: data.maxHR || prev.maxHR,
        calories: data.calories || prev.calories,
      }));
      setOcrSuccess(true);
    } catch (err) {
      setOcrError(err.message || 'スマートウォッチ画像の解析に失敗しました');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await addErgoRecord({
        date: form.date,
        session: form.session,
        type: selectedType?.zone || 'other',
        zone: selectedType?.zone || null,
        time: form.time,
        distance: form.distance ? Number(form.distance) : null,
        split: form.split,
        watts: form.watts ? Number(form.watts) : null,
        rate: form.rate ? Number(form.rate) : null,
        hr: form.avgHR ? Number(form.avgHR) : null,
        maxHR: form.maxHR ? Number(form.maxHR) : null,
        calories: form.calories ? Number(form.calories) : null,
        rpe: form.rpe,
        memo: form.memo,
        videoUrl: form.videoUrl,
        intervals: form.intervals,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save ergo record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      type: 'ut2',
      time: '',
      distance: '',
      split: '',
      watts: '',
      rate: '',
      avgHR: '',
      maxHR: '',
      calories: '',
      rpe: 5,
      memo: '',
      videoUrl: '',
      intervals: [],
    });
    setOcrPreviewUrl(null);
    setSaved(false);
  };

  const handleTimeChange = (v) => {
    updateField('time', formatRowingTime(v));
  };

  const handleSplitChange = (v) => {
    updateField('split', formatRowingTime(v));
  };

  const handleIntervalChange = (index, field, value) => {
    const updated = [...form.intervals];
    if (field === 'time' || field === 'split') {
      updated[index][field] = formatRowingTime(value);
    } else {
      updated[index][field] = value;
    }
    updateField('intervals', updated);
  };

  return (
    <div className="space-y-4" id="ergo-logger">
      <div className="glass-card p-4" id="ocr-upload-section">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📸</span>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            PM5 画像から自動入力
          </h3>
          <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
            {hasApiKey() ? '✅ OCR' : '⚠️ APIキー未設定'}
          </span>
        </div>

        {ocrPreviewUrl ? (
          <div className="relative rounded-xl overflow-hidden mb-3">
            <img
              src={ocrPreviewUrl}
              alt="PM5 preview"
              className="w-full h-40 object-cover rounded-xl"
              style={{ filter: isOcrProcessing ? 'brightness(0.5)' : 'none' }}
            />
            {isOcrProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-[var(--color-accent-primary)]">
                  OCR解析中...
                </p>
              </div>
            )}
            {!isOcrProcessing && (
              <button
                onClick={() => {
                  setOcrPreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[rgba(0,0,0,0.6)] text-white border-none cursor-pointer flex items-center justify-center text-xs hover:bg-[rgba(0,0,0,0.8)] transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-[rgba(56,189,248,0.15)] rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(56,189,248,0.03)]"
            onClick={() => fileInputRef.current?.click()}
            id="ocr-dropzone"
          >
            <div className="text-3xl mb-2">📷</div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              PM5モニターの写真をアップロード
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              タップして撮影 or ファイル選択
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
          id="ocr-file-input"
        />

        {ocrError && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)] text-xs text-[var(--color-accent-danger)]">
            ⚠️ {ocrError}
          </div>
        )}
        {ocrSuccess && !ocrError && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.2)] text-xs text-[var(--color-accent-success)]">
            ✅ OCR解析完了 — データが自動入力されました
          </div>
        )}

        <input
          ref={watchInputRef}
          type="file"
          accept="image/*"
          onChange={handleWatchUpload}
          className="hidden"
          id="watch-file-input"
        />
        <button
          onClick={() => watchInputRef.current?.click()}
          disabled={isOcrProcessing}
          className="w-full mt-2 px-4 py-2.5 rounded-xl text-xs font-medium text-[var(--color-text-secondary)] bg-[rgba(167,139,250,0.06)] border border-[rgba(167,139,250,0.1)] cursor-pointer transition-all duration-200 hover:bg-[rgba(167,139,250,0.12)] hover:border-[rgba(167,139,250,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          id="watch-upload-btn"
        >
          ⌚ Apple Watch / Garmin スクショから心拍取得
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              日付
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="w-2/3 px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)]"
                id="ergo-date"
              />
              <select
                value={form.session}
                onChange={(e) => updateField('session', e.target.value)}
                className="w-1/3 px-2 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] cursor-pointer appearance-none text-center"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
                <option value="Night">Night</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              メニュータイプ
            </label>
            <select
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] cursor-pointer appearance-none"
              id="ergo-type"
            >
              {ERGO_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone reference badge */}
        {zoneData && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-1"
            style={{
              background: `${zoneData.color}10`,
              border: `1px solid ${zoneData.color}25`,
              color: zoneData.color,
            }}
            id="zone-reference"
          >
            <span className="font-bold">{zoneData.fisa} ({zoneData.french})</span>
            <span className="opacity-70">|</span>
            <span>HR {zoneData.hrMin}-{zoneData.hrMax}</span>
            <span className="opacity-70">|</span>
            <span>{zoneData.splitMin}-{zoneData.splitMax}/500m</span>
            <span className="opacity-70">|</span>
            <span>{zoneData.wattMin}-{zoneData.wattMax}W</span>
          </div>
        )}
      </div>

      {/* ─── Ergo Data Fields ────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🚣</span>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            エルゴデータ
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InputField label="タイム (自動フォーマット)" placeholder="30000 -> 30:00.0" value={form.time} onChange={handleTimeChange} id="ergo-time" />
          <InputField label="距離 (m)" placeholder="7500" value={form.distance} onChange={(v) => updateField('distance', v)} type="number" id="ergo-distance" />
          <InputField label="500mスプリット" placeholder="1523 -> 1:52.3" value={form.split} onChange={handleSplitChange} id="ergo-split" />
          <InputField label="ワット (W)" placeholder="190" value={form.watts} onChange={(v) => updateField('watts', v)} type="number" id="ergo-watts" />
          <InputField label="レート (SPM)" placeholder="20" value={form.rate} onChange={(v) => updateField('rate', v)} type="number" id="ergo-rate" />
        </div>
      </div>

      {/* ─── Interval Details ────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⏱️</span>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            インターバル詳細 (任意)
          </h3>
        </div>
          <div className="space-y-3">
            {form.intervals.map((interval, index) => (
              <div key={index} className="flex items-end gap-2 p-3 bg-[var(--color-surface-700)] rounded-xl border border-[rgba(56,189,248,0.08)]">
                <div className="flex-1">
                  <InputField
                    label="距離(m)"
                    placeholder="500"
                    type="number"
                    value={interval.distance}
                    onChange={(v) => {
                      const newIntervals = [...form.intervals];
                      newIntervals[index].distance = v;
                      updateField('intervals', newIntervals);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <InputField
                    label="タイム"
                    placeholder="1450 -> 1:45.0"
                    value={interval.time}
                    onChange={(v) => handleIntervalChange(index, 'time', v)}
                  />
                </div>
                <div className="flex-1">
                  <InputField
                    label="スプリット"
                    placeholder="1450 -> 1:45.0"
                    value={interval.split}
                    onChange={(v) => handleIntervalChange(index, 'split', v)}
                  />
                </div>
                <button
                  onClick={() => {
                    const newIntervals = form.intervals.filter((_, i) => i !== index);
                    updateField('intervals', newIntervals);
                  }}
                  className="w-10 h-10 mb-0.5 flex items-center justify-center rounded-xl bg-[rgba(248,113,113,0.1)] text-[var(--color-accent-danger)] hover:bg-[rgba(248,113,113,0.2)] transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => updateField('intervals', [...form.intervals, { distance: '', time: '', split: '' }])}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] border border-dashed border-[rgba(56,189,248,0.2)] hover:bg-[rgba(56,189,248,0.05)] transition-colors"
            >
              + インターバルを追加
            </button>
          </div>
        </div>

      {/* ─── Heart Rate Fields ───────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">❤️</span>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            心拍データ
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <InputField label="平均HR" placeholder="145" value={form.avgHR} onChange={(v) => updateField('avgHR', v)} type="number" id="ergo-avg-hr" />
          <InputField label="最大HR" placeholder="165" value={form.maxHR} onChange={(v) => updateField('maxHR', v)} type="number" id="ergo-max-hr" />
          <InputField label="消費Cal" placeholder="450" value={form.calories} onChange={(v) => updateField('calories', v)} type="number" id="ergo-calories" />
        </div>
      </div>

      {/* ─── RPE Slider ──────────────────────────────────── */}
      <div className="glass-card p-4" id="rpe-section">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💪</span>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              RPE（主観的運動強度）
            </h3>
          </div>
          <span
            className="text-lg font-bold tabular-nums px-3 py-1 rounded-lg"
            style={{
              color: RPE_SCALE[form.rpe - 1]?.color,
              background: `${RPE_SCALE[form.rpe - 1]?.color}15`,
            }}
          >
            {form.rpe}
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="10"
          value={form.rpe}
          onChange={(e) => updateField('rpe', Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(90deg, #4FC3F7 0%, #66BB6A 30%, #FFA726 50%, #EF5350 70%, #B71C1C 100%)`,
          }}
          id="rpe-slider"
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] text-[var(--color-text-muted)]">楽</span>
          <span className="text-xs font-medium" style={{ color: RPE_SCALE[form.rpe - 1]?.color }}>
            {RPE_SCALE[form.rpe - 1]?.label}
          </span>
          <span className="text-[9px] text-[var(--color-text-muted)]">限界</span>
        </div>
      </div>

      {/* ─── Memo & Video ────────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📝</span>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            メモ & 動画
          </h3>
        </div>

        <textarea
          value={form.memo}
          onChange={(e) => updateField('memo', e.target.value)}
          placeholder="技術的振り返り、キャッチの掛け感、フィニッシュの抜け等..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] resize-none placeholder:text-[var(--color-text-muted)]"
          id="ergo-memo"
        />

        <div className="mt-3">
          <InputField
            label="動画URL (YouTube / Google Photos)"
            placeholder="https://youtu.be/..."
            value={form.videoUrl}
            onChange={(v) => updateField('videoUrl', v)}
            id="ergo-video-url"
          />
        </div>
      </div>

      {/* ─── Action Buttons ──────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-[var(--color-surface-600)] text-[var(--color-text-secondary)] border border-[rgba(56,189,248,0.06)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface-500)]"
          id="ergo-reset-btn"
        >
          リセット
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`
            flex-[2] px-4 py-3 rounded-xl text-sm font-bold border-none cursor-pointer
            transition-all duration-200
            ${saved
              ? 'bg-[var(--color-accent-success)] text-white'
              : 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white hover:opacity-90'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          id="ergo-save-btn"
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              保存中...
            </span>
          ) : saved ? (
            '✓ 保存しました'
          ) : (
            '💾 記録を保存'
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Reusable Input Field ──────────────────────────────────

function InputField({ label, placeholder, value, onChange, type = 'text', id }) {
  return (
    <div>
      <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] focus:ring-1 focus:ring-[rgba(56,189,248,0.15)] placeholder:text-[var(--color-text-muted)] tabular-nums"
        id={id}
      />
    </div>
  );
}
