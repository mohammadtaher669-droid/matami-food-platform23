/** Dependency-free SVG charts for dashboards & reports. */
import { useMemo } from "react";

export function LineChart({ data, height = 160, color = "var(--th-primary)", valueLabel }: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  valueLabel?: (v: number) => string;
}) {
  const w = 600;
  const pad = 8;
  const points = useMemo(() => {
    if (data.length === 0) return "";
    const max = Math.max(...data.map((d) => d.value), 1);
    const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
    return data
      .map((d, i) => `${pad + i * stepX},${height - pad - (d.value / max) * (height - pad * 2)}`)
      .join(" ");
  }, [data, height]);

  if (data.length === 0) {
    return <div className="flex h-32 items-center justify-center text-xs text-[var(--th-muted)]">—</div>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const last = data[data.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" role="img">
        <polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <polygon points={`${pad},${height - pad} ${points} ${w - pad},${height - pad}`} fill={color} opacity={0.08} />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--th-muted)]">
        <span>{data[0]?.label}</span>
        <span>
          {valueLabel ? valueLabel(max) : max} ↑ · {last?.label}
        </span>
      </div>
    </div>
  );
}

export function BarList({ data, valueLabel }: { data: Array<{ label: string; value: number }>; valueLabel?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return <div className="flex h-20 items-center justify-center text-xs text-[var(--th-muted)]">—</div>;
  }
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i}>
          <div className="mb-0.5 flex items-center justify-between text-xs">
            <span className="truncate font-semibold">{d.label}</span>
            <span className="ms-2 shrink-0 font-bold text-[var(--th-muted)]">{valueLabel ? valueLabel(d.value) : d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full bg-[var(--th-primary)]" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
