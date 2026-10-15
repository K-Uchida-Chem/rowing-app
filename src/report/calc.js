// 週次レポートの集計。画面にも DB にも依存しない純粋関数だけを置く(テストしやすくするため)。
import { addDays, dayOfWeek, weekDates, DOW_LABELS, TIMEZONE } from './week.js';

/** 練習の記録 1 件。useEntries の { kind, ...record } と同じ形。 @typedef {Record<string, any> & { kind: string, date: string }} Entry */

/**
 * 表示名を引く関数(画面側の定義を渡す。テストでは簡単なものを渡す)
 * @typedef {{ exerciseLabel: (id: string) => string, zoneLabel: (id: string) => string, boatLabel: (id: string) => string }} Labels
 */

export const AEROBIC_KINDS = ['ergo', 'water', 'cross'];
export const TRAINING_KINDS = [...AEROBIC_KINDS, 'strength'];
/** メニューの並び順: エルゴ → 水上 → その他の有酸素 → 筋トレ */
const KIND_ORDER = ['ergo', 'water', 'cross', 'strength'];
/** 強度区分の並び順。未入力は最後の「未分類」 */
export const ZONE_ORDER = ['UT2', 'UT1', 'AT', 'TR', 'AN', '2kTT', 'other'];
export const UNCLASSIFIED = 'unclassified';

/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const sum = (/** @type {number[]} */ a) => a.reduce((s, x) => s + x, 0);
const mean = (/** @type {number[]} */ a) => (a.length ? sum(a) / a.length : null);

// ─── 時間の読み取り ────────────────────────────────────

/**
 * "1:44.3" / "30:00" / "1:02:03" → 秒。読めなければ null。
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseClock(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const parts = String(value).trim().split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

// ─── スプリット ────────────────────────────────────────

/**
 * 平均スプリット(500mあたりの秒数)。スプリットの単純平均ではなく、「合計時間 ÷ 合計距離 × 500」で出す。
 * 距離が違う区間のスプリットを単純平均すると、実際のペースとずれるため。
 * @param {number | null | undefined} seconds 合計時間(秒)
 * @param {number | null | undefined} meters 合計距離(m)
 * @returns {number | null}
 */
export function avgSplitSec(seconds, meters) {
  if (!isNum(seconds) || !isNum(meters) || seconds <= 0 || meters <= 0) return null;
  return (seconds / meters) * 500;
}

// ─── 体重 ──────────────────────────────────────────────

/**
 * 日ごとの体重。1日に複数回測っていれば、その平均。
 * 3. の曜日見出しと 2. のグラフは、必ずこの結果を使う(体重を二重管理しない)。
 * @param {Entry[]} entries
 * @returns {Map<string, number>}
 */
export function dailyWeightMap(entries) {
  /** @type {Map<string, number[]>} */
  const byDate = new Map();
  for (const e of entries) {
    if (e.kind !== 'weight' || !isNum(e.weight) || e.weight <= 0) continue;
    byDate.set(e.date, [...(byDate.get(e.date) ?? []), e.weight]);
  }
  /** @type {Map<string, number>} */
  const out = new Map();
  for (const [date, values] of byDate) out.set(date, /** @type {number} */ (mean(values)));
  return out;
}

/**
 * 移動平均。その日を終点とする window 日の中で、測定のある日だけで平均する。
 * 窓の中に測定が1日もなければ null。
 * @param {Map<string, number>} daily
 * @param {string} date
 * @param {number} [window]
 * @returns {number | null}
 */
export function movingAverageAt(daily, date, window = 7) {
  /** @type {number[]} */
  const values = [];
  for (let i = 0; i < window; i++) {
    const v = daily.get(addDays(date, -i));
    if (v !== undefined) values.push(v);
  }
  return mean(values);
}

/**
 * グラフ用の系列。from〜to の全日付について、日々の値(測定なしは null)と移動平均を返す。
 * @param {Map<string, number>} daily
 * @param {string} from
 * @param {string} to
 * @param {number} [window]
 */
export function weightSeries(daily, from, to, window = 7) {
  /** @type {string[]} */
  const dates = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  return {
    dates,
    daily: dates.map((d) => daily.get(d) ?? null),
    average: dates.map((d) => movingAverageAt(daily, d, window)),
  };
}

