import { useEffect, useMemo, useState } from 'react';
import {
  RotateCw,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { getProfitLossStatement, exportProfitLossExcel } from '../../../services/api';
import FinanceChartCard from '../../../components/Charts/FinanceChartCard';
import DonutBreakdownChart from '../../../components/Charts/DonutBreakdownChart';
import DmsSectionPanel from '../../../components/DmsUi/DmsSectionPanel';
import {
  FINANCE_CHART_PALETTE,
  formatVnd,
  formatCompactVnd,
} from '../../../utils/chartFormatters';
import './ProfitLossStatement.css';

const ProfitLossTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const margin = row.income > 0 ? ((row.netProfit / row.income) * 100).toFixed(1) : '0.0';

  return (
    <div className="chart-tooltip-box">
      <div className="chart-tooltip-title">{label}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label">
          <span className="chart-tooltip-dot" style={{ backgroundColor: '#1a73e8' }} />
          Doanh thu
        </span>
        <span className="chart-tooltip-val">{formatVnd(row.income)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label">
          <span className="chart-tooltip-dot" style={{ backgroundColor: '#94a3b8' }} />
          Giá vốn (COGS)
        </span>
        <span className="chart-tooltip-val">{formatVnd(row.expense)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label">
          <span className="chart-tooltip-dot" style={{ backgroundColor: '#10b981' }} />
          Lợi nhuận thuần
        </span>
        <span className="chart-tooltip-val">{formatVnd(row.netProfit)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label">Biên lợi nhuận</span>
        <span className="chart-tooltip-val">{margin}%</span>
      </div>
    </div>
  );
};

const ProfitLossStatement = () => {
  const [filters, setFilters] = useState({
    fiscalYear: String(new Date().getFullYear()),
    periodicity: 'Theo Quý',
  });
  const [chartMode, setChartMode] = useState('combo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({
    income: true,
    expense: true,
  });

  const fetchData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProfitLossStatement(filters, signal);
      setData(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Không thể tải dữ liệu báo cáo');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [filters.fiscalYear, filters.periodicity]);

  const chartData = data?.chartData ?? [];
  const equation = data?.equation ?? {
    totalIncome: 0,
    totalExpense: 0,
    totalDiscounts: 0,
    netProfit: 0,
    profitMargin: 0,
  };

  const channelItems = useMemo(() => {
    const entries = Object.entries(data?.channelBreakdown ?? {});
    return entries
      .map(([name, value], idx) => ({
        name,
        value: Number(value) || 0,
        color: FINANCE_CHART_PALETTE[idx % FINANCE_CHART_PALETTE.length],
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const hasChartActivity = useMemo(
    () => chartData.some((d) => d.income > 0 || d.expense > 0 || d.netProfit !== 0),
    [chartData],
  );

  const toggleNode = (node) =>
    setExpandedNodes((prev) => ({ ...prev, [node]: !prev[node] }));

  return (
    <div className="pnl-statement-page">
      {/* 1. Header Toolbar */}
      <div className="pnl-page-header">
        <h1 className="pnl-page-title">Báo cáo Lãi Lỗ (P&L)</h1>

        <div className="pnl-header-actions">
          <select
            className="pnl-select-btn"
            value={filters.periodicity}
            onChange={(e) => setFilters((f) => ({ ...f, periodicity: e.target.value }))}
          >
            <option value="Theo Tháng">Theo Tháng</option>
            <option value="Theo Quý">Theo Quý</option>
          </select>

          <button type="button" className="pnl-select-btn" onClick={() => exportProfitLossExcel(filters)}>
            Xuất Excel
          </button>

          <button
            type="button"
            className="pnl-icon-btn"
            title="Làm mới"
            onClick={() => fetchData()}
            disabled={loading}
          >
            <RotateCw size={15} className={loading ? 'pnl-spin' : ''} />
          </button>

          <button type="button" className="pnl-icon-btn" title="Tùy chọn khác">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* 2. Filter Rows */}
      <div className="pnl-filters-card">
        <div className="pnl-filter-row">
          <select
            className="pnl-filter-input select"
            value={filters.fiscalYear}
            onChange={(e) => setFilters((f) => ({ ...f, fiscalYear: e.target.value }))}
          >
            <option value="2026">Năm tài chính 2026</option>
            <option value="2025">Năm tài chính 2025</option>
            <option value="2024">Năm tài chính 2024</option>
          </select>

          <select
            className="pnl-filter-input select"
            value={filters.periodicity}
            onChange={(e) => setFilters((f) => ({ ...f, periodicity: e.target.value }))}
          >
            <option value="Theo Tháng">Kỳ báo cáo: Theo Tháng</option>
            <option value="Theo Quý">Kỳ báo cáo: Theo Quý</option>
          </select>

          <span className="pnl-filter-meta">
            {data ? `${data.totalOrdersCount} đơn hàng · Năm ${data.fiscalYear}` : ''}
          </span>
        </div>
      </div>

      {/* 3. KPI Equation Cards */}
      <div className="pnl-kpi-equation-card">
        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Tổng Doanh Thu</span>
          <span className="pnl-kpi-val">{formatVnd(equation.totalIncome)}</span>
        </div>

        <div className="pnl-operator-box">
          <span>-</span>
        </div>

        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Tổng Giá Vốn</span>
          <span className="pnl-kpi-val">{formatVnd(equation.totalExpense)}</span>
        </div>

        <div className="pnl-operator-box">
          <span>=</span>
        </div>

        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Lợi Nhuận Thuần</span>
          <span className={`pnl-kpi-val ${equation.netProfit >= 0 ? 'success' : 'danger'}`}>
            {formatVnd(equation.netProfit)}
          </span>
        </div>

        <div className="pnl-operator-box">
          <span>·</span>
        </div>

        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Tỷ Suất Lợi Nhuận</span>
          <span className="pnl-kpi-val">{Number(equation.profitMargin || 0).toFixed(1)}%</span>
        </div>

        {Number(equation.totalDiscounts || 0) > 0 && (
          <>
            <div className="pnl-operator-box">
              <span>·</span>
            </div>
            <div className="pnl-kpi-col">
              <span className="pnl-kpi-label">Chiết Khấu Hóa Đơn</span>
              <span className="pnl-kpi-val warn">{formatVnd(equation.totalDiscounts)}</span>
            </div>
          </>
        )}
      </div>

      {/* 4. Financial Analytics Grid */}
      <div className="pnl-charts-grid">
        <FinanceChartCard
          title="Phân tích Doanh thu – Giá vốn – Lợi nhuận"
          subtitle={`Biến động kết quả kinh doanh ${filters.periodicity.toLowerCase()} năm ${filters.fiscalYear}`}
          isEmpty={!loading && !hasChartActivity}
          emptyText="Chưa phát sinh doanh thu trong năm tài chính đã chọn"
          actions={
            <div className="chart-mode-toggle">
              <button
                type="button"
                className={`chart-mode-btn ${chartMode === 'combo' ? 'active' : ''}`}
                onClick={() => setChartMode('combo')}
              >
                Cột & Đường
              </button>
              <button
                type="button"
                className={`chart-mode-btn ${chartMode === 'line' ? 'active' : ''}`}
                onClick={() => setChartMode('line')}
              >
                Xu hướng
              </button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={290}>
            {chartMode === 'combo' ? (
              <ComposedChart data={chartData} margin={{ top: 14, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatCompactVnd}
                />
                <Tooltip content={<ProfitLossTooltip />} />
                <Legend verticalAlign="bottom" height={34} />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar dataKey="income" name="Doanh thu" fill="#2b5b8c" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" name="Giá vốn (COGS)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Line
                  type="monotone"
                  dataKey="netProfit"
                  name="Lợi nhuận thuần"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#059669' }}
                  activeDot={{ r: 5.5 }}
                />
              </ComposedChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 14, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatCompactVnd}
                />
                <Tooltip content={<ProfitLossTooltip />} />
                <Legend verticalAlign="bottom" height={34} />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Line type="monotone" dataKey="income" name="Doanh thu" stroke="#2b5b8c" strokeWidth={2.2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" name="Giá vốn (COGS)" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="netProfit" name="Lợi nhuận thuần" stroke="#059669" strokeWidth={2.5} dot={{ r: 3.5 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </FinanceChartCard>

        <FinanceChartCard
          title="Cơ cấu Doanh thu theo Kênh bán"
          subtitle="Phân bổ đóng góp doanh thu theo nhóm khách hàng"
          isEmpty={!loading && channelItems.length === 0}
          emptyText="Chưa có dữ liệu phân bổ kênh bán hàng"
        >
          <DonutBreakdownChart
            items={channelItems}
            centerTitle="Tổng doanh thu"
            centerValue={formatCompactVnd(equation.totalIncome)}
          />
        </FinanceChartCard>
      </div>

      {/* 5. Hierarchical Tree Table */}
      <DmsSectionPanel title="Bảng chi tiết kết quả kinh doanh (P&L)" noPadding>
        <div className="dms-ledger-table-wrap" style={{ border: 'none' }}>
          <table className="dms-ledger-table pnl-data-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Tài khoản</th>
              {chartData.map((d) => (
                <th key={d.period} style={{ textAlign: 'right' }}>{d.period}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={chartData.length + 1} style={{ textAlign: 'center', padding: 32 }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={chartData.length + 1} style={{ textAlign: 'center', padding: 32, color: '#dc2626' }}>
                  {error}
                </td>
              </tr>
            ) : (
              <>
                {/* Income */}
                <tr className="tree-row parent-row" onClick={() => toggleNode('income')}>
                  <td>
                    <div className="tree-cell">
                      <span className="row-num">1</span>
                      {expandedNodes.income ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <strong>Doanh Thu</strong>
                    </div>
                  </td>
                  {chartData.map((d) => (
                    <td key={d.period} style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatVnd(d.income)}
                    </td>
                  ))}
                </tr>

                {/* Expense */}
                <tr className="tree-row parent-row" onClick={() => toggleNode('expense')}>
                  <td>
                    <div className="tree-cell">
                      <span className="row-num">2</span>
                      {expandedNodes.expense ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <strong>Giá Vốn (COGS)</strong>
                    </div>
                  </td>
                  {chartData.map((d) => (
                    <td key={d.period} style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatVnd(d.expense)}
                    </td>
                  ))}
                </tr>

                {expandedNodes.expense && (
                  <tr className="tree-row child-level-1">
                    <td>
                      <div className="tree-cell indent-1">
                        <span className="row-num">3</span>
                        <span>Giá vốn hàng bán</span>
                      </div>
                    </td>
                    {chartData.map((d) => (
                      <td key={d.period} style={{ textAlign: 'right' }}>
                        {formatVnd(d.expense)}
                      </td>
                    ))}
                  </tr>
                )}
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="tree-total-row">
              <td style={{ fontWeight: 700 }}>Tổng Lợi Nhuận</td>
              {chartData.map((d) => (
                <td
                  key={d.period}
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    color: d.netProfit >= 0 ? '#10b981' : '#dc2626',
                  }}
                >
                  {formatVnd(d.netProfit)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        </div>
      </DmsSectionPanel>
    </div>
  );
};

export default ProfitLossStatement;
