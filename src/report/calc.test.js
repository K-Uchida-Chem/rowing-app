import { describe, it, expect } from 'vitest';
import {
  parseClock, avgSplitSec, dailyWeightMap, movingAverageAt, weightSeries, weightWeekStats,
  epley, expandSets, compressSets, summarizeStrength, aerobicRow, sessionOf, plannedText,
  intensityBreakdown, conditionAverages, buildWeekReport, timeMenuName,
} from './calc.js';

const labels = {
  exerciseLabel: (id) => ({ bench: 'ベンチプレス', squat: 'スクワット' })[id] ?? id,
  zoneLabel: (id) => id,
  boatLabel: (id) => id,
};

describe('平均スプリットは「合計時間 ÷ 合計距離 × 500」', () => {
  it('距離が違う区間では、スプリットの単純平均と答えが変わる', () => {
    // 500m を 1:40.0(100秒)、2000m を 8:00.0(480秒)。区間のスプリットは 100秒 と 120秒。
    const seconds = 100 + 480;
    const meters = 500 + 2000;
    const weighted = avgSplitSec(seconds, meters); // 580/2500*500 = 116.0
    const simple = (100 + 120) / 2; // 110.0 (誤り)
    expect(weighted).toBeCloseTo(116, 6);
    expect(weighted).not.toBeCloseTo(simple, 1);
  });
  it('同じ距離なら、単純平均と一致する', () => {
    expect(avgSplitSec(2 * 420, 2 * 2000)).toBeCloseTo((105 + 105) / 2, 6);
  });
  it('距離か時間がなければ null', () => {
    expect(avgSplitSec(0, 2000)).toBeNull();
    expect(avgSplitSec(420, 0)).toBeNull();
    expect(avgSplitSec(null, 2000)).toBeNull();
    expect(avgSplitSec(420, undefined)).toBeNull();
  });
  it('インターバルの行は、区間の合計から平均を出す(区間ごとのスプリットも持つ)', () => {
    const row = aerobicRow({
      kind: 'ergo', id: 1, date: '2026-10-12', type: 'UT1',
      intervals: [
        { distance: 500, time: '1:40.0', split: '1:40.0' },
        { distance: 2000, time: '8:00.0', split: '2:00.0' },
      ],
    }, labels);
    expect(row.distance).toBe(2500);
    expect(row.seconds).toBe(580);
    expect(row.split).toBeCloseTo(116, 6);
    expect(row.splits).toEqual([100, 120]);
    expect(row.name).toBe('2×500m UT1');
  });
});

describe('移動平均の欠損日の扱い', () => {
  const daily = new Map([['2026-10-12', 70], ['2026-10-14', 72], ['2026-10-16', 71]]);
  it('窓の中で測定のある日だけで平均する(欠損日を 0 や前日で埋めない)', () => {
    // 10/16 を終点とする7日 = 10/10〜10/16。測定は 70, 72, 71 の3日。
    expect(movingAverageAt(daily, '2026-10-16')).toBeCloseTo(71, 6);
  });
  it('測定のない日が終点でも、窓に測定があれば平均を出す', () => {
    expect(movingAverageAt(daily, '2026-10-15')).toBeCloseTo(71, 6); // 70, 72
  });
  it('窓に測定が1日もなければ null', () => {
    expect(movingAverageAt(daily, '2026-10-30')).toBeNull();
    expect(movingAverageAt(new Map(), '2026-10-12')).toBeNull();
  });
  it('7日より前の測定は、窓に入らない', () => {
    // 10/12 は 10/19 の窓(10/13〜10/19)の外
    expect(movingAverageAt(daily, '2026-10-19')).toBeCloseTo((72 + 71) / 2, 6);
  });
  it('系列は、測定のない日を null にして、日付の数だけ返す', () => {
    const s = weightSeries(daily, '2026-10-12', '2026-10-16');
    expect(s.dates).toHaveLength(5);
    expect(s.daily).toEqual([70, null, 72, null, 71]);
    expect(s.average.every((v) => v !== null)).toBe(true);
  });
  it('1日に複数回測ったら、その日の平均', () => {
    const m = dailyWeightMap([
      { kind: 'weight', date: '2026-10-12', weight: 70 },
      { kind: 'weight', date: '2026-10-12', weight: 71 },
      { kind: 'weight', date: '2026-10-13', weight: 0 }, // 不正値は無視
      { kind: 'ergo', date: '2026-10-13', weight: 99 }, // 体重以外は無視
    ]);
    expect(m.get('2026-10-12')).toBeCloseTo(70.5, 6);
    expect(m.has('2026-10-13')).toBe(false);
  });
  it('今週の統計: 平均・先週との差・最小・最大', () => {
    const d = new Map([['2026-10-05', 72], ['2026-10-06', 72], ['2026-10-12', 70], ['2026-10-14', 71]]);
    const cur = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
    const prev = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
    const st = weightWeekStats(d, cur, prev);
    expect(st).toMatchObject({ count: 2, min: 70, max: 71 });
    expect(st.average).toBeCloseTo(70.5, 6);
    expect(st.diff).toBeCloseTo(-1.5, 6);
  });
  it('測定のない週は、すべて null(エラーにしない)', () => {
    const st = weightWeekStats(new Map(), ['2026-10-12'], ['2026-10-05']);
    expect(st).toEqual({ count: 0, average: null, previousAverage: null, diff: null, min: null, max: null });
  });
});

