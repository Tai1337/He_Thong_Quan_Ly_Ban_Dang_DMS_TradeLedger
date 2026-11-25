import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, HelpCircle, X } from 'lucide-react';
import './NotificationProvider.css';

const NotificationContext = createContext(null);

const TYPE_META = {
  success: { title: 'Thành công', Icon: CheckCircle2, duration: 4000 },
  error: { title: 'Thông báo lỗi', Icon: AlertCircle, duration: 6000 },
  warning: { title: 'Cảnh báo', Icon: AlertTriangle, duration: 5000 },
  info: { title: 'Thông báo', Icon: Info, duration: 4500 }
};

const inferAlertType = (rawMsg) => {
  const msg = String(rawMsg || '').toLowerCase();
  if (
    msg.includes('lỗi') ||
    msg.includes('không thể') ||
    msg.includes('thất bại') ||
    msg.includes('bắt buộc') ||
    msg.includes('không hợp lệ') ||
    msg.includes('chưa được')
  ) {
    return 'error';
  }
  if (
    msg.includes('vui lòng') ||
    msg.includes('cần ') ||
    msg.includes('chưa có') ||
    msg.includes('cảnh báo') ||
    msg.includes('có ')
  ) {
    return 'warning';
  }
  if (
    msg.includes('thành công') ||
    msg.includes('đã ') ||
    msg.includes('hoàn tất')
  ) {
    return 'success';
  }
  return 'info';
};

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolverRef = useRef(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (type, message, customTitle) => {
      const meta = TYPE_META[type] || TYPE_META.info;
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const item = {
        id,
        type,
        title: customTitle || meta.title,
        message: String(message || '')
      };
      setToasts((prev) => [...prev.slice(-4), item]);
      setTimeout(() => {
        removeToast(id);
      }, meta.duration);
    },
    [removeToast]
  );

  const notify = {
    success: (message, title) => pushToast('success', message, title),
    error: (message, title) => pushToast('error', message, title),
    warning: (message, title) => pushToast('warning', message, title),
    info: (message, title) => pushToast('info', message, title)
  };

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : options || {};
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({
        title: opts.title || 'Xác nhận thao tác',
        message: opts.message || 'Bạn có chắc chắn muốn thực hiện thao tác này?',
        confirmText: opts.confirmText || 'Xác nhận',
        cancelText: opts.cancelText || 'Hủy bỏ',
        variant: opts.variant || 'primary'
      });
    });
  }, []);

  const handleConfirmClose = useCallback((result) => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
    setConfirmState(null);
  }, []);

  // Thay thế window.alert mặc định của trình duyệt bằng bảng thông báo chung của hệ thống
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const detectedType = inferAlertType(msg);
      pushToast(detectedType, msg);
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [pushToast]);

  // Hỗ trợ bấm Esc để đóng hộp thoại xác nhận
  useEffect(() => {
    if (!confirmState) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleConfirmClose(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmState, handleConfirmClose]);

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}

      {/* Bảng thông báo Toast toàn hệ thống */}
      <div className="global-toast-container" aria-live="polite">
        {toasts.map((toast) => {
          const meta = TYPE_META[toast.type] || TYPE_META.info;
          const Icon = meta.Icon;
          return (
            <div key={toast.id} className={`global-toast-card ${toast.type}`} role="status">
              <div className="global-toast-icon">
                <Icon size={18} />
              </div>
              <div className="global-toast-body">
                <div className="global-toast-title">{toast.title}</div>
                <div className="global-toast-message">{toast.message}</div>
              </div>
              <button
                type="button"
                className="global-toast-close"
                onClick={() => removeToast(toast.id)}
                aria-label="Đóng thông báo"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Hộp thoại xác nhận chung */}
      {confirmState && (
        <div
          className="global-confirm-backdrop"
          onClick={() => handleConfirmClose(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="global-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="global-confirm-header">
              <div className={`global-confirm-badge ${confirmState.variant}`}>
                {confirmState.variant === 'danger' ? (
                  <AlertTriangle size={20} />
                ) : (
                  <HelpCircle size={20} />
                )}
              </div>
              <div className="global-confirm-text">
                <h3>{confirmState.title}</h3>
                <p>{confirmState.message}</p>
              </div>
            </div>
            <div className="global-confirm-footer">
              <button
                type="button"
                className="global-confirm-btn-cancel"
                onClick={() => handleConfirmClose(false)}
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                className={`global-confirm-btn-ok ${confirmState.variant}`}
                onClick={() => handleConfirmClose(true)}
                autoFocus
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
}
