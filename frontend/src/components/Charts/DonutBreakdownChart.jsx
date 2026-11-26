import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  FINANCE_CHART_PALETTE,
  formatVnd,
  formatCompactVnd,
} from '../../utils/chartFormatters';

/**
 * Reusable Donut chart with center KPI label and aligned breakdown legend.
 */
export default function DonutBreakdownChart({
  items = [],
  centerTitle = 'Tổng cộng',
  centerValue,
  valueFormatter = formatVnd,
}) {
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const resolvedCenterValue = centerValue ?? formatCompactVnd(total);

  return (
    <div className="donut-chart-layout">
      <div className="donut-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={84}
              paddingAngle={items.length > 1 ? 3 : 0}
              stroke="none"
            >
              {items.map((entry, idx) => (
                <Cell
                  key={entry.name || idx}
                  fill={entry.color || FINANCE_CHART_PALETTE[idx % FINANCE_CHART_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
                return (
                  <div className="chart-tooltip-box">
                    <div className="chart-tooltip-title">{item.name}</div>
                    <div className="chart-tooltip-row">
                      <span className="chart-tooltip-label">Giá trị</span>
                      <span className="chart-tooltip-val">{valueFormatter(item.value)}</span>
                    </div>
                    <div className="chart-tooltip-row">
                      <span className="chart-tooltip-label">Tỷ trọng</span>
                      <span className="chart-tooltip-val">{pct}%</span>
                    </div>
                    {item.meta && (
                      <div className="chart-tooltip-row">
                        <span className="chart-tooltip-label">Chi tiết</span>
                        <span className="chart-tooltip-val">{item.meta}</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="donut-center-label">
          <span className="donut-center-title">{centerTitle}</span>
          <span className="donut-center-value">{resolvedCenterValue}</span>
        </div>
      </div>

      <div className="donut-legend-list">
        {items.map((item, idx) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
          const color = item.color || FINANCE_CHART_PALETTE[idx % FINANCE_CHART_PALETTE.length];
          return (
            <div key={item.name || idx} className="donut-legend-item">
              <div className="donut-legend-left" title={item.name}>
                <span className="chart-tooltip-dot" style={{ backgroundColor: color }} />
                <span className="donut-legend-name">{item.name}</span>
              </div>
              <div className="donut-legend-right">
                <span className="donut-legend-val">{formatCompactVnd(item.value)}</span>
                <span className="donut-legend-pct">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