/**
 * 今週の体重の統計。先週との差は、両方に測定があるときだけ出す。
 * @param {Map<string, number>} daily
 * @param {string[]} dates 今週の日付
 * @param {string[]} prevDates 先週の日付
 */
export function weightWeekStats(daily, dates, prevDates) {
  const pick = (/** @type {string[]} */ ds) => ds.map((d) => daily.get(d)).filter(isNum);
  const cur = pick(dates);
  const prev = pick(prevDates);
  const avg = mean(cur);
  const prevAvg = mean(prev);
  return {
    count: cur.length,
    average: avg,
    previousAverage: prevAvg,
    diff: avg !== null && prevAvg !== null ? avg - prevAvg : null,
    min: cur.length ? Math.min(...cur) : null,
    max: cur.length ? Math.max(...cur) : null,
  };
}

// ─── 筋トレ ────────────────────────────────────────────

/**
 * 推定1RM(Epley式): 重量 × (1 + 回数 / 30)
 * @param {number} weight
 * @param {number} reps
 */
export const epley = (weight, reps) => weight * (1 + reps / 30);

/**
 * 1つの記録を、1セットずつに広げる。旧アプリの「セットごとの記録」(setList)にも対応。
 * @param {Entry} rec
 * @returns {{ weight: number, reps: number }[]}
 */
export function expandSets(rec) {
  if (Array.isArray(rec.setList) && rec.setList.length) {
    return rec.setList
      .filter((/** @type {any} */ s) => s && Number(s.reps) > 0)
      .map((/** @type {any} */ s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) }));
  }
  const reps = Number(rec.reps);
  if (!(reps > 0)) return [];
  const n = Number(rec.sets) > 0 ? Math.floor(Number(rec.sets)) : 1;
  return Array.from({ length: n }, () => ({ weight: Number(rec.weight) || 0, reps }));
}

/**
 * 同じ重量・回数が連続するセットを詰める。
 * @param {{ weight: number, reps: number }[]} sets
 * @returns {{ weight: number, reps: number, count: number }[]}
 */
export function compressSets(sets) {
  /** @type {{ weight: number, reps: number, count: number }[]} */
  const groups = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.weight === s.weight && last.reps === s.reps) last.count += 1;
    else groups.push({ ...s, count: 1 });
  }
  return groups;
}

/** 重量の表記: 60 → "60kg"、62.5 → "62.5kg"、0 → "自重" @param {number} w */
const weightText = (w) => (w > 0 ? `${Number.isInteger(w) ? w : w.toFixed(1)}kg` : '自重');

/**
 * 1種目ぶんの要約。例: "60kg×10×3, 70kg×8" / 総挙上量 / 推定1RMの最大
 * @param {{ weight: number, reps: number }[]} sets
 */
export function summarizeStrength(sets) {
  const groups = compressSets(sets);
  const text = groups.map((g) => `${weightText(g.weight)}×${g.reps}${g.count > 1 ? `×${g.count}` : ''}`).join(', ');
  const weighted = sets.filter((s) => s.weight > 0);
  return {
    text,
    volume: sum(sets.map((s) => s.weight * s.reps)),
    totalReps: sum(sets.map((s) => s.reps)),
    e1rm: weighted.length ? Math.max(...weighted.map((s) => epley(s.weight, s.reps))) : null,
  };
}

// ─── 有酸素 ────────────────────────────────────────────

