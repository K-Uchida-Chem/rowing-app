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

// 旧アプリや手入力のゆるい時間表記を秒にする。
//   "30:00" / "1:30:00" → そのまま、"60" → 60分、"10+5" "25+25" → 分の足し算
export function looseDuration(str) {
  if (str == null || str === '') return null;
  const s = String(str).trim();
  if (s.includes('+')) {
    const parts = s.split('+').map(looseDuration);
    return parts.some((p) => p == null) ? null : parts.reduce((a, b) => a + b, 0);
  }
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s) * 60; // コロンのない数字は「分」
  return parseTime(s);
}

export function formatTime(sec, decimals = 1) {
  if (sec == null || !Number.isFinite(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(decimals).padStart(decimals ? decimals + 3 : 2, '0');
  return `${m}:${s}`;
}

// 500mスプリット(秒)から平均ワット。Concept2 の換算式
export const wattsFromSplit = (sec500) => 2.8 / Math.pow(sec500 / 500, 3);

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
  { id: 'race', label: 'レース', color: '#e879a9' },
  { id: 'other', label: 'その他', color: '#94a3b8' },
];

// 練習の時間帯(任意)。週次レポートで、1日に朝練と午後練があるときの区切りに使う。
// 旧アプリの記録には 'AM' / 'PM' で入っている。
export const SESSIONS = [
  { id: 'am', label: '午前' },
  { id: 'pm', label: '午後' },
];
export const normalizeSession = (v) => {
  const s = String(v ?? '').toLowerCase();
  return s === 'am' || s === 'pm' ? s : '';
};

// 予定どおりにできなかった練習(任意)。空欄は「やりきった」
export const STATUS_LABEL = { partial: '途中で中止', skipped: '実施せず' };

// 旧アプリのコンディションの「体調」
export const FEELINGS = [
  { id: 'excellent', label: '絶好調' },
  { id: 'good', label: '好調' },
  { id: 'normal', label: '普通' },
  { id: 'tired', label: '疲労' },
  { id: 'poor', label: '不調' },
];

const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([id, label]) => ({ id, label }));
const MEMO_FIELD = { key: 'memo', label: 'メモ', type: 'textarea', rows: 3, placeholder: 'その日の感想、気づいたこと、痛みなど' };

