import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Chart, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import db from '../db.js';
import { useEntries } from '../useEntries.js';
import { ERGO_ZONES, exerciseLabel, boatShort } from '../lib.js';
import { buildWeekReport, dailyWeightMap, weightSeries, UNCLASSIFIED } from '../report/calc.js';
import { formatSplit, formatDuration, formatDistance, formatDelta, formatKg, DASH } from '../report/format.js';
import { weekStartOf, addDays, todayInTz, formatMD } from '../report/week.js';

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const NAVY = '#1b365d';
const MUTE = '#8a8578';
const LABELS = { exerciseLabel, boatLabel: boatShort, zoneLabel: (id) => id };
// エルゴと水上は、行の頭に小さなラベルを付けて見分ける(色は増やさず、枠だけ/塗りで区別)
const KIND_TAG = {
  ergo: { label: 'エルゴ', cls: 'text-brand' },
  water: { label: '水上', cls: 'bg-brand text-white' },
};
const SESSION_LABEL = { am: '午前', pm: '午後', '': '' };
const RANGES = [
  { id: '4w', label: '4週', weeks: 4 },
  { id: '8w', label: '8週', weeks: 8 },
  { id: 'all', label: '全期間', weeks: null },
];
const zoneInfo = (zone) =>
  zone === UNCLASSIFIED
    ? { label: '未分類', color: '#cfcac0' }
    : ERGO_ZONES.find((z) => z.id === zone) ?? { label: zone, color: '#cfcac0' };

export default function WeekReportPage() {
  const entries = useEntries();
  const schedule = useLiveQuery(() => db.weeklySchedule.toArray(), []);
  const workoutRows = useLiveQuery(() => db.workouts.toArray(), []);
  const today = todayInTz();
  const [weekStart, setWeekStart] = useState(() => weekStartOf(today));
  const [range, setRange] = useState('8w');

  const workouts = useMemo(() => new Map((workoutRows ?? []).map((w) => [String(w.id), w])), [workoutRows]);
  // 体重は日別に1か所で集計し、曜日の見出しとグラフの両方がこれを参照する
  const weights = useMemo(() => dailyWeightMap(entries ?? []), [entries]);
  const report = useMemo(
    () => (entries ? buildWeekReport({ entries, weekStart, today, labels: LABELS, schedule: schedule ?? [], workouts, weights }) : null),
    [entries, weekStart, today, schedule, workouts, weights]
  );
  if (!report) return null;

  const isCurrentWeek = weekStart >= weekStartOf(today);
  const go = (n) => setWeekStart((w) => addDays(w, 7 * n));

  return (
    <>
      <header className="flex items-center justify-between">
        <button onClick={() => go(-1)} aria-label="前の週" className="p-2 text-brand"><ChevronLeft size={22} /></button>
        <div className="text-center">
          <p className="label">週次レポート{isCurrentWeek ? '(今週)' : ''}</p>
          <h1 className="text-lg font-bold tabular-nums tracking-tight">{formatMD(report.start)} – {formatMD(report.end)}</h1>
        </div>
        <button onClick={() => go(1)} disabled={isCurrentWeek} aria-label="次の週" className="p-2 text-brand disabled:opacity-25"><ChevronRight size={22} /></button>
      </header>
      {!isCurrentWeek && (
        <button onClick={() => setWeekStart(weekStartOf(today))} className="-mt-3 text-xs text-brand">今週に戻る</button>
      )}

      <Summary report={report} />
      <WeightPanel report={report} weights={weights} today={today} range={range} setRange={setRange} />
      <section className="space-y-2.5">
        <h2 className="label">曜日別の詳細</h2>
        {report.days.map((d) => <DayBlock key={d.date} day={d} />)}
      </section>
      <Intensity data={report.intensity} />
      <Condition data={report.condition} />
    </>
  );
}

// ─── 1. 週のサマリー ─────────────────────────────────
function Summary({ report }) {
  const { summary: s, delta: d } = report;
  return (
    <section className="space-y-1.5 border-y border-line py-2.5">
      <div className="grid grid-cols-4 gap-2">
        <Stat label="総距離" value={formatDistance(s.distance.total)} delta={formatDelta(d.distance, formatDistance)} />
        <Stat label="総練習時間" value={formatDuration(s.seconds)} delta={formatDelta(d.seconds, formatDuration)} />
        <Stat label="練習回数" value={`${s.count}回`} delta={formatDelta(d.count, (n) => `${n}回`)} />
        <Stat label="休養日" value={`${s.restDays}日`} delta={formatDelta(d.restDays, (n) => `${n}日`)} />
      </div>
      <p className="text-[12px] tabular-nums text-mute">
        エルゴ {formatDistance(s.distance.ergo)} · 水上 {formatDistance(s.distance.water)} · その他 {formatDistance(s.distance.cross)}
      </p>
    </section>
  );
}

