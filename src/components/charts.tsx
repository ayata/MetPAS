import { useState } from 'react';

/* Two-series stacked horizontal bar (e.g. open vs completed per person).
   Colors validated for CVD separation; totals are direct-labeled and a legend is always shown. */
export interface StackRow {
  id: string;
  label: string;
  a: number;
  b: number;
}

export function StackedBars({ rows, aLabel, bLabel, onSelect }: { rows: StackRow[]; aLabel: string; bLabel: string; onSelect?: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.a + r.b));
  return (
    <div className="stack gap-3">
      <div className="legend" aria-hidden>
        <span><i style={{ background: 'var(--chart-2)' }} />{aLabel}</span>
        <span><i style={{ background: 'var(--chart-1)' }} />{bLabel}</span>
      </div>
      <div className="hbar-chart" role="table" aria-label={`${aLabel} and ${bLabel} by person`}>
        {rows.map((r) => (
          <button
            key={r.id}
            className="hbar-row"
            role="row"
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(r.id)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect?.(r.id)}
            aria-label={`${r.label}: ${r.a} ${aLabel.toLowerCase()}, ${r.b} ${bLabel.toLowerCase()}`}
          >
            <span className="ellipsis" role="cell">{r.label}</span>
            <span className="hbar-track" role="cell">
              {r.a > 0 && <span style={{ width: `${(r.a / max) * 100}%`, background: 'var(--chart-2)' }} />}
              {r.b > 0 && <span style={{ width: `${(r.b / max) * 100}%`, background: 'var(--chart-1)' }} />}
            </span>
            <span className="mono muted" role="cell" style={{ textAlign: 'right' }}>{r.a} / {r.b}</span>
            {hover === r.id && (
              <span className="chart-tip" style={{ left: 140, top: -34 }}>
                <b>{r.label}</b> · {aLabel} {r.a} · {bLabel} {r.b}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Single-series line with reference target and hover crosshair. */
export function TrendLine({ points, target, unit = '%', min, max, label }: { points: { x: string; y: number }[]; target?: number; unit?: string; min: number; max: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 520, H = 170, padL = 34, padR = 44, padT = 12, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i: number) => padL + (iw * i) / (points.length - 1);
  const y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.y)}`).join(' ');
  const ticks = [min, (min + max) / 2, max];
  const last = points[points.length - 1];

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} style={{ display: 'block', overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border-subtle)" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="var(--text-3)">{t}{unit}</text>
          </g>
        ))}
        {target !== undefined && (
          <g>
            <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke="var(--text-3)" strokeDasharray="4 4" />
            <text x={padL + 6} y={y(target) - 6} fontSize="10.5" fill="var(--text-3)">Target {target}{unit}</text>
          </g>
        )}
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--text-3)">{p.x}</text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--text-3)" strokeWidth="1" />}
        <path d={d} fill="none" stroke="var(--chart-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.y)} r={hover === i ? 5 : 4} fill="var(--chart-line)" stroke="#fff" strokeWidth="2" />
        ))}
        <text x={x(points.length - 1) + 10} y={y(last.y) + 4} fontSize="11.5" fontWeight="600" fill="var(--text)">{last.y}{unit}</text>
        {points.map((_, i) => (
          <rect key={i} x={x(i) - iw / (points.length - 1) / 2} y={padT} width={iw / (points.length - 1)} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: 0, transform: 'translate(-50%, -110%)' }}>
          <b>{points[hover].x}</b> · {points[hover].y}{unit}
        </div>
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{points.map((p, i) => <tr key={i}><th>{p.x}</th><td>{p.y}{unit}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
