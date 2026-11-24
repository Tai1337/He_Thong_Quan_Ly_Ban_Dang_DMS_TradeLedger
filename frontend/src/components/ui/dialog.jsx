import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './dialog.css';

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open && onOpenChange) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="ui-dialog-backdrop"
      onClick={() => onOpenChange && onOpenChange(false)}
    >
      <div
        className="ui-dialog-container"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ className = '', children, ...props }) {
  return (
    <div className={`ui-dialog-content ${className}`} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ className = '', children, onClose, ...props }) {
  return (
    <div className={`ui-dialog-header ${className}`} {...props}>
      <div className="ui-dialog-header-text">{children}</div>
      {onClose && (
        <button
          type="button"
          className="ui-dialog-close-btn"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export function DialogTitle({ className = '', children, ...props }) {
  return (
    <h3 className={`ui-dialog-title ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function DialogDescription({ className = '', children, ...props }) {
  return (
    <p className={`ui-dialog-desc ${className}`} {...props}>
      {children}
    </p>
  );
}

export function DialogFooter({ className = '', children, ...props }) {
  return (
    <div className={`ui-dialog-footer ${className}`} {...props}>
      {children}
    </div>
  );
}

