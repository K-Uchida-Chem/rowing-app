import { useEntries } from '../useEntries.js';
import { KINDS, today, weekStart, formatDate } from '../lib.js';

export default function TodayPage({ onAdd }) {
  const entries = useEntries();
  if (!entries) return null;

  const t = today();
  const ws = weekStart(t);
  const thisWeek = entries.filter((e) => e.date >= ws);
  const todays = entries.filter((e) => e.date === t);

  const km = thisWeek.filter((e) => e.kind === 'ergo').reduce((s, e) => s + (e.distance || 0), 0) / 1000;
  const days = new Set(
    thisWeek.filter((e) => ['ergo', 'strength', 'cross'].includes(e.kind)).map((e) => e.date)
  ).size;
  const latestWeight = entries.find((e) => e.kind === 'weight');

  return (
    <>
      <header>
        <p className="label">{formatDate(t)}</p>
        <h1 className="text-2xl font-bold tracking-tight">今日</h1>
      </header>

      <div className="flex divide-x divide-line border-y border-line py-3">
        <Stat label="今週の練習" value={days} unit="日" />
        <Stat label="今週のエルゴ" value={km.toFixed(1)} unit="km" />
        <Stat label="体重" value={latestWeight?.weight ?? '–'} unit="kg" />
      </div>

      <section>
        <h2 className="label mb-2">記録をつける</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(KINDS).map(([kind, def]) => (
            <button
              key={kind}
              onClick={() => onAdd(kind)}
              className="rounded-md border border-brand px-3.5 py-2 text-sm font-medium text-brand active:bg-brand-soft"
            >
              {def.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="label mb-1">今日の記録</h2>
        {todays.length === 0 ? (
          <p className="py-6 text-sm text-mute">まだありません。</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {todays.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="py-3">
                <p className="text-xs text-mute">{KINDS[e.kind].label}</p>
                <p className="text-[15px]">{KINDS[e.kind].summary(e)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="flex-1 px-3 first:pl-0">
      <p className="text-[11px] text-mute">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight">
        {value}
        <span className="ml-1 text-xs font-normal text-mute">{unit}</span>
      </p>
    </div>
  );
}
