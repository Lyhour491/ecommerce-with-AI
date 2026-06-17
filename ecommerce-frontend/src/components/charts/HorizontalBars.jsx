export default function HorizontalBars({ rows = [], labelKey = "label", valueKey = "value", title, formatValue = (value) => value }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);

  return (
    <div className="simple-chart-card">
      {title && <h3>{title}</h3>}
      <div className="simple-bars">
        {rows.map((row) => (
          <div className="simple-bar-row" key={row[labelKey]}>
            <div className="simple-bar-label">
              <span>{row[labelKey]}</span>
              <strong>{formatValue(row[valueKey])}</strong>
            </div>
            <div className="simple-bar-track">
              <span style={{ width: `${(Number(row[valueKey] || 0) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
