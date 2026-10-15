import { describe, it, expect } from 'vitest';
import { formatSplit, formatDuration, formatDistance, formatDelta, formatKg } from './format.js';

describe('formatSplit (m:ss.s)', () => {
  it('整形する', () => {
    expect(formatSplit(104.3)).toBe('1:44.3');
    expect(formatSplit(120)).toBe('2:00.0');
    expect(formatSplit(65.04)).toBe('1:05.0');
  });
  it('59.96秒は 1:00.0 に繰り上がる(0:60.0 にしない)', () => {
    expect(formatSplit(59.96)).toBe('1:00.0');
    expect(formatSplit(119.97)).toBe('2:00.0');
  });
  it('値がなければ —', () => {
    expect(formatSplit(null)).toBe('—');
    expect(formatSplit(NaN)).toBe('—');
    expect(formatSplit(0)).toBe('—');
  });
});

describe('formatDuration (m:ss / h:mm:ss)', () => {
  it('1時間未満は m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3599)).toBe('59:59');
  });
  it('1時間以上は h:mm:ss', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(5025)).toBe('1:23:45');
  });
  it('秒未満は四捨五入。59.6秒は 1:00', () => {
    expect(formatDuration(59.6)).toBe('1:00');
    expect(formatDuration(3599.6)).toBe('1:00:00');
  });
  it('値がなければ —', () => {
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
  });
});

describe('formatDistance', () => {
  it('1000m以上は km(小数第1位)、未満は m', () => {
    expect(formatDistance(999)).toBe('999m');
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(12640)).toBe('12.6km');
    expect(formatDistance(0)).toBe('0m');
  });
  it('値がなければ —', () => {
    expect(formatDistance(null)).toBe('—');
  });
});

describe('formatDelta / formatKg', () => {
  it('符号つきで増減を出す', () => {
    expect(formatDelta(3200, (a) => formatDistance(a))).toBe('+3.2km');
    expect(formatDelta(-500, (a) => formatDistance(a))).toBe('−500m');
    expect(formatDelta(0, (a) => formatDistance(a))).toBe('±0m');
    expect(formatDelta(null, String)).toBe('');
  });
  it('体重', () => {
    expect(formatKg(71.64)).toBe('71.6kg');
    expect(formatKg(null)).toBe('—');
  });
});