describe('筋トレ', () => {
  it('同じ重量・回数が連続するセットを詰める', () => {
    const sets = [{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }, { weight: 60, reps: 10 }, { weight: 70, reps: 8 }, { weight: 75, reps: 5 }];
    expect(summarizeStrength(sets).text).toBe('60kg×10×3, 70kg×8, 75kg×5');
  });
  it('重量が同じでも回数が違えば詰めない。離れていれば詰めない', () => {
    expect(compressSets([{ weight: 60, reps: 10 }, { weight: 60, reps: 8 }]).length).toBe(2);
    expect(compressSets([{ weight: 60, reps: 10 }, { weight: 70, reps: 10 }, { weight: 60, reps: 10 }]).length).toBe(3);
  });
  it('総挙上量と推定1RM(Epley式: 重量×(1+回数/30))の最大', () => {
    const s = summarizeStrength([{ weight: 60, reps: 10 }, { weight: 70, reps: 8 }, { weight: 75, reps: 5 }]);
    expect(s.volume).toBe(60 * 10 + 70 * 8 + 75 * 5); // 1535
    // 60*(1+10/30)=80, 70*(1+8/30)=88.67, 75*(1+5/30)=87.5 → 最大 88.67
    expect(s.e1rm).toBeCloseTo(70 * (1 + 8 / 30), 6);
    expect(epley(100, 3)).toBeCloseTo(110, 6);
  });
  it('自重は「自重」と表記し、1RMは出さない', () => {
    const s = summarizeStrength([{ weight: 0, reps: 12 }, { weight: 0, reps: 12 }]);
    expect(s.text).toBe('自重×12×2');
    expect(s.volume).toBe(0);
    expect(s.e1rm).toBeNull();
    expect(s.totalReps).toBe(24);
  });
  it('1つの記録(重量・回数・セット数)と、旧形式(setList)を、1セットずつに広げる', () => {
    expect(expandSets({ weight: 60, reps: 10, sets: 3 })).toHaveLength(3);
    expect(expandSets({ weight: 60, reps: 10 })).toEqual([{ weight: 60, reps: 10 }]);
    expect(expandSets({ reps: 0, sets: 3 })).toEqual([]);
    expect(expandSets({ setList: [{ weight: 50, reps: 8 }, { weight: 55, reps: 6 }] })).toHaveLength(2);
  });
  it('小数の重量は、小数で表記する', () => {
    expect(summarizeStrength([{ weight: 62.5, reps: 5 }]).text).toBe('62.5kg×5');
  });
});

