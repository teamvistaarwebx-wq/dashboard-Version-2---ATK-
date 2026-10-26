/**
 * Tiny trend line for a metric tab: the current period solid, the comparison
 * dashed, both on one scale so their heights compare honestly. Nulls (hours
 * still to come today) end the line rather than dropping it to zero.
 */
export function Sparkline({ values, compare, width = 76, height = 26, fluid = false, className = "" }) {
  const all = [...values, ...(compare ?? [])].filter((value) => value !== null && Number.isFinite(value));
  if (all.length === 0) return <svg width={width} height={height} aria-hidden="true" className={className} />;

  const max = Math.max(...all);
  const min = Math.min(0, ...all);
  const span = max - min || 1;
  const count = Math.max(values.length, compare?.length ?? 0);
  const pad = 2;

  function path(series) {
    let d = "";
    let drawing = false;
    series.forEach((value, index) => {
      if (value === null || !Number.isFinite(value)) {
        drawing = false;
        return;
      }
      const x = count <= 1 ? width / 2 : (index / (count - 1)) * (width - pad * 2) + pad;
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      d += `${drawing ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      drawing = true;
    });
    return d;
  }

  return (
    <svg
      width={fluid ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fluid ? "none" : undefined}
      aria-hidden="true"
      className={className}
    >
      {compare ? (
        <path d={path(compare)} fill="none" stroke="var(--chart-compare)" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ) : null}
      <path d={path(values)} fill="none" stroke="var(--chart-line)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
