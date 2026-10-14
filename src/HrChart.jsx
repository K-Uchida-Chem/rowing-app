// 心拍の推移(series: [[開始からの秒, bpm], ...])を線で描く
export default function HrChart({ series }) {
  if (!series?.length || series.length < 2) return null;
  const W = 300, H = 90, PAD = 4;
  const tMax = series[series.length - 1][0] || 1;
  const bpms = series.map((p) => p[1]);
  const lo = Math.min(...bpms), hi = Math.max(...bpms);
  const span = Math.max(hi - lo, 10);
  const pts = series
    .map(([t, v]) => `${(PAD + (t / tMax) * (W - PAD * 2)).toFixed(1)},${(H - PAD - ((v - lo) / span) * (H - PAD * 2)).toFixed(1)}`)
    .join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="心拍の推移">
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="text-brand" />
      </svg>
      <p className="flex justify-between text-[11px] text-mute">
        <span>最小 {lo}</span>
        <span>{Math.round(tMax / 60)}分</span>
        <span>最大 {hi}</span>
      </p>
    </div>
  );
}
