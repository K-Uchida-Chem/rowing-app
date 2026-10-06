import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import db from '../db.js';
import { useEntries } from '../useEntries.js';
import { KINDS, formatDate } from '../lib.js';

export default function HistoryPage() {
  const entries = useEntries();
  const [filter, setFilter] = useState('all');
  if (!entries) return null;

  const shown = filter === 'all' ? entries : entries.filter((e) => e.kind === filter);
  const groups = [];
  for (const e of shown) {
    const last = groups[groups.length - 1];
    if (last?.date === e.date) last.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }

  const remove = (e) => {
    if (confirm(`この${KINDS[e.kind].label}の記録を削除しますか?`)) db[KINDS[e.kind].table].delete(e.id);
  };

  return (
    <>
      <h1 className="text-xl font-bold">履歴</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['all', { label: 'すべて' }], ...Object.entries(KINDS)].map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 rounded-md border px-3.5 py-1.5 text-sm font-medium ${
              filter === k ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && <p className="py-10 text-center text-sm text-mute">記録がありません。</p>}

      {groups.map((g) => (
        <section key={g.date} className="card">
          <h2 className="label mb-1">{formatDate(g.date)}</h2>
          <ul className="divide-y divide-line">
            {g.items.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex items-start gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-mute">{KINDS[e.kind].label}</p>
                  <p className="text-sm">{KINDS[e.kind].summary(e)}</p>
                  {e.memo && <p className="mt-0.5 text-xs text-mute">{e.memo}</p>}
                </div>
                <button onClick={() => remove(e)} aria-label="削除" className="p-1 text-mute active:text-accent">
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