function Stat({ label, value, delta }) {
  return (
    <div>
      <p className="text-[11px] text-mute">{label}</p>
      <p className="text-[16px] font-bold leading-tight tabular-nums tracking-tight">{value}</p>
      <p className="h-3 text-[10px] leading-3 tabular-nums text-mute">{delta}</p>
    </div>
  );
}

// ─── 2. 体重の推移 ───────────────────────────────────
function WeightPanel({ report, weights, today, range, setRange }) {
  const end = report.end < today ? report.end : today; // 未来の日は、グラフに含めない
  const chosen = RANGES.find((r) => r.id === range) ?? RANGES[1];
  const first = [...weights.keys()].sort()[0];
  const from = chosen.weeks ? addDays(end, -7 * chosen.weeks + 1) : first && first <= end ? first : addDays(end, -27);
  const series = useMemo(() => weightSeries(weights, from, end), [weights, from, end]);
  const w = report.weight;
  const has = series.daily.some((v) => v !== null);

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="label">体重の推移</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded border px-2 py-0.5 text-[11px] leading-4 ${range === r.id ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {has ? (
        // 簡素なグラフ: 凡例・縦の目盛り線なし、高さ 88px。点が測定値、線が7日移動平均
        <div className="h-[88px]">
          <Line
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              layout: { padding: { top: 2, right: 2 } },
              plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
              scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 4, autoSkip: true, maxRotation: 0, font: { size: 9 } } },
                y: { grid: { color: '#ece9e1' }, border: { display: false }, ticks: { maxTicksLimit: 3, font: { size: 9 } } },
              },
            }}
            data={{
              labels: series.dates.map(formatMD),
              datasets: [
                { label: '測定値', data: series.daily, showLine: false, pointRadius: 1.5, backgroundColor: MUTE, borderColor: MUTE },
                { label: '7日移動平均', data: series.average, borderColor: NAVY, backgroundColor: NAVY, borderWidth: 1.5, pointRadius: 0, tension: 0, spanGaps: true },
              ],
            }}
          />
        </div>
      ) : (
        <p className="py-3 text-center text-[12px] text-mute">この期間は、体重の記録がありません。</p>
      )}
      <p className="mt-1 text-[11px] leading-snug tabular-nums text-mute">
        今週 平均 {formatKg(w.average)}({w.diff === null ? '先週比 —' : `先週比 ${formatDelta(w.diff, (n) => `${n.toFixed(1)}kg`)}`}) · 最小 {formatKg(w.min)} · 最大 {formatKg(w.max)}
      </p>
      <p className="text-[10px] leading-snug text-mute/80">点: 測定値 / 線: 7日移動平均 · 今週 {w.count}日測定</p>
    </section>
  );
}

