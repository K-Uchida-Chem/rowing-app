import { useState } from 'react';
import {
  Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useEntries } from '../useEntries.js';
import { reviewWeek } from '../ocr.js';
import {
  parseTime, formatTime, formatDate, formatTimeInput, EXERCISES, ERGO_ZONES, labelOf,
} from '../lib.js';
import {
  lastWeekStarts, shortDate, computePBs, PB_DISTANCES, weeklyZoneMinutes, ut2Share, weeklyLoad, loadWarning,
  predict2k, wattsFromSplit, weekReport,
} from '../stats.js';

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const BRAND = '#1b365d';
const COLORS = ['#1b365d', '#c2410c', '#8a8578'];
const baseOptions = { responsive: true, plugins: { legend: { display: false } } };

export default function AnalyticsPage() {
  const entries = useEntries();
  if (!entries) return null;

  // 週ごとのエルゴ距離(km)
  const weeks = lastWeekStarts(8);
  const weekKm = weeks.map(() => 0);
  for (const e of entries.filter((e) => e.kind === 'ergo' && e.distance)) {
    const i = weeks.indexOf(weekStartOf(e.date, weeks));
    if (i >= 0) weekKm[i] += e.distance / 1000;
  }

  // 2kmタイムの推移
  const twoK = entries
    .filter((e) => e.kind === 'ergo' && !e.intervals?.length && e.distance === 2000 && parseTime(e.time))
    .reverse();

  // 体重の推移
  const weights = entries.filter((e) => e.kind === 'weight').reverse();

  // BIG3 推定1RMの推移
  const big3 = EXERCISES.filter((x) => x.big3).map((x, i) => ({
    label: x.label,
    color: COLORS[i],
    rows: entries.filter((e) => e.kind === 'strength' && e.exercise === x.id && e.estimated1RM).reverse(),
  }));
  const big3Dates = [...new Set(big3.flatMap((b) => b.rows.map((r) => r.date)))].sort();

  const pbs = computePBs(entries);
  const zones = weeklyZoneMinutes(entries, 8);
  const share = ut2Share(entries);
  const loads = weeklyLoad(entries, 8);
  const warning = loadWarning(loads.load);
  const hasZone = Object.values(zones.byZone).flat().some((v) => v > 0);

  return (
    <>
      <h1 className="text-xl font-bold">分析</h1>

      <WeeklyReport entries={entries} />

      <Panel title="自己ベスト">
        <ul className="divide-y divide-line">
          {PB_DISTANCES.map((d) => (
            <PbRow key={d} label={`${d}m`} value={pbs.dist[d]?.time} date={pbs.dist[d]?.date} />
          ))}
          {EXERCISES.filter((x) => x.big3).map((x) => (
            <PbRow key={x.id} label={`${x.label} 推定1RM`} value={pbs.lifts[x.id] && `${pbs.lifts[x.id].kg}kg`} date={pbs.lifts[x.id]?.date} />
          ))}
        </ul>
      </Panel>

      <Panel title="週ごとのエルゴ距離 (km)">
        <Bar
          options={baseOptions}
          data={{
            labels: weeks.map(shortDate),
            datasets: [{ data: weekKm.map((v) => +v.toFixed(1)), backgroundColor: BRAND, borderRadius: 2 }],
          }}
        />
      </Panel>

      <Panel title="強度ゾーン別の時間 (分)" empty={!hasZone} hint="タイムつきのエルゴ記録があると表示されます">
        {share != null && (
          <p className="mb-3 text-sm">
            直近4週の UT2 比率 <b className="text-lg">{share}%</b>
            <span className="ml-2 text-xs text-mute">基礎持久の目安は 70〜80%</span>
          </p>
        )}
        <Bar
          options={{
            responsive: true,
            plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10 } } },
            scales: { x: { stacked: true }, y: { stacked: true } },
          }}
          data={{
            labels: zones.weeks.map(shortDate),
            datasets: ERGO_ZONES.filter((z) => zones.byZone[z.id].some((v) => v > 0)).map((z) => ({
              label: z.id,
              data: zones.byZone[z.id].map(Math.round),
              backgroundColor: z.color,
            })),
          }}
        />
      </Panel>

      <Panel title="練習負荷 (RPE × 分)" empty={loads.load.every((v) => v === 0)} hint="エルゴやラン・バイクで RPE とタイムを記録すると表示されます">
        {warning && <p className="mb-3 text-sm text-accent">{warning}</p>}
        <Bar
          options={baseOptions}
          data={{
            labels: loads.weeks.map(shortDate),
            datasets: [{
              data: loads.load,
              backgroundColor: loads.load.map((_, i) => (i === loads.load.length - 1 && warning ? '#c2410c' : BRAND)),
              borderRadius: 2,
            }],
          }}
        />
      </Panel>

      <Panel title="2kmタイム" empty={twoK.length === 0} hint="距離を2000mにして記録すると表示されます">
        <Line
          options={{
            ...baseOptions,
            scales: { y: { reverse: true, ticks: { callback: (v) => formatTime(v) } } },
            plugins: { ...baseOptions.plugins, tooltip: { callbacks: { label: (c) => formatTime(c.parsed.y) } } },
          }}
          data={{
            labels: twoK.map((e) => formatDate(e.date)),
            datasets: [{ data: twoK.map((e) => parseTime(e.time)), borderColor: BRAND, backgroundColor: BRAND, tension: 0 }],
          }}
        />
      </Panel>

      <Panel title="BIG3 推定1RM (kg)" empty={big3Dates.length === 0} hint="筋トレを記録すると表示されます">
        <Line
          options={{ ...baseOptions, plugins: { legend: { display: true } } }}
          data={{
            labels: big3Dates.map(formatDate),
            datasets: big3.map((b) => ({
              label: b.label,
              borderColor: b.color,
              backgroundColor: b.color,
              spanGaps: true,
              tension: 0,
              data: big3Dates.map((d) => b.rows.filter((r) => r.date === d).reduce((m, r) => Math.max(m, r.estimated1RM), 0) || null),
            })),
          }}
        />
      </Panel>

      <Panel title="体重 (kg)" empty={weights.length === 0} hint="体重を記録すると表示されます">
        <Line
          options={{ ...baseOptions, scales: { y: { suggestedMin: 50 } } }}
          data={{
            labels: weights.map((e) => formatDate(e.date)),
            datasets: [{ data: weights.map((e) => e.weight), borderColor: BRAND, backgroundColor: BRAND, tension: 0 }],
          }}
        />
      </Panel>

      <PaceCalculator />
    </>
  );
}

