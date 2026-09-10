import { useState, useEffect } from 'react';
import { X, Ban, CheckSquare, AlertCircle } from 'lucide-react';
import { cancelPurchaseOrder, closePartialPurchaseOrder } from '../../../services/api';
import './CancelCloseModal.css';

const CancelCloseModal = ({ isOpen, onClose, onSuccess, order, actionType = 'CANCEL' }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const isCancel = actionType === 'CANCEL';

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError(`Vui lòng nhập lý do ${isCancel ? 'huỷ đơn hàng' : 'đóng đơn hàng'}`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      let res;
      if (isCancel) {
        res = await cancelPurchaseOrder(order.id, {
          distributorId: 1,
          reason: reason.trim()
        });
      } else {
        res = await closePartialPurchaseOrder(order.id, {
          distributorId: 1,
          reason: reason.trim()
        });
      }

      onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi xử lý thao tác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="po-create-modal reason-modal-container">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className={`modal-icon-badge ${isCancel ? 'reason-icon-cancel' : 'reason-icon-close'}`}>
              {isCancel ? <Ban size={20} /> : <CheckSquare size={20} />}
            </div>
            <div>
              <h2>{isCancel ? `Huỷ đơn đặt hàng: ${order.poCode}` : `Đóng đơn thiếu hàng: ${order.poCode}`}</h2>
              <p className="modal-subtitle">
                {isCancel 
                  ? 'Đơn hàng sẽ chuyển sang trạng thái Huỷ và không thể thao tác tiếp'
                  : 'Đơn hàng sẽ chuyển sang trạng thái Hoàn tất dù chưa nhận đủ số lượng ban đầu'
                }
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-field">
            <label>
              Lý do {isCancel ? 'huỷ đơn đặt hàng' : 'đóng đơn thiếu hàng'} <span className="req">*</span>:
            </label>
            <textarea
              rows={3}
              placeholder={isCancel ? 'VD: Nhà cung cấp báo hết hàng tạm thời...' : 'VD: Nhà cung cấp chỉ giao được đợt 1 và huỷ phần còn lại...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
            Quay lại
          </button>
          <button
            type="button"
            className={isCancel ? 'btn-danger-confirm' : 'btn-warning-confirm'}
            onClick={handleSubmit}
            disabled={loading}
          >
            {isCancel ? <Ban size={16} /> : <CheckSquare size={16} />}
            <span>{loading ? 'Đang xử lý...' : (isCancel ? 'Xác nhận Huỷ đơn' : 'Xác nhận Đóng đơn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelCloseModal;