/** 秒数を「4分」「1分30秒」に @param {number} sec */
export function timeMenuName(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m ? `${m}分` : ''}${s ? `${s}秒` : ''}` || '0秒';
}

/**
 * 時間帯。記録に午前/午後があればそれ、なければヘルスケアの開始時刻から。どちらもなければ null。
 * 旧アプリの記録は 'AM' / 'PM' で入っている。
 * @param {Entry} e
 * @param {Map<string, { start?: string }>} [workouts] ヘルスケアのワークアウト(id → …)
 * @returns {'am' | 'pm' | null}
 */
export function sessionOf(e, workouts) {
  const s = String(e.session ?? '').toLowerCase();
  if (s === 'am' || s === 'pm') return s;
  const start = e.workoutId !== undefined ? workouts?.get(String(e.workoutId))?.start : undefined;
  if (start) {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', hour12: false }).format(new Date(start)));
    if (Number.isFinite(hour)) return hour < 12 ? 'am' : 'pm';
  }
  return null;
}

/**
 * エルゴ・水上・ラン/バイクの1メニューを、表示用の1行に。
 * @param {Entry} e
 * @param {Labels} labels
 */
export function aerobicRow(e, labels) {
  if (e.kind === 'cross') {
    const km = isNum(e.distance) ? e.distance : null;
    const meters = km !== null ? km * 1000 : null;
    const seconds = parseClock(e.time);
    const running = e.type !== 'cycling';
    const paceSecPerKm = running && km && seconds ? seconds / km : null;
    const speedKmh = !running && km && seconds ? km / (seconds / 3600) : null;
    return {
      kind: 'cross', id: e.id, name: running ? 'ラン' : 'バイク', distance: meters, seconds,
      split: null, rate: null, hr: isNum(e.avgHR) ? e.avgHR : null, boat: '', splits: /** @type {number[]} */ ([]),
      paceSecPerKm, speedKmh, zone: '',
    };
  }

  const pieces = Array.isArray(e.intervals) ? e.intervals : [];
  /** @type {(number | null)[]} */
  const pieceSecs = pieces.map((/** @type {any} */ p) => parseClock(p.time));
  const hasPieces = pieces.length > 0 && pieceSecs.every(isNum);
  const secs = /** @type {number[]} */ (hasPieces ? pieceSecs : []); // hasPieces のときだけ、すべて数値
  const distance = hasPieces ? sum(pieces.map((/** @type {any} */ p) => Number(p.distance) || 0)) : isNum(e.distance) ? e.distance : null;
  const seconds = hasPieces ? sum(secs) : parseClock(e.time);

  // セットごとのスプリット。保存してあるスプリットがなければ、距離とタイムから出す
  const splits = hasPieces
    ? pieces.map((/** @type {any} */ p, /** @type {number} */ i) => parseClock(p.split) ?? avgSplitSec(secs[i], Number(p.distance)) ?? NaN).filter(isNum)
    : [];

  // 平均レート: 保存してある値。なければ、区間のレートを時間で重み付けして出す
  let rate = isNum(e.rate) ? e.rate : null;
  if (rate === null && hasPieces) {
    const rated = pieces.map((/** @type {any} */ p, /** @type {number} */ i) => ({ r: Number(p.rate), t: secs[i] })).filter((x) => x.r > 0);
    const total = sum(rated.map((x) => x.t));
    rate = total ? sum(rated.map((x) => x.r * x.t)) / total : null;
  }

  // 種目名: 「4×2000m」「2000m TT」「UT2 8000m」のように
  const timeMenu = hasPieces ? e.intervalBy === 'time' : e.menuBy === 'time';
  const unit = (/** @type {number | null} */ m, /** @type {number | null} */ s) => (timeMenu ? timeMenuName(s ?? 0) : `${Math.round(m ?? 0)}m`);
  const menu = hasPieces
    ? `${pieces.length}×${unit(Number(pieces[0].distance), secs[0])}`
    : unit(distance, seconds);
  const zoneId = typeof e.type === 'string' ? e.type : '';
  const zoneText = zoneId === '2kTT' ? 'TT' : zoneId && zoneId !== 'other' ? labels.zoneLabel(zoneId) : '';
  const name = e.kind === 'water' ? [zoneText, menu].filter(Boolean).join(' ') : [menu, zoneText].filter(Boolean).join(' ');

  return {
    kind: e.kind, id: e.id, name, distance, seconds,
    split: avgSplitSec(seconds, distance), rate, hr: isNum(e.avgHR) ? e.avgHR : null,
    boat: e.boat ? labels.boatLabel(e.boat) : '', splits,
    paceSecPerKm: null, speedKmh: null, zone: zoneId || UNCLASSIFIED,
  };
}

// ─── 1日・1週間 ────────────────────────────────────────

/**
 * 予定メニュー(週間メニュー)の文字列。なければ null。
 * @param {{ ergoType?: string, strengthDay?: string, description?: string } | undefined} row
 * @returns {string | null}
 */
export function plannedText(row) {
  if (!row) return null;
  const parts = [
    row.ergoType && row.ergoType !== 'none' ? `エルゴ ${row.ergoType}` : '',
    row.strengthDay && row.strengthDay !== 'none' ? `筋トレ ${row.strengthDay}` : '',
    row.description ?? '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * 1日ぶんの練習を、時間帯ごとのまとまりにする。
 * @param {Entry[]} items その日の練習(有酸素と筋トレ)
 * @param {Labels} labels
 * @param {Map<string, { start?: string }>} [workouts]
 */
function buildSessions(items, labels, workouts) {
  /** @type {Map<string, Entry[]>} */
  const byKey = new Map();
  for (const e of items) {
    const key = sessionOf(e, workouts) ?? '';
    byKey.set(key, [...(byKey.get(key) ?? []), e]);
  }
  const order = ['am', 'pm', ''];
  const sessions = order
    .filter((k) => byKey.has(k))
    .map((key) => {
      const list = /** @type {Entry[]} */ (byKey.get(key));
      const sortByKind = (/** @type {Entry} */ a, /** @type {Entry} */ b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || (a.id ?? 0) - (b.id ?? 0);
      const aerobic = list.filter((e) => AEROBIC_KINDS.includes(e.kind)).sort(sortByKind).map((e) => aerobicRow(e, labels));

      // 筋トレは、種目ごとに1行(同じ種目を何度か記録していれば、1行にまとめる)
      /** @type {Map<string, { weight: number, reps: number }[]>} */
      const byExercise = new Map();
      for (const e of list.filter((x) => x.kind === 'strength').sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) {
        const id = String(e.exercise ?? '');
        byExercise.set(id, [...(byExercise.get(id) ?? []), ...expandSets(e)]);
      }
      const strength = [...byExercise].map(([id, sets]) => ({ name: labels.exerciseLabel(id), ...summarizeStrength(sets) }));
      return { key, aerobic, strength };
    });
  return sessions;
}

/**
 * 集計の対象にする1週間ぶんのまとめ(総距離・時間・回数・休養日数)。
 * @param {Entry[]} entries
 * @param {string[]} dates その週の日付
 * @param {string | null} today 今日。これ以降の日は休養日に数えない
 * @param {Map<string, { start?: string }>} [workouts]
 */
export function summarizeWeek(entries, dates, today, workouts) {
  const set = new Set(dates);
  const week = entries.filter((e) => set.has(e.date) && TRAINING_KINDS.includes(e.kind));
  const aerobic = week.filter((e) => AEROBIC_KINDS.includes(e.kind));
  const rows = aerobic.map((e) => aerobicRow(e, { exerciseLabel: String, zoneLabel: String, boatLabel: String }));
  const distanceOf = (/** @type {string} */ kind) => sum(rows.filter((r) => r.kind === kind).map((r) => r.distance ?? 0));

  // 練習回数: 同じ日の同じ時間帯は1回と数える(時間帯がわからない記録は、その日で1回)
  const sessions = new Set(week.map((e) => `${e.date}|${sessionOf(e, workouts) ?? ''}`));
  const trainedDates = new Set(week.map((e) => e.date));
  const restDays = dates.filter((d) => (today === null || d < today) && !trainedDates.has(d)).length;

  return {
    distance: { total: distanceOf('ergo') + distanceOf('water') + distanceOf('cross'), ergo: distanceOf('ergo'), water: distanceOf('water'), cross: distanceOf('cross') },
    seconds: sum(rows.map((r) => r.seconds ?? 0)),
    count: sessions.size,
    restDays,
  };
}

/**
 * 強度区分ごとの練習量(エルゴと水上)。区分が未入力のものは「未分類」。
 * @param {Entry[]} entries
 * @param {string[]} dates
 */
export function intensityBreakdown(entries, dates) {
  const set = new Set(dates);
  /** @type {Map<string, { distance: number, seconds: number }>} */
  const acc = new Map();
  for (const e of entries) {
    if (!set.has(e.date) || (e.kind !== 'ergo' && e.kind !== 'water')) continue;
    const row = aerobicRow(e, { exerciseLabel: String, zoneLabel: String, boatLabel: String });
    const zone = ZONE_ORDER.includes(row.zone) ? row.zone : row.zone === UNCLASSIFIED ? UNCLASSIFIED : 'other';
    const cur = acc.get(zone) ?? { distance: 0, seconds: 0 };
    acc.set(zone, { distance: cur.distance + (row.distance ?? 0), seconds: cur.seconds + (row.seconds ?? 0) });
  }
  const totalSeconds = sum([...acc.values()].map((v) => v.seconds));
  const totalDistance = sum([...acc.values()].map((v) => v.distance));
  const rows = [...ZONE_ORDER, UNCLASSIFIED]
    .filter((z) => acc.has(z))
    .map((zone) => {
      const v = /** @type {{ distance: number, seconds: number }} */ (acc.get(zone));
      // 割合は時間で。時間が1つも入っていないときだけ、距離で
      const share = totalSeconds > 0 ? v.seconds / totalSeconds : totalDistance > 0 ? v.distance / totalDistance : 0;
      return { zone, distance: v.distance, seconds: v.seconds, share };
    });
  return { rows, totalSeconds, totalDistance };
}

/**
 * 主観データ(睡眠・疲労・安静時心拍)の週平均。1件もなければ null。
 * @param {Entry[]} entries
 * @param {string[]} dates
 */
export function conditionAverages(entries, dates) {
  const set = new Set(dates);
  const list = entries.filter((e) => e.kind === 'condition' && set.has(e.date));
  if (!list.length) return null;
  const avgOf = (/** @type {string} */ key) => mean(list.map((e) => e[key]).filter(isNum));
  return { days: new Set(list.map((e) => e.date)).size, sleep: avgOf('sleep'), fatigue: avgOf('fatigue'), restingHR: avgOf('restingHR') };
}

/**
 * 週次レポート全体を組み立てる。
 * @param {{
 *   entries: Entry[],
 *   weekStart: string,
 *   today: string,
 *   labels: Labels,
 *   schedule?: { dayOfWeek: number, ergoType?: string, strengthDay?: string, description?: string }[],
 *   workouts?: Map<string, { start?: string }>,
 *   weights?: Map<string, number>,
 * }} input
 */
export function buildWeekReport({ entries, weekStart, today, labels, schedule = [], workouts, weights }) {
  const dates = weekDates(weekStart);
  const prevDates = weekDates(addDays(weekStart, -7));
  const weightMap = weights ?? dailyWeightMap(entries);

  const days = dates.map((date) => {
    const items = entries.filter((e) => e.date === date && TRAINING_KINDS.includes(e.kind));
    const sessions = buildSessions(items, labels, workouts);
    const rows = sessions.flatMap((s) => s.aerobic);
    const dow = dayOfWeek(date);
    const isFuture = date > today;
    const isToday = date === today;
    const hasTraining = items.length > 0;
    const planned = plannedText(schedule.find((s) => s.dayOfWeek === dow));
    return {
      date, dow, label: DOW_LABELS[dow], isToday, isFuture,
      isRest: !isFuture && !isToday && !hasTraining, // 今日は、まだ記録がなくても「休養」とは決めない
      planned: (isFuture || (isToday && !hasTraining)) ? planned : null,
      weight: weightMap.get(date) ?? null,
      distance: sum(rows.map((r) => r.distance ?? 0)),
      seconds: sum(rows.map((r) => r.seconds ?? 0)),
      hasTraining,
      showSessionLabels: sessions.length > 1,
      sessions,
    };
  });

  const summary = summarizeWeek(entries, dates, today, workouts);
  const previous = summarizeWeek(entries, prevDates, null, workouts);
  const delta = {
    distance: summary.distance.total - previous.distance.total,
    seconds: summary.seconds - previous.seconds,
    count: summary.count - previous.count,
    restDays: summary.restDays - previous.restDays,
  };

  return {
    start: weekStart, end: dates[6], days, summary, previous, delta,
    intensity: intensityBreakdown(entries, dates),
    condition: conditionAverages(entries, dates),
    weight: weightWeekStats(weightMap, dates, prevDates),
  };
}