// 日付の属する週の開始日(lastWeekStarts と同じ形式)。範囲外なら空文字
function weekStartOf(dateStr, weeks) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const pad = (n) => String(n).padStart(2, '0');
  const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return weeks.includes(s) ? s : '';
}

function PbRow({ label, value, date }) {
  return (
    <li className="flex items-baseline justify-between py-2 text-sm">
      <span>{label}</span>
      {value ? (
        <span>
          <b>{value}</b>
          <span className="ml-2 text-xs text-mute">{formatDate(date)}</span>
        </span>
      ) : (
        <span className="text-mute">–</span>
      )}
    </li>
  );
}

function WeeklyReport({ entries }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const report = weekReport(entries);

  const ask = async () => {
    setBusy(true);
    setError('');
    setText('');
    try {
      setText(await reviewWeek(report));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const body = text ? `${report}\n\n${text}` : report;
    try {
      if (navigator.share) await navigator.share({ text: body });
      else {
        await navigator.clipboard.writeText(body);
        setNote('コピーしました');
        setTimeout(() => setNote(''), 2000);
      }
    } catch {
      /* 共有のキャンセルは無視 */
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="label">この1週間</h2>
      <pre className="whitespace-pre-wrap font-[inherit] text-sm leading-relaxed">{report}</pre>
      {text && <p className="rounded-md bg-brand-soft px-3 py-2.5 text-sm leading-relaxed">{text}</p>}
      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="flex gap-2">
        <button onClick={ask} disabled={busy} className="flex-1 rounded-md border border-brand py-2.5 text-sm font-semibold text-brand disabled:opacity-50">
          {busy ? '作成中…' : 'AIに振り返ってもらう'}
        </button>
        <button onClick={share} className="flex-1 rounded-md border border-brand py-2.5 text-sm font-semibold text-brand">
          {note || '共有・コピー'}
        </button>
      </div>
      <p className="text-xs text-mute">AIの振り返りは、上のレポートの文章だけを Google (Gemini) に送ります。</p>
    </section>
  );
}

function PaceCalculator() {
  const [distance, setDistance] = useState('');
  const [time, setTime] = useState('');
  const r = predict2k(Number(distance), time);

  return (
    <section className="card space-y-3">
      <h2 className="label">ペース換算</h2>
      <div className="grid grid-cols-2 gap-2">
        <input className="input" type="number" inputMode="numeric" placeholder="距離 (m)" value={distance} onChange={(e) => setDistance(e.target.value)} />
        <input className="input font-semibold" inputMode="numeric" placeholder="タイム 0:00.0" value={time} onChange={(e) => setTime(formatTimeInput(e.target.value))} />
      </div>
      {r ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-mute">500mスプリット</dt><dd className="text-right font-semibold">{formatTime(r.split)}</dd>
          <dt className="text-mute">平均ワット</dt><dd className="text-right font-semibold">{Math.round(r.watts)}W</dd>
          <dt className="text-mute">2km換算の目安</dt>
          <dd className="text-right font-semibold">{formatTime(r.time2k)}(@{formatTime(r.split2k)})</dd>
        </dl>
      ) : (
        <p className="text-xs text-mute">全力で漕いだ距離とタイムを入れると、2kmでのペースの目安を出します。</p>
      )}
      <p className="text-xs text-mute">距離が2倍になるごとに 500m ペースが約5秒遅くなるという経験則(Paul's law)での概算です。</p>
    </section>
  );
}

function Panel({ title, empty, hint, children }) {
  return (
    <section className="card">
      <h2 className="label mb-3">{title}</h2>
      {empty ? <p className="py-6 text-center text-sm text-mute">{hint}</p> : children}
    </section>
  );
}
