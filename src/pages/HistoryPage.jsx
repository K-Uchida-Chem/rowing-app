import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db.js';
import { useEntries } from '../useEntries.js';
import EntryList from '../EntryList.jsx';
import { KINDS, formatDate } from '../lib.js';

export default function HistoryPage({ onEdit, onOpenDay }) {
  const entries = useEntries();
  const notes = useLiveQuery(async () => Object.fromEntries((await db.dayNotes.toArray()).map((n) => [n.date, n.note])), []);
  const [filter, setFilter] = useState('all');
  if (!entries) return null;

  const shown = filter === 'all' ? entries : entries.filter((e) => e.kind === filter);

  // 日付ごとにまとめ、月が変わるところに見出しを入れる
  const days = [];
  for (const e of shown) {
    const last = days[days.length - 1];
    if (last?.date === e.date) last.items.push(e);
    else days.push({ date: e.date, items: [e] });
  }

  const remove = (e) => {
    if (confirm(`この${KINDS[e.kind].label}の記録を削除しますか?`)) db[KINDS[e.kind].table].delete(e.id);
  };

  let prevMonth = '';
  return (
    <>
      <h1 className="text-xl font-bold">履歴</h1>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
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
      <p className="-mt-2 text-xs text-mute">記録をタップすると編集できます。</p>

      {days.length === 0 && <p className="py-10 text-center text-sm text-mute">記録がありません。</p>}

      {days.map((d) => {
        const month = d.date.slice(0, 7);
        const showMonth = month !== prevMonth;
        prevMonth = month;
        return (
          <section key={d.date} className="space-y-2">
            {showMonth && (
              <h2 className="pt-3 text-sm font-bold text-mute">
                {month.slice(0, 4)}年{Number(month.slice(5))}月
              </h2>
            )}
            <button onClick={() => onOpenDay(d.date)} className="flex w-full items-baseline justify-between text-left">
              <h3 className="text-[17px] font-bold tracking-tight">{formatDate(d.date)}</h3>
              <span className="text-xs text-brand">まとめ ›</span>
            </button>
            {notes?.[d.date] && (
              <p className="whitespace-pre-wrap rounded-md bg-brand-soft px-3 py-2 text-[13px] leading-relaxed">{notes[d.date]}</p>
            )}
            <EntryList entries={d.items} onEdit={onEdit} onDelete={remove} />
          </section>
        );
      })}
    </>
  );
}
