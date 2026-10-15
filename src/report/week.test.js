import { describe, it, expect } from 'vitest';
import { addDays, dayOfWeek, weekStartOf, weekDates, todayInTz, diffDays, formatMD } from './week.js';

describe('週の境界(月曜始まり)', () => {
  it('月曜はその日が週の開始', () => {
    expect(weekStartOf('2026-10-12', 1)).toBe('2026-10-12'); // 2026-10-12 は月曜
  });
  it('日曜は、前の月曜が週の開始(日曜は週の最終日)', () => {
    expect(weekStartOf('2026-10-18', 1)).toBe('2026-10-12');
  });
  it('週の途中・月またぎ・年またぎ', () => {
    expect(weekStartOf('2026-10-15', 1)).toBe('2026-10-12');
    expect(weekStartOf('2026-11-01', 1)).toBe('2026-10-26'); // 日曜 → 月またぎ
    expect(weekStartOf('2027-01-01', 1)).toBe('2026-12-28'); // 金曜 → 年またぎ
  });
  it('日曜始まりにも切り替えられる', () => {
    expect(weekStartOf('2026-10-18', 0)).toBe('2026-10-18');
    expect(weekStartOf('2026-10-17', 0)).toBe('2026-10-11');
  });
  it('週の7日分は、開始日から連続する', () => {
    expect(weekDates('2026-10-12')).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ]);
  });
  it('うるう日を含む', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(weekStartOf('2028-03-01', 1)).toBe('2028-02-28');
  });
  it('曜日・日数の差・表示', () => {
    expect(dayOfWeek('2026-10-12')).toBe(1);
    expect(diffDays('2026-10-12', '2026-10-19')).toBe(7);
    expect(formatMD('2026-10-05')).toBe('10/5');
  });
});

describe('今日の日付(Asia/Tokyo)', () => {
  it('UTC では前日でも、日本ではもう次の日', () => {
    // 2026-10-11 20:00 UTC = 2026-10-12 05:00 JST(月曜)
    expect(todayInTz(new Date('2026-10-11T20:00:00Z'))).toBe('2026-10-12');
  });
  it('日本の 23:59 はまだその日、0:00 で変わる', () => {
    expect(todayInTz(new Date('2026-10-12T14:59:00Z'))).toBe('2026-10-12'); // 23:59 JST
    expect(todayInTz(new Date('2026-10-12T15:00:00Z'))).toBe('2026-10-13'); // 0:00 JST
  });
  it('週の境界: 日曜 23:59 JST と 月曜 0:00 JST で、週が切り替わる', () => {
    const sunNight = todayInTz(new Date('2026-10-18T14:59:00Z')); // 日曜 23:59 JST
    const monMorning = todayInTz(new Date('2026-10-18T15:00:00Z')); // 月曜 0:00 JST
    expect(weekStartOf(sunNight)).toBe('2026-10-12');
    expect(weekStartOf(monMorning)).toBe('2026-10-19');
  });
});
