// 週次レポートの確認用ダミーデータ。実データには触れない(すべて dummy: true の印つきで、消すときはその印だけを消す)。
// 同じ日付からは、いつ作っても同じデータができる。
import { formatTime, wattsFromSplit } from '../lib.js';
import { addDays, dayOfWeek, weekStartOf } from '../report/week.js';

/** 日付から決まる乱数(0〜1)。同じ日付・同じ名前なら、いつも同じ値 */
function rand(date, salt = '') {
  let h = 2166136261;
  for (const ch of `${date}|${salt}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
}
const between = (date, salt, lo, hi) => lo + rand(date, salt) * (hi - lo);

const splitText = (sec) => formatTime(sec);

/** インターバルの1本ぶん(スプリットから、タイムとワットを出す) */
function pieceByDistance(date, i, distance, splitSec, rate) {
  const sec = (splitSec * distance) / 500;
  return { distance, time: formatTime(sec), split: splitText(splitSec), watts: Math.round(wattsFromSplit(splitSec)), rate, _sec: sec, _i: i, _d: date };
}
function pieceByTime(timeSec, splitSec, rate) {
  const distance = Math.round((timeSec / splitSec) * 500);
  return { distance, time: formatTime(timeSec), split: splitText(splitSec), watts: Math.round(wattsFromSplit(splitSec)), rate, _sec: timeSec };
}
const clean = (pieces) => pieces.map(({ _sec, _i, _d, ...p }) => p);

function intervalRecord(base, pieces, by, extra = {}) {
  const sec = pieces.reduce((s, p) => s + p._sec, 0);
  const dist = pieces.reduce((s, p) => s + p.distance, 0);
  const rate = Math.round(pieces.reduce((s, p) => s + p.rate * p._sec, 0) / sec);
  const watts = Math.round(pieces.reduce((s, p) => s + p.watts * p._sec, 0) / sec);
  const { kind, ...rest } = base; // kind は保存しない(読み出すとき、テーブルから決まる)
  return {
    ...rest, intervals: clean(pieces), intervalBy: by, distance: dist, time: formatTime(sec),
    split: splitText((sec / dist) * 500), rate, ...extra, ...(kind === 'water' ? {} : { watts }),
  };
}

const TECHNIQUE = [
  'キャッチの入りが遅れがち。フィニッシュで体が開く癖。次回はリズムを意識。',
  '前半のスライドが速い。4番とのタイミングは良くなった。',
  '風が強く、ブレードがバタついた。入水を静かに。',
  'リカバリーでハンドが先に出る。下半身から開始を意識する。',
];

/**
 * ダミーの記録を作る。
 * @param {{ today: string, weeks?: number }} opt
 * @returns {Record<string, any[]>} テーブル名 → レコードの配列(id なし)
 */
export function generateDummy({ today, weeks = 10 }) {
  const out = { ergoRecords: [], waterRecords: [], strengthRecords: [], crossTrainingRecords: [], conditionRecords: [], bodyWeightRecords: [], weeklySchedule: [] };
  const thisWeek = weekStartOf(today);

  for (let w = weeks; w >= 0; w--) {
    const weekStart = addDays(thisWeek, -7 * w);
    const quiet = w === 5; // この週は、練習が1件もない(オフ週)
    const noWeights = w === 6; // この週は、体重を1日も測っていない
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      if (date > today) continue;
      const dow = dayOfWeek(date);
      const ergo = (r) => out.ergoRecords.push({ date, dummy: true, ...r });
      const water = (r) => out.waterRecords.push({ date, dummy: true, ...r });
      const cross = (r) => out.crossTrainingRecords.push({ date, dummy: true, ...r });
      const lift = (exercise, sets, session = 'pm') => sets.forEach(([weight, reps, n]) => out.strengthRecords.push({ date, dummy: true, session, exercise, weight, reps, sets: n, estimated1RM: weight ? Math.round(weight * (1 + reps / 30)) : null }));
      const grow = 1 - w * 0.004; // 少しずつ速くなる

      if (!quiet) {
        if (dow === 1) {
          ergo({ session: 'am', type: 'UT2', menuBy: 'distance', distance: 8000, split: splitText(124 * grow), time: formatTime((124 * grow * 8000) / 500), watts: Math.round(wattsFromSplit(124 * grow)), rate: 18, avgHR: 138, rpe: 4 });
          lift('squat', [[80, 5, 3], [90, 3, 1]]);
          lift('bench', [[60, 10, 3], [70, 8, 1], [75, 5, 1]]);
          lift('bentOverRow', [[50, 10, 3]]);
        } else if (dow === 2) {
          water({ session: 'am', boat: '4x', type: 'UT2', menuBy: 'distance', distance: 10000, split: splitText(126 * grow), time: formatTime((126 * grow * 10000) / 500), rate: 20, avgHR: 142, rpe: 4, technique: TECHNIQUE[w % TECHNIQUE.length] });
          ergo({ session: 'pm', type: 'AT', menuBy: 'distance', distance: 5000, split: splitText(113 * grow), time: formatTime((113 * grow * 5000) / 500), watts: Math.round(wattsFromSplit(113 * grow)), rate: 24, avgHR: 163, rpe: 7 });
        } else if (dow === 3 && w % 2 === 1) {
          lift('squat', [[85, 5, 3]], 'am'); // 筋トレだけの日
          lift('bench', [[65, 8, 3]], 'am');
        } else if (dow === 3 && w % 2 === 0) {
          cross({ type: 'cycling', menuBy: 'distance', distance: 40, time: formatTime(5760), avgSpeed: 25, avgHR: 128 });
        } else if (dow === 4) {
          const pieces = [0, 1, 2, 3].map((k) => pieceByDistance(date, k, 2000, (108.5 + k * 0.5 + between(date, `p${k}`, -0.3, 0.3)) * grow, 28 + (k % 2)));
          ergo(intervalRecord({ kind: 'ergo', session: 'am', type: 'UT1' }, pieces, 'distance', { avgHR: 156, rpe: 7 }));
          lift('deadlift', [[100, 5, 3]]);
          lift('pullUp', [[0, 8, 1], [0, 7, 1], [0, 6, 1]]);
        } else if (dow === 5) {
          const pieces = [0, 1, 2, 3, 4].map((k) => pieceByTime(240, (112 + between(date, `t${k}`, -0.6, 0.8)) * grow, 26 + (k % 3)));
          water({ session: 'am', ...intervalRecord({ kind: 'water', boat: '2x', type: 'AT' }, pieces, 'time', { avgHR: 160, rpe: 7, technique: TECHNIQUE[(w + 1) % TECHNIQUE.length] }) });
          cross({ session: 'pm', type: 'running', menuBy: 'distance', distance: 8, time: formatTime(2640), pace: formatTime(330), avgSpeed: 10.9, avgHR: 150 });
        } else if (dow === 6) {
          if (w % 3 === 0) {
            ergo({ type: '2kTT', menuBy: 'distance', distance: 2000, split: splitText((103 - (10 - w) * 0.15) * 1), time: formatTime(((103 - (10 - w) * 0.15) * 2000) / 500), watts: Math.round(wattsFromSplit(103)), rate: 34, avgHR: 184, maxHR: 192, rpe: 10 });
          } else {
            const pieces = [0, 1, 2, 3, 4, 5].map((k) => pieceByDistance(date, k, 500, (99 + k * 0.4) * grow, 34));
            ergo(intervalRecord({ kind: 'ergo', type: 'TR' }, pieces, 'distance', { avgHR: 176, rpe: 9 }));
          }
        } else if (dow === 0 && w % 2 === 1) {
          cross({ type: 'running', menuBy: 'time', distance: 12, time: formatTime(4140), pace: formatTime(345), avgSpeed: 10.4, avgHR: 145 });
        }
      }

      // 体重: 測らない日がある(約25%)。たまに1日に2回
      if (!noWeights && rand(date, 'skip') > 0.25) {
        const base = 71.8 - (weeks - w) * 0.05 - i * 0.02 + between(date, 'wt', -0.4, 0.4);
        out.bodyWeightRecords.push({ date, dummy: true, weight: Math.round(base * 10) / 10 });
        if (rand(date, 'twice') > 0.92) out.bodyWeightRecords.push({ date, dummy: true, weight: Math.round((base + 0.3) * 10) / 10 });
      }
      // コンディション: 約70%の日
      if (rand(date, 'cond') > 0.3) {
        out.conditionRecords.push({ date, dummy: true, sleep: Math.round(between(date, 'sl', 5.5, 8.5) * 10) / 10, fatigue: 1 + Math.floor(rand(date, 'fa') * 4), restingHR: 50 + Math.floor(rand(date, 'hr') * 6) });
      }
    }
  }

  // 週間メニュー(今日より先の日の「予定」に出る)。実データがあれば、投入側で上書きしない
  const plan = { 1: ['UT2', 'Day 1', ''], 2: ['AT', 'none', '乗艇'], 3: ['none', 'none', 'オフ'], 4: ['UT1', 'Day 2', ''], 5: ['AT', 'none', '乗艇 + ラン'], 6: ['TR', 'none', ''], 0: ['none', 'none', 'ロング'] };
  for (const [dow, [ergoType, strengthDay, description]] of Object.entries(plan)) {
    out.weeklySchedule.push({ dayOfWeek: Number(dow), ergoType, strengthDay, description, dummy: true });
  }
  return out;
}

/** 記録のテーブル(スケジュールは別扱い) */
export const DUMMY_TABLES = ['ergoRecords', 'waterRecords', 'strengthRecords', 'crossTrainingRecords', 'conditionRecords', 'bodyWeightRecords'];

/** ダミーを入れる。前に入れたダミーは、先に消す。実データの週間メニューがあれば残す。 */
export async function seedDummy(db, today) {
  await clearDummy(db);
  const data = generateDummy({ today });
  for (const t of DUMMY_TABLES) await db[t].bulkAdd(data[t]);
  if ((await db.weeklySchedule.count()) === 0) await db.weeklySchedule.bulkAdd(data.weeklySchedule);
  return DUMMY_TABLES.reduce((n, t) => n + data[t].length, 0);
}

/** ダミーの印がついたものだけを消す */
export async function clearDummy(db) {
  for (const t of [...DUMMY_TABLES, 'weeklySchedule']) await db[t].filter((r) => r.dummy === true).delete();
}