describe('有酸素の行', () => {
  it('時間メニューのインターバルの種目名', () => {
    const row = aerobicRow({
      kind: 'water', id: 2, date: '2026-10-13', type: 'UT2', boat: '4x', intervalBy: 'time',
      intervals: [{ distance: 1053, time: '4:00.0' }, { distance: 1045, time: '4:00.0' }],
    }, labels);
    expect(row.name).toBe('UT2 2×4分');
    expect(row.boat).toBe('4x');
    expect(row.distance).toBe(2098);
  });
  it('2kmテストは「2000m TT」', () => {
    const row = aerobicRow({ kind: 'ergo', id: 3, date: '2026-10-14', type: '2kTT', distance: 2000, time: '6:48.0' }, labels);
    expect(row.name).toBe('2000m TT');
    expect(row.split).toBeCloseTo(102, 6);
  });
  it('ランは平均ペース、バイクは平均速度。距離は km → m', () => {
    const run = aerobicRow({ kind: 'cross', id: 4, date: '2026-10-15', type: 'running', distance: 10, time: '55:00' }, labels);
    expect(run.distance).toBe(10000);
    expect(run.paceSecPerKm).toBeCloseTo(330, 6);
    const bike = aerobicRow({ kind: 'cross', id: 5, date: '2026-10-15', type: 'cycling', distance: 40, time: '1:36:00' }, labels);
    expect(bike.speedKmh).toBeCloseTo(25, 6);
  });
  it('インターバルの平均レートは、保存値がなければ時間で重み付けする', () => {
    const row = aerobicRow({
      kind: 'ergo', id: 6, date: '2026-10-14', intervals: [
        { distance: 1000, time: '3:00.0', rate: 30 }, { distance: 1000, time: '6:00.0', rate: 24 },
      ],
    }, labels);
    expect(row.rate).toBeCloseTo((30 * 180 + 24 * 360) / 540, 6);
  });
  it('壊れた記録(時間も距離もない)でも落ちない', () => {
    const row = aerobicRow({ kind: 'ergo', id: 7, date: '2026-10-14' }, labels);
    expect(row.split).toBeNull();
    expect(row.distance).toBeNull();
  });
  it('時間メニューの名前・予定メニュー・時間の読み取り', () => {
    expect(timeMenuName(240)).toBe('4分');
    expect(timeMenuName(90)).toBe('1分30秒');
    expect(plannedText({ ergoType: 'UT2', strengthDay: 'Day 1', description: '乗艇のあと' })).toBe('エルゴ UT2 · 筋トレ Day 1 · 乗艇のあと');
    expect(plannedText({ ergoType: 'none', strengthDay: 'none', description: '' })).toBeNull();
    expect(plannedText(undefined)).toBeNull();
    expect(parseClock('1:23:45')).toBe(5025);
    expect(parseClock('')).toBeNull();
    expect(parseClock('abc')).toBeNull();
  });
});

describe('時間帯', () => {
  it('午前/午後。旧アプリの AM/PM も読む', () => {
    expect(sessionOf({ kind: 'ergo', date: 'x', session: 'am' })).toBe('am');
    expect(sessionOf({ kind: 'ergo', date: 'x', session: 'PM' })).toBe('pm');
    expect(sessionOf({ kind: 'ergo', date: 'x' })).toBeNull();
  });
  it('記録になければ、ヘルスケアの開始時刻(日本時間)から', () => {
    const workouts = new Map([['w1', { start: '2026-10-12T22:00:00Z' }], ['w2', { start: '2026-10-13T06:00:00Z' }]]);
    expect(sessionOf({ kind: 'ergo', date: 'x', workoutId: 'w1' }, workouts)).toBe('am'); // 07:00 JST
    expect(sessionOf({ kind: 'ergo', date: 'x', workoutId: 'w2' }, workouts)).toBe('pm'); // 15:00 JST
  });
});

describe('強度別・コンディション', () => {
  const dates = ['2026-10-12', '2026-10-13'];
  it('区分が未入力のメニューは「未分類」。割合は時間で出す', () => {
    const b = intensityBreakdown([
      { kind: 'ergo', date: '2026-10-12', type: 'UT2', distance: 8000, time: '32:00.0' },
      { kind: 'water', date: '2026-10-13', type: 'AT', distance: 4000, time: '16:00.0' },
      { kind: 'ergo', date: '2026-10-13', distance: 2000, time: '8:00.0' }, // 区分なし
      { kind: 'cross', date: '2026-10-13', type: 'running', distance: 10, time: '55:00' }, // 対象外
    ], dates);
    expect(b.rows.map((r) => r.zone)).toEqual(['UT2', 'AT', 'unclassified']);
    expect(b.totalSeconds).toBe(1920 + 960 + 480);
    expect(b.rows[0].share).toBeCloseTo(1920 / 3360, 6);
    expect(b.rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 6);
  });
  it('時間がどれも入っていなければ、距離で割合を出す', () => {
    const b = intensityBreakdown([{ kind: 'ergo', date: '2026-10-12', type: 'UT2', distance: 3000 }, { kind: 'ergo', date: '2026-10-12', type: 'AT', distance: 1000 }], dates);
    expect(b.rows[0].share).toBeCloseTo(0.75, 6);
  });
  it('データがなければ空', () => {
    expect(intensityBreakdown([], dates).rows).toEqual([]);
  });
  it('コンディションの週平均。1件もなければ null', () => {
    expect(conditionAverages([], dates)).toBeNull();
    const c = conditionAverages([
      { kind: 'condition', date: '2026-10-12', sleep: 7, fatigue: 2 },
      { kind: 'condition', date: '2026-10-13', sleep: 6, fatigue: 4, restingHR: 52 },
    ], dates);
    expect(c.sleep).toBeCloseTo(6.5, 6);
    expect(c.fatigue).toBeCloseTo(3, 6);
    expect(c.restingHR).toBe(52);
  });
});

