import { Trash2 } from 'lucide-react';
import { KINDS } from './lib.js';
import { rowOf, groupNote } from './rows.js';

// 1日ぶんの記録を、種類ごとにまとめて表示する(種類の見出しは1回だけ)
// onEdit / onDelete を渡さなければ表示のみ
export default function EntryList({ entries, onEdit, onDelete }) {
  const groups = Object.keys(KINDS)
    .map((kind) => ({ kind, items: entries.filter((e) => e.kind === kind).sort((a, b) => a.id - b.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map(({ kind, items }) => (
        <section key={kind}>
          <h3 className="mb-0.5 flex items-baseline gap-2 text-xs font-bold text-brand">
            {KINDS[kind].label}
            <span className="font-normal text-mute">{groupNote(kind, items)}</span>
          </h3>
          <ul className="divide-y divide-line border-y border-line">
            {items.map((e) => {
              const row = rowOf(e);
              const body = (
                <>
                  <p className="text-[15px] font-semibold leading-snug">{row.title}</p>
                  {row.detail && <p className="mt-0.5 text-[13px] leading-snug text-ink/80">{row.detail}</p>}
                  {row.lines.map((l, i) => (
                    <p key={i} className="mt-0.5 text-xs leading-snug text-mute">{l}</p>
                  ))}
                </>
              );
              return (
                <li key={e.id} className="flex items-start">
                  {onEdit ? (
                    <button onClick={() => onEdit(e)} className="min-w-0 flex-1 py-2.5 text-left">{body}</button>
                  ) : (
                    <div className="min-w-0 flex-1 py-2.5">{body}</div>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(e)} aria-label="削除" className="p-2.5 text-mute active:text-accent">
                      <Trash2 size={17} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
