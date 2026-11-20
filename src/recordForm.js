// 入力画面の、画面に依存しない変換(テストしやすいように、LogPage から切り出したもの)

// ─── 筋トレ: セットごとの入力 ────────────────────────
// 行 = 「重量 × 回数 × セット数」。同じ重量・回数を何セットかやったときは、1行にまとめて入れられる
export const emptySetRow = () => ({ weight: '', reps: '', count: '1' });

/** 入力行 → 1セットずつの配列。回数が空の行は無視 */
export function rowsToSets(rows) {
  return rows.flatMap((r) => {
    const reps = Number(r.reps);
    if (!(reps > 0)) return [];
    const n = Math.max(1, Math.floor(Number(r.count) || 1));
    return Array.from({ length: n }, () => ({ weight: Number(r.weight) || 0, reps }));
  });
}

/** 保存してある記録(読み込み後の形)→ 入力行。同じ重量・回数が続くセットは1行にまとめる */
export function setRowsFrom(rec) {
  const list = rec.setList?.length
    ? rec.setList
    : Number(rec.reps) > 0
      ? Array.from({ length: Number(rec.sets) > 0 ? Number(rec.sets) : 1 }, () => ({ weight: rec.weight || 0, reps: rec.reps }))
      : [];
  const rows = [];
  for (const s of list) {
    const last = rows[rows.length - 1];
    if (last && Number(last.weight || 0) === (s.weight || 0) && Number(last.reps) === s.reps) last.count = String(Number(last.count) + 1);
    else rows.push({ weight: s.weight ? String(s.weight) : '', reps: String(s.reps), count: '1' });
  }
  return rows.length ? rows : [emptySetRow()];
}

// ─── エルゴ・水上・ラン/バイク ───────────────────────
/**
 * 開いた記録の、メニューの側('distance' | 'time')。
 * 時間だけが入っていて距離がない記録は、時間メニューとして開く
 * (距離メニューとして開くと、隠れた「時間」を捨ててしまうため)。
 */
export function inferBy(rec) {
  if (!rec) return 'distance';
  if (rec.intervals?.length) return rec.intervalBy === 'time' ? 'time' : 'distance';
  if (rec.menuBy === 'time') return 'time';
  return rec.time && !rec.distance ? 'time' : 'distance';
}
