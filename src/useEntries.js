import { useLiveQuery } from 'dexie-react-hooks';
import db from './db.js';
import { KINDS } from './lib.js';

// 全種類の記録を { kind, ...record } の配列にして、新しい順で返す。読み込み中は undefined。
export function useEntries() {
  return useLiveQuery(async () => {
    const lists = await Promise.all(
      Object.entries(KINDS).map(async ([kind, def]) =>
        (await db[def.table].toArray()).map((r) => ({ ...r, kind }))
      )
    );
    return lists.flat().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, []);
}
