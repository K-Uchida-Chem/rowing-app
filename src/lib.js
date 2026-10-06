// ─── 日付 ────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toDateStr(new Date());

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
export function formatDate(s) {
  const d = new Date(`${s}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`;
}

// 月曜始まりの週の開始日
export function weekStart(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
}

// ─── タイム ──────────────────────────────────────────
// "7:05.3" / "30:00" / "1:02:03" → 秒
export function parseTime(str) {
  if (!str) return null;
  const parts = String(str).trim().split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export function formatTime(sec, decimals = 1) {
  if (sec == null || !Number.isFinite(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(decimals).padStart(decimals ? decimals + 3 : 2, '0');
  return `${m}:${s}`;
}

// 距離とタイムから500mスプリットを計算
export function calcSplit(distance, timeStr) {
  const sec = parseTime(timeStr);
  if (!distance || !sec) return '';
  return formatTime((sec / distance) * 500);
}

// ─── 計算 ────────────────────────────────────────────
export const epley1RM = (weight, reps) =>
  reps <= 1 ? weight : Math.round(weight * (1 + reps / 30));

// ─── マスター ────────────────────────────────────────
export const ERGO_ZONES = [
  { id: 'UT2', label: 'UT2 (基礎持久)', color: '#38bdf8' },
  { id: 'UT1', label: 'UT1', color: '#4ade80' },
  { id: 'AT', label: 'AT', color: '#fb923c' },
  { id: 'TR', label: 'TR', color: '#f87171' },
  { id: 'AN', label: 'AN (スプリント)', color: '#c084fc' },
  { id: '2kTT', label: '2kテスト', color: '#facc15' },
  { id: 'other', label: 'その他', color: '#94a3b8' },
];

export const EXERCISES = [
  { id: 'squat', label: 'スクワット', big3: true },
  { id: 'bench', label: 'ベンチプレス', big3: true },
  { id: 'deadlift', label: 'デッドリフト', big3: true },
  { id: 'frontSquat', label: 'フロントスクワット' },
  { id: 'romanianDL', label: 'ルーマニアンDL' },
  { id: 'bentOverRow', label: 'ベントオーバーロウ' },
  { id: 'pullUp', label: '懸垂' },
  { id: 'other', label: 'その他' },
];

export const labelOf = (list, id) => list.find((x) => x.id === id)?.label ?? id;

// ─── 記録フォーム定義 (入力画面・履歴の表示を共通化) ──
export const KINDS = {
  ergo: {
    table: 'ergoRecords',
    label: 'エルゴ',
    fields: [
      { key: 'type', label: '強度ゾーン', type: 'select', options: ERGO_ZONES, default: 'UT2' },
      { key: 'distance', label: '距離 (m)', type: 'number' },
      { key: 'time', label: 'タイム (例 30:00.0)', type: 'text' },
      { key: 'rate', label: 'レート (spm)', type: 'number' },
      { key: 'avgHR', label: '平均心拍', type: 'number' },
      { key: 'rpe', label: 'きつさ RPE (1-10)', type: 'number' },
      { key: 'memo', label: 'メモ', type: 'text' },
    ],
    prepare: (r) => ({ ...r, split: calcSplit(r.distance, r.time) }),
    summary: (r) =>
      [
        labelOf(ERGO_ZONES, r.type),
        r.distance && `${r.distance}m`,
        r.time,
        r.split && `@${r.split}/500m`,
        r.avgHR && `HR${r.avgHR}`,
      ].filter(Boolean).join(' · '),
  },
  strength: {
    table: 'strengthRecords',
    label: '筋トレ',
    fields: [
      { key: 'exercise', label: '種目', type: 'select', options: EXERCISES, default: 'squat' },
      { key: 'weight', label: '重量 (kg・自重は0)', type: 'number' },
      { key: 'reps', label: '回数', type: 'number' },
      { key: 'sets', label: 'セット数', type: 'number', default: 1 },
      { key: 'memo', label: 'メモ', type: 'text' },
    ],
    prepare: (r) => ({ ...r, estimated1RM: r.weight ? epley1RM(r.weight, r.reps || 1) : null }),
    summary: (r) =>
      [
        labelOf(EXERCISES, r.exercise),
        r.weight ? `${r.weight}kg` : '自重',
        `${r.reps ?? '-'}回×${r.sets ?? 1}`,
        r.estimated1RM && `推定1RM ${r.estimated1RM}kg`,
      ].filter(Boolean).join(' · '),
  },
  cross: {
    table: 'crossTrainingRecords',
    label: 'ラン/バイク',
    fields: [
      {
        key: 'type', label: '種類', type: 'select', default: 'running',
        options: [{ id: 'running', label: 'ランニング' }, { id: 'cycling', label: 'サイクリング' }],
      },
      { key: 'distance', label: '距離 (km)', type: 'number' },
      { key: 'time', label: 'タイム (例 30:00)', type: 'text' },
      { key: 'avgHR', label: '平均心拍', type: 'number' },
      { key: 'memo', label: 'メモ', type: 'text' },
    ],
    prepare: (r) => r,
    summary: (r) =>
      [r.type === 'cycling' ? 'バイク' : 'ラン', r.distance && `${r.distance}km`, r.time, r.avgHR && `HR${r.avgHR}`]
        .filter(Boolean).join(' · '),
  },
  condition: {
    table: 'conditionRecords',
    label: 'コンディション',
    fields: [
      { key: 'sleep', label: '睡眠時間 (h)', type: 'number' },
      { key: 'fatigue', label: '疲労度 (1:元気 〜 5:ぐったり)', type: 'number' },
      { key: 'restingHR', label: '安静時心拍', type: 'number' },
      { key: 'memo', label: 'メモ', type: 'text' },
    ],
    prepare: (r) => r,
    summary: (r) =>
      [r.sleep && `睡眠${r.sleep}h`, r.fatigue && `疲労${r.fatigue}/5`, r.restingHR && `安静時HR${r.restingHR}`]
        .filter(Boolean).join(' · '),
  },
  weight: {
    table: 'bodyWeightRecords',
    label: '体重',
    fields: [{ key: 'weight', label: '体重 (kg)', type: 'number' }],
    prepare: (r) => r,
    summary: (r) => `${r.weight}kg`,
  },
};

// 数値フィールドは文字列→数値に、空欄は除去
export function cleanRecord(kind, values) {
  const out = {};
  for (const f of KINDS[kind].fields) {
    const v = values[f.key];
    if (v === '' || v == null) continue;
    out[f.key] = f.type === 'number' ? Number(v) : v;
  }
  return out;
}
