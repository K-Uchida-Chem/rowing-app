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
  { id: 'legPress', label: 'レッグプレス' },
  { id: 'bentOverRow', label: 'ベントオーバーロウ' },
  { id: 'pullUp', label: '懸垂' },
  { id: 'powerClean', label: 'パワークリーン' },
  { id: 'hangClean', label: 'ハングクリーン' },
  { id: 'abRoller', label: 'アブローラー' },
  { id: 'sideBend', label: 'サイドベント' },
  { id: 'russianTwist', label: 'ロシアンツイスト' },
  { id: 'other', label: 'その他' },
];

export const labelOf = (list, id) => list.find((x) => x.id === id)?.label ?? id;

// 旧アプリで「種目を追加」した記録は、名前が残っておらず custom-数字 のIDだけが保存されている
export const exerciseLabel = (id) =>
  EXERCISES.find((x) => x.id === id)?.label ?? (String(id).startsWith('custom-') ? '追加した種目' : id);

// ─── 記録フォーム定義 (入力画面・履歴の表示を共通化) ──
export const KINDS = {
  ergo: {
    table: 'ergoRecords',
    label: 'エルゴ',
    requireAny: ['distance', 'time'],
    menuKeys: ['type', 'distance'],
    menuLabel: (r) => `${labelOf(ERGO_ZONES, r.type)} ${r.intervals?.length ? intervalLabel(r) : `${r.distance}m`}`,
    fields: [
      { key: 'type', label: '強度ゾーン', type: 'choice', options: ERGO_ZONES, default: 'UT2' },
      { key: 'distance', label: '距離 (m)', type: 'number', presets: [500, 1000, 2000, 5000, 6000, 10000] },
      { key: 'time', label: 'タイム(数字だけ入力: 7053 → 7:05.3)', type: 'time' },
      { key: 'watts', label: '平均ワット', type: 'number' },
      { key: 'rate', label: 'レート (spm)', type: 'number' },
      { key: 'avgHR', label: '平均心拍', type: 'number' },
      { key: 'maxHR', label: '最大心拍', type: 'number' },
      { key: 'rpe', label: 'きつさ RPE', type: 'scale', min: 1, max: 10 },
      { key: 'memo', label: 'メモ', type: 'text' },
    ],
    prepare: (r) => ({ ...r, split: calcSplit(r.distance, r.time) }),
    summary: (r) =>
      [
        labelOf(ERGO_ZONES, r.type),
        r.intervals?.length ? intervalLabel(r) : r.distance && `${r.distance}m`,
        r.time,
        r.split && `@${r.split}/500m`,
        r.watts && `${r.watts}W`,
        r.avgHR && `HR${r.avgHR}`,
      ].filter(Boolean).join(' · '),
  },
  strength: {
    table: 'strengthRecords',
    label: '筋トレ',
    requireAny: ['weight', 'reps'],
    fields: [
      { key: 'exercise', label: '種目', type: 'choice', options: EXERCISES, default: 'squat' },
      { key: 'weight', label: '重量 (kg・自重は空欄)', type: 'number', step: 2.5 },
      { key: 'reps', label: '回数', type: 'stepper', default: 5, min: 1 },
      { key: 'sets', label: 'セット数', type: 'stepper', default: 3, min: 1 },
      { key: 'memo', label: 'メモ', type: 'text' },
    ],
    prepare: (r) => ({ ...r, estimated1RM: r.weight ? epley1RM(r.weight, r.reps || 1) : null }),
    summary: (r) =>
      [
        exerciseLabel(r.exercise),
        r.setList?.length
          ? r.setList.map((s) => `${s.weight ? `${s.weight}kg` : '自重'}×${s.reps}`).join(', ')
          : [r.weight ? `${r.weight}kg` : '自重', `${r.reps ?? '-'}回×${r.sets ?? 1}`].join(' · '),
        r.estimated1RM && `推定1RM ${r.estimated1RM}kg`,
      ].filter(Boolean).join(' · '),
  },
  cross: {
    table: 'crossTrainingRecords',
    label: 'ラン/バイク',
    requireAny: ['distance', 'time'],
    menuKeys: ['type', 'distance'],
    menuLabel: (r) => `${r.type === 'cycling' ? 'バイク' : 'ラン'} ${r.distance}km`,
    fields: [
      {
        key: 'type', label: '種類', type: 'choice', default: 'running',
        options: [{ id: 'running', label: 'ランニング' }, { id: 'cycling', label: 'サイクリング' }],
      },
      { key: 'distance', label: '距離 (km)', type: 'number', presets: [3, 5, 10, 20] },
      { key: 'time', label: 'タイム(数字だけ入力)', type: 'time' },
      { key: 'avgHR', label: '平均心拍', type: 'number' },
      { key: 'rpe', label: 'きつさ RPE', type: 'scale', min: 1, max: 10 },
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
    requireAny: ['sleep', 'fatigue', 'restingHR'],
    fields: [
      { key: 'sleep', label: '睡眠時間 (h)', type: 'number', presets: [5, 6, 7, 8, 9] },
      { key: 'fatigue', label: '疲労度 (1:元気 〜 5:ぐったり)', type: 'scale', min: 1, max: 5 },
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
    requireAny: ['weight'],
    fields: [{ key: 'weight', label: '体重 (kg)', type: 'number', step: 0.1 }],
    prepare: (r) => r,
    summary: (r) => `${r.weight}kg`,
  },
};

const NUMERIC = ['number', 'stepper', 'scale'];

KINDS.nutrition = {
  table: 'nutritionRecords',
  label: '食事',
  requireAny: ['calories', 'protein'],
  fields: [
    {
      key: 'mealType', label: '区分', type: 'choice', default: 'total',
      options: [
        { id: 'breakfast', label: '朝食' }, { id: 'lunch', label: '昼食' }, { id: 'dinner', label: '夕食' },
        { id: 'snack', label: '間食' }, { id: 'total', label: '1日の合計' },
      ],
    },
    { key: 'calories', label: 'エネルギー (kcal)', type: 'number' },
    { key: 'protein', label: 'たんぱく質 (g)', type: 'number' },
    { key: 'fat', label: '脂質 (g)', type: 'number' },
    { key: 'carbs', label: '炭水化物 (g)', type: 'number' },
  ],
  prepare: (r) => r,
  summary: (r) =>
    [
      { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食', total: '合計' }[r.mealType],
      r.calories && `${r.calories}kcal`,
      r.protein && `P${r.protein}`,
      r.fat && `F${r.fat}`,
      r.carbs && `C${r.carbs}`,
    ].filter(Boolean).join(' · '),
};

// インターバルの表示: 同じ距離なら 1000m×4、違えば 4本 計3500m
export function intervalLabel(r) {
  const ds = [...new Set(r.intervals.map((p) => p.distance))];
  return ds.length === 1 ? `${ds[0]}m×${r.intervals.length}` : `${r.intervals.length}本 計${r.distance}m`;
}

// ─── 目標・週間メニュー ──────────────────────────────
export const GOAL_TYPES = [
  { id: '2kTT', label: '2km タイム', unit: '', time: true },
  { id: 'squat', label: 'スクワット 1RM', unit: 'kg' },
  { id: 'bench', label: 'ベンチプレス 1RM', unit: 'kg' },
  { id: 'deadlift', label: 'デッドリフト 1RM', unit: 'kg' },
  { id: 'bodyWeight', label: '体重', unit: 'kg' },
];
export const SCHEDULE_ERGO = [{ id: 'none', label: 'なし' }, ...ERGO_ZONES.filter((z) => z.id !== 'other')];
export const SCHEDULE_STRENGTH = [
  { id: 'none', label: 'なし' }, { id: 'Day 1', label: 'Day 1' }, { id: 'Day 2', label: 'Day 2' }, { id: 'Day 3', label: 'Day 3' },
];

// 数値フィールドは文字列→数値に、空欄は除去
export function cleanRecord(kind, values) {
  const out = {};
  for (const f of KINDS[kind].fields) {
    const v = values[f.key];
    if (v === '' || v == null) continue;
    out[f.key] = NUMERIC.includes(f.type) ? Number(v) : v;
  }
  return out;
}

// 数字だけ打てば PM5 風に整形: 7053 → 7:05.3 (右から 1/10秒・秒2桁・分)
export function formatTimeInput(raw) {
  const d = String(raw).replace(/\D/g, '').slice(0, 7).replace(/^0+(?=\d{4})/, '');
  if (!d) return '';
  const tenth = d.slice(-1);
  const sec = d.slice(-3, -1).padStart(2, '0');
  const min = d.slice(0, -3) || '0';
  return `${min}:${sec}.${tenth}`;
}

// OCR などで得た "30:00" や "1:02:03.4" を入力欄の形式に揃える
export const normalizeTime = (str) => {
  const sec = parseTime(str);
  return sec == null ? '' : formatTime(sec);
};

// ─── 旧アプリ(RowingAppDB)形式の読み替え ───────────────
// 保存データは書き換えず、読み出すときに新アプリの形へそろえる。
const num = (v) => {
  const n = Number(v);
  return v === '' || v == null || !Number.isFinite(n) ? undefined : n;
};

export function normalizeRecord(kind, r) {
  switch (kind) {
    case 'ergo': {
      const intervals = (Array.isArray(r.intervals) ? r.intervals : [])
        .map((p) => ({ ...p, distance: num(p.distance), time: normalizeTime(p.time) || undefined }))
        .filter((p) => p.distance > 0 && p.time);
      return {
        ...r,
        distance: num(r.distance),
        watts: num(r.watts),
        rate: num(r.rate),
        rpe: num(r.rpe),
        avgHR: num(r.avgHR ?? r.hr),
        maxHR: num(r.maxHR),
        intervals: intervals.length ? intervals : undefined,
      };
    }
    case 'strength': {
      // 旧形式: 1種目1行で sets: [{weight, reps}, ...]
      if (!Array.isArray(r.sets)) return { ...r, weight: num(r.weight), reps: num(r.reps), sets: num(r.sets) };
      const list = r.sets.filter((s) => s && Number(s.reps) > 0).map((s) => ({ weight: num(s.weight) || 0, reps: Number(s.reps) }));
      if (!list.length) return { ...r, sets: 1, setList: [], estimated1RM: null };
      const top = list.reduce((b, s) => (s.weight > b.weight ? s : b), list[0]);
      const best1RM = Math.max(0, ...list.filter((s) => s.weight > 0).map((s) => epley1RM(s.weight, s.reps)));
      return { ...r, setList: list, weight: top.weight || undefined, reps: top.reps, sets: list.length, estimated1RM: best1RM || null };
    }
    case 'cross':
      return { ...r, distance: num(r.distance), avgHR: num(r.avgHR) };
    case 'condition':
      return {
        ...r,
        sleep: num(r.sleep ?? r.sleepHours),
        fatigue: num(r.fatigue ?? r.fatigueScore),
        restingHR: num(r.restingHR),
      };
    case 'weight':
      return { ...r, weight: num(r.weight) };
    case 'nutrition':
      return { ...r, calories: num(r.calories), protein: num(r.protein), fat: num(r.fat), carbs: num(r.carbs) };
    default:
      return r;
  }
}
