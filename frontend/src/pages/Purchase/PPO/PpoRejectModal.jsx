import { useState, useEffect } from 'react';
import { X, Ban, AlertCircle } from 'lucide-react';
import { rejectPpo } from '../../../services/api';
import './PpoRejectModal.css';

const PpoRejectModal = ({ isOpen, onClose, onSuccess, ppo }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !ppo) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do từ chối đề xuất này');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await rejectPpo(ppo.id, {
        distributorId: 1,
        reason: reason.trim()
      });
      onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi từ chối đề xuất');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="po-create-modal ppo-reject-modal-container">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <Ban size={20} />
            </div>
            <div>
              <h2>Từ chối đề xuất: [{ppo.product?.sku}]</h2>
              <p className="modal-subtitle">Ghi nhận lý do để phục vụ hiệu chỉnh thuật toán đề xuất sau này</p>
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
            <label>Lý do từ chối đề xuất đặt hàng <span className="req">*</span>:</label>
            <textarea
              rows={3}
              placeholder="VD: Sản phẩm sắp đổi mẫu mã bao bì, tạm dừng nhập thêm..."
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
            className="btn-danger-confirm"
            onClick={handleSubmit}
            disabled={loading}
          >
            <Ban size={16} />
            <span>{loading ? 'Đang xử lý...' : 'Xác nhận Từ chối'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PpoRejectModal;
