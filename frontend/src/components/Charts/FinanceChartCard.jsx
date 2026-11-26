import './FinanceChartCard.css';

/**
 * Reusable container card for financial and sales charts with optional header actions and empty state.
 */
export default function FinanceChartCard({
  title,
  subtitle,
  actions,
  isEmpty = false,
  emptyText = 'Chưa có dữ liệu để hiển thị biểu đồ',
  children,
  footer,
  className = '',
}) {
  return (
    <section className={`finance-chart-card ${className}`.trim()}>
      <header className="finance-chart-header">
        <div className="finance-chart-heading">
          <h3 className="finance-chart-title">{title}</h3>
          {subtitle && <p className="finance-chart-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="finance-chart-actions">{actions}</div>}
      </header>

      <div className="finance-chart-body">
        {isEmpty ? (
          <div className="finance-chart-empty">{emptyText}</div>
        ) : (
          children
        )}
      </div>

      {footer && !isEmpty && <footer className="finance-chart-footer">{footer}</footer>}
    </section>
  );
}
