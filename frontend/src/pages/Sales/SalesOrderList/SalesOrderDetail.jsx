import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building2, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  Printer, 
  Check, 
  X, 
  PackageCheck,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { 
  getSalesOrderById, 
  confirmSalesOrder, 
  cancelSalesOrder, 
  assignTripSalesOrder, 
  confirmDeliverySalesOrder, 
  closeSalesOrder,
  getDeliveryTrips 
} from '../../../services/api';
import './SalesOrderDetail.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const STATUS_LABELS = {
  PENDING: 'Đã gửi đơn',
  ALLOCATED: 'Chờ giao',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  PAID: 'Đã đóng',
  CANCELLED: 'Đã huỷ'
};

const SalesOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [trips, setTrips] = useState([]);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(true);
  const [deliveryNote, setDeliveryNote] = useState('');

  const loadOrderDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSalesOrderById(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
    getDeliveryTrips({ distributorId: 1 }).then(setTrips).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // Lifecycle Actions
  const handleConfirmAction = async () => {
    setActionLoading(true);
    try {
      const res = await confirmSalesOrder(id);
      setSuccessMsg(res.message || 'Xác nhận đơn hàng và phân bổ lô FEFO thành công');
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi xác nhận đơn hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do huỷ');
      return;
    }
    setActionLoading(true);
    try {
      const res = await cancelSalesOrder(id, { reason: cancelReason });
      setSuccessMsg(res.message || 'Huỷ đơn hàng thành công');
      setCancelModalOpen(false);
      setCancelReason('');
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi huỷ đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTripSubmit = async () => {
    if (!selectedTripId) {
      alert('Vui lòng chọn chuyến xe');
      return;
    }
    setActionLoading(true);
    try {
      const res = await assignTripSalesOrder(id, { tripId: selectedTripId });
      setSuccessMsg(res.message || 'Gán chuyến xe thành công');
      setTripModalOpen(false);
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi gán xe');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverySubmit = async () => {
    setActionLoading(true);
    try {
      const res = await confirmDeliverySalesOrder(id, { isSuccess: deliverySuccess, note: deliveryNote });
      setSuccessMsg(res.message || 'Xác nhận giao hàng thành công');
      setDeliveryModalOpen(false);
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi xác nhận giao hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseAction = async () => {
    setActionLoading(true);
    try {
      const res = await closeSalesOrder(id);
      setSuccessMsg(res.message || 'Đóng đơn hàng thành công');
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi đóng đơn');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="detail-loading">Đang tải thông tin đơn hàng...</div>;
  }

  if (error || !order) {
    return (
      <div className="detail-error-container">
        <AlertTriangle size={32} color="#dc2626" />
        <p>{error || 'Không tìm thấy đơn hàng'}</p>
        <Link to="/sales/sales-orders" className="btn-secondary">
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="sales-order-detail-page">
      {/* Toast Alert */}
      {successMsg && (
        <div className="detail-toast-success">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Top Header */}
      <div className="detail-header-card">
        <div className="detail-header-left">
          <Link to="/sales/sales-orders" className="btn-back">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="order-title-row">
              <h2>Đơn hàng: {order.orderCode}</h2>
              <span className={`status-badge-lg ${order.status.toLowerCase()}`}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <p className="order-meta">
              Ngày tạo: {new Date(order.createdAt).toLocaleString('vi-VN')} | Kho: {order.warehouseName} | Loại đơn: {order.orderType === 'IMMEDIATE' ? 'Giao ngay' : 'Giao sau'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="detail-header-actions">
          <button className="btn-outline" onClick={() => window.print()}>
            <Printer size={15} /> In phiếu
          </button>

          {order.status === 'PENDING' && (
            <>
              <button 
                className="btn-danger-outline" 
                onClick={() => setCancelModalOpen(true)}
                disabled={actionLoading}
              >
                <Ban size={15} /> Huỷ đơn
              </button>
              <button 
                className="btn-primary" 
                onClick={handleConfirmAction}
                disabled={actionLoading}
              >
                <Check size={15} /> Xác nhận đơn (FEFO)
              </button>
            </>
          )}

          {order.status === 'ALLOCATED' && (
            <>
              <button 
                className="btn-danger-outline" 
                onClick={() => setCancelModalOpen(true)}
                disabled={actionLoading}
              >
                <Ban size={15} /> Huỷ đơn
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setTripModalOpen(true)}
                disabled={actionLoading}
              >
                <Truck size={15} /> Gán chuyến xe
              </button>
            </>
          )}

          {order.status === 'SHIPPED' && (
            <button 
              className="btn-primary" 
              onClick={() => setDeliveryModalOpen(true)}
              disabled={actionLoading}
            >
              <PackageCheck size={15} /> Xác nhận giao hàng
            </button>
          )}

          {order.status === 'DELIVERED' && (
            <button 
              className="btn-success" 
              onClick={handleCloseAction}
              disabled={actionLoading}
            >
              <CheckCircle2 size={15} /> Đối soát & Đóng đơn
            </button>
          )}
        </div>
      </div>

      {/* Info Grid (3 Cards) */}
      <div className="detail-info-grid">
        {/* Card 1: Khách hàng */}
        <div className="info-card">
          <div className="info-card-header">
            <Building2 size={16} /> Thông tin Khách hàng / Đại lý
          </div>
          <div className="info-card-body">
            <div className="info-row">
              <span className="label">Mã đại lý:</span>
              <span className="value"><strong>{order.retailerCode}</strong></span>
            </div>
            <div className="info-row">
              <span className="label">Tên cửa hàng:</span>
              <span className="value">{order.retailerName}</span>
            </div>
            <div className="info-row">
              <span className="label">Số điện thoại:</span>
              <span className="value">{order.retailerPhone || 'Chưa cập nhật'}</span>
            </div>
            <div className="info-row">
              <span className="label">Địa chỉ giao:</span>
              <span className="value">{order.retailerAddress}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Nhân viên & Vận chuyển */}
        <div className="info-card">
          <div className="info-card-header">
            <Truck size={16} /> Giao nhận & Vận chuyển
          </div>
          <div className="info-card-body">
            <div className="info-row">
              <span className="label">Ngày giao dự kiến:</span>
              <span className="value">
                {new Date(order.expectedDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Chuyến xe:</span>
              <span className="value">
                {order.deliveryTrip ? order.deliveryTrip.tripCode : 'Chưa điều phối'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Tài xế / NVGH:</span>
              <span className="value">
                {order.deliveryTrip?.driverName || 'Chưa gán tài xế'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Đại diện kinh doanh:</span>
              <span className="value">
                {order.vnbhName} ({order.vnbhCode})
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Giá trị đơn hàng */}
        <div className="info-card">
          <div className="info-card-header">
            <FileText size={16} /> Tổng kết đơn hàng
          </div>
          <div className="info-card-body">
            <div className="info-row">
              <span className="label">Số mặt hàng:</span>
              <span className="value">{order.items.length} sản phẩm</span>
            </div>
            <div className="info-row">
              <span className="label">Tổng tiền hàng:</span>
              <span className="value">{formatCurrency(order.totalAmount)} đ</span>
            </div>
            <div className="info-row">
              <span className="label">Chiết khấu:</span>
              <span className="value">0 đ</span>
            </div>
            <div className="info-row total-highlight">
              <span className="label">Tổng thanh toán:</span>
              <span className="value-total">{formatCurrency(order.totalAmount)} đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="detail-table-card">
        <div className="card-title-bar">
          <h3>Danh sách sản phẩm & Phân bổ lô hàng (FEFO)</h3>
        </div>
        <table className="detail-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th>Mã SKU</th>
              <th>Tên sản phẩm</th>
              <th>ĐVT</th>
              <th style={{ textAlign: 'right' }}>Số lượng đặt</th>
              <th style={{ textAlign: 'right' }}>Đơn giá</th>
              <th style={{ textAlign: 'right' }}>Thành tiền</th>
              <th>Lô hàng phân bổ (FEFO) & HSD</th>
              <th style={{ textAlign: 'center' }}>Trạng thái tồn</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td><code>{item.productSku}</code></td>
                <td style={{ fontWeight: 500 }}>{item.productName}</td>
                <td>{item.unit}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)} đ</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(item.totalAmount)} đ
                </td>
                <td>
                  {item.allocations.length > 0 ? (
                    <div className="allocations-list">
                      {item.allocations.map(a => (
                        <span key={a.id} className="lot-badge">
                          Lô: <strong>{a.lotNumber}</strong> (SL: {a.quantity}) 
                          {a.expiryDate && ` - HSD: ${new Date(a.expiryDate).toLocaleDateString('vi-VN')}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                      {order.status === 'PENDING' ? 'Sẽ tự động chọn lô theo FEFO khi xác nhận' : 'Chưa phân bổ lô'}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {item.isShortage ? (
                    <span className="item-stock-tag shortage">
                      Thiếu tồn (Có: {item.availableStock})
                    </span>
                  ) : (
                    <span className="item-stock-tag enough">
                      Đủ tồn (Có: {item.availableStock})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status History Timeline (Audit Trail) */}
      <div className="detail-table-card">
        <div className="card-title-bar">
          <h3>Lịch sử chuyển trạng thái (Audit Trail)</h3>
        </div>
        <div className="timeline-container">
          {order.statusHistory.map((h, i) => (
            <div key={h.id} className="timeline-step">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-status">
                    {STATUS_LABELS[h.toStatus] || h.toStatus}
                  </span>
                  <span className="timeline-time">
                    <Clock size={12} /> {new Date(h.changedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="timeline-user">
                  Thực hiện bởi: <strong>{h.changedBy}</strong>
                </div>
                {h.reason && (
                  <div className="timeline-reason">
                    <strong>Lý do:</strong> {h.reason}
                  </div>
                )}
                {h.notes && (
                  <div className="timeline-notes">
                    {h.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Huỷ đơn */}
      {cancelModalOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Huỷ đơn hàng {order.orderCode}</h3>
              <button className="btn-close" onClick={() => setCancelModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                {order.status === 'ALLOCATED' 
                  ? 'Đơn hàng đang ở trạng thái Chờ giao (đã giữ chỗ lô). Khi huỷ đơn, tồn kho giữ chỗ sẽ tự động được hoàn trả về kho.' 
                  : 'Vui lòng nhập lý do huỷ đơn hàng:'}
              </p>
              <div className="form-group">
                <label>Lý do huỷ <span style={{ color: 'red' }}>*</span></label>
                <textarea 
                  rows="3"
                  className="modal-textarea"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do huỷ..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setCancelModalOpen(false)}>
                Đóng
              </button>
              <button className="btn-danger" onClick={handleCancelSubmit} disabled={actionLoading}>
                <Ban size={15} /> Xác nhận Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gán xe */}
      {tripModalOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Gán chuyến xe giao hàng</h3>
              <button className="btn-close" onClick={() => setTripModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Chuyến xe <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="modal-select"
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                >
                  <option value="">-- Chọn chuyến xe --</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.tripCode}] - Tài xế: {t.driverName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setTripModalOpen(false)}>
                Đóng
              </button>
              <button className="btn-primary" onClick={handleTripSubmit} disabled={actionLoading}>
                <Truck size={15} /> Xác nhận Gán xe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Giao hàng */}
      {deliveryModalOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Xác nhận giao hàng</h3>
              <button className="btn-close" onClick={() => setDeliveryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group radio-group">
                <label>
                  <input 
                    type="radio" 
                    name="deliv" 
                    checked={deliverySuccess} 
                    onChange={() => setDeliverySuccess(true)}
                  /> Giao thành công (Xuất kho vật lý)
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="deliv" 
                    checked={!deliverySuccess} 
                    onChange={() => setDeliverySuccess(false)}
                  /> Giao thất bại (Quay về Chờ giao)
                </label>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input 
                  type="text"
                  className="modal-input"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Ghi chú người nhận hoặc nguyên nhân giao thất bại..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeliveryModalOpen(false)}>
                Đóng
              </button>
              <button className="btn-primary" onClick={handleDeliverySubmit} disabled={actionLoading}>
                <CheckCircle2 size={15} /> Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrderDetail;
