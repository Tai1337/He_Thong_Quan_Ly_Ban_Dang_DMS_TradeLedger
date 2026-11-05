import { useEffect, useState } from 'react';
import {
  RotateCw,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getProfitLossStatement, exportProfitLossExcel } from '../../../services/api';
import './ProfitLossStatement.css';

const formatMoney = (amount) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(amount) || 0) + ' đ';

const formatCompact = (amount) => {
  const v = Number(amount) || 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} T`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Tr`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)} K`;
  return String(v);
};

const ProfitLossStatement = () => {
  const [filters, setFilters] = useState({
    fiscalYear: String(new Date().getFullYear()),
    periodicity: 'Theo Quý',
  });
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
  const equation = data?.equation ?? { totalIncome: 0, totalExpense: 0, netProfit: 0, profitMargin: 0 };

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
          <span className="pnl-kpi-val">{formatMoney(equation.totalIncome)}</span>
        </div>

        <div className="pnl-operator-box">
          <span>-</span>
        </div>

        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Tổng Giá Vốn</span>
          <span className="pnl-kpi-val">{formatMoney(equation.totalExpense)}</span>
        </div>

        <div className="pnl-operator-box">
          <span>=</span>
        </div>

        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Lợi Nhuận Thuần</span>
          <span className={`pnl-kpi-val ${equation.netProfit >= 0 ? 'success' : 'danger'}`}>
            {formatMoney(equation.netProfit)}
          </span>
        </div>

        <div className="pnl-operator-box">
          <span>·</span>
        </div>

        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Tỷ Suất Lợi Nhuận</span>
          <span className="pnl-kpi-val">{Number(equation.profitMargin || 0).toFixed(1)}%</span>
        </div>
      </div>

      {/* 4. Trend Chart */}
      <div className="pnl-chart-card">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
              <XAxis
                dataKey="period"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                tickFormatter={formatCompact}
              />
              <Tooltip
                formatter={(value) => formatMoney(value)}
                contentStyle={{ borderRadius: 6, border: '1px solid #e5e7eb' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="rect" />
              <Line type="linear" dataKey="income" name="Doanh thu" stroke="#ec4899" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              <Line type="linear" dataKey="expense" name="Giá vốn" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              <Line type="linear" dataKey="netProfit" name="Lợi nhuận" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          !loading && <div className="pnl-empty">Không có dữ liệu trong kỳ báo cáo</div>
        )}
      </div>

      {/* 5. Hierarchical Tree Table */}
      <div className="pnl-tree-table-card">
        <table className="pnl-data-table">
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
                      {formatMoney(d.income)}
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
                      {formatMoney(d.expense)}
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
                        {formatMoney(d.expense)}
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
                  {formatMoney(d.netProfit)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ProfitLossStatement;
