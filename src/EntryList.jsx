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
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold leading-snug">
                    {row.title}
                    {row.badge && <span className="self-center rounded-sm border border-accent px-1 text-[10px] font-bold leading-4 text-accent">{row.badge}</span>}
                  </p>
                  {row.detail && <p className="mt-0.5 text-[13px] leading-snug text-ink/80">{row.detail}</p>}
                  {row.lines.map((l, i) => (
                    <p key={i} className="mt-0.5 whitespace-pre-wrap text-xs leading-snug text-mute">{l}</p>
                  ))}
                </>
              );
              return (
                <li key={e.id} className="flex items-start">
                  <div className="min-w-0 flex-1">
                    {onEdit ? (
                      <button onClick={() => onEdit(e)} className="block w-full py-2.5 text-left">{body}</button>
                    ) : (
                      <div className="py-2.5">{body}</div>
                    )}
                    {/* リンクは、編集ボタンの外に置く(ボタンの中にリンクは入れられない) */}
                    {row.links.length > 0 && (
                      <p className="-mt-1.5 pb-2.5">
                        {row.links.map((k) => (
                          <a key={k.url} href={k.url} target="_blank" rel="noreferrer noopener" className="mr-3 text-xs text-brand underline">
                            {k.label}を開く
                          </a>
                        ))}
                      </p>
                    )}
                  </div>
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
