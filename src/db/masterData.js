/**
 * マスターデータ — 心拍ゾーン、種目定義、Dayプリセット
 *
 * アプリ全体で参照する定数データ。
 * ユーザーが将来カスタマイズできるよう、設定画面から上書き可能にする想定。
 */

// ─── 心拍・強度ゾーンマスター（FISA / 仏式） ─────────────

export const HEART_RATE_ZONES = [
  {
    fisa: 'UT2',
    french: 'B1',
    hrMin: 130,
    hrMax: 150,
    rateMin: 16,
    rateMax: 20,
    splitMin: '2:00',
    splitMax: '2:06',
    wattMin: 175,
    wattMax: 200,
    color: '#4FC3F7',      // Light blue
    description: '基礎持久力向上・60〜90分ロング',
    menus: ['60min steady', '90min long', '45min recovery'],
  },
  {
    fisa: 'UT1',
    french: 'B2',
    hrMin: 150,
    hrMax: 160,
    rateMin: 20,
    rateMax: 24,
    splitMin: '1:54',
    splitMax: '1:58',
    wattMin: 210,
    wattMax: 235,
    color: '#66BB6A',      // Green
    description: '乳酸代謝改善・20分×2',
    menus: ['20min × 2', '30min tempo', '4000m × 2'],
  },
  {
    fisa: 'AT',
    french: 'B3',
    hrMin: 160,
    hrMax: 170,
    rateMin: 24,
    rateMax: 28,
    splitMin: '1:49',
    splitMax: '1:52',
    wattMin: 250,
    wattMax: 275,
    color: '#FFA726',      // Orange
    description: 'LT値向上・10分×3、3000m×2',
    menus: ['10min × 3', '3000m × 2', '8min × 4'],
  },
  {
    fisa: 'TR',
    french: 'B4',
    hrMin: 170,
    hrMax: 190,
    rateMin: 30,
    rateMax: 34,
    splitMin: '1:44',
    splitMax: '1:47',
    wattMin: 295,
    wattMax: 325,
    color: '#EF5350',      // Red
    description: 'VO2Max向上・1000m×4',
    menus: ['1000m × 4', '500m × 6', '2000m × 2'],
  },
  {
    fisa: 'AN',
    french: 'B5/B6',
    hrMin: 190,
    hrMax: 200,
    rateMin: 36,
    rateMax: null,
    splitMin: null,
    splitMax: '1:43',
    wattMin: 330,
    wattMax: null,
    color: '#AB47BC',      // Purple
    description: '最大スプリント・250m×8',
    menus: ['250m × 8', '500m × 4', '100m × 10'],
  },
];

// ─── 筋トレ種目定義 ─────────────────────────────────────

export const STRENGTH_EXERCISES = {
  // BIG 3
  squat: {
    id: 'squat',
    name: 'スクワット',
    nameEn: 'Back Squat',
    category: 'big3',
    muscleGroup: 'legs',
    isBig3: true,
  },
  bench: {
    id: 'bench',
    name: 'ベンチプレス',
    nameEn: 'Bench Press',
    category: 'big3',
    muscleGroup: 'chest',
    isBig3: true,
  },
  deadlift: {
    id: 'deadlift',
    name: 'デッドリフト',
    nameEn: 'Deadlift',
    category: 'big3',
    muscleGroup: 'back',
    isBig3: true,
  },

  // Supplementary – Lower Body
  frontSquat: {
    id: 'frontSquat',
    name: 'フロントスクワット',
    nameEn: 'Front Squat',
    category: 'supplementary',
    muscleGroup: 'legs',
  },
  romanianDL: {
    id: 'romanianDL',
    name: 'ルーマニアンデッドリフト',
    nameEn: 'Romanian Deadlift',
    category: 'supplementary',
    muscleGroup: 'posterior',
  },
  legPress: {
    id: 'legPress',
    name: 'レッグプレス',
    nameEn: 'Leg Press',
    category: 'supplementary',
    muscleGroup: 'legs',
  },

  // Supplementary – Upper Body Pull
  bentOverRow: {
    id: 'bentOverRow',
    name: 'ベントオーバーロウ',
    nameEn: 'Bent Over Row',
    category: 'supplementary',
    muscleGroup: 'back',
  },
  pullUp: {
    id: 'pullUp',
    name: '懸垂（チンアップ）',
    nameEn: 'Pull-up / Chin-up',
    category: 'supplementary',
    muscleGroup: 'back',
  },

  // Power
  powerClean: {
    id: 'powerClean',
    name: 'パワークリーン',
    nameEn: 'Power Clean',
    category: 'power',
    muscleGroup: 'full',
  },
  hangClean: {
    id: 'hangClean',
    name: 'ハングクリーン',
    nameEn: 'Hang Clean',
    category: 'power',
    muscleGroup: 'full',
  },

  // Core
  abRoller: {
    id: 'abRoller',
    name: 'アブローラー',
    nameEn: 'Ab Roller',
    category: 'core',
    muscleGroup: 'core',
  },
  sideBend: {
    id: 'sideBend',
    name: 'ダンベルサイドベント',
    nameEn: 'Dumbbell Side Bend',
    category: 'core',
    muscleGroup: 'core',
  },
  russianTwist: {
    id: 'russianTwist',
    name: '加重ロシアンツイスト',
    nameEn: 'Weighted Russian Twist',
    category: 'core',
    muscleGroup: 'core',
  },
};

