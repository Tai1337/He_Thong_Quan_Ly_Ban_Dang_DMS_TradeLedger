import { getCategory, formatCurrency } from '../constants';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Trash2, CalendarX2 } from 'lucide-react';

export default function ExpenseList({ expenses, onDelete }) {
  // Sort expenses by date descending
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedExpenses.length === 0) {
    return (
      <div className="expense-list">
        <div className="empty-state">
          <CalendarX2 size={48} />
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Chưa có khoản chi tiêu nào</h3>
          <p>Hãy thêm khoản chi đầu tiên của bạn ở form bên trên.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-list">
      <div className="expense-header">
        <h2>Lịch sử chi tiêu</h2>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {sortedExpenses.length} giao dịch
        </span>
      </div>
      <div>
        {sortedExpenses.map(expense => {
          const category = getCategory(expense.categoryId);
          const Icon = category.icon;
          
          return (
            <div key={expense.id} className="expense-item">
              <div className="expense-info">
                <div className="expense-icon" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                  <Icon size={20} />
                </div>
                <div className="expense-details">
                  <h3>{expense.note || category.name}</h3>
                  <p>
                    {format(parseISO(expense.date), 'dd MMM yyyy', { locale: vi })} • 
                    <span className="category-badge" style={{ marginLeft: '0.5rem' }}>{category.name}</span>
                  </p>
                </div>
              </div>
              <div className="expense-actions">
                <span className="expense-amount text-danger">
                  -{formatCurrency(expense.amount)}
                </span>
                <button 
                  className="btn-icon" 
                  onClick={() => onDelete(expense.id)}
                  title="Xóa khoản chi này"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