// ─── 3. 曜日別の詳細 ─────────────────────────────────
function DayBlock({ day }) {
  const empty = !day.hasTraining;
  return (
    <div
      id={`week-day-${day.date}`}
      className={`scroll-mt-4 rounded-md border px-3 py-2 ${day.isToday ? 'border-brand bg-brand-soft/50' : 'border-line'} ${day.isFuture ? 'opacity-70' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-bold tabular-nums tracking-tight">
          {day.label} <span className="font-normal text-mute">{formatMD(day.date)}</span>
          {day.isToday && <span className="ml-1.5 text-[10px] font-normal text-brand">今日</span>}
        </h3>
        <p className="text-[12px] tabular-nums text-mute">
          {day.distance > 0 || day.seconds > 0 ? <><b className="text-ink">{formatDistance(day.distance)}</b> · {formatDuration(day.seconds)} · </> : null}
          {day.weight === null ? DASH : formatKg(day.weight)}
        </p>
      </div>

      {empty && day.isRest && <p className="mt-0.5 text-[12px] text-mute">休養</p>}
      {empty && !day.isRest && day.planned && <p className="mt-0.5 text-[12px] text-mute">予定: {day.planned}</p>}
      {empty && day.isToday && !day.planned && <p className="mt-0.5 text-[12px] text-mute">まだ記録がありません</p>}

      {day.sessions.map((s) => (
        <div key={s.key || 'none'} className="mt-1">
          {day.showSessionLabels && s.key && <p className="text-[10px] font-bold tracking-wide text-brand">{SESSION_LABEL[s.key]}</p>}
          {s.aerobic.map((r) => <AerobicRow key={`${r.kind}-${r.id}`} row={r} />)}
          {s.strength.map((x) => <StrengthRow key={x.name} item={x} />)}
        </div>
      ))}
    </div>
  );
}

function AerobicRow({ row: r }) {
  const metrics = [
    r.distance !== null && formatDistance(r.distance),
    r.seconds !== null && formatDuration(r.seconds),
    r.kind === 'cross'
      ? r.paceSecPerKm !== null
        ? `${formatDuration(r.paceSecPerKm)}/km`
        : r.speedKmh !== null && `${r.speedKmh.toFixed(1)}km/h`
      : r.split !== null && `@${formatSplit(r.split)}`,
    r.rate !== null && `${Math.round(r.rate)}spm`,
    r.hr !== null && `HR${Math.round(r.hr)}`,
  ].filter(Boolean);

  return (
    <div className="border-t border-line py-1 first:border-t-0">
      <p className="flex flex-wrap items-baseline gap-x-2 leading-snug">
        {KIND_TAG[r.kind] && <span className={`self-center rounded-sm border border-brand px-1 text-[10px] font-bold leading-4 ${KIND_TAG[r.kind].cls}`}>{KIND_TAG[r.kind].label}</span>}
        <span className="text-[13px] font-semibold">{r.name}</span>
        {r.boat && <span className="text-[11px] text-mute">{r.boat}</span>}
        <span className="text-[12px] tabular-nums text-ink/80">{metrics.join('  ')}</span>
      </p>
      {r.splits.length > 1 && <p className="text-[11px] leading-snug tabular-nums text-mute">{r.splits.map(formatSplit).join(' / ')}</p>}
    </div>
  );
}

// 筋トレは小さく・灰色寄りにして、常時表示(見た目の重さだけ軽くする)
function StrengthRow({ item: x }) {
  return (
    <p className="border-t border-line py-0.5 text-[11px] leading-snug tabular-nums text-mute first:border-t-0">
      <span className="text-ink/70">{x.name}</span> {x.text}
      <span className="ml-1.5">
        {x.volume > 0 ? `計${Math.round(x.volume).toLocaleString()}kg` : `計${x.totalReps}回`}
        {x.e1rm !== null && ` · 1RM ${Math.round(x.e1rm)}kg`}
      </span>
    </p>
  );
}

// ─── 4. 強度別の練習量 ───────────────────────────────
function Intensity({ data }) {
  if (!data.rows.length) {
    return (
      <section>
        <h2 className="label mb-1">強度別の練習量</h2>
        <p className="text-[12px] text-mute">この週は、エルゴ・水上の記録がありません。</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="label mb-2">強度別の練習量(エルゴ・水上)</h2>
      <div className="flex h-3 overflow-hidden rounded-sm bg-line" role="img" aria-label="強度別の時間の割合">
        {data.rows.map((r) => (
          <span key={r.zone} style={{ width: `${r.share * 100}%`, background: zoneInfo(r.zone).color }} title={`${zoneInfo(r.zone).label} ${Math.round(r.share * 100)}%`} />
        ))}
      </div>
      <table className="mt-2 w-full text-[12px] tabular-nums">
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.zone} className="border-t border-line first:border-t-0">
              <td className="py-1 pr-2">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: zoneInfo(r.zone).color }} />
                {zoneInfo(r.zone).label}
              </td>
              <td className="py-1 text-right">{formatDistance(r.distance)}</td>
              <td className="py-1 text-right">{formatDuration(r.seconds)}</td>
              <td className="w-12 py-1 text-right text-mute">{Math.round(r.share * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-mute">割合は時間で計算しています。</p>
    </section>
  );
}

// ─── 5. コンディション ───────────────────────────────
function Condition({ data }) {
  if (!data) return null; // 記録がなければ、この項目は省略する
  return (
    <section>
      <h2 className="label mb-1">コンディション(週平均・{data.days}日分)</h2>
      <p className="text-[12px] tabular-nums text-mute">
        睡眠 {data.sleep === null ? DASH : `${data.sleep.toFixed(1)}h`} · 疲労 {data.fatigue === null ? DASH : `${data.fatigue.toFixed(1)}/5`} · 安静時心拍 {data.restingHR === null ? DASH : `${Math.round(data.restingHR)}`}
      </p>
    </section>
  );
}

