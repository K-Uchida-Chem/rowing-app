import { useLiveQuery } from 'dexie-react-hooks';
import db, { lastBackup } from '../db.js';
import { useEntries } from '../useEntries.js';
import {
  KINDS, today, weekStart, formatDate, labelOf, SCHEDULE_ERGO,
} from '../lib.js';
import { readiness, weeklyLoad, loadWarning, goalProgress } from '../stats.js';

export default function TodayPage({ onAdd, onGo, flash, onDismissFlash }) {
  const entries = useEntries();
  const schedule = useLiveQuery(() => db.weeklySchedule.toArray(), []);
  const goals = useLiveQuery(() => db.goals.toArray(), []);
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

  const plan = schedule?.find((s) => s.dayOfWeek === new Date().getDay());
  const planText = plan && [
    plan.ergoType && plan.ergoType !== 'none' && `エルゴ ${labelOf(SCHEDULE_ERGO, plan.ergoType)}`,
    plan.strengthDay && plan.strengthDay !== 'none' && `筋トレ ${plan.strengthDay}`,
    plan.description,
  ].filter(Boolean).join(' · ');

  const ready = readiness(entries, t);
  const warning = loadWarning(weeklyLoad(entries, 8).load);
  const goalRows = (goals ?? []).map((g) => ({ g, p: goalProgress(g, entries) })).filter((x) => x.p);

  const backup = lastBackup();
  const backupDays = backup ? Math.floor((Date.now() - new Date(`${backup}T00:00:00`)) / 86400000) : null;
  const needBackup = entries.length > 0 && (backupDays == null || backupDays >= 14);

  return (
    <>
      <header>
        <p className="label">{formatDate(t)}</p>
        <h1 className="text-2xl font-bold tracking-tight">今日</h1>
      </header>

      {flash && (
        <button onClick={onDismissFlash} className="w-full rounded-md border border-accent px-3 py-2.5 text-left text-sm font-semibold text-accent">
          {flash}
        </button>
      )}

      {planText && (
        <section>
          <h2 className="label mb-1">今日の予定</h2>
          <p className="text-[15px]">{planText}</p>
        </section>
      )}

      {ready ? (
        <section className="flex items-center gap-4 border-y border-line py-3">
          <p className="text-4xl font-bold tracking-tight">{ready.score}</p>
          <div>
            <p className="label">コンディション</p>
            <p className="text-[15px] font-medium">{ready.label}</p>
          </div>
        </section>
      ) : (
        <button onClick={() => onAdd('condition')} className="w-full rounded-md border border-dashed border-line px-3 py-2.5 text-left text-sm text-mute">
          今日のコンディションを記録すると、スコアが出ます
        </button>
      )}

      {warning && <p className="rounded-md bg-brand-soft px-3 py-2.5 text-sm text-ink">{warning}</p>}

      <div className="flex divide-x divide-line border-y border-line py-3">
        <Stat label="今週の練習" value={days} unit="日" />
        <Stat label="今週のエルゴ" value={km.toFixed(1)} unit="km" />
        <Stat label="体重" value={latestWeight?.weight ?? '–'} unit="kg" />
      </div>

      {goalRows.length > 0 && (
        <section>
          <h2 className="label mb-2">目標</h2>
          <ul className="space-y-3">
            {goalRows.map(({ g, p }) => (
              <li key={g.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{p.label}</span>
                  <span className="text-mute">
                    {p.current ?? '–'} → <b className={p.reached ? 'text-accent' : 'text-ink'}>{p.targetText}</b>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-sm bg-line">
                  <div className="h-full rounded-sm bg-brand" style={{ width: `${Math.round(p.ratio * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {needBackup && (
        <button onClick={() => onGo('settings')} className="w-full rounded-md border border-line px-3 py-2.5 text-left text-sm text-mute">
          {backupDays == null ? 'まだバックアップを取っていません。' : `最後のバックアップは${backupDays}日前です。`}
          設定から書き出しておくと安心です。
        </button>
      )}
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
