import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Send, 
  PackageCheck, 
  Ban, 
  CheckSquare, 
  Clock, 
  Truck, 
  CheckCircle2, 
  Building2, 
  History,
  AlertCircle
} from 'lucide-react';
import { 
  getPurchaseOrderById, 
  sendPurchaseOrderToSupplier 
} from '../../../services/api';
import ReceiveGoodsModal from '../PurchaseOrderList/ReceiveGoodsModal';
import CancelCloseModal from '../PurchaseOrderList/CancelCloseModal';
import CreatePurchaseOrderModal from '../PurchaseOrderList/CreatePurchaseOrderModal';
import './PurchaseOrderDetail.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const PurchaseOrderDetail = () => {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonActionType, setReasonActionType] = useState('CANCEL');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPurchaseOrderById(id, 1);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải chi tiết đơn hàng mua');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleSendPO = async () => {
    if (!window.confirm('Xác nhận gửi đơn đặt hàng này cho Nhà cung cấp?')) return;
    try {
      await sendPurchaseOrderToSupplier(order.id, {
        distributorId: 1,
        notes: 'Gửi đơn hàng mua từ màn hình chi tiết PO'
      });
      fetchOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi gửi đơn hàng');
    }
  };

  if (loading) {
    return (
      <div className="po-detail-container">
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Đang tải thông tin chi tiết đơn đặt hàng mua...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="po-detail-container">
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error || 'Không tìm thấy đơn đặt hàng'}</span>
        </div>
        <Link to="/purchase/purchase-orders" className="back-link">
          <ArrowLeft size={16} />
          <span>Quay lại danh sách đơn mua</span>
        </Link>
      </div>
    );
  }

  const percent = order.metrics?.receivedPercentage || 0;

  return (
    <div className="po-detail-container">
      {/* Top Nav */}
      <div className="po-detail-top-nav">
        <Link to="/purchase/purchase-orders" className="back-link">
          <ArrowLeft size={18} />
          <span>Quay lại danh sách Đơn đặt hàng mua (PO)</span>
        </Link>

        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Ngày tạo: {new Date(order.createdAt).toLocaleString('vi-VN')}
        </span>
      </div>

      {/* Header Card */}
      <div className="po-detail-header-card">
        <div className="po-detail-title-group">
          <h1>{order.poCode}</h1>
          {order.status === 'DRAFT' && (
            <span className="badge-status badge-draft">
              <Clock size={14} /> Nháp
            </span>
          )}
          {order.status === 'WAITING_RECEIVE' && (
            <span className="badge-status badge-waiting">
              <Truck size={14} /> Đã gửi NCC
            </span>
          )}
          {order.status === 'PARTIALLY_RECEIVED' && (
            <span className="badge-status badge-partial">
              <PackageCheck size={14} /> Đã nhận một phần
            </span>
          )}
          {order.status === 'COMPLETED' && (
            <span className="badge-status badge-completed">
              <CheckCircle2 size={14} /> Hoàn tất
            </span>
          )}
          {order.status === 'CANCELLED' && (
            <span className="badge-status badge-cancelled">
              <Ban size={14} /> Đã huỷ
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="po-header-actions">
          {order.status === 'DRAFT' && (
            <>
              <button 
                type="button" 
                className="btn-secondary-action"
                onClick={() => setIsEditModalOpen(true)}
              >
                Chỉnh sửa đơn
              </button>
              <button 
                type="button" 
                className="btn-primary-action"
                onClick={handleSendPO}
              >
                <Send size={16} />
                <span>Gửi cho NCC</span>
              </button>
              <button 
                type="button" 
                className="action-icon-btn danger"
                onClick={() => {
                  setReasonActionType('CANCEL');
                  setIsReasonModalOpen(true);
                }}
              >
                <Ban size={16} />
                <span>Huỷ đơn</span>
              </button>
            </>
          )}

          {order.status === 'WAITING_RECEIVE' && (
            <>
              <button 
                type="button" 
                className="btn-primary-action"
                style={{ background: '#059669' }}
                onClick={() => setIsReceiveModalOpen(true)}
              >
                <PackageCheck size={16} />
                <span>Nhận hàng nhập kho</span>
              </button>
              <button 
                type="button" 
                className="action-icon-btn danger"
                onClick={() => {
                  setReasonActionType('CANCEL');
                  setIsReasonModalOpen(true);
                }}
              >
                <Ban size={16} />
                <span>Huỷ đơn</span>
              </button>
            </>
          )}

          {order.status === 'PARTIALLY_RECEIVED' && (
            <>
              <button 
                type="button" 
                className="btn-primary-action"
                style={{ background: '#059669' }}
                onClick={() => setIsReceiveModalOpen(true)}
              >
                <PackageCheck size={16} />
                <span>Tiếp tục nhận đợt tiếp theo</span>
              </button>
              <button 
                type="button" 
                className="btn-secondary-action"
                onClick={() => {
                  setReasonActionType('CLOSE');
                  setIsReasonModalOpen(true);
                }}
              >
                <CheckSquare size={16} color="#d97706" />
                <span>Đóng đơn dù thiếu</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="po-detail-info-grid">
        {/* Card 1: Thông tin chung */}
        <div className="detail-info-card">
          <div className="detail-card-title">
            <ShoppingCart size={18} color="#2563eb" />
            <span>Thông tin đơn đặt</span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Kho nhận hàng:</span>
            <span className="detail-prop-value">{order.warehouse?.name || '-'} ({order.warehouse?.code})</span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Ngày giao dự kiến:</span>
            <span className="detail-prop-value">
              {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}
            </span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Người tạo đơn:</span>
            <span className="detail-prop-value">{order.createdBy?.fullName || 'Hệ thống'}</span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Ghi chú:</span>
            <span className="detail-prop-value" style={{ fontWeight: 400, color: '#475569' }}>
              {order.notes || '(Không có)'}
            </span>
          </div>
          {order.cancelReason && (
            <div className="detail-prop-row" style={{ color: '#b91c1c' }}>
              <span className="detail-prop-label" style={{ color: '#b91c1c' }}>Lý do huỷ:</span>
              <span className="detail-prop-value" style={{ color: '#b91c1c' }}>{order.cancelReason}</span>
            </div>
          )}
          {order.closeReason && (
            <div className="detail-prop-row" style={{ color: '#b45309' }}>
              <span className="detail-prop-label" style={{ color: '#b45309' }}>Lý do đóng thiếu:</span>
              <span className="detail-prop-value" style={{ color: '#b45309' }}>{order.closeReason}</span>
            </div>
          )}
        </div>

        {/* Card 2: Nhà cung cấp */}
        <div className="detail-info-card">
          <div className="detail-card-title">
            <Building2 size={18} color="#059669" />
            <span>Nhà cung cấp</span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Tên NCC:</span>
            <span className="detail-prop-value">{order.supplier?.name || 'Chưa chọn'}</span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Mã NCC:</span>
            <span className="detail-prop-value">{order.supplier?.code || '-'}</span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Số điện thoại:</span>
            <span className="detail-prop-value">{order.supplier?.phone || '-'}</span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Địa chỉ:</span>
            <span className="detail-prop-value" style={{ fontWeight: 400, color: '#475569' }}>
              {order.supplier?.address || '-'}
            </span>
          </div>
        </div>

        {/* Card 3: Tiến độ & Giá trị */}
        <div className="detail-info-card">
          <div className="detail-card-title">
            <PackageCheck size={18} color="#d97706" />
            <span>Tiến độ nhận hàng & Tổng giá trị</span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Tổng tiền đặt mua:</span>
            <span className="detail-prop-value" style={{ fontSize: '1.1rem', color: '#1d4ed8' }}>
              {formatCurrency(order.metrics?.totalAmount)} đ
            </span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Giá trị đã thực nhận:</span>
            <span className="detail-prop-value" style={{ color: '#059669' }}>
              {formatCurrency(order.metrics?.totalReceivedAmount)} đ
            </span>
          </div>
          <div className="detail-prop-row">
            <span className="detail-prop-label">Tổng số lượng đặt / đã nhận:</span>
            <span className="detail-prop-value">
              {order.metrics?.totalReceivedQty} / {order.metrics?.totalOrderedQty} SP
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="receive-progress-container">
              <div className="receive-progress-label">
                <span>Tỷ lệ hoàn thành</span>
                <span style={{ fontWeight: 700 }}>{percent}%</span>
              </div>
              <div className="receive-progress-bar-bg" style={{ height: 8 }}>
                <div 
                  className="receive-progress-bar-fill" 
                  style={{ width: `${percent}%`, background: percent === 100 ? '#059669' : '#d97706' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="po-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>
          Chi tiết danh sách mặt hàng đặt mua ({order.items?.length || 0} mặt hàng)
        </div>
        <div className="po-table-responsive">
          <table className="po-data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                <th style={{ width: '130px' }}>Mã SKU</th>
                <th style={{ width: '260px' }}>Tên sản phẩm</th>
                <th style={{ width: '70px', textAlign: 'center' }}>ĐVT</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Đơn giá (đ)</th>
                <th style={{ width: '100px', textAlign: 'right' }}>SL Đặt</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Thành tiền đặt (đ)</th>
                <th style={{ width: '100px', textAlign: 'right' }}>SL Đã nhận</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Còn lại</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Tiến độ dòng</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, idx) => {
                const diff = item.quantityReceived - item.quantity;
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{item.product?.sku}</td>
                    <td style={{ fontWeight: 500, color: '#1e293b' }}>{item.product?.name}</td>
                    <td style={{ textAlign: 'center', color: '#475569' }}>{item.product?.unit}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {formatCurrency(item.lineTotal)} đ
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: item.quantityReceived > 0 ? '#059669' : '#64748b' }}>
                      {item.quantityReceived}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: item.quantityRemaining > 0 ? '#d97706' : '#94a3b8' }}>
                      {item.quantityRemaining}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.quantityReceived >= item.quantity ? (
                        <span className="badge-diff-exact">
                          <CheckCircle2 size={12} /> Đã nhận đủ
                        </span>
                      ) : item.quantityReceived > 0 ? (
                        <span className="badge-diff-shortage">
                          {item.receivedPercentage}%
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Chưa nhận</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Timeline */}
      <div className="detail-info-card">
        <div className="detail-card-title">
          <History size={18} color="#64748b" />
          <span>Nhật ký trạng thái & Quá trình nhận hàng ({order.statusHistory?.length || 0})</span>
        </div>

        <div className="history-timeline">
          {(order.statusHistory || []).map((h, index) => (
            <div key={h.id || index} className="timeline-item">
              <div className="timeline-dot">
                {index + 1}
              </div>
              <div className="timeline-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: '#1e293b' }}>
                    {h.toStatus === 'DRAFT' && 'Khởi tạo đơn Nháp'}
                    {h.toStatus === 'WAITING_RECEIVE' && 'Đã gửi cho Nhà cung cấp'}
                    {h.toStatus === 'PARTIALLY_RECEIVED' && 'Ghi nhận đợt nhận hàng'}
                    {h.toStatus === 'COMPLETED' && 'Đơn hàng Hoàn tất'}
                    {h.toStatus === 'CANCELLED' && 'Huỷ đơn hàng'}
                  </strong>
                  <span className="timeline-time">
                    {new Date(h.changedAt).toLocaleString('vi-VN')}
                  </span>
                  {h.changedBy && (
                    <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                      (Bởi: {h.changedBy.fullName || h.changedBy.username})
                    </span>
                  )}
                </div>
                {h.notes && (
                  <div className="timeline-note">{h.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submodals */}
      {isReceiveModalOpen && (
        <ReceiveGoodsModal
          isOpen={isReceiveModalOpen}
          order={order}
          onClose={() => setIsReceiveModalOpen(false)}
          onSuccess={() => fetchOrderDetail()}
        />
      )}

      {isReasonModalOpen && (
        <CancelCloseModal
          isOpen={isReasonModalOpen}
          order={order}
          actionType={reasonActionType}
          onClose={() => setIsReasonModalOpen(false)}
          onSuccess={() => fetchOrderDetail()}
        />
      )}

      {isEditModalOpen && (
        <CreatePurchaseOrderModal
          isOpen={isEditModalOpen}
          initialOrder={order}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => fetchOrderDetail()}
        />
      )}
    </div>
  );
};

export default PurchaseOrderDetail;
