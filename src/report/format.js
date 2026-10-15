// 表示用の整形関数。週次レポートの全部品はここを使う(書式をここ1か所に揃えるため)。

const DASH = '—';

/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * スプリット(500mあたりの秒数)を m:ss.s で表す。例: 104.3 → "1:44.3"
 * @param {number|null|undefined} sec
 */
export function formatSplit(sec) {
  if (!isNum(sec) || sec <= 0) return DASH;
  const tenths = Math.round(sec * 10); // 59.96 → 600 のように繰り上がりを正しく扱う
  const m = Math.floor(tenths / 600);
  const s = (tenths % 600) / 10;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

/**
 * 時間を、1時間未満は m:ss、1時間以上は h:mm:ss で表す。秒未満は四捨五入。
 * @param {number|null|undefined} sec
 */
export function formatDuration(sec) {
  if (!isNum(sec) || sec < 0) return DASH;
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * 距離(m)を、1000m以上は km(小数第1位)、未満は m で表す。
 * @param {number|null|undefined} meters
 */
export function formatDistance(meters) {
  if (!isNum(meters) || meters < 0) return DASH;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

/**
 * 増減を、符号つきで表す(0 は ±0)。差分の小さな併記に使う。
 * @param {number|null|undefined} diff
 * @param {(abs: number) => string} fmt 絶対値を整形する関数
 */
export function formatDelta(diff, fmt) {
  if (!isNum(diff)) return '';
  if (Math.abs(diff) < 1e-9) return `±${fmt(0)}`;
  return `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))}`;
}

/**
 * 体重など小数1桁の数値。
 * @param {number|null|undefined} v
 */
export function formatKg(v) {
  return isNum(v) ? `${v.toFixed(1)}kg` : DASH;
}

export { DASH };
