import { describe, it, expect } from 'vitest';
import { rowsToSets, setRowsFrom, emptySetRow, inferBy } from './recordForm.js';

describe('筋トレのセット入力', () => {
  it('行 → セット: 「重量×回数×セット数」を、1セットずつに広げる。回数が空の行は無視', () => {
    const sets = rowsToSets([
      { weight: '40', reps: '10', count: '3' },
      { weight: '45', reps: '8', count: '1' },
      { weight: '50', reps: '', count: '2' },
    ]);
    expect(sets).toHaveLength(4);
    expect(sets.map((s) => `${s.weight}x${s.reps}`)).toEqual(['40x10', '40x10', '40x10', '45x8']);
  });
  it('自重(重量が空)は 0kg。セット数が空・0 でも 1セットにする', () => {
    expect(rowsToSets([{ weight: '', reps: '10', count: '' }])).toEqual([{ weight: 0, reps: 10 }]);
    expect(rowsToSets([{ weight: '', reps: '10', count: '0' }])).toHaveLength(1);
  });
  it('小数の重量(2.5kg 刻み)', () => {
    expect(rowsToSets([{ weight: '62.5', reps: '5', count: '2' }])[0].weight).toBe(62.5);
  });
  it('記録 → 行: 同じ重量・回数が続くセットは1行にまとめる', () => {
    const rows = setRowsFrom({ setList: [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }, { weight: 60, reps: 6 }, { weight: 55, reps: 8 }, { weight: 55, reps: 8 }] });
    expect(rows).toEqual([
      { weight: '60', reps: '8', count: '2' },
      { weight: '60', reps: '6', count: '1' },
      { weight: '55', reps: '8', count: '2' },
    ]);
  });
  it('記録 → 行: 数字で保存された記録(重量・回数・セット数)', () => {
    expect(setRowsFrom({ weight: 120, reps: 6, sets: 3 })).toEqual([{ weight: '120', reps: '6', count: '3' }]);
    expect(setRowsFrom({ weight: undefined, reps: 10, sets: 2 })).toEqual([{ weight: '', reps: '10', count: '2' }]);
  });
  it('記録 → 行: セットがない記録は、空の1行', () => {
    expect(setRowsFrom({})).toEqual([emptySetRow()]);
    expect(setRowsFrom({ setList: [] })).toEqual([emptySetRow()]);
  });
  it('行 → セット → 行 で、内容が変わらない(開いて更新しても、セットが崩れない)', () => {
    const rows = [{ weight: '60', reps: '8', count: '2' }, { weight: '', reps: '12', count: '3' }];
    const back = setRowsFrom({ setList: rowsToSets(rows) });
    expect(back).toEqual(rows);
  });
});

describe('メニューの側の見分け', () => {
  it('区間があれば、その記録の側。なければ menuBy', () => {
    expect(inferBy({ intervals: [{}], intervalBy: 'time' })).toBe('time');
    expect(inferBy({ intervals: [{}] })).toBe('distance');
    expect(inferBy({ menuBy: 'time', distance: 7500, time: '30:00.0' })).toBe('time');
  });
  it('時間だけがあって距離がない記録は、時間メニュー(隠れた時間を捨てない)', () => {
    expect(inferBy({ time: '60:00.0' })).toBe('time');
  });
  it('距離がある・何もない・新規は距離メニュー', () => {
    expect(inferBy({ distance: 5, time: '25:00.0' })).toBe('distance');
    expect(inferBy({ distance: 5 })).toBe('distance');
    expect(inferBy({})).toBe('distance');
    expect(inferBy(null)).toBe('distance');
  });
});
