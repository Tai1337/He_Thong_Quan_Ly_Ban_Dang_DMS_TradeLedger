import { X, Sparkles, Calculator, AlertTriangle, CheckCircle2, TrendingUp, Package, Clock, Building2 } from 'lucide-react';
import './PpoDetailModal.css';

const PpoDetailModal = ({ isOpen, onClose, ppo }) => {
  if (!isOpen || !ppo) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="po-create-modal ppo-detail-modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Calculator size={20} />
            </div>
            <div>
              <h2>Chi tiết Đề xuất Đặt hàng: [{ppo.product?.sku}]</h2>
              <p className="modal-subtitle">Minh bạch thuật toán tính toán nhu cầu và ngưỡng điểm đặt hàng lại (ROP)</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Thông tin sản phẩm */}
          <div className="form-grid-2">
            <div className="detail-prop-row">
              <span className="detail-prop-label">Tên sản phẩm:</span>
              <span className="detail-prop-value">{ppo.product?.name}</span>
            </div>
            <div className="detail-prop-row">
              <span className="detail-prop-label">Đơn vị tính:</span>
              <span className="detail-prop-value">{ppo.product?.unit || 'Thùng'}</span>
            </div>
            <div className="detail-prop-row">
              <span className="detail-prop-label">Nhà cung cấp:</span>
              <span className="detail-prop-value">{ppo.supplier?.name || 'Tân Hiệp Phát'}</span>
            </div>
            <div className="detail-prop-row">
              <span className="detail-prop-label">Thời điểm sinh:</span>
              <span className="detail-prop-value">{new Date(ppo.generatedAt).toLocaleString('vi-VN')}</span>
            </div>
          </div>

          {/* Diễn giải lý do */}
          <div className="explain-text-box">
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <AlertTriangle size={16} />
              <span>Diễn giải căn cứ đề xuất đặt hàng:</span>
            </div>
            <div>{ppo.reason}</div>
          </div>

          {/* Card Công thức & Chỉ số phân tích */}
          <div className="ppo-formula-card">
            <div className="ppo-formula-title">
              <Calculator size={18} color="#2563eb" />
              <span>Các biến số phân tích đầu vào (Input Parameters)</span>
            </div>

            <div className="formula-grid">
              <div className="formula-box">
                <span className="formula-label">Bán TB / Ngày (d)</span>
                <span className="formula-val">{ppo.avgDailyDemand}</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Moving avg 30 ngày</span>
              </div>

              <div className="formula-box">
                <span className="formula-label">Lead Time (L)</span>
                <span className="formula-val">{ppo.leadTimeDays} ngày</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Thời gian NCC giao</span>
              </div>

              <div className="formula-box">
                <span className="formula-label">Tồn An toàn (SS)</span>
                <span className="formula-val">{ppo.safetyStock}</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Buffer an toàn</span>
              </div>

              <div className="formula-box highlight">
                <span className="formula-label">Điểm Đặt Lại (ROP)</span>
                <span className="formula-val">{ppo.reorderPoint}</span>
                <span style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>Ngưỡng kích hoạt</span>
              </div>
            </div>

            <div className="formula-equation">
              Công thức ROP = (Doanh số TB/ngày × Lead time) + Tồn an toàn = ({ppo.avgDailyDemand} × {ppo.leadTimeDays}) + {ppo.safetyStock} = <strong>{ppo.reorderPoint}</strong>
            </div>

            <div className="formula-grid" style={{ marginTop: 6 }}>
              <div className="formula-box" style={{ borderColor: ppo.quantityAvailableSnapshot < ppo.reorderPoint ? '#ef4444' : '#cbd5e1' }}>
                <span className="formula-label">Tồn khả dụng hiện tại</span>
                <span className="formula-val" style={{ color: ppo.quantityAvailableSnapshot < ppo.reorderPoint ? '#dc2626' : '#0f172a' }}>
                  {ppo.quantityAvailableSnapshot}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>OnHand - Reserved</span>
              </div>

              <div className="formula-box">
                <span className="formula-label">Chu kỳ dự trữ mong muốn</span>
                <span className="formula-val">14 ngày</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Đủ bán nửa tháng</span>
              </div>

              <div className="formula-box highlight">
                <span className="formula-label">Số lượng đề xuất</span>
                <span className="formula-val" style={{ color: '#2563eb' }}>{ppo.suggestedQty}</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Hệ thống đề xuất</span>
              </div>

              <div className="formula-box" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                <span className="formula-label">Số lượng đặt chốt</span>
                <span className="formula-val" style={{ color: '#15803d' }}>{ppo.finalQty}</span>
                <span style={{ fontSize: '0.72rem', color: '#15803d' }}>Nhân viên duyệt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PpoDetailModal;
