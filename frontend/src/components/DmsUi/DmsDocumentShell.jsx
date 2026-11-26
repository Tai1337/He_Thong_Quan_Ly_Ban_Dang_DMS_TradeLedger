import { X } from 'lucide-react';
import './DmsDocumentShell.css';

/**
 * Structured document detail view (`CHI TIẾT ĐƠN ĐẶT HÀNG` / `CHI TIẾT PHIẾU`)
 * matching the classic navy header, metadata grid, line-item split, and bottom action bar.
 */
export default function DmsDocumentShell({
  title,
  icon: Icon,
  metaFields = [],
  onClose,
  footerActions,
  children,
  asModal = false,
}) {
  const shellContent = (
    <div className={`dms-doc-shell ${asModal ? 'is-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
      <header className="dms-doc-header">
        <div className="dms-doc-header-title">
          {Icon && <Icon size={17} />}
          <span>{title}</span>
        </div>
        {onClose && (
          <button type="button" className="dms-doc-close-btn" onClick={onClose} title="Đóng">
            <X size={16} />
          </button>
        )}
      </header>

      <div className="dms-doc-content">
        {metaFields.length > 0 && (
          <div className="dms-doc-meta-grid">
            {metaFields.map((field, idx) => (
              <div
                key={field.label || idx}
                className={`dms-doc-meta-cell ${field.fullWidth ? 'full-width' : ''}`}
              >
                <span className="dms-doc-meta-label">{field.label}:</span>
                <span className={`dms-doc-meta-val ${field.highlight ? 'is-highlight' : ''}`}>
                  {field.value ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="dms-doc-body">{children}</div>
      </div>

      {footerActions && <footer className="dms-doc-footer">{footerActions}</footer>}
    </div>
  );

  if (asModal) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        {shellContent}
      </div>
    );
  }

  return shellContent;
}
