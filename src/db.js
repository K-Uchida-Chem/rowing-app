import Dexie from 'dexie';

// 旧アプリ(RowingAppDB)のエクスポートJSONをそのまま取り込めるよう、テーブル名と項目名を揃えている
const db = new Dexie('RowingLogDB');

db.version(1).stores({
  ergoRecords: '++id, date, type',
  strengthRecords: '++id, date, exercise',
  crossTrainingRecords: '++id, date, type',
  conditionRecords: '++id, date',
  bodyWeightRecords: '++id, date',
  // 旧アプリ互換のため残す(画面は未対応)
  nutritionRecords: '++id, date',
  weeklySchedule: 'dayOfWeek',
  goals: 'id, type',
});

export const TABLES = [
  'ergoRecords',
  'strengthRecords',
  'crossTrainingRecords',
  'conditionRecords',
  'bodyWeightRecords',
  'nutritionRecords',
  'weeklySchedule',
  'goals',
];

export async function exportData() {
  const out = {};
  for (const t of TABLES) out[t] = await db[t].toArray();
  return JSON.stringify(out);
}

// 既存データはすべて置き換わる
export async function importData(json) {
  const data = JSON.parse(json);
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    for (const t of TABLES) {
      await db[t].clear();
      if (data[t]?.length) await db[t].bulkAdd(data[t]);
    }
  });
}

// 旧アプリ(RowingAppDB)が同じブラウザに残っていて、新DBが空なら中身をコピーする。旧データは消さない。
export async function migrateFromLegacy() {
  try {
    if (!(await Dexie.exists('RowingAppDB'))) return false;
    const counts = await Promise.all(TABLES.map((t) => db[t].count()));
    if (counts.some((n) => n > 0)) return false;

    const old = new Dexie('RowingAppDB');
    await old.open();
    const data = {};
    for (const t of old.tables.map((x) => x.name)) {
      if (TABLES.includes(t)) data[t] = await old.table(t).toArray();
    }
    old.close();

    await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
      for (const t of TABLES) if (data[t]?.length) await db[t].bulkAdd(data[t]);
    });
    return true;
  } catch (err) {
    console.warn('旧データの引き継ぎに失敗しました', err);
    return false;
  }
}

export default db;