export const BOATS = [
  { id: '1x', label: 'シングル 1x' },
  { id: '2x', label: 'ダブル 2x' },
  { id: '2-', label: 'ペア 2-' },
  { id: '4x', label: 'クォド 4x' },
  { id: '4-', label: 'フォア 4-' },
  { id: '4+', label: '舵つきフォア 4+' },
  { id: '8+', label: 'エイト 8+' },
  { id: 'other', label: 'その他' },
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

// 艇種の表示名(「シングル 1x」のうち、記録の見出しでは短く「1x」を使う)
export const boatShort = (id) => (BOATS.find((b) => b.id === id) ? id : id || '');

// 旧アプリで「種目を追加」した記録は、名前が残っておらず custom-数字 のIDだけが保存されている
export const exerciseLabel = (id) =>
  EXERCISES.find((x) => x.id === id)?.label ?? (String(id).startsWith('custom-') ? '追加した種目' : id);

// ─── 記録フォーム定義 (入力画面・履歴の表示を共通化) ──
export const KINDS = {
  ergo: {
    table: 'ergoRecords',
    label: 'エルゴ',
    sessionable: true,
    // 数字がなくても、メモ・ねらい・予定があれば保存できる(「腰痛で断念」のような記録)
    requireAny: ['distance', 'time', 'memo', 'planned', 'aim', 'status'],
    menuKeys: ['type', 'distance'],
    menuLabel: (r) =>
      `${labelOf(ERGO_ZONES, r.type)} ${r.intervals?.length ? intervalLabel(r) : r.menuBy === 'time' ? timeMenuLabel(parseTime(r.time) || 0) : `${r.distance}m`}`,
    fields: [
      // 強度は、もう一度タップすると「なし」に戻せる(技術メモだけの記録など)
      { key: 'type', label: '強度ゾーン', type: 'choice', options: ERGO_ZONES, default: 'UT2', optional: true },
      { key: 'distance', label: '距離 (m)', type: 'number', presets: [500, 1000, 2000, 5000, 6000, 10000] },
      { key: 'time', label: '時間(数字だけ入力: 3000 → 30:00.0)', type: 'time', presets: [600, 1200, 1800, 2400, 3600] },
      { key: 'split', label: '平均スプリット(/500m・数字だけ入力: 1463 → 1:46.3)', type: 'time' },
      { key: 'rate', label: 'レート (spm)', type: 'number' },
      { key: 'avgHR', label: '平均心拍(全体)', type: 'number' },
      { key: 'maxHR', label: '最大心拍', type: 'number' },
      { key: 'rpe', label: 'きつさ RPE', type: 'scale', min: 1, max: 10 },
      // レースのとき(強度ゾーンが「レース」)だけ出す
      { key: 'event', label: '大会名', type: 'text', placeholder: '例: 全道予選', showIf: (v) => v.type === 'race' },
      { key: 'result', label: '結果・順位', type: 'text', placeholder: '例: 優勝 / 3位', showIf: (v) => v.type === 'race' },
      MEMO_FIELD,
      // 「さらに記録する」に入れる項目(普段は閉じておく)
      { key: 'status', label: '予定どおりできたか', type: 'choice', options: STATUS_OPTIONS, default: '', optional: true, advanced: true },
      { key: 'planned', label: '予定していたメニュー', type: 'text', placeholder: '例: 20分×3 / UTB2 30×2', advanced: true },
      { key: 'aim', label: 'ねらい・目標', type: 'text', placeholder: '例: 目標2:05。セット早く、上体我慢', advanced: true },
      { key: 'rest', label: 'レスト(インターバルの間)', type: 'text', placeholder: '例: 1分 / r40sec', advanced: true },
      { key: 'videoUrl', label: '動画のURL', type: 'text', placeholder: 'https://…', advanced: true },
    ],
    // スプリットと平均ワットは自動計算。インターバルのワットは区間ごとの時間加重平均を入力画面で計算済み
    prepare: (r) => {
      const split = r.split || calcSplit(r.distance, r.time);
      const sec500 = parseTime(split);
      const watts = r.intervals?.length ? r.watts : sec500 ? Math.round(wattsFromSplit(sec500)) : r.watts;
      return { ...r, split, ...(watts != null && { watts }) };
    },
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
    sessionable: true,
    // セットは入力画面の専用欄(sets: [{weight, reps}, …])。重量・回数が入っていれば保存できる
    requireAny: ['sets', 'memo'],
    fields: [
      { key: 'exercise', label: '種目', type: 'choice', options: EXERCISES, default: 'squat' },
      { key: 'exerciseName', label: '種目名', type: 'text', placeholder: '例: ブルガリアンスクワット', showIf: (v) => v.exercise === 'other' },
      MEMO_FIELD,
      { key: 'videoUrl', label: '動画のURL', type: 'text', placeholder: 'https://…', advanced: true },
    ],
    prepare: (r) => {
      // 推定1RM は、重量のあるセットのうち最大のもの(旧アプリの記録と同じ形 sets: [{weight, reps}])
      const best = Math.max(0, ...(Array.isArray(r.sets) ? r.sets : []).filter((s) => s.weight > 0).map((s) => epley1RM(s.weight, s.reps)));
      return { ...r, estimated1RM: best || null };
    },
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
    sessionable: true,
    requireAny: ['distance', 'time', 'memo', 'planned', 'status'],
    menuKeys: ['type', 'distance'],
    menuLabel: (r) => `${r.type === 'cycling' ? 'バイク' : r.type === 'other' ? 'その他' : 'ラン'} ${r.menuBy === 'time' ? timeMenuLabel(parseTime(r.time) || 0) : `${r.distance}km`}`,
    fields: [
      {
        key: 'type', label: '種類', type: 'choice', default: 'running',
        options: [{ id: 'running', label: 'ランニング' }, { id: 'cycling', label: 'サイクリング' }, { id: 'other', label: 'その他(補強・アクティブレストなど)' }],
      },
      { key: 'distance', label: '距離 (km)', type: 'number', presets: [3, 5, 10, 20] },
      { key: 'time', label: '時間(数字だけ入力: 3000 → 30:00.0)', type: 'time', presets: [1200, 1800, 2400, 3600, 5400, 7200] },
      { key: 'pace', label: '平均ペース(/km・数字だけ入力: 5300 → 5:30.0)', type: 'time' },
      { key: 'avgSpeed', label: '平均速度 (km/h)', type: 'number', step: 0.1 },
      { key: 'avgHR', label: '平均心拍', type: 'number' },
      { key: 'rpe', label: 'きつさ RPE', type: 'scale', min: 1, max: 10 },
      MEMO_FIELD,
      { key: 'status', label: '予定どおりできたか', type: 'choice', options: STATUS_OPTIONS, default: '', optional: true, advanced: true },
      { key: 'planned', label: '予定していたメニュー', type: 'text', placeholder: '例: 25分×2', advanced: true },
      { key: 'videoUrl', label: '動画のURL', type: 'text', placeholder: 'https://…', advanced: true },
    ],
    prepare: (r) => r,
    summary: (r) =>
      [r.type === 'cycling' ? 'バイク' : 'ラン', r.distance && `${r.distance}km`, r.time, r.avgHR && `HR${r.avgHR}`]
        .filter(Boolean).join(' · '),
  },
  condition: {
    table: 'conditionRecords',
    label: 'コンディション',
    // 痛みや違和感のメモだけでも保存できる
    requireAny: ['sleep', 'fatigue', 'restingHR', 'condition', 'memo'],
    fields: [
      { key: 'sleep', label: '睡眠時間 (h)', type: 'number', presets: [5, 6, 7, 8, 9] },
      { key: 'fatigue', label: '疲労度 (1:元気 〜 5:ぐったり)', type: 'scale', min: 1, max: 5 },
      { key: 'condition', label: '体調', type: 'choice', options: FEELINGS, default: '', optional: true },
      { key: 'restingHR', label: '安静時心拍', type: 'number' },
      { key: 'memo', label: 'メモ(痛み・違和感など)', type: 'textarea', rows: 3, placeholder: '例: 腰に違和感。ヒンジ姿勢で少し痛い' },
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

// 水上トレーニング: エルゴと同じ入力に、艇種と技術的な振り返りを足したもの。
// 水上ではエルゴ用のワット換算が当てはまらないので、ワットは計算しない。
{
  const [typeField, ...rest] = KINDS.ergo.fields;
  const memoAt = rest.findIndex((f) => f.key === 'memo');
  const memoField = rest[memoAt];
  const beforeMemo = rest.slice(0, memoAt);
  const afterMemo = rest.slice(memoAt + 1); // 「さらに記録する」の項目
  KINDS.water = {
    ...KINDS.ergo,
    table: 'waterRecords',
    label: '水上',
    requireAny: [...KINDS.ergo.requireAny, 'technique'],
    menuLabel: (r) =>
      [
        boatShort(r.boat),
        labelOf(ERGO_ZONES, r.type),
        r.intervals?.length ? intervalLabel(r) : r.menuBy === 'time' ? timeMenuLabel(parseTime(r.time) || 0) : `${r.distance}m`,
      ].filter(Boolean).join(' '),
    fields: [
      { key: 'boat', label: '艇種', type: 'choice', options: BOATS, default: '' },
      typeField,
      ...beforeMemo,
      {
        key: 'technique',
        label: '技術的な振り返り',
        type: 'textarea',
        placeholder: 'キャッチ、フィニッシュ、リズム、ブレード、クルーの感想、次に意識することなど',
      },
      memoField,
      ...afterMemo,
    ],
    prepare: (r) => ({ ...r, split: r.split || calcSplit(r.distance, r.time) }),
    summary: (r) =>
      [
        boatShort(r.boat),
        labelOf(ERGO_ZONES, r.type),
        r.intervals?.length ? intervalLabel(r) : r.distance && `${r.distance}m`,
        r.time,
        r.split && `@${r.split}/500m`,
        r.avgHR && `HR${r.avgHR}`,
      ].filter(Boolean).join(' · '),
  };
}

// 記録画面・履歴での並び順(エルゴの次に水上)
for (const k of ['ergo', 'water', 'strength', 'cross', 'condition', 'weight', 'nutrition']) {
  const v = KINDS[k];
  delete KINDS[k];
  KINDS[k] = v;
}

// インターバルの表示: 同じ距離なら 1000m×4、違えば 4本 計3500m
export function intervalLabel(r) {
  const n = r.intervals.length;
  if (r.intervalBy === 'time') {
    const secs = r.intervals.map((p) => parseTime(p.time));
    const ts = [...new Set(secs.map((s) => (s ? Math.round(s * 10) : 0)))];
    if (ts.length === 1 && ts[0] > 0) return `${timeMenuLabel(ts[0] / 10)}×${n}`;
    return r.time ? `${n}本 計${r.time}` : `${n}本`;
  }
  const ds = [...new Set(r.intervals.map((p) => p.distance))];
  if (ds.length === 1 && ds[0] > 0) return `${ds[0]}m×${n}`;
  return r.distance ? `${n}本 計${r.distance}m` : `${n}本`;
}

// 秒数を「4分」「1分30秒」「30秒」の形に
export function timeMenuLabel(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m ? `${m}分` : ''}${s ? `${s}秒` : ''}` || '0秒';
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

// ストローク/分としてありえない値(入力ミス)は捨てる
const saneRate = (v) => {
  const n = num(v);
  return n > 0 && n <= 80 ? n : undefined;
};

export function normalizeRecord(kind, r) {
  switch (kind) {
    case 'ergo':
    case 'water': {
      // 区間は、距離・時間・スプリットのどれか1つでもあれば残す。足りない分は、分かるものから計算する
      // (旧アプリの時間メニューは、距離が空で、時間とスプリットだけが入っている)
      const raw = Array.isArray(r.intervals) ? r.intervals : [];
      const intervals = raw
        .map((p) => {
          const sec = looseDuration(p.time);
          const splitSec = parseTime(p.split);
          let distance = num(p.distance);
          let time = sec > 0 ? formatTime(sec) : undefined;
          if (!(distance > 0) && sec > 0 && splitSec > 0) distance = Math.round((sec / splitSec) * 500);
          if (!time && distance > 0 && splitSec > 0) time = formatTime((splitSec * distance) / 500);
          return { ...p, distance: distance > 0 ? distance : undefined, time, split: splitSec > 0 ? normalizeTime(p.split) : undefined, rate: saneRate(p.rate) };
        })
        .filter((p) => p.distance || p.time || p.split);
      // 全区間の距離が空なら、時間メニュー
      const inferredBy = raw.length && raw.every((p) => !(num(p.distance) > 0)) ? 'time' : undefined;
      return {
        ...r,
        distance: num(r.distance),
        watts: num(r.watts),
        rate: saneRate(r.rate),
        rpe: num(r.rpe),
        avgHR: num(r.avgHR ?? r.hr),
        maxHR: num(r.maxHR),
        intervals: intervals.length ? intervals : undefined,
        intervalBy: r.intervalBy ?? inferredBy,
      };
    }
    case 'strength': {
      // 種目名が決まっていない「その他」は、メモの1行目を種目名として使う(旧データではメモに種目名だけが入っている)
      const named = r.exercise === 'other' && !r.exerciseName && typeof r.memo === 'string' && r.memo.trim()
        ? { exerciseName: r.memo.trim().split('\n')[0], nameFromMemo: true }
        : {};
      // 旧形式: 1種目1行で sets: [{weight, reps}, ...]
      if (!Array.isArray(r.sets)) return { ...r, ...named, weight: num(r.weight), reps: num(r.reps), sets: num(r.sets) };
      const list = r.sets.filter((s) => s && Number(s.reps) > 0).map((s) => ({ weight: num(s.weight) || 0, reps: Number(s.reps) }));
      if (!list.length) return { ...r, ...named, sets: 1, setList: [], estimated1RM: null };
      const top = list.reduce((b, s) => (s.weight > b.weight ? s : b), list[0]);
      const best1RM = Math.max(0, ...list.filter((s) => s.weight > 0).map((s) => epley1RM(s.weight, s.reps)));
      return { ...r, ...named, setList: list, weight: top.weight || undefined, reps: top.reps, sets: list.length, estimated1RM: best1RM || null };
    }
    case 'cross': {
      // 旧アプリ・手入力の種類: bike → サイクリング。時間は「10+5」(分の足し算)なども読む
      const type = r.type === 'bike' ? 'cycling' : r.type;
      const sec = looseDuration(r.time);
      const plus = r.time && String(r.time).includes('+') ? { timeText: String(r.time) } : {};
      return { ...r, ...plus, type, distance: num(r.distance), avgHR: num(r.avgHR), ...(sec > 0 && { time: formatTime(sec) }) };
    }
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
