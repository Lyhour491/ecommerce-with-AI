const toNumber = (value) => Number(value || 0);

export default function SimpleLineChart({ rows = [], valueKey = "total", labelKey = "date", color = "#2563eb", title }) {
  const data = rows.length ? rows : [{ [labelKey]: "No data", [valueKey]: 0 }];
  const max = Math.max(...data.map((item) => toNumber(item[valueKey])), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 36 : 36 + (index * 568) / (data.length - 1);
    const y = 186 - (toNumber(item[valueKey]) / max) * 132;
    return { ...item, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `36,202 ${line} ${points[points.length - 1]?.x || 604},202`;

  return (
    <div className="simple-chart-card">
      {title && <h3>{title}</h3>}
      <svg className="simple-line-chart" viewBox="0 0 640 230" role="img" aria-label={title || "Line chart"}>
        <defs>
          <linearGradient id={`chartGradient-${valueKey}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((tick) => (
          <line key={tick} x1="36" x2="604" y1={54 + tick * 44} y2={54 + tick * 44} stroke="#e5e7eb" strokeWidth="1" />
        ))}
        <polygon points={area} fill={`url(#chartGradient-${valueKey})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point[labelKey]}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke={color} strokeWidth="3" />
            <text x={point.x} y="220" textAnchor="middle">{String(point[labelKey]).slice(5) || point[labelKey]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