// ─── Day プリセット（3分割ルーティン） ───────────────────

export const DAY_PRESETS = {
  1: {
    label: 'Day 1 — SQ系',
    description: 'スクワット中心 + 下半身補助',
    exercises: ['squat', 'frontSquat', 'legPress', 'abRoller'],
    color: '#4FC3F7',
  },
  2: {
    label: 'Day 2 — ヒンジ重め',
    description: 'デッドリフト中心 + プル系',
    exercises: ['deadlift', 'bentOverRow', 'pullUp', 'russianTwist'],
    color: '#FFA726',
  },
  3: {
    label: 'Day 3 — 補助 + ヒンジ軽め',
    description: 'ベンチ + ルーマニアンDL + 体幹',
    exercises: ['bench', 'romanianDL', 'sideBend', 'abRoller'],
    color: '#66BB6A',
  },
};

// ─── ピリオダイゼーション定義 ────────────────────────────

export const PERIODIZATION_PHASES = {
  hypertrophy: {
    id: 'hypertrophy',
    name: '筋肥大期',
    nameEn: 'Hypertrophy',
    intensityRange: '65-75%',
    repsRange: '8-12',
    color: '#66BB6A',
  },
  maxStrength: {
    id: 'maxStrength',
    name: '最大筋力期',
    nameEn: 'Max Strength',
    intensityRange: '80-90%',
    repsRange: '3-5',
    color: '#EF5350',
  },
  power: {
    id: 'power',
    name: '筋パワー期',
    nameEn: 'Power',
    intensityRange: '80-85%',
    repsRange: '3',
    color: '#AB47BC',
  },
};

// ─── 栄養目標デフォルト ─────────────────────────────────

export const NUTRITION_TARGETS = {
  calories: 4000,
  protein: 180,    // grams
  fat: 110,        // grams
  carbs: 520,      // grams
};

// ─── 天候オプション ─────────────────────────────────────

export const WEATHER_OPTIONS = [
  { id: 'sunny', label: '晴れ', emoji: '☀️', canRow: true },
  { id: 'cloudy', label: '曇り', emoji: '☁️', canRow: true },
  { id: 'rainy', label: '雨', emoji: '🌧️', canRow: false },
  { id: 'stormy', label: '荒天', emoji: '⛈️', canRow: false },
  { id: 'snowy', label: '雪', emoji: '❄️', canRow: false },
  { id: 'windy', label: '強風', emoji: '💨', canRow: false },
];

// ─── コンディションオプション ───────────────────────────

export const CONDITION_OPTIONS = [
  { id: 'excellent', label: '絶好調', emoji: '🔥', value: 5 },
  { id: 'good', label: '好調', emoji: '💪', value: 4 },
  { id: 'normal', label: '普通', emoji: '😐', value: 3 },
  { id: 'tired', label: '疲労', emoji: '😓', value: 2 },
  { id: 'poor', label: '不調', emoji: '🤕', value: 1 },
];

// ─── RPEスケール ────────────────────────────────────────

export const RPE_SCALE = [
  { value: 1, label: '非常に楽', color: '#4FC3F7' },
  { value: 2, label: '楽', color: '#4FC3F7' },
  { value: 3, label: 'やや楽', color: '#66BB6A' },
  { value: 4, label: 'ちょうど良い', color: '#66BB6A' },
  { value: 5, label: 'ややきつい', color: '#FFA726' },
  { value: 6, label: 'きつい', color: '#FFA726' },
  { value: 7, label: 'かなりきつい', color: '#FF7043' },
  { value: 8, label: '非常にきつい', color: '#EF5350' },
  { value: 9, label: '極めてきつい', color: '#E53935' },
  { value: 10, label: '限界', color: '#B71C1C' },
];
