import { CheckCircle2, Truck, FileText, Calendar, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PpoClosingResultModal.css';

const PpoClosingResultModal = ({ result, onClose }) => {
  const navigate = useNavigate();
  if (!result) return null;

  const { summary, createdTrips = [] } = result;

  const handleGoToReceiving = () => {
    onClose();
    navigate('/purchase/receiving');
  };

  return (
    <div className="modal-backdrop">
      <div className="closing-result-modal">
        <div className="closing-modal-header">
          <div className="closing-header-title">
            <div className="success-icon-wrap">
              <CheckCircle2 size={26} color="#16a34a" />
            </div>
            <div>
              <h3>Kết quả Chốt Đơn PPO 11:00</h3>
              <p>Hệ thống đã tự động tạo PO, SO và lập Lịch Chuyến xe giao hàng D+3</p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="closing-modal-body">
          {/* Summary Badges */}
          <div className="closing-stats-grid">
            <div className="closing-stat-card">
              <span className="stat-num">{summary?.totalPpoApproved || 0}</span>
              <span className="stat-label">Đề xuất PPO đã duyệt</span>
            </div>
            <div className="closing-stat-card">
              <span className="stat-num">{summary?.tripsCreated || 0}</span>
              <span className="stat-label">Chuyến xe INBOUND (D+3)</span>
            </div>
            <div className="closing-stat-card">
              <span className="stat-num">{summary?.posCreated || 0}</span>
              <span className="stat-label">Đơn mua hàng (PO)</span>
            </div>
            <div className="closing-stat-card">
              <span className="stat-num" style={{ color: '#2563eb' }}>{summary?.expectedDeliveryDate || 'D+3'}</span>
              <span className="stat-label">Ngày giao dự kiến</span>
            </div>
          </div>

          {/* List of generated trips */}
          <h4 className="section-title">Danh sách Chuyến xe & Đơn hàng đã sinh tự động:</h4>
          <div className="closing-trips-list">
            {createdTrips.length === 0 ? (
              <div className="empty-trips-text">Không có chuyến xe nào được sinh (chưa có đề xuất chờ duyệt).</div>
            ) : (
              createdTrips.map(trip => (
                <div key={trip.tripId} className="created-trip-card">
                  <div className="trip-card-top">
                    <div className="trip-code-badge">
                      <Truck size={16} />
                      <strong>{trip.tripCode}</strong>
                    </div>
                    <span className="trip-status-tag">ĐANG VẬN CHUYỂN (SHIPPING)</span>
                  </div>

                  <div className="trip-details-grid">
                    <div className="trip-detail-item">
                      <span className="item-label">Nhà cung cấp:</span>
                      <span className="item-value"><strong>{trip.supplierName}</strong></span>
                    </div>
                    <div className="trip-detail-item">
                      <span className="item-label">Kho tiếp nhận:</span>
                      <span className="item-value">{trip.warehouseName}</span>
                    </div>
                    <div className="trip-detail-item">
                      <span className="item-label">Mã Đơn PO:</span>
                      <span className="item-value" style={{ color: '#7c3aed', fontWeight: 600 }}>{trip.poCode}</span>
                    </div>
                    <div className="trip-detail-item">
                      <span className="item-label">Mã Đơn SO (NCC):</span>
                      <span className="item-value" style={{ color: '#2563eb', fontWeight: 600 }}>{trip.soCode}</span>
                    </div>
                    <div className="trip-detail-item">
                      <span className="item-label">Ngày giao dự kiến:</span>
                      <span className="item-value" style={{ color: '#ea580c', fontWeight: 700 }}>
                        <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                        {trip.expectedDeliveryDate} (D+3)
                      </span>
                    </div>
                    <div className="trip-detail-item">
                      <span className="item-label">Số mặt hàng:</span>
                      <span className="item-value">{trip.totalItems} mặt hàng</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="closing-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button className="btn-go-receiving" onClick={handleGoToReceiving}>
            <span>Tới màn hình Nhập kho đặt hàng (D+3)</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PpoClosingResultModal;
