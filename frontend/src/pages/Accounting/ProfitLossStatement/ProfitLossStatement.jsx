import { useState } from 'react';
import { 
  RotateCw, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronRight,
  Download,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import './ProfitLossStatement.css';

// Dữ liệu biểu đồ mẫu theo đúng ảnh Image 1
const chartData = [
  { period: 'Apr 24-Jun 24', income: 0, expense: 0, netProfit: 0 },
  { period: 'Jul 24-Sep 24', income: 0, expense: 0, netProfit: 0 },
  { period: 'Oct 24-Dec 24', income: 1000000, expense: 620000, netProfit: 380000 },
  { period: 'Jan 25-Mar 25', income: 1000000, expense: 620000, netProfit: 380000 },
];

const ProfitLossStatement = () => {
  // Bộ lọc theo phân hệ DMS-NPP
  const [filters, setFilters] = useState({
    company: 'Công ty TNHH Phân Phối DMS TradeLedger',
    financeBook: 'Sổ cái Bán hàng & Kho vận',
    fiscalYear: '2026',
    fromYear: '2026',
    toYear: '2026',
    periodicity: 'Theo Quý',
    currency: 'VNĐ',
    costCenter: 'Trung tâm Phân phối Miền Nam',
    branch: 'Chi nhánh Tổng Kho Bình Dương',
    project: 'Kênh GT - Tạp hóa truyền thống',
    reportView: 'Tổng hợp',
    accumulatedValues: true,
    includeDefaultFB: true
  });

  // State đóng mở cây tài khoản
  const [expandedNodes, setExpandedNodes] = useState({
    income: true,
    directIncome: true,
    expense: true,
  });

  const toggleNode = (node) => {
    setExpandedNodes(prev => ({ ...prev, [node]: !prev[node] }));
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  return (
    <div className="pnl-statement-page">
      {/* 1. Header Toolbar */}
      <div className="pnl-page-header">
        <h1 className="pnl-page-title">Profit and Loss Statement</h1>

        <div className="pnl-header-actions">
          <select className="pnl-select-btn">
            <option>Financial Statements</option>
            <option>Balance Sheet</option>
            <option>Cash Flow</option>
          </select>

          <select className="pnl-select-btn">
            <option>Actions</option>
            <option>Export to Excel</option>
            <option>Export to PDF</option>
          </select>

          <button type="button" className="pnl-icon-btn" title="Refresh">
            <RotateCw size={15} />
          </button>

          <button type="button" className="pnl-icon-btn" title="More Options">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* 2. Filter Rows (2 Hàng ô lọc bo tròn góc chuẩn ERPNext) */}
      <div className="pnl-filters-card">
        {/* Row 1 */}
        <div className="pnl-filter-row">
          <input 
            type="text" 
            className="pnl-filter-input" 
            value={filters.company} 
            placeholder="Company"
            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
          />

          <input 
            type="text" 
            className="pnl-filter-input" 
            placeholder="Finance Book"
            value={filters.financeBook}
            onChange={(e) => setFilters({ ...filters, financeBook: e.target.value })}
          />

          <select 
            className="pnl-filter-input select"
            value={filters.fiscalYear}
            onChange={(e) => setFilters({ ...filters, fiscalYear: e.target.value })}
          >
            <option>Năm tài chính (2026)</option>
            <option>2026</option>
            <option>2025</option>
          </select>

          <input 
            type="text" 
            className="pnl-filter-input" 
            value={filters.fromYear} 
            placeholder="Từ năm"
            onChange={(e) => setFilters({ ...filters, fromYear: e.target.value })}
          />

          <input 
            type="text" 
            className="pnl-filter-input" 
            value={filters.toYear} 
            placeholder="Đến năm"
            onChange={(e) => setFilters({ ...filters, toYear: e.target.value })}
          />

          <select 
            className="pnl-filter-input select"
            value={filters.periodicity}
            onChange={(e) => setFilters({ ...filters, periodicity: e.target.value })}
          >
            <option>Kỳ báo cáo (Theo Quý)</option>
            <option>Theo Tháng</option>
            <option>Theo Quý</option>
            <option>Theo Năm</option>
          </select>
        </div>

        {/* Row 2 */}
        <div className="pnl-filter-row">
          <select 
            className="pnl-filter-input select"
            value={filters.currency}
            onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
          >
            <option>Currency</option>
            <option>USD</option>
            <option>VND</option>
          </select>

          <input 
            type="text" 
            className="pnl-filter-input" 
            placeholder="Cost Center"
            value={filters.costCenter}
            onChange={(e) => setFilters({ ...filters, costCenter: e.target.value })}
          />

          <input 
            type="text" 
            className="pnl-filter-input" 
            placeholder="Branch"
            value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
          />

          <input 
            type="text" 
            className="pnl-filter-input" 
            placeholder="Project"
            value={filters.project}
            onChange={(e) => setFilters({ ...filters, project: e.target.value })}
          />

          <select 
            className="pnl-filter-input select"
            value={filters.reportView}
            onChange={(e) => setFilters({ ...filters, reportView: e.target.value })}
          >
            <option>Report View</option>
            <option>Summary</option>
            <option>Detailed</option>
          </select>

          <label className="pnl-checkbox-label">
            <input 
              type="checkbox" 
              checked={filters.accumulatedValues}
              onChange={(e) => setFilters({ ...filters, accumulatedValues: e.target.checked })}
            />
            <span>Accumulated Values</span>
          </label>
        </div>

        {/* Checkbox row */}
        <div className="pnl-checkbox-row">
          <label className="pnl-checkbox-label">
            <input 
              type="checkbox" 
              checked={filters.includeDefaultFB}
              onChange={(e) => setFilters({ ...filters, includeDefaultFB: e.target.checked })}
            />
            <span>Include Default FB Entries</span>
          </label>
        </div>
      </div>

      {/* 3. KPI Equation Cards (Total Income - Total Expense = Net Profit) */}
      <div className="pnl-kpi-equation-card">
        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Total Income</span>
          <span className="pnl-kpi-val">$ 10,00,000.00</span>
        </div>

        <div className="pnl-operator-box">
          <span>-</span>
        </div>

        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Total Expense</span>
          <span className="pnl-kpi-val">$ 6,20,000.00</span>
        </div>

        <div className="pnl-operator-box">
          <span>=</span>
        </div>

        <div className="pnl-kpi-col">
          <span className="pnl-kpi-label">Net Profit</span>
          <span className="pnl-kpi-val success">$ 3,80,000.00</span>
        </div>
      </div>

      {/* 4. Interactive Trend Chart */}
      <div className="pnl-chart-card">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
            <XAxis dataKey="period" stroke="#9ca3af" fontSize={12} tickLine={false} />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={11} 
              tickLine={false}
              tickFormatter={(v) => v === 0 ? '0' : `${v / 1000} K`}
            />
            <Tooltip 
              formatter={(value) => formatMoney(value)}
              contentStyle={{ borderRadius: 6, border: '1px solid #e5e7eb' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="rect" />
            <Line 
              type="linear" 
              dataKey="income" 
              name="Income" 
              stroke="#ec4899" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 5 }} 
            />
            <Line 
              type="linear" 
              dataKey="expense" 
              name="Expense" 
              stroke="#2563eb" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 5 }} 
            />
            <Line 
              type="linear" 
              dataKey="netProfit" 
              name="Net Profit/Loss" 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 5 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 5. Hierarchical Tree Table */}
      <div className="pnl-tree-table-card">
        <table className="pnl-data-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Account</th>
              <th style={{ textAlign: 'right' }}>Apr 24-Jun 24</th>
              <th style={{ textAlign: 'right' }}>Jul 24-Sep 24</th>
              <th style={{ textAlign: 'right' }}>Oct 24-Dec 24</th>
              <th style={{ textAlign: 'right' }}>Jan 25-Mar 25</th>
            </tr>
          </thead>
          <tbody>
            {/* Level 1: Income */}
            <tr className="tree-row parent-row" onClick={() => toggleNode('income')}>
              <td>
                <div className="tree-cell">
                  <span className="row-num">1</span>
                  {expandedNodes.income ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <strong>Income</strong>
                </div>
              </td>
              <td style={{ textAlign: 'right' }}>$ 0.00</td>
              <td style={{ textAlign: 'right' }}>$ 0.00</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>$ 10,00,000.00</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>$ 10,00,000.00</td>
            </tr>

            {/* Level 2: Direct Income */}
            {expandedNodes.income && (
              <>
                <tr className="tree-row child-level-1" onClick={() => toggleNode('directIncome')}>
                  <td>
                    <div className="tree-cell indent-1">
                      <span className="row-num">2</span>
                      {expandedNodes.directIncome ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>Direct Income</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>$ 0.00</td>
                  <td style={{ textAlign: 'right' }}>$ 0.00</td>
                  <td style={{ textAlign: 'right' }}>$ 10,00,000.00</td>
                  <td style={{ textAlign: 'right' }}>$ 10,00,000.00</td>
                </tr>

                {/* Level 3: Sales */}
                {expandedNodes.directIncome && (
                  <tr className="tree-row child-level-2">
                    <td>
                      <div className="tree-cell indent-2">
                        <span className="row-num">3</span>
                        <span>Sales</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>$ 0.00</td>
                    <td style={{ textAlign: 'right' }}>$ 0.00</td>
                    <td style={{ textAlign: 'right' }}>$ 10,00,000.00</td>
                    <td style={{ textAlign: 'right' }}>$ 10,00,000.00</td>
                  </tr>
                )}
              </>
            )}

            {/* Level 1: Expense */}
            <tr className="tree-row parent-row" onClick={() => toggleNode('expense')}>
              <td>
                <div className="tree-cell">
                  <span className="row-num">4</span>
                  {expandedNodes.expense ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <strong>Expense</strong>
                </div>
              </td>
              <td style={{ textAlign: 'right' }}>$ 0.00</td>
              <td style={{ textAlign: 'right' }}>$ 0.00</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>$ 6,20,000.00</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>$ 6,20,000.00</td>
            </tr>

            {/* Level 2: Cost of Goods Sold */}
            {expandedNodes.expense && (
              <tr className="tree-row child-level-1">
                <td>
                  <div className="tree-cell indent-1">
                    <span className="row-num">5</span>
                    <span>Cost of Goods Sold (COGS)</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>$ 0.00</td>
                <td style={{ textAlign: 'right' }}>$ 0.00</td>
                <td style={{ textAlign: 'right' }}>$ 6,20,000.00</td>
                <td style={{ textAlign: 'right' }}>$ 6,20,000.00</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="tree-total-row">
              <td style={{ fontWeight: 700 }}>Total Net Profit</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>$ 0.00</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>$ 0.00</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>$ 3,80,000.00</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>$ 3,80,000.00</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ProfitLossStatement;
