import { describe, it, expect } from 'vitest';
import { looseDuration, normalizeRecord, cleanPains } from './lib.js';

describe('ゆるい時間表記', () => {
  it('コロンつきはそのまま、数字だけは分、「+」は足し算', () => {
    expect(looseDuration('30:00')).toBe(1800);
    expect(looseDuration('1:30:00')).toBe(5400);
    expect(looseDuration('60')).toBe(3600);
    expect(looseDuration('10+5')).toBe(900);
    expect(looseDuration('25+25')).toBe(3000);
    expect(looseDuration('10:00+5')).toBe(900);
    expect(looseDuration('')).toBeNull();
    expect(looseDuration(null)).toBeNull();
    expect(looseDuration('abc')).toBeNull();
    expect(looseDuration('10+x')).toBeNull();
  });
});

describe('旧アプリ・Slack由来の記録を、新アプリの形にそろえる', () => {
  it('エルゴ: 距離が空の時間メニューの区間を捨てない。時間とスプリットから距離を出す', () => {
    const r = normalizeRecord('ergo', {
      type: 'UT2', date: '2026-09-01',
      intervals: [{ distance: '', time: '30:00', split: '2:16.4' }, { distance: '', time: '30:00', split: '2:19.4' }],
    });
    expect(r.intervals).toHaveLength(2);
    expect(r.intervals[0].time).toBe('30:00.0');
    expect(r.intervals[0].distance).toBe(Math.round((1800 / 136.4) * 500)); // 6598
    expect(r.intervalBy).toBe('time');
  });
  it('エルゴ: 時間が「60」(分)だけの区間は 60分として読む', () => {
    const r = normalizeRecord('ergo', { type: 'UT2', date: 'x', intervals: [{ distance: '', time: '60', split: '2:12.8' }] });
    expect(r.intervals[0].time).toBe('60:00.0');
  });
  it('エルゴ: 時間だけ・スプリットだけの区間(結果未入力)も残す', () => {
    const r = normalizeRecord('ergo', { type: 'UT2', date: 'x', intervals: [{ time: '20:00.0' }, { time: '20:00.0' }, { time: '20:00.0' }] });
    expect(r.intervals).toHaveLength(3);
    const s = normalizeRecord('ergo', { type: 'UT1', date: 'x', intervals: [{ split: '2:03.9', watts: 184 }, { split: '2:01.9', watts: 193 }] });
    expect(s.intervals).toHaveLength(2);
    expect(s.intervals[0].split).toBe('2:03.9');
  });
  it('エルゴ: 距離とスプリットから、足りない時間を出す', () => {
    const r = normalizeRecord('ergo', { type: 'AT', date: 'x', intervalBy: 'distance', intervals: [{ distance: 2500, split: '2:00.0' }] });
    expect(r.intervals[0].time).toBe('10:00.0');
  });
  it('エルゴ: 距離つきの区間はこれまでどおり(intervalBy は変えない)', () => {
    const r = normalizeRecord('ergo', { type: 'AT', date: 'x', intervals: [{ distance: '4000', time: '15:41.8', split: '1:57.7' }] });
    expect(r.intervals[0]).toMatchObject({ distance: 4000, time: '15:41.8', split: '1:57.7' });
    expect(r.intervalBy).toBeUndefined();
  });
  it('レートの異常値(222424)は捨てる。普通の値は残す', () => {
    expect(normalizeRecord('ergo', { date: 'x', rate: 222424 }).rate).toBeUndefined();
    expect(normalizeRecord('ergo', { date: 'x', rate: 24 }).rate).toBe(24);
    expect(normalizeRecord('water', { date: 'x', intervals: [{ distance: 500, time: '1:45.0', rate: 999 }] }).intervals[0].rate).toBeUndefined();
  });
  it('ラン/バイク: bike はサイクリング。other はそのまま', () => {
    expect(normalizeRecord('cross', { date: 'x', type: 'bike', time: '60:00' }).type).toBe('cycling');
    expect(normalizeRecord('cross', { date: 'x', type: 'cycling' }).type).toBe('cycling');
    expect(normalizeRecord('cross', { date: 'x', type: 'other' }).type).toBe('other');
  });
  it('ラン/バイク: 「10+5」「25+25」は分の合計にして、元の書き方も残す', () => {
    const a = normalizeRecord('cross', { date: 'x', type: 'running', time: '10+5' });
    expect(a.time).toBe('15:00.0');
    expect(a.timeText).toBe('10+5');
    expect(normalizeRecord('cross', { date: 'x', type: 'bike', time: '25+25' }).time).toBe('50:00.0');
    expect(normalizeRecord('cross', { date: 'x', type: 'bike', time: '59:54' }).timeText).toBeUndefined();
  });
  it('ラン/バイク: 時間が空でも落ちない', () => {
    expect(normalizeRecord('cross', { date: 'x', type: 'cycling', time: '' }).time).toBe('');
  });
  it('筋トレ: 種目が「その他」で、メモに種目名だけが入っている旧データは、メモの1行目を種目名にする', () => {
    const r = normalizeRecord('strength', { date: 'x', exercise: 'other', weight: 50, reps: 8, sets: 3, memo: 'ショルダープレス' });
    expect(r.exerciseName).toBe('ショルダープレス');
    expect(r.nameFromMemo).toBe(true);
    expect(normalizeRecord('strength', { date: 'x', exercise: 'other', exerciseName: 'ベンチプル', memo: '重かった' }).exerciseName).toBe('ベンチプル');
    expect(normalizeRecord('strength', { date: 'x', exercise: 'bench', memo: 'よかった' }).exerciseName).toBeUndefined();
  });
});

