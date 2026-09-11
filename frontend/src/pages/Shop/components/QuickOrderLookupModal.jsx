import React, { useState } from 'react';
import { 
  Search, 
  X, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  DollarSign
} from 'lucide-react';
import { getShopOrderDetail } from '../../../services/api';
import './QuickOrderLookupModal.css';

export default function QuickOrderLookupModal({ isOpen, onClose }) {
  const [orderCode, setOrderCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!orderCode.trim()) {
      setError('Vui lòng nhập mã đơn hàng (Ví dụ: R-20260911-XXXXX)');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await getShopOrderDetail(orderCode.trim());
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError('Không tìm thấy đơn hàng với mã này trên hệ thống DMS.');
      }
    } catch (err) {
      setError(err.message || 'Không tìm thấy thông tin đơn hàng này');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'ALLOCATED':
        return 2;
      case 'DELIVERING':
        return 3;
      case 'COMPLETED':
        return 4;
      case 'CANCELLED':
        return -1;
      default:
        return 1;
    }
  };

  const currentStep = order ? getStatusStep(order.status) : 0;

  return (
    <div className="lookup-modal-backdrop" onClick={onClose}>
      <div className="lookup-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="lookup-modal-header">
          <div className="lookup-header-lead">
            <div className="lookup-icon-badge">
              <Truck size={20} color="#059669" />
            </div>
            <div>
              <h3 className="lookup-title">Tra Cứu Lộ Trình Đơn Hàng R-</h3>
              <p className="lookup-subtitle">Theo dõi trạng thái điều phối kho và giao hàng theo thời gian thực</p>
            </div>
          </div>
          <button type="button" className="lookup-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Search Input Bar */}
        <form className="lookup-search-bar" onSubmit={handleSearch}>
          <div className="lookup-input-group">
            <Search size={18} className="lookup-search-icon" />
            <input
              type="text"
              placeholder="Nhập mã đơn hàng có tiền tố R- (VD: R-20260911-12345)..."
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              className="lookup-input"
              autoFocus
            />
            {orderCode && (
              <button 
                type="button" 
                className="lookup-clear-btn" 
                onClick={() => setOrderCode('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button 
            type="submit" 
            className="lookup-submit-btn"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="spin-icon" /> : <Search size={16} />}
            <span>Kiểm tra ngay</span>
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="lookup-error-banner">
            <AlertCircle size={18} color="#ef4444" />
            <span>{error}</span>
          </div>
        )}

        {/* Order Details Display */}
        {order && (
          <div className="lookup-result-card">
            <div className="lookup-result-head">
              <div>
                <span className="lookup-code-label">MÃ ĐƠN HÀNG WEB ĐIỆN TỬ</span>
                <h4 className="lookup-code-val">{order.orderCode}</h4>
              </div>
              <span className={`lookup-status-pill status-${order.status.toLowerCase()}`}>
                {order.status === 'PENDING' && 'Chờ Tiếp Nhận'}
                {order.status === 'ALLOCATED' && 'Đã Gán Kho Phân Phối'}
                {order.status === 'DELIVERING' && 'Xe Tải Đang Giao'}
                {order.status === 'COMPLETED' && 'Giao Thành Công'}
                {order.status === 'CANCELLED' && 'Đã Huỷ Đơn'}
              </span>
            </div>

            {/* Tracking Steps Timeline */}
            <div className="lookup-timeline-wrapper">
              <div className={`lookup-step ${currentStep >= 1 ? 'active' : ''}`}>
                <div className="step-circle">
                  <Clock size={15} />
                </div>
                <div className="step-content">
                  <strong>1. Tiếp nhận đơn</strong>
                  <small>Đơn tự động lưu kho</small>
                </div>
              </div>

              <div className="step-divider-line"></div>

              <div className={`lookup-step ${currentStep >= 2 ? 'active' : ''}`}>
                <div className="step-circle">
                  <Package size={15} />
                </div>
                <div className="step-content">
                  <strong>2. Lấy hàng & Đóng gói</strong>
                  <small>Kiểm tra số lô & HSD</small>
                </div>
              </div>

              <div className="step-divider-line"></div>

              <div className={`lookup-step ${currentStep >= 3 ? 'active' : ''}`}>
                <div className="step-circle">
                  <Truck size={15} />
                </div>
                <div className="step-content">
                  <strong>3. Xuất xe giao</strong>
                  <small>Tuyến xe tải DMS</small>
                </div>
              </div>

              <div className="step-divider-line"></div>

              <div className={`lookup-step ${currentStep >= 4 ? 'active' : ''}`}>
                <div className="step-circle">
                  <CheckCircle2 size={15} />
                </div>
                <div className="step-content">
                  <strong>4. Giao tận nơi</strong>
                  <small>Ký nhận & Thanh toán</small>
                </div>
              </div>
            </div>

            {/* Meta summary */}
            <div className="lookup-meta-grid">
              <div className="lookup-meta-item">
                <Calendar size={15} color="#64748b" />
                <div>
                  <small>Thời gian đặt</small>
                  <strong>{new Date(order.orderDate).toLocaleString('vi-VN')}</strong>
                </div>
              </div>

              <div className="lookup-meta-item">
                <DollarSign size={15} color="#64748b" />
                <div>
                  <small>Tổng tiền thanh toán</small>
                  <strong className="lookup-total-price">
                    {Number(order.totalAmount).toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              </div>

              <div className="lookup-meta-item">
                <ShieldCheck size={15} color="#64748b" />
                <div>
                  <small>Đơn vị đặt hàng</small>
                  <strong>{order.customer?.storeName || order.customer?.fullName || 'Khách vãng lai'}</strong>
                </div>
              </div>
            </div>

            {/* Items table preview */}
            <div className="lookup-items-preview">
              <div className="lookup-items-head">
                <span>Danh sách mặt hàng ({order.items?.length || 0})</span>
              </div>
              <div className="lookup-items-list">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="lookup-item-row">
                    <div className="lookup-item-name">
                      <strong>{item.product?.name || 'Sản phẩm FMCG'}</strong>
                      <small>SKU: {item.product?.sku || '-'}</small>
                    </div>
                    <div className="lookup-item-qty">
                      x{item.quantity} {item.product?.unit || 'thùng'}
                    </div>
                    <div className="lookup-item-subtotal">
                      {Number(item.totalPrice).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        {!order && !error && (
          <div className="lookup-guide-box">
            <h4>Mẹo tra cứu nhanh:</h4>
            <ul>
              <li>Mọi đơn đặt hàng từ Cổng Web Bán Hàng đều được tạo với tiền tố <strong>R-</strong> (VD: <code>R-20260911-87846</code>).</li>
              <li>Bạn có thể kiểm tra mã đơn từ tin nhắn xác nhận hoặc email khi hoàn tất đặt hàng.</li>
              <li>Hệ thống liên kết trực tiếp điều phối đội xe tải kho tổng DMS TradeLedger.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
