import { Waves, Dumbbell, Footprints, HeartPulse, Scale } from 'lucide-react';
import { useEntries } from '../useEntries.js';
import { KINDS, today, weekStart, formatDate } from '../lib.js';

const QUICK = [
  { kind: 'ergo', Icon: Waves },
  { kind: 'strength', Icon: Dumbbell },
  { kind: 'cross', Icon: Footprints },
  { kind: 'condition', Icon: HeartPulse },
  { kind: 'weight', Icon: Scale },
];

export default function TodayPage({ onAdd }) {
  const entries = useEntries();
  if (!entries) return null;

  const t = today();
  const ws = weekStart(t);
  const thisWeek = entries.filter((e) => e.date >= ws);
  const todays = entries.filter((e) => e.date === t);

  const ergoWeek = thisWeek.filter((e) => e.kind === 'ergo');
  const km = ergoWeek.reduce((s, e) => s + (e.distance || 0), 0) / 1000;
  const days = new Set(
    thisWeek.filter((e) => ['ergo', 'strength', 'cross'].includes(e.kind)).map((e) => e.date)
  ).size;
  const latestWeight = entries.find((e) => e.kind === 'weight');

  return (
    <>
      <header>
        <p className="text-sm text-slate-500">{formatDate(t)}</p>
        <h1 className="text-2xl font-bold">今日の練習</h1>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="今週の練習日" value={days} unit="日" />
        <Stat label="今週のエルゴ" value={km.toFixed(1)} unit="km" />
        <Stat label="最新体重" value={latestWeight?.weight ?? '-'} unit="kg" />
      </div>

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">クイック記録</h2>
        <div className="grid grid-cols-5 gap-2">
          {QUICK.map(({ kind, Icon }) => (
            <button
              key={kind}
              onClick={() => onAdd(kind)}
              className="flex flex-col items-center gap-1 rounded-xl bg-brand-soft py-3 text-[11px] font-medium text-brand active:opacity-70"
            >
              <Icon size={22} />
              {KINDS[kind].label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 text-sm font-semibold text-slate-500">今日の記録</h2>
        {todays.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">まだ記録がありません</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todays.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="py-2.5">
                <p className="text-xs font-semibold text-brand">{KINDS[e.kind].label}</p>
                <p className="text-sm">{KINDS[e.kind].summary(e)}</p>
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
    <div className="card text-center">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">
        {value}
        <span className="ml-0.5 text-xs font-normal text-slate-400">{unit}</span>
      </p>
    </div>
  );
}
