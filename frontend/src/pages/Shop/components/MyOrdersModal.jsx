import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  X 
} from 'lucide-react';
import { getCustomerOrders } from '../../../services/api';
import './MyOrdersModal.css';

export default function MyOrdersModal({ isOpen, onClose, customer }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (isOpen && customer?.id) {
      loadOrders();
    }
  }, [isOpen, customer]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await getCustomerOrders(customer.id);
      setOrders(res.data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="order-status-tag pending">
            <Clock size={12} /> Chờ NPP duyệt
          </span>
        );
      case 'SUBMITTED':
      case 'ALLOCATED':
        return (
          <span className="order-status-tag allocated">
            <Package size={12} /> Đang soạn hàng
          </span>
        );
      case 'SHIPPED':
      case 'DELIVERING':
        return (
          <span className="order-status-tag delivering">
            <Truck size={12} /> Đang giao hàng
          </span>
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="order-status-tag completed">
            <CheckCircle2 size={12} /> Đã giao thành công
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="order-status-tag cancelled">
            <XCircle size={12} /> Đã huỷ
          </span>
        );
      default:
        return <span className="order-status-tag default">{status}</span>;
    }
  };

  return (
    <div className="portal-modal-overlay" onClick={onClose}>
      <div className="my-orders-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="my-orders-header">
          <div className="orders-title-group">
            <div className="orders-header-icon-badge">
              <Package size={20} color="#059669" />
            </div>
            <div>
              <h3>Đơn Mua Của Tôi</h3>
              <p>Lịch sử các đơn hàng trực tuyến (Mã tiền tố <strong>R-</strong>)</p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="my-orders-body">
          {loading ? (
            <div className="orders-loading-state">
              <div className="orders-spinner"></div>
              <span>Đang tải lịch sử đơn hàng...</span>
            </div>
          ) : errorMsg ? (
            <div className="orders-error-state">
              <span>{errorMsg}</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="orders-empty-state">
              <div className="empty-box-circle">
                <Package size={48} color="#94a3b8" />
              </div>
              <h4>Bạn chưa có đơn hàng nào</h4>
              <p>Các đơn hàng bạn đặt từ web bán hàng sẽ hiển thị ở đây để bạn theo dõi tiến trình.</p>
            </div>
          ) : (
            <div className="orders-list-cards">
              {orders.map((order) => {
                const isExpanded = expandedId === order.id;
                const formattedDate = new Date(order.createdAt).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={order.id} className="order-history-card">
                    <div className="order-history-top" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                      <div className="order-code-col">
                        <strong className="history-order-code">{order.orderCode}</strong>
                        <span className="history-order-date">{formattedDate}</span>
                      </div>

                      <div className="order-status-col">
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="order-amount-col">
                        <strong className="history-order-amount">
                          {order.totalAmount.toLocaleString('vi-VN')} ₫
                        </strong>
                        <span className="toggle-hint">
                          {isExpanded ? (
                            <><span>Thu gọn</span> <ChevronUp size={12} /></>
                          ) : (
                            <><span>Chi tiết</span> <ChevronDown size={12} /></>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Expandable items table */}
                    {isExpanded && (
                      <div className="order-history-details">
                        <div className="details-table-header">
                          <span>Sản phẩm</span>
                          <span>Số lượng</span>
                          <span>Đơn giá</span>
                          <span>Thành tiền</span>
                        </div>
                        {order.items.map((it) => (
                          <div key={it.id} className="details-item-row">
                            <span className="item-name-col">
                              {it.productName} <small>({it.unit})</small>
                            </span>
                            <span className="item-qty-col">{it.quantity}</span>
                            <span className="item-price-col">
                              {it.unitPrice.toLocaleString('vi-VN')} ₫
                            </span>
                            <span className="item-subtotal-col">
                              {it.amount.toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                        ))}

                        {order.deliveryTripCode && (
                          <div className="trip-tracking-line">
                            <Truck size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Chuyến xe giao hàng nội bộ: <strong>{order.deliveryTripCode}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