describe('痛み・目標スプリット・区間ごとの心拍の読み込み', () => {
  it('痛み: 部位とつらさ(1〜5)がそろったものだけ残す。同じ部位は強いほうに', () => {
    expect(cleanPains([{ part: 'lowback', level: 2 }, { part: 'lowback', level: 3 }, { part: 'hip', level: 0 }, { part: '', level: 3 }, { part: 'knee', level: 9 }, null]))
      .toEqual([{ part: 'lowback', level: 3 }]);
    expect(cleanPains([])).toBeUndefined();
    expect(cleanPains(undefined)).toBeUndefined();
    expect(cleanPains('腰')).toBeUndefined();
  });
  it('コンディションの痛みを読み込む。壊れた値でも落ちない', () => {
    expect(normalizeRecord('condition', { date: 'x', pains: [{ part: 'rib', level: '4' }] }).pains).toEqual([{ part: 'rib', level: 4 }]);
    expect(normalizeRecord('condition', { date: 'x', pains: 'なし' }).pains).toBeUndefined();
  });
  it('目標スプリットをそろえる。読めないものは捨てる', () => {
    expect(normalizeRecord('ergo', { date: 'x', targetSplit: '2:05' }).targetSplit).toBe('2:05.0');
    expect(normalizeRecord('ergo', { date: 'x', targetSplit: '' }).targetSplit).toBeUndefined();
    expect(normalizeRecord('ergo', { date: 'x', targetSplit: 'abc' }).targetSplit).toBeUndefined();
  });
  it('区間ごとの心拍。ありえない値は捨てる。心拍だけの区間も残す', () => {
    const r = normalizeRecord('ergo', { date: 'x', intervals: [{ distance: 1000, time: '3:30.0', avgHR: '163', maxHR: 174 }, { avgHR: 9999 }, { avgHR: 150 }] });
    expect(r.intervals[0]).toMatchObject({ avgHR: 163, maxHR: 174 });
    expect(r.intervals).toHaveLength(2); // 9999 は心拍として捨てるので、中身のない区間は残らない
    expect(r.intervals[1].avgHR).toBe(150);
  });
});

describe('入力欄の案内文の例が、実際の整形と合っている', () => {
  it('数字だけ入力すると、右から 1/10秒・秒2桁・分 の順に並ぶ', async () => {
    const { formatTimeInput, KINDS } = await import('./lib.js');
    expect(formatTimeInput('1463')).toBe('1:46.3');
    expect(formatTimeInput('2050')).toBe('2:05.0');
    expect(formatTimeInput('30000')).toBe('30:00.0');
    expect(formatTimeInput('5300')).toBe('5:30.0');
    expect(formatTimeInput('7053')).toBe('7:05.3');
    // 案内文(label)に書いてある「数字 → 結果」を、すべて実際に試す
    const examples = [];
    for (const def of Object.values(KINDS)) {
      for (const f of def.fields) {
        const m = typeof f.label === 'string' && f.label.match(/(\d+) → (\d+:\d\d\.\d)/);
        if (m) examples.push([f.key, m[1], m[2]]);
      }
    }
    expect(examples.length).toBeGreaterThanOrEqual(4);
    for (const [, digits, expected] of examples) expect(formatTimeInput(digits)).toBe(expected);
  });
});
