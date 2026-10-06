// 集計・判定ロジック(画面に依存しない)
import db from './db.js';
import {
  ERGO_ZONES, EXERCISES, GOAL_TYPES, exerciseLabel, normalizeRecord, parseTime, formatTime, toDateStr, today, weekStart, formatDate,
} from './lib.js';

export const PB_DISTANCES = [2000, 5000, 6000, 10000];
const BIG3 = EXERCISES.filter((x) => x.big3);

const sum = (a) => a.reduce((s, x) => s + x, 0);
const avg = (a) => (a.length ? sum(a) / a.length : null);
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export const minutesOf = (e) => (parseTime(e.time) ? parseTime(e.time) / 60 : null);

// 直近 n 週の週開始日(古い順)
export function lastWeekStarts(n) {
  const out = [];
  const d = new Date(`${weekStart(today())}T00:00:00`);
  for (let i = 0; i < n; i++) {
    out.unshift(toDateStr(d));
    d.setDate(d.getDate() - 7);
  }
  return out;
}

export const shortDate = (s) => {
  const d = new Date(`${s}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// ─── 自己ベスト ──────────────────────────────────────
const isSingleErgo = (e) => e.kind === 'ergo' && !e.intervals?.length;

export function computePBs(entries) {
  const dist = {};
  for (const e of entries.filter(isSingleErgo)) {
    const sec = parseTime(e.time);
    if (!PB_DISTANCES.includes(e.distance) || !sec) continue;
    if (!dist[e.distance] || sec < dist[e.distance].sec) dist[e.distance] = { sec, time: e.time, date: e.date };
  }
  const lifts = {};
  for (const e of entries.filter((e) => e.kind === 'strength' && e.estimated1RM)) {
    if (!BIG3.some((x) => x.id === e.exercise)) continue;
    if (!lifts[e.exercise] || e.estimated1RM > lifts[e.exercise].kg) lifts[e.exercise] = { kg: e.estimated1RM, date: e.date };
  }
  return { dist, lifts };
}

// 保存前に呼び、自己ベストなら表示用メッセージを返す
export async function pbMessage(kind, rec, excludeId) {
  if (kind === 'ergo' && !rec.intervals?.length && PB_DISTANCES.includes(rec.distance) && parseTime(rec.time)) {
    const rows = (await db.ergoRecords.toArray()).map((r) => normalizeRecord('ergo', r)).filter(
      (r) => r.id !== excludeId && !r.intervals?.length && r.distance === rec.distance && parseTime(r.time)
    );
    if (!rows.length) return `${rec.distance}m 初記録 ${rec.time}`;
    const best = Math.min(...rows.map((r) => parseTime(r.time)));
    const diff = best - parseTime(rec.time);
    if (diff > 0) return `${rec.distance}m 自己ベスト更新 ${rec.time}(−${diff.toFixed(1)}秒)`;
  }
  if (kind === 'strength' && rec.estimated1RM && BIG3.some((x) => x.id === rec.exercise)) {
    const rows = (await db.strengthRecords.where('exercise').equals(rec.exercise).toArray()).map((r) => normalizeRecord('strength', r)).filter(
      (r) => r.id !== excludeId && r.estimated1RM
    );
    if (rows.length && rec.estimated1RM > Math.max(...rows.map((r) => r.estimated1RM))) {
      return `${exerciseLabel(rec.exercise)} 推定1RM 自己ベスト ${rec.estimated1RM}kg`;
    }
  }
  return '';
}

// ─── 強度ゾーン別の週間時間 ──────────────────────────
export function weeklyZoneMinutes(entries, n = 8) {
  const weeks = lastWeekStarts(n);
  const byZone = Object.fromEntries(ERGO_ZONES.map((z) => [z.id, weeks.map(() => 0)]));
  for (const e of entries.filter((e) => e.kind === 'ergo')) {
    const m = minutesOf(e);
    const i = weeks.indexOf(weekStart(e.date));
    if (m == null || i < 0) continue;
    byZone[byZone[e.type] ? e.type : 'other'][i] += m;
  }
  return { weeks, byZone };
}

// 直近4週のうち UT2 が占める割合(%)。データなしは null
export function ut2Share(entries) {
  const { byZone } = weeklyZoneMinutes(entries, 4);
  const total = sum(Object.values(byZone).flat());
  return total ? Math.round((sum(byZone.UT2) / total) * 100) : null;
}

// ─── 練習負荷 (RPE × 分) ─────────────────────────────
export function weeklyLoad(entries, n = 8) {
  const weeks = lastWeekStarts(n);
  const load = weeks.map(() => 0);
  for (const e of entries.filter((e) => (e.kind === 'ergo' || e.kind === 'cross') && e.rpe)) {
    const m = minutesOf(e);
    const i = weeks.indexOf(weekStart(e.date));
    if (m != null && i >= 0) load[i] += e.rpe * m;
  }
  return { weeks, load: load.map(Math.round) };
}

// 今週の負荷が直近3週の平均を大きく超えていれば注意メッセージ
export function loadWarning(load) {
  const cur = load[load.length - 1];
  const prev = load.slice(-4, -1);
  const base = avg(prev);
  if (!base || cur <= base * 1.3) return '';
  return `今週の練習負荷は直近3週平均の${(cur / base).toFixed(1)}倍です。急に増えすぎていないか確認を。`;
}

// ─── コンディションスコア ────────────────────────────
export function readiness(entries, date = today()) {
  const conds = entries.filter((e) => e.kind === 'condition');
  const c = conds.find((e) => e.date === date);
  if (!c) return null;

  const base = conds.filter((e) => e.date < date && e.restingHR).slice(0, 14).map((e) => e.restingHR);
  const parts = [];
  if (c.sleep) parts.push({ w: 40, v: clamp(c.sleep / 8) });
  if (c.fatigue) parts.push({ w: 40, v: clamp((5 - c.fatigue) / 4) });
  if (c.restingHR && base.length >= 3) parts.push({ w: 20, v: clamp(1 - Math.max(0, c.restingHR - avg(base)) / 5) });
  if (!parts.length) return null;

  const score = Math.round((100 * sum(parts.map((p) => p.w * p.v))) / sum(parts.map((p) => p.w)));
  const label = score >= 75 ? '予定どおりで大丈夫' : score >= 50 ? '強度は抑えめに' : '休養か軽めの練習を';
  return { score, label };
}

// ─── 目標 ────────────────────────────────────────────
export function goalProgress(goal, entries) {
  const def = GOAL_TYPES.find((g) => g.id === goal.type);
  if (!def) return null;
  const target = def.time ? parseTime(goal.target) : Number(goal.target);
  if (!target) return null;

  // chronological な値の並びから「最初の値」と「現在値」を取る
  let values;
  if (goal.type === '2kTT') {
    values = entries.filter((e) => isSingleErgo(e) && e.distance === 2000 && parseTime(e.time)).reverse().map((e) => parseTime(e.time));
  } else if (goal.type === 'bodyWeight') {
    values = entries.filter((e) => e.kind === 'weight').reverse().map((e) => e.weight);
  } else {
    values = entries.filter((e) => e.kind === 'strength' && e.exercise === goal.type && e.estimated1RM).reverse().map((e) => e.estimated1RM);
  }
  if (!values.length) return { label: def.label, current: null, targetText: fmtGoal(def, target), ratio: 0 };

  // 現在値: 2km・1RM は自己ベスト、体重は最新値
  const lowerBetter = goal.type === '2kTT';
  const current = goal.type === 'bodyWeight' ? values[values.length - 1] : lowerBetter ? Math.min(...values) : Math.max(...values);
  const start = values[0];
  const ratio = start === target ? 1 : clamp((start - current) / (start - target));
  return { label: def.label, current: fmtGoal(def, current), targetText: fmtGoal(def, target), ratio, reached: ratio >= 1 };
}

const fmtGoal = (def, v) => (def.time ? formatTime(v) : `${Math.round(v * 10) / 10}${def.unit}`);

// ─── ペース換算 ──────────────────────────────────────
export const wattsFromSplit = (sec500) => 2.8 / Math.pow(sec500 / 500, 3);

// Paul's law: 距離が2倍になるごとに 500m ペースが約5秒遅くなる。あくまで目安
export function predict2k(distance, timeStr) {
  const sec = parseTime(timeStr);
  if (!distance || !sec) return null;
  const split = (sec / distance) * 500;
  const split2k = split + 5 * Math.log2(2000 / distance);
  return { split, watts: wattsFromSplit(split), split2k, time2k: split2k * 4 };
}

// ─── 週間レポート ────────────────────────────────────
export function weekReport(entries, end = today()) {
  const endD = new Date(`${end}T00:00:00`);
  const startD = new Date(endD);
  startD.setDate(startD.getDate() - 6);
  const from = toDateStr(startD);
  const w = entries.filter((e) => e.date >= from && e.date <= end);
  const of = (k) => w.filter((e) => e.kind === k);
  const lines = [`【練習レポート ${formatDate(from)}〜${formatDate(end)}】`];

  const ergo = of('ergo');
  if (ergo.length) {
    const km = sum(ergo.map((e) => e.distance || 0)) / 1000;
    const zoneMin = Object.entries(
      ergo.reduce((m, e) => ({ ...m, [e.type]: (m[e.type] || 0) + (minutesOf(e) || 0) }), {})
    ).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${Math.round(v)}分`);
    lines.push(`エルゴ: ${ergo.length}回 / ${km.toFixed(1)}km${zoneMin.length ? `(${zoneMin.join('、')})` : ''}`);
  }
  if (of('strength').length) lines.push(`筋トレ: ${new Set(of('strength').map((e) => e.date)).size}日 / ${of('strength').length}種目分`);
  if (of('cross').length) lines.push(`ラン・バイク: ${of('cross').length}回 / ${sum(of('cross').map((e) => e.distance || 0)).toFixed(1)}km`);
  lines.push(`練習日数: ${new Set(w.filter((e) => ['ergo', 'strength', 'cross'].includes(e.kind)).map((e) => e.date)).size}日`);

  const load = sum(w.filter((e) => (e.kind === 'ergo' || e.kind === 'cross') && e.rpe && minutesOf(e)).map((e) => e.rpe * minutesOf(e)));
  if (load) lines.push(`練習負荷(RPE×分): ${Math.round(load)}`);

  const cond = of('condition');
  if (cond.length) {
    const sl = avg(cond.filter((e) => e.sleep).map((e) => e.sleep));
    const fa = avg(cond.filter((e) => e.fatigue).map((e) => e.fatigue));
    lines.push(`コンディション: ${[sl && `睡眠平均${sl.toFixed(1)}h`, fa && `疲労平均${fa.toFixed(1)}/5`].filter(Boolean).join(' / ')}`);
  }
  const wt = of('weight');
  if (wt.length) {
    const first = wt[wt.length - 1].weight;
    const last = wt[0].weight;
    lines.push(`体重: ${last}kg${wt.length > 1 ? `(週内 ${last - first >= 0 ? '+' : ''}${(last - first).toFixed(1)}kg)` : ''}`);
  }
  for (const e of w.filter(isSingleErgo)) {
    if (e.type === '2kTT' && e.distance === 2000) lines.push(`2kmテスト: ${e.time}`);
  }
  return lines.join('\n');
}