describe('週次レポート全体', () => {
  const weekStart = '2026-10-12'; // 月曜
  const base = { weekStart, labels, today: '2026-10-15' }; // 木曜

  it('データが空の週でも、7日分のブロックが揃い、エラーにならない', () => {
    const r = buildWeekReport({ ...base, entries: [] });
    expect(r.days).toHaveLength(7);
    expect(r.days.map((d) => d.label)).toEqual(['月', '火', '水', '木', '金', '土', '日']);
    expect(r.summary.count).toBe(0);
    expect(r.summary.distance.total).toBe(0);
    expect(r.weight.average).toBeNull();
    expect(r.intensity.rows).toEqual([]);
    expect(r.condition).toBeNull();
  });

  it('休養日: 過去で練習がない日は休養。今日と未来は休養と決めない', () => {
    const r = buildWeekReport({ ...base, entries: [{ kind: 'ergo', id: 1, date: '2026-10-13', type: 'UT2', distance: 8000, time: '32:00.0' }] });
    expect(r.days.map((d) => d.isRest)).toEqual([true, false, true, false, false, false, false]);
    expect(r.days[3].isToday).toBe(true);
    expect(r.days[4].isFuture).toBe(true);
    expect(r.summary.restDays).toBe(2); // 月・水
  });

  it('筋トレだけの日でも、行が出て、距離・時間は 0', () => {
    const r = buildWeekReport({ ...base, entries: [
      { kind: 'strength', id: 1, date: '2026-10-12', exercise: 'bench', weight: 60, reps: 10, sets: 3 },
      { kind: 'strength', id: 2, date: '2026-10-12', exercise: 'bench', weight: 70, reps: 8, sets: 1 },
    ] });
    const monday = r.days[0];
    expect(monday.isRest).toBe(false);
    expect(monday.distance).toBe(0);
    expect(monday.seconds).toBe(0);
    expect(monday.sessions[0].strength).toHaveLength(1); // 同じ種目は1行
    expect(monday.sessions[0].strength[0].text).toBe('60kg×10×3, 70kg×8');
    expect(monday.sessions[0].strength[0].name).toBe('ベンチプレス');
  });

  it('メニューの並びは エルゴ → 水上 → その他の有酸素 → 筋トレ(記録した順に関係なく)', () => {
    const r = buildWeekReport({ ...base, entries: [
      { kind: 'strength', id: 1, date: '2026-10-12', exercise: 'squat', weight: 80, reps: 5, sets: 1 },
      { kind: 'cross', id: 2, date: '2026-10-12', type: 'running', distance: 5, time: '27:30' },
      { kind: 'water', id: 3, date: '2026-10-12', type: 'UT2', distance: 8000, time: '32:00.0' },
      { kind: 'ergo', id: 4, date: '2026-10-12', type: 'UT1', distance: 6000, time: '24:00.0' },
    ] });
    const s = r.days[0].sessions[0];
    expect(s.aerobic.map((x) => x.kind)).toEqual(['ergo', 'water', 'cross']);
    expect(s.strength).toHaveLength(1);
  });

  it('1日に午前・午後があれば、時間帯のラベルで分ける', () => {
    const r = buildWeekReport({ ...base, entries: [
      { kind: 'water', id: 1, date: '2026-10-13', session: 'am', type: 'UT2', distance: 10000, time: '40:00.0' },
      { kind: 'ergo', id: 2, date: '2026-10-13', session: 'pm', type: 'AT', distance: 6000, time: '22:00.0' },
    ] });
    const day = r.days[1];
    expect(day.showSessionLabels).toBe(true);
    expect(day.sessions.map((s) => s.key)).toEqual(['am', 'pm']);
    expect(r.summary.count).toBe(2); // 同じ日でも、午前と午後で2回
    // 1日の合計は、2つの合計
    expect(day.distance).toBe(16000);
    expect(day.seconds).toBe(2400 + 1320);
  });

  it('時間帯がわからない記録だけなら、ラベルは出さない。1日1回と数える', () => {
    const r = buildWeekReport({ ...base, entries: [
      { kind: 'ergo', id: 1, date: '2026-10-13', type: 'UT2', distance: 6000, time: '24:00.0' },
      { kind: 'strength', id: 2, date: '2026-10-13', exercise: 'bench', weight: 60, reps: 10, sets: 1 },
    ] });
    expect(r.days[1].showSessionLabels).toBe(false);
    expect(r.summary.count).toBe(1);
  });

  it('前の週との差を出す', () => {
    const r = buildWeekReport({ ...base, entries: [
      { kind: 'ergo', id: 1, date: '2026-10-13', type: 'UT2', distance: 10000, time: '40:00.0' },
      { kind: 'ergo', id: 2, date: '2026-10-06', type: 'UT2', distance: 6000, time: '24:00.0' }, // 前の週
    ] });
    expect(r.summary.distance.total).toBe(10000);
    expect(r.previous.distance.total).toBe(6000);
    expect(r.delta.distance).toBe(4000);
    expect(r.delta.seconds).toBe(2400 - 1440);
  });

  it('総距離の内訳(エルゴ・水上・その他)の合計が、総距離に合う', () => {
    const r = buildWeekReport({ ...base, entries: [
      { kind: 'ergo', id: 1, date: '2026-10-12', type: 'UT2', distance: 8000, time: '32:00.0' },
      { kind: 'water', id: 2, date: '2026-10-13', type: 'UT2', distance: 9000, time: '36:00.0' },
      { kind: 'cross', id: 3, date: '2026-10-14', type: 'running', distance: 5, time: '27:30' },
    ] });
    const d = r.summary.distance;
    expect(d).toMatchObject({ ergo: 8000, water: 9000, cross: 5000, total: 22000 });
  });

  it('体重: 見出しの値とグラフ用の値が、同じ日別データ(二重管理しない)', () => {
    const entries = [
      { kind: 'weight', id: 1, date: '2026-10-12', weight: 70.2 },
      { kind: 'weight', id: 2, date: '2026-10-14', weight: 70.8 },
    ];
    const daily = dailyWeightMap(entries);
    const r = buildWeekReport({ ...base, entries, weights: daily });
    expect(r.days[0].weight).toBe(daily.get('2026-10-12'));
    expect(r.days[2].weight).toBe(daily.get('2026-10-14'));
    expect(r.days[1].weight).toBeNull(); // 未測定の日は null(画面では —)
    const series = weightSeries(daily, '2026-10-12', '2026-10-18');
    expect(series.daily[0]).toBe(r.days[0].weight);
    expect(series.daily[2]).toBe(r.days[2].weight);
  });

  it('予定メニューは、未来の日と、まだ記録のない今日にだけつく', () => {
    const schedule = [{ dayOfWeek: 4, ergoType: 'UT2', strengthDay: 'none', description: '' }, { dayOfWeek: 5, ergoType: 'AT', strengthDay: 'none', description: '' }, { dayOfWeek: 2, ergoType: 'UT1', strengthDay: 'none', description: '' }];
    const r = buildWeekReport({ ...base, entries: [], schedule });
    expect(r.days[1].planned).toBeNull(); // 火(過去)
    expect(r.days[3].planned).toBe('エルゴ UT2'); // 木(今日・記録なし)
    expect(r.days[4].planned).toBe('エルゴ AT'); // 金(未来)
    const done = buildWeekReport({ ...base, schedule, entries: [{ kind: 'ergo', id: 1, date: '2026-10-15', type: 'UT2', distance: 8000, time: '32:00.0' }] });
    expect(done.days[3].planned).toBeNull(); // 今日にもう記録があれば、予定は出さない
  });

  it('記録が壊れていても(時間や距離がない)落ちない', () => {
    const r = buildWeekReport({ ...base, entries: [{ kind: 'ergo', id: 1, date: '2026-10-12' }, { kind: 'strength', id: 2, date: '2026-10-12' }] });
    expect(r.days[0].distance).toBe(0);
    expect(r.days[0].sessions[0].aerobic[0].split).toBeNull();
  });
});
