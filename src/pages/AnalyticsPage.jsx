import {
  Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useEntries } from '../useEntries.js';
import { today, weekStart, parseTime, formatTime, formatDate, EXERCISES } from '../lib.js';

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const BRAND = '#0f766e';
const COLORS = ['#0f766e', '#f97316', '#6366f1'];
const baseOptions = { responsive: true, plugins: { legend: { display: false } } };

// 直近 n 週間の週開始日
function lastWeeks(n) {
  const out = [];
  const d = new Date(`${weekStart(today())}T00:00:00`);
  for (let i = 0; i < n; i++) {
    out.unshift(`${d.getMonth() + 1}/${d.getDate()}`);
    d.setDate(d.getDate() - 7);
  }
  return out;
}

export default function AnalyticsPage() {
  const entries = useEntries();
  if (!entries) return null;

  // 週ごとのエルゴ距離(km)
  const weeks = lastWeeks(8);
  const weekKm = Object.fromEntries(weeks.map((w) => [w, 0]));
  for (const e of entries.filter((e) => e.kind === 'ergo' && e.distance)) {
    const d = new Date(`${weekStart(e.date)}T00:00:00`);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (key in weekKm) weekKm[key] += e.distance / 1000;
  }

  // 2kmタイムの推移
  const twoK = entries
    .filter((e) => e.kind === 'ergo' && e.distance === 2000 && parseTime(e.time))
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

  return (
    <>
      <h1 className="text-xl font-bold">分析</h1>

      <Panel title="週ごとのエルゴ距離 (km)">
        <Bar
          options={baseOptions}
          data={{
            labels: weeks,
            datasets: [{ data: weeks.map((w) => +weekKm[w].toFixed(1)), backgroundColor: BRAND, borderRadius: 6 }],
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
            datasets: [{ data: twoK.map((e) => parseTime(e.time)), borderColor: BRAND, backgroundColor: BRAND, tension: 0.2 }],
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
              tension: 0.2,
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
            datasets: [{ data: weights.map((e) => e.weight), borderColor: BRAND, backgroundColor: BRAND, tension: 0.2 }],
          }}
        />
      </Panel>
    </>
  );
}

function Panel({ title, empty, hint, children }) {
  return (
    <section className="card">
      <h2 className="mb-3 text-sm font-semibold text-slate-500">{title}</h2>
      {empty ? <p className="py-6 text-center text-sm text-slate-400">{hint}</p> : children}
    </section>
  );
}
