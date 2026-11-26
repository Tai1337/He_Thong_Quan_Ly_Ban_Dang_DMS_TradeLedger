import './DmsSectionPanel.css';

/**
 * Classic DMS angled Steel-Blue section panel (`TÌM KIẾM`, `DANH SÁCH...`, etc.)
 * inspired by structured enterprise ledger screens.
 */
export default function DmsSectionPanel({
  title,
  count,
  actions,
  children,
  noPadding = false,
  className = '',
}) {
  return (
    <section className={`dms-section-panel ${className}`.trim()}>
      <div className="dms-section-bar">
        <div className="dms-section-tab">
          <span className="dms-section-tab-text">
            {title}
            {count !== undefined && count !== null ? ` (${count})` : ''}
          </span>
        </div>
        {actions && <div className="dms-section-actions">{actions}</div>}
      </div>

      <div className={`dms-section-body ${noPadding ? 'no-padding' : ''}`.trim()}>
        {children}
      </div>
    </section>
  );
}
