interface Point { date: string; value: number }

interface Props { data: Point[]; threshold?: number; thresholdLabel?: string; yMax?: number; yMin?: number; height?: number }

export const NDVILineChart = ({ data, threshold, thresholdLabel, yMax = 40, yMin = 10, height = 260 }: Props) => {
  const W = 800, H = height, P = 36;
  const xStep = (W - P * 2) / (data.length - 1);
  const yScale = (v: number) => H - P - ((v - yMin) / (yMax - yMin)) * (H - P * 2);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${P + i * xStep} ${yScale(d.value)}`).join(" ");
  const ty = threshold !== undefined ? yScale(threshold) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = P + p * (H - P * 2);
        return <line key={i} x1={P} x2={W - P} y1={y} y2={y} stroke="hsl(var(--surface-high))" strokeWidth={1} />;
      })}
      {ty !== null && (
        <>
          <line x1={P} x2={W - P} y1={ty} y2={ty} stroke="hsl(var(--destructive))" strokeWidth={1.2} strokeDasharray="6 6" />
          {thresholdLabel && (
            <text x={W - P} y={ty - 8} textAnchor="end" className="fill-destructive" fontSize={10}>
              {thresholdLabel}
            </text>
          )}
        </>
      )}
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={P + i * xStep} cy={yScale(d.value)} r={i === data.length - 1 ? 5 : 3.5} fill="hsl(var(--primary))" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={P + i * xStep} y={H - 10} textAnchor="middle" className="fill-muted-foreground" fontSize={10} letterSpacing="0.05em">
          {d.date}
        </text>
      ))}
    </svg>
  );
};
