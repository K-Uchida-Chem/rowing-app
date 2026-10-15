// 週の計算。日付は "YYYY-MM-DD" の文字列で扱い、計算はすべて UTC の暦で行う
// (実行する端末のタイムゾーンに左右されないようにするため)。

/** 週の開始曜日。0=日曜, 1=月曜。日曜始まりにしたいときは、ここだけ変える。 */
export const WEEK_START = 1;

/** 「今日」を決めるタイムゾーン */
export const TIMEZONE = 'Asia/Tokyo';

export const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 指定のタイムゾーンでの今日の日付。
 * @param {Date} [now]
 * @param {string} [tz]
 * @returns {string}
 */
export function todayInTz(now = new Date(), tz = TIMEZONE) {
  // en-CA は YYYY-MM-DD の形で返る
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** @param {string} dateStr @returns {number} UTC の 0時 のミリ秒 */
const toUtcMs = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** @param {number} ms @returns {string} */
const fromUtcMs = (ms) => {
  const d = new Date(ms);
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/**
 * @param {string} dateStr
 * @param {number} n 日数(負も可)
 * @returns {string}
 */
export function addDays(dateStr, n) {
  return fromUtcMs(toUtcMs(dateStr) + n * 86400000);
}

/** @param {string} dateStr @returns {number} 0=日 … 6=土 */
export function dayOfWeek(dateStr) {
  return new Date(toUtcMs(dateStr)).getUTCDay();
}

/**
 * その日を含む週の開始日。
 * @param {string} dateStr
 * @param {number} [weekStart]
 * @returns {string}
 */
export function weekStartOf(dateStr, weekStart = WEEK_START) {
  const back = (dayOfWeek(dateStr) - weekStart + 7) % 7;
  return addDays(dateStr, -back);
}

/**
 * 週の7日分の日付。
 * @param {string} startStr 週の開始日
 * @returns {string[]}
 */
export function weekDates(startStr) {
  return Array.from({ length: 7 }, (_, i) => addDays(startStr, i));
}

/** @param {string} dateStr 例 "2026-10-12" → "10/12" */
export function formatMD(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}`;
}

/**
 * 2つの日付の差(日数)。b - a。
 * @param {string} a
 * @param {string} b
 */
export function diffDays(a, b) {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86400000);
}
