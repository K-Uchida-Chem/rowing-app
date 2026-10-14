import db from './db.js';
import { toDateStr } from './lib.js';

// ヘルスケアのワークアウト(ショートカットが集めたJSON)を取り込み、あとから記録に結びつける。
// 取り込み形式(配列・単体・{workouts:[...]} のどれでも可):
//   { id?, start, end?, duration?, type?, distance?(m), distanceKm?, kcal?, hr?: [{t, v}] | [[t, v]] }
//   start/end/t は ISO 8601 の日時。hr の t は、ISO 日時か「開始からの秒数」。

export const ACTIVITIES = {
  rowing: { label: 'ローイング', kind: 'ergo' },
  running: { label: 'ランニング', kind: 'cross', cross: 'running' },
  cycling: { label: 'サイクリング', kind: 'cross', cross: 'cycling' },
  strength: { label: '筋トレ', kind: 'strength' },
  other: { label: 'その他', kind: 'ergo' },
};

export function activityOf(type) {
  const s = String(type ?? '').toLowerCase();
  if (/row|ローイング|ボート|エルゴ/.test(s)) return 'rowing';
  if (/run|walk|ラン|ランニング|ウォーキング/.test(s)) return 'running';
  if (/cycl|bik|サイクリング|バイク/.test(s)) return 'cycling';
  if (/strength|weight|筋|トレーニング/.test(s)) return 'strength';
  return 'other';
}

const BUCKET = 15; // 心拍は15秒ごとの平均にまとめて保存量を抑える

function toSeries(hr, startMs) {
  if (!Array.isArray(hr)) return [];
  const buckets = new Map();
  for (const p of hr) {
    const t = Array.isArray(p) ? p[0] : p?.t;
    const v = Number(Array.isArray(p) ? p[1] : p?.v ?? p?.bpm);
    if (!Number.isFinite(v) || v <= 0) continue;
    const ms = typeof t === 'number' || /^\d+(\.\d+)?$/.test(String(t)) ? startMs + Number(t) * 1000 : new Date(t).getTime();
    if (!Number.isFinite(ms)) continue;
    const key = Math.max(0, Math.floor((ms - startMs) / 1000 / BUCKET)) * BUCKET;
    const b = buckets.get(key) ?? { sum: 0, n: 0 };
    b.sum += v;
    b.n += 1;
    buckets.set(key, b);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([t, b]) => [t, Math.round(b.sum / b.n)]);
}

function normalize(raw) {
  const startMs = new Date(raw?.start).getTime();
  if (!Number.isFinite(startMs)) return null;
  const endMs = raw.end ? new Date(raw.end).getTime() : NaN;
  const duration = Math.round(Number(raw.duration) || (Number.isFinite(endMs) ? (endMs - startMs) / 1000 : 0));
  const series = toSeries(raw.hr, startMs);
  const bpms = series.map((p) => p[1]);
  const distance = Number(raw.distance) || (Number(raw.distanceKm) ? Number(raw.distanceKm) * 1000 : 0);
  return {
    id: String(raw.id ?? raw.start),
    date: toDateStr(new Date(startMs)),
    start: new Date(startMs).toISOString(),
    activity: activityOf(raw.type),
    duration: duration || undefined,
    distance: distance || undefined,
    kcal: Number(raw.kcal) || undefined,
    avgHR: bpms.length ? Math.round(bpms.reduce((s, v) => s + v, 0) / bpms.length) : undefined,
    maxHR: bpms.length ? Math.max(...bpms) : undefined,
    hr: series,
    status: 'pending',
  };
}

export function parseWorkouts(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : Array.isArray(data?.workouts) ? data.workouts : [data];
  return list.map(normalize).filter(Boolean);
}

// 取り込み済み(記録に結びつけた・使わないと決めた)ものは触らず、新しいものだけ足す
export async function importWorkouts(text) {
  const items = parseWorkouts(text);
  if (!items.length) throw new Error('ワークアウトが見つかりませんでした');
  let added = 0;
  for (const w of items) {
    if (await db.workouts.get(w.id)) continue;
    await db.workouts.add(w);
    added += 1;
  }
  return { added, skipped: items.length - added };
}

export async function importFromClipboard() {
  return importWorkouts(await navigator.clipboard.readText());
}

// URL の #hk=... (base64url の JSON)から取り込む。取り込めたら件数、なければ null
export async function importFromHash() {
  const m = location.hash.match(/^#hk=(.+)$/);
  if (!m) return null;
  history.replaceState(null, '', location.pathname + location.search);
  const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return importWorkouts(new TextDecoder().decode(bytes));
}

export const dismissWorkout = (id) => db.workouts.update(id, { status: 'dismissed' });
export const restoreWorkout = (id) => db.workouts.update(id, { status: 'pending' });

export const durationLabel = (sec) => {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}時間${m}分` : `${m}分`;
};

export const workoutSummary = (w) =>
  [
    ACTIVITIES[w.activity]?.label,
    durationLabel(w.duration),
    w.distance && `${w.distance >= 1000 ? `${(w.distance / 1000).toFixed(1)}km` : `${Math.round(w.distance)}m`}`,
    w.avgHR && `平均${w.avgHR}`,
    w.maxHR && `最大${w.maxHR}`,
  ].filter(Boolean).join(' · ');
