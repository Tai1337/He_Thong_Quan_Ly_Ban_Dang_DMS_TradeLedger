import { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Package, 
  FileText, 
  RotateCcw,
  Store,
  MapPin,
  Phone
} from 'lucide-react';
import { confirmStopDelivery } from '../../services/api';
import './ConfirmDeliveryModal.css';

export default function ConfirmDeliveryModal({ 
  isOpen, 
  onClose, 
  tripId, 
  order, 
  onDeliveryConfirmed 
}) {
  const [deliveryResult, setDeliveryResult] = useState('DELIVERED_FULL'); // 'DELIVERED_FULL', 'DELIVERED_PARTIAL', 'DELIVERY_FAILED'
  const [itemsState, setItemsState] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Khởi tạo state cho các mặt hàng khi order thay đổi
  useEffect(() => {
    if (order && order.items) {
      const initialItems = order.items.map(it => {
        const qty = Number(it.quantity || 0);
        return {
          itemId: it.id,
          productName: it.productName,
          productSku: it.productSku,
          unit: it.unit || 'THÙNG',
          orderedQty: qty,
          deliveredQty: qty, // Mặc định đủ
          unitPrice: Number(it.unitPrice || 0)
        };
      });
      setItemsState(initialItems);
      setDeliveryResult('DELIVERED_FULL');
      setNotes('');
      setError('');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  // Xử lý thay đổi số lượng thực giao cho từng mặt hàng
  const handleQuantityChange = (itemId, val) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    setItemsState(prev => prev.map(item => {
      if (item.itemId === itemId) {
        // Không cho phép vượt quá số lượng đặt
        const safeDelivered = num === '' ? 0 : Math.min(item.orderedQty, num);
        return { ...item, deliveredQty: safeDelivered };
      }
      return item;
    }));
  };

  // Tính tổng số lượng đặt, thực giao và rớt
  const totalOrdered = itemsState.reduce((sum, it) => sum + it.orderedQty, 0);
  const totalDelivered = itemsState.reduce((sum, it) => sum + (Number(it.deliveredQty) || 0), 0);
  const totalFailed = Math.max(0, Math.round((totalOrdered - totalDelivered) * 10) / 10);

  // Submit xác nhận giao hàng
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (deliveryResult === 'DELIVERY_FAILED' && !notes.trim()) {
      setError('Vui lòng nhập lý do giao hàng thất bại');
      return;
    }

    if (deliveryResult === 'DELIVERED_PARTIAL') {
      if (totalFailed <= 0) {
        setError('Số lượng thực giao đang bằng số lượng đặt. Vui lòng chọn "Giao thành công 100%" hoặc chỉnh sửa số lượng thực giao.');
        return;
      }
      if (!notes.trim()) {
        setError('Vui lòng ghi rõ lý do rớt hàng / giao thiếu');
        return;
      }
    }

    setLoading(true);
    try {
      const itemsPayload = itemsState.map(it => ({
        itemId: it.itemId,
        deliveredQty: Number(it.deliveredQty || 0),
        failedReason: notes
      }));

      await confirmStopDelivery(tripId, {
        orderId: order.id,
        distributorId: 1,
        deliveryResult,
        itemsDelivery: itemsPayload,
        notes: notes.trim(),
        changedById: 1
      });

      onDeliveryConfirmed && onDeliveryConfirmed();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi xác nhận giao hàng');
    } finally {
      setLoading(false);
    }
  };

  // Các lý do gợi ý khi giao thất bại
  const failureReasons = [
    'Khách đóng cửa / đi vắng',
    'Không liên lạc được số điện thoại',
    'Khách từ chối nhận (hủy đơn)',
    'Hàng bị móp méo / khách không đồng ý nhận',
    'Sai địa chỉ giao hàng'
  ];

  return (
    <div className="confirm-delivery-backdrop" onClick={onClose}>
      <div className="confirm-delivery-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="confirm-delivery-header">
          <div className="confirm-delivery-title-group">
            <div className="confirm-icon-badge">
              <Package size={20} />
            </div>
            <div>
              <h3>Xác Nhận Giao Hàng Điểm Bán</h3>
              <p className="confirm-header-sub">
                Đơn hàng: <strong>{order.orderCode}</strong>
              </p>
            </div>
          </div>

          <button type="button" className="btn-close-confirm-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="confirm-delivery-body">
            {error && <div className="confirm-error-alert">{error}</div>}

            {/* Thông tin đại lý nhận hàng */}
            <div className="confirm-retailer-card">
              <div className="confirm-retailer-row">
                <Store size={16} color="#2563eb" />
                <strong>{order.retailer?.name || 'Khách lẻ'}</strong>
              </div>
              <div className="confirm-retailer-row sub">
                <MapPin size={14} color="#64748b" />
                <span>{order.retailer?.address || 'Chưa cập nhật địa chỉ'}</span>
              </div>
              {order.retailer?.phone && (
                <div className="confirm-retailer-row sub">
                  <Phone size={14} color="#64748b" />
                  <span>{order.retailer?.phone}</span>
                </div>
              )}
            </div>

            {/* 3 Lựa chọn kết quả giao hàng */}
            <div className="delivery-result-selector">
              <label 
                className={`result-radio-card ${deliveryResult === 'DELIVERED_FULL' ? 'selected success' : ''}`}
                onClick={() => setDeliveryResult('DELIVERED_FULL')}
              >
                <input 
                  type="radio" 
                  name="deliveryResult" 
                  checked={deliveryResult === 'DELIVERED_FULL'}
                  onChange={() => setDeliveryResult('DELIVERED_FULL')}
                />
                <div className="radio-card-content">
                  <div className="radio-card-head">
                    <CheckCircle2 size={18} color="#10b981" />
                    <strong>Giao Thành Công Đủ 100%</strong>
                  </div>
                  <p>Khách nhận đủ toàn bộ {totalOrdered} thùng hàng.</p>
                </div>
              </label>

              <label 
                className={`result-radio-card ${deliveryResult === 'DELIVERED_PARTIAL' ? 'selected warning' : ''}`}
                onClick={() => setDeliveryResult('DELIVERED_PARTIAL')}
              >
                <input 
                  type="radio" 
                  name="deliveryResult" 
                  checked={deliveryResult === 'DELIVERED_PARTIAL'}
                  onChange={() => setDeliveryResult('DELIVERED_PARTIAL')}
                />
                <div className="radio-card-content">
                  <div className="radio-card-head">
                    <AlertCircle size={18} color="#f59e0b" />
                    <strong>Giao Một Phần (Đơn Rớt Hàng)</strong>
                  </div>
                  <p>Khách chỉ nhận một phần số lượng, phần còn lại mang về kho.</p>
                </div>
              </label>

              <label 
                className={`result-radio-card ${deliveryResult === 'DELIVERY_FAILED' ? 'selected danger' : ''}`}
                onClick={() => setDeliveryResult('DELIVERY_FAILED')}
              >
                <input 
                  type="radio" 
                  name="deliveryResult" 
                  checked={deliveryResult === 'DELIVERY_FAILED'}
                  onChange={() => setDeliveryResult('DELIVERY_FAILED')}
                />
                <div className="radio-card-content">
                  <div className="radio-card-head">
                    <XCircle size={18} color="#ef4444" />
                    <strong>Giao Thất Bại Toàn Bộ</strong>
                  </div>
                  <p>Đại lý từ chối nhận hoặc không liên lạc được.</p>
                </div>
              </label>
            </div>

            {/* BẢNG CHỈNH SỬA SỐ LƯỢNG KHI GIAO MỘT PHẦN (ĐƠN RỚT) */}
            {deliveryResult === 'DELIVERED_PARTIAL' && (
              <div className="partial-delivery-card">
                <div className="partial-header-row">
                  <h4>Chi Tiết Số Lượng Thực Giao Cho Từng Mặt Hàng</h4>
                  <span className="partial-summary-chip">
                    Đặt: {totalOrdered} | Thực giao: <strong>{totalDelivered}</strong> | Rớt: <strong style={{ color: '#ef4444' }}>{totalFailed}</strong>
                  </span>
                </div>

                <div className="partial-table-wrap">
                  <table className="partial-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th style={{ width: '85px', textAlign: 'center' }}>Đặt</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Thực giao</th>
                        <th style={{ width: '85px', textAlign: 'center' }}>Rớt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsState.map(item => {
                        const delivered = Number(item.deliveredQty) || 0;
                        const failed = Math.max(0, item.orderedQty - delivered);
                        return (
                          <tr key={item.itemId}>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.productName}</div>
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                SKU: <code>{item.productSku}</code> ({item.unit})
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                              {item.orderedQty}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number"
                                min="0"
                                max={item.orderedQty}
                                step="1"
                                className="input-actual-qty"
                                value={item.deliveredQty}
                                onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge-failed-qty ${failed > 0 ? 'has-fail' : ''}`}>
                                {failed > 0 ? `-${failed}` : '0'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="partial-note-alert">
                  <RotateCcw size={15} />
                  <span>
                    Số lượng hàng rớt ({totalFailed} thùng) sẽ được giải phóng giữ chỗ (reserved) và tự động hoàn trả về tồn kho khả dụng cho Nhà phân phối.
                  </span>
                </div>
              </div>
            )}

            {/* GỢI Ý LÝ DO KHI GIAO THẤT BẠI */}
            {deliveryResult === 'DELIVERY_FAILED' && (
              <div className="failure-reasons-wrap">
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                  Chọn nhanh lý do không giao được:
                </div>
                <div className="reason-chips">
                  {failureReasons.map((reason, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`reason-chip ${notes === reason ? 'active' : ''}`}
                      onClick={() => setNotes(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ô NHẬP GHI CHÚ / LÝ DO */}
            {(deliveryResult === 'DELIVERED_PARTIAL' || deliveryResult === 'DELIVERY_FAILED') && (
              <div className="form-group-notes">
                <label>
                  <FileText size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {deliveryResult === 'DELIVERED_PARTIAL' ? 'Lý do rớt hàng / giao thiếu *' : 'Ghi chú lý do thất bại *'}
                </label>
                <textarea 
                  rows="3"
                  className="confirm-textarea"
                  placeholder={deliveryResult === 'DELIVERED_PARTIAL' 
                    ? 'Ví dụ: Khách thiếu tiền chỉ lấy 8 thùng, 2 thùng bị móp méo mang về kho...'
                    : 'Nhập chi tiết lý do không thể giao hàng...'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="confirm-delivery-footer">
            <button 
              type="button" 
              className="btn-confirm-cancel" 
              onClick={onClose}
              disabled={loading}
            >
              Đóng
            </button>

            <button 
              type="submit" 
              className={`btn-confirm-submit ${deliveryResult === 'DELIVERY_FAILED' ? 'btn-danger' : 'btn-primary'}`}
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : 'Xác Nhận Kết Quả Giao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
