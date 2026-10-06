import { useLiveQuery } from 'dexie-react-hooks';
import db from './db.js';
import { KINDS } from './lib.js';

// 全種類の記録を { kind, ...record } の配列にして、新しい順で返す。読み込み中は undefined。
// 取り込みデータに日付のない壊れた行があっても、画面全体が落ちないよう除外する。
export function useEntries() {
  return useLiveQuery(async () => {
    const lists = await Promise.all(
      Object.entries(KINDS).map(async ([kind, def]) =>
        (await db[def.table].toArray()).filter((r) => typeof r.date === 'string').map((r) => ({ ...r, kind }))
      )
    );
    return lists.flat().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, []);
}
