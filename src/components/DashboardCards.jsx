import { formatCurrency } from '../constants';
import { Wallet, TrendingDown } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function DashboardCards({ expenses }) {
  // Calculate total expense
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Calculate current month expense
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const currentMonthExpenses = expenses.filter(expense => {
    const expenseDate = parseISO(expense.date);
    return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
  });
  
  const currentMonthTotal = currentMonthExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="dashboard-grid">
      <div className="card">
        <div className="card-title">
          <TrendingDown size={16} />
          Chi tiêu tháng này
        </div>
        <div className="card-amount text-danger">
          {formatCurrency(currentMonthTotal)}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Tháng {format(now, 'MM/yyyy')}
        </div>
      </div>
      
      <div className="card">
        <div className="card-title">
          <Wallet size={16} />
          Tổng chi tiêu đã ghi nhận
        </div>
        <div className="card-amount">
          {formatCurrency(totalExpense)}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {expenses.length} giao dịch
        </div>
      </div>
    </div>
  );
}
