import { describe, it, expect } from 'vitest';
import { generateDummy } from './dummyData.js';
import { buildWeekReport, dailyWeightMap } from '../report/calc.js';
import { addDays, weekStartOf } from '../report/week.js';

const KIND_OF = { ergoRecords: 'ergo', waterRecords: 'water', strengthRecords: 'strength', crossTrainingRecords: 'cross', conditionRecords: 'condition', bodyWeightRecords: 'weight' };
const TODAY = '2026-10-15'; // 木曜
const labels = { exerciseLabel: String, zoneLabel: String, boatLabel: String };

function entriesOf(data) {
  let id = 1;
  return Object.entries(KIND_OF).flatMap(([table, kind]) => data[table].map((r) => ({ ...r, kind, id: id++ })));
}

describe('ダミーデータ', () => {
  const data = generateDummy({ today: TODAY });
  const entries = entriesOf(data);
  const thisWeek = weekStartOf(TODAY);

  it('いつ作っても同じ(日付から決まる)', () => {
    expect(generateDummy({ today: TODAY })).toEqual(data);
  });
  it('すべてに dummy の印がついている(消すときに、実データを巻き込まない)', () => {
    for (const rows of Object.values(data)) expect(rows.every((r) => r.dummy === true)).toBe(true);
  });
  it('今日より先の日付は作らない', () => {
    expect(entries.every((e) => e.date <= TODAY)).toBe(true);
  });
  it('どの週も、エラーなくレポートが作れる', () => {
    for (let w = 11; w >= -1; w--) {
      const weekStart = addDays(thisWeek, -7 * w);
      expect(() => buildWeekReport({ entries, weekStart, today: TODAY, labels, schedule: data.weeklySchedule })).not.toThrow();
    }
  });
  it('確認したい場面が、データの中に含まれている', () => {
    const weekAt = (w) => buildWeekReport({ entries, weekStart: addDays(thisWeek, -7 * w), today: TODAY, labels, schedule: data.weeklySchedule });
    const empty = weekAt(5); // 練習が1件もない週
    expect(empty.summary.count).toBe(0);
    expect(empty.summary.restDays).toBe(7);
    expect(weekAt(6).weight.count).toBe(0); // 体重の測定がない週
    const normal = weekAt(2);
    expect(normal.days.some((d) => d.isRest)).toBe(true); // 休養日
    const oddWeek = weekAt(1);
    expect(oddWeek.days.some((d) => d.hasTraining && d.distance === 0)).toBe(true); // 筋トレだけの日
  });
  it('午前・午後が分かれる日と、体重が欠ける日がある', () => {
    const r = buildWeekReport({ entries, weekStart: addDays(thisWeek, -7), today: TODAY, labels, schedule: data.weeklySchedule });
    expect(r.days.some((d) => d.showSessionLabels)).toBe(true);
    expect(r.days.some((d) => d.weight === null)).toBe(true);
    expect(dailyWeightMap(entries).size).toBeGreaterThan(20);
  });
});
