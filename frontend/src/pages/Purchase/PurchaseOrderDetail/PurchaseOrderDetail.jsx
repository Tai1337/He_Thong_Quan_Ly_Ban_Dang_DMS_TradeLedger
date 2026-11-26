import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  PackageCheck, 
  CheckSquare, 
  Truck, 
  AlertCircle,
  Printer,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Share2,
  Boxes
} from 'lucide-react';
import { 
  getPurchaseOrderById, 
  sendPurchaseOrderToSupplier 
} from '../../../services/api';
import ReceiveGoodsModal from '../PurchaseOrderList/ReceiveGoodsModal';
import CancelCloseModal from '../PurchaseOrderList/CancelCloseModal';
import PrintPurchaseOrderModal from '../PurchaseOrderList/PrintPurchaseOrderModal';
import { useNotification } from '../../../components/Common/NotificationProvider';
import { numberToVietnameseWords } from '../../../utils/chartFormatters';
import './PurchaseOrderDetail.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, confirm } = useNotification();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ERPNext Accordion Section States
  const [accordionState, setAccordionState] = useState({
    status: true,
    supplier: true,
    items: true,
    additional: true
  });

  // ERPNext Tab State
  const [activeTab, setActiveTab] = useState('details');

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Modals
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonActionType, setReasonActionType] = useState('CANCEL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  const toggleAccordion = (section) => {
    setAccordionState(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSendPO = async () => {
    const ok = await confirm({
      title: 'Gửi đơn đặt hàng cho NCC',
      message: 'Xác nhận gửi đơn đặt hàng này cho Nhà cung cấp?',
      confirmText: 'Gửi đơn'
    });
    if (!ok) return;
    try {
      await sendPurchaseOrderToSupplier(order.id, {
        distributorId: 1,
        notes: 'Gửi đơn hàng mua từ màn hình chi tiết PO'
      });
      notify.success('Đã gửi đơn đặt hàng cho Nhà cung cấp!');
      fetchOrderDetail();
    } catch (err) {
      notify.error(err.message || 'Lỗi khi gửi đơn hàng');
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments(prev => [
      ...prev,
      {
        id: Date.now(),
        author: 'Administrator',
        content: newComment.trim(),
        createdAt: new Date().toISOString()
      }
    ]);
    setNewComment('');
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    notify.success('Đã sao chép liên kết chứng từ vào clipboard!');
  };

  if (loading) {
    return (
      <div className="erp-doc-page">
        <div className="erp-doc-loading">
          Đang tải thông tin chi tiết đơn đặt hàng mua...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="erp-doc-page">
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
    <div className="erp-doc-page">
      {/* 1. DOCUMENT TOP BAR (ERPNext Style) */}
      <div className="erp-doc-header">
        <div className="erp-doc-title-row">
          <div className="erp-doc-title-wrap">
            <h1 className="erp-doc-title">{order.supplier?.name || 'Đơn hàng mua'}</h1>
            {order.status === 'DRAFT' && (
              <span className="erp-status-badge badge-draft">
                <span className="erp-badge-dot"></span> Nháp
              </span>
            )}
            {order.status === 'WAITING_RECEIVE' && (
              <span className="erp-status-badge badge-waiting">
                <span className="erp-badge-dot"></span> Đã gửi NCC
              </span>
            )}
            {order.status === 'PARTIALLY_RECEIVED' && (
              <span className="erp-status-badge badge-partial">
                <span className="erp-badge-dot"></span> Nhận một phần
              </span>
            )}
            {order.status === 'COMPLETED' && (
              <span className="erp-status-badge badge-completed">
                <span className="erp-badge-dot"></span> Hoàn tất
              </span>
            )}
            {order.status === 'CANCELLED' && (
              <span className="erp-status-badge badge-cancelled">
                <span className="erp-badge-dot"></span> Đã hủy
              </span>
            )}
          </div>

          <div className="erp-doc-controls">
            <div className="erp-pager-btns">
              <button 
                type="button" 
                className="erp-ctrl-btn" 
                title="Quay lại danh sách PO"
                onClick={() => navigate('/purchase/purchase-orders')}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                type="button" 
                className="erp-ctrl-btn" 
                title="Đi tới Nhập kho mua hàng"
                onClick={() => navigate('/purchase/receiving')}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              className="erp-btn-secondary"
              title="Nhân bản thành đơn mua mới"
              onClick={() => navigate(`/purchase/purchase-orders/create?duplicateFrom=${order.id}`)}
            >
              <Copy size={15} />
              <span>Nhân bản</span>
            </button>

            {/* Quick Action Buttons */}
            {order.status === 'DRAFT' && (
              <>
                <button 
                  type="button" 
                  className="erp-btn-secondary"
                  onClick={() => navigate(`/purchase/purchase-orders/${order.id}/edit`)}
                >
                  Chỉnh sửa
                </button>
                <button 
                  type="button" 
                  className="erp-btn-primary"
                  onClick={handleSendPO}
                >
                  <Send size={15} />
                  <span>Gửi cho NCC</span>
                </button>
                <button 
                  type="button" 
                  className="erp-btn-danger-outline"
                  onClick={() => {
                    setReasonActionType('CANCEL');
                    setIsReasonModalOpen(true);
                  }}
                >
                  Hủy đơn
                </button>
              </>
            )}

            {order.status === 'WAITING_RECEIVE' && (
              <>
                <button 
                  type="button" 
                  className="erp-btn-primary success"
                  onClick={() => setIsReceiveModalOpen(true)}
                >
                  <PackageCheck size={15} />
                  <span>Nhận hàng nhập kho</span>
                </button>
                <button 
                  type="button" 
                  className="erp-btn-danger-outline"
                  onClick={() => {
                    setReasonActionType('CANCEL');
                    setIsReasonModalOpen(true);
                  }}
                >
                  Hủy đơn
                </button>
              </>
            )}

            {order.status === 'PARTIALLY_RECEIVED' && (
              <>
                <button 
                  type="button" 
                  className="erp-btn-primary success"
                  onClick={() => setIsReceiveModalOpen(true)}
                >
                  <PackageCheck size={15} />
                  <span>Tiếp tục nhận đợt tiếp</span>
                </button>
                <button 
                  type="button" 
                  className="erp-btn-secondary"
                  onClick={() => {
                    setReasonActionType('CLOSE');
                    setIsReasonModalOpen(true);
                  }}
                >
                  <CheckSquare size={15} color="#d97706" />
                  <span>Đóng đơn thiếu</span>
                </button>
              </>
            )}

            <button 
              type="button" 
              className="erp-btn-secondary"
              onClick={handlePrint}
              title="In chứng từ Đơn đặt hàng mua (PO)"
            >
              <Printer size={15} />
              <span>In chứng từ</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Details / Connections) */}
        <div className="erp-doc-tabs">
          <button 
            type="button" 
            className={`erp-tab-item ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Chi tiết đơn hàng
          </button>
          <button 
            type="button" 
            className={`erp-tab-item ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            Liên kết (Connections)
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT: 2 COLUMNS (Main Form Left + Document Sidebar Right) */}
      <div className="erp-doc-layout-body">
        {/* CỘT CHÍNH (MAIN FORM & ACTIVITY) */}
        <div className="erp-form-canvas">
          {activeTab === 'details' ? (
            <>
              {/* SECTION 1: TRẠNG THÁI ĐƠN HÀNG (ORDER STATUS) */}
              <div className={`erp-accordion-card ${accordionState.status ? 'expanded' : ''}`}>
                <div 
                  className="erp-accordion-header"
                  onClick={() => toggleAccordion('status')}
                >
                  <span className="erp-accordion-title">Thông tin & Trạng thái đơn</span>
                  <ChevronDown size={16} className="erp-accordion-chevron" />
                </div>

                <div className="erp-accordion-collapse-wrapper">
                  <div className="erp-accordion-content-inner">
                    <div className="erp-accordion-content">
                      <div className="erp-form-grid-2">
                        <div className="erp-field-pair">
                          <label className="erp-field-label">Kho nhận hàng</label>
                          <div className="erp-field-value bold">
                            {order.warehouse?.name || '-'} ({order.warehouse?.code})
                          </div>
                        </div>

                        <div className="erp-field-pair">
                          <label className="erp-field-label">Ngày giao dự kiến</label>
                          <div className="erp-field-value">
                            {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}
                          </div>
                        </div>

                        <div className="erp-field-pair">
                          <label className="erp-field-label">Người tạo đơn</label>
                          <div className="erp-field-value">
                            {order.createdBy?.fullName || 'Hệ thống'}
                          </div>
                        </div>

                        <div className="erp-field-pair">
                          <label className="erp-field-label">Tiến độ nhận hàng</label>
                          <div className="erp-field-value">
                            <div className="erp-mini-progress-wrap">
                              <div className="erp-mini-progress-bar">
                                <div 
                                  className="erp-mini-progress-fill" 
                                  style={{ 
                                    width: `${percent}%`,
                                    backgroundColor: percent === 100 ? '#16a34a' : '#2563eb'
                                  }}
                                />
                              </div>
                              <span className="erp-mini-progress-text">{percent}% ({order.metrics?.totalReceivedQty || 0}/{order.metrics?.totalOrderedQty || 0} SP)</span>
                            </div>
                          </div>
                        </div>

                        <div className="erp-field-pair full-width">
                          <label className="erp-field-label">Ghi chú đơn hàng</label>
                          <div className="erp-field-value text-muted">
                            {order.notes || '(Không có ghi chú)'}
                          </div>
                        </div>

                        {order.cancelReason && (
                          <div className="erp-field-pair full-width danger-highlight">
                            <label className="erp-field-label text-danger">Lý do hủy đơn</label>
                            <div className="erp-field-value text-danger bold">{order.cancelReason}</div>
                          </div>
                        )}

                        {order.closeReason && (
                          <div className="erp-field-pair full-width warning-highlight">
                            <label className="erp-field-label text-warning">Lý do đóng thiếu</label>
                            <div className="erp-field-value text-warning bold">{order.closeReason}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: THÔNG TIN NHÀ CUNG CẤP (SUPPLIER INFO) */}
              <div className={`erp-accordion-card ${accordionState.supplier ? 'expanded' : ''}`}>
                <div 
                  className="erp-accordion-header"
                  onClick={() => toggleAccordion('supplier')}
                >
                  <span className="erp-accordion-title">Thông tin Nhà cung cấp</span>
                  <ChevronDown size={16} className="erp-accordion-chevron" />
                </div>

                <div className="erp-accordion-collapse-wrapper">
                  <div className="erp-accordion-content-inner">
                    <div className="erp-accordion-content">
                      <div className="erp-form-grid-2">
                        <div className="erp-field-pair">
                          <label className="erp-field-label">Tên Nhà cung cấp</label>
                          <div className="erp-field-value bold">{order.supplier?.name || '-'}</div>
                        </div>

                        <div className="erp-field-pair">
                          <label className="erp-field-label">Mã NCC</label>
                          <div className="erp-field-value">{order.supplier?.code || '-'}</div>
                        </div>

                        <div className="erp-field-pair">
                          <label className="erp-field-label">Số điện thoại</label>
                          <div className="erp-field-value">{order.supplier?.phone || '-'}</div>
                        </div>

                        <div className="erp-field-pair">
                          <label className="erp-field-label">Địa chỉ kho gửi</label>
                          <div className="erp-field-value">{order.supplier?.address || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: DANH SÁCH MẶT HÀNG ĐẶT MUA (LINE ITEMS TABLE) */}
              <div className={`erp-accordion-card ${accordionState.items ? 'expanded' : ''}`}>
                <div 
                  className="erp-accordion-header"
                  onClick={() => toggleAccordion('items')}
                >
                  <span className="erp-accordion-title">
                    Danh sách mặt hàng đặt mua ({order.items?.length || 0})
                  </span>
                  <ChevronDown size={16} className="erp-accordion-chevron" />
                </div>

                <div className="erp-accordion-collapse-wrapper">
                  <div className="erp-accordion-content-inner">
                    <div className="erp-accordion-content no-padding">
                      <div className="dms-ledger-table-wrap" style={{ border: 'none' }}>
                        <table className="dms-ledger-table erp-data-table">
                          <thead>
                            <tr>
                              <th className="text-center" style={{ width: '40px' }}>STT</th>
                              <th style={{ width: '130px' }}>Mã SKU</th>
                              <th>Tên sản phẩm</th>
                              <th className="text-center" style={{ width: '80px' }}>ĐVT</th>
                              <th className="text-right" style={{ width: '110px' }}>Đơn giá (đ)</th>
                              <th className="text-right" style={{ width: '90px' }}>SL đặt</th>
                              <th className="text-right" style={{ width: '100px' }}>Đã nhận</th>
                              <th className="text-right" style={{ width: '100px' }}>Còn lại</th>
                              <th className="text-right" style={{ width: '130px' }}>Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(order.items || []).map((item, idx) => (
                              <tr key={item.id}>
                                <td className="text-center" style={{ color: '#64748b' }}>{idx + 1}</td>
                                <td className="erp-sku-cell">{item.product?.sku}</td>
                                <td className="erp-name-cell">{item.product?.name}</td>
                                <td className="text-center" style={{ color: '#64748b' }}>{item.product?.unit}</td>
                                <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                                <td className="text-right" style={{ fontWeight: 600 }}>{item.quantity}</td>
                                <td className="text-right" style={{ fontWeight: 600, color: item.quantityReceived > 0 ? '#16a34a' : '#64748b' }}>
                                  {item.quantityReceived}
                                </td>
                                <td className="text-right" style={{ color: item.quantityRemaining > 0 ? '#d97706' : '#64748b' }}>
                                  {item.quantityRemaining}
                                </td>
                                <td className="text-right" style={{ fontWeight: 600, color: '#111827' }}>
                                  {formatCurrency(item.lineTotal)} đ
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5} className="text-right" style={{ fontWeight: 700, color: '#0f172a' }}>Tổng cộng:</td>
                              <td className="text-right" style={{ fontWeight: 700, color: '#0f172a' }}>{order.metrics?.totalOrderedQty || 0}</td>
                              <td className="text-right" style={{ fontWeight: 700, color: '#059669' }}>{order.metrics?.totalReceivedQty || 0}</td>
                              <td colSpan={2} className="text-right" style={{ fontWeight: 700, fontSize: '14px', color: '#b91c1c' }}>
                                {formatCurrency(order.metrics?.totalAmount)} đ
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={9} style={{ backgroundColor: '#ffffff', color: '#334155', fontWeight: 500 }}>
                                <strong>Bằng chữ:</strong> <em>{numberToVietnameseWords(order.metrics?.totalAmount)}</em>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ADDITIONAL INFO */}
              <div className={`erp-accordion-card ${accordionState.additional ? 'expanded' : ''}`}>
                <div 
                  className="erp-accordion-header"
                  onClick={() => toggleAccordion('additional')}
                >
                  <span className="erp-accordion-title">Printing Settings & Additional Info</span>
                  <ChevronDown size={16} className="erp-accordion-chevron" />
                </div>

                <div className="erp-accordion-collapse-wrapper">
                  <div className="erp-accordion-content-inner">
                    <div className="erp-accordion-content">
                      <div className="erp-form-grid-2">
                        <div className="erp-field-pair">
                          <label className="erp-field-label">Tiền tệ & Tỷ giá</label>
                          <div className="erp-field-value">VND (Việt Nam Đồng)</div>
                        </div>
                        <div className="erp-field-pair">
                          <label className="erp-field-label">Chính sách vận chuyển</label>
                          <div className="erp-field-value">Giao trực tiếp kho NPP (D+3)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: COMMENTS & ACTIVITY (ERPNext Style Stream) */}
              <div className="erp-activity-section">
                {/* Comments box */}
                <div className="erp-comments-container">
                  <h3 className="erp-section-heading">Comments</h3>
                  <form onSubmit={handleAddComment} className="erp-comment-form">
                    <div className="erp-comment-avatar">A</div>
                    <div className="erp-comment-input-wrap">
                      <input 
                        type="text" 
                        placeholder="Type a reply / comment"
                        className="erp-comment-input"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button type="submit" className="erp-comment-btn" disabled={!newComment.trim()}>
                        Gửi
                      </button>
                    </div>
                  </form>

                  {comments.length > 0 && (
                    <div className="erp-comment-list">
                      {comments.map(c => (
                        <div key={c.id} className="erp-comment-bubble">
                          <div className="erp-comment-avatar small">A</div>
                          <div className="erp-comment-body">
                            <div className="erp-comment-meta">
                              <strong>{c.author}</strong>
                              <span>{new Date(c.createdAt).toLocaleTimeString('vi-VN')}</span>
                            </div>
                            <div className="erp-comment-text">{c.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Activity Feed */}
                <div className="erp-timeline-container">
                  <div className="erp-timeline-header">
                    <h3 className="erp-section-heading">Lịch sử xử lý chứng từ</h3>
                  </div>

                  <div className="erp-vertical-timeline">
                    {/* Status History Items */}
                    {(order.statusHistory || []).map((h, idx) => (
                      <div key={h.id || idx} className="erp-timeline-row">
                        <div className="erp-timeline-marker"></div>
                        <div className="erp-timeline-details">
                          <span className="erp-timeline-text">
                            <strong>{h.changedBy?.fullName || 'Administrator'}</strong>
                            {' '}chuyển trạng thái sang{' '}
                            <span className="erp-highlight-status">{h.toStatus}</span>
                            {h.notes && ` - "${h.notes}"`}
                          </span>
                          <span className="erp-timeline-date">
                            {new Date(h.changedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Initial Creation Event */}
                    <div className="erp-timeline-row">
                      <div className="erp-timeline-marker"></div>
                      <div className="erp-timeline-details">
                        <span className="erp-timeline-text">
                          <strong>{order.createdBy?.fullName || 'You'}</strong> created this document
                        </span>
                        <span className="erp-timeline-date">
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Tab: CONNECTIONS */
            <div className="erp-connections-view">
              <div className="erp-conn-card">
                <h4>Chuyến xe Nhập kho & Chứng từ liên quan</h4>
                <div className="erp-conn-grid">
                  <div className="erp-conn-box">
                    <Truck size={20} color="#2563eb" />
                    <div>
                      <div className="erp-conn-title">
                        {order.deliveryTrip ? `Chuyến xe ${order.deliveryTrip.tripCode}` : 'Chuyến xe giao hàng (D+3)'}
                      </div>
                      <div className="erp-conn-desc">
                        {order.deliveryTrip
                          ? `Trạng thái: ${order.deliveryTrip.status} • Dự kiến: ${order.deliveryTrip.expectedDeliveryDate || 'Chưa đặt'}`
                          : 'Chưa phát hành (sẽ tự tạo khi Gửi NCC)'}
                      </div>
                    </div>
                    {order.deliveryTrip && (
                      <button className="erp-conn-link" onClick={() => navigate('/purchase/receiving')}>
                        Mở Nhập kho
                      </button>
                    )}
                  </div>

                  <div className="erp-conn-box">
                    <Boxes size={20} color="#059669" />
                    <div>
                      <div className="erp-conn-title">Giao dịch nhập kho (IN)</div>
                      <div className="erp-conn-desc">
                        {order.inboundTransactions?.length > 0
                          ? `${order.inboundTransactions.length} lần ghi nhận nhập kho`
                          : 'Chưa có phiếu nhập kho'}
                      </div>
                    </div>
                    <button className="erp-conn-link" onClick={() => navigate('/inventory/transactions')}>
                      Nhật ký kho
                    </button>
                  </div>
                </div>

                {order.inboundTransactions && order.inboundTransactions.length > 0 && (
                  <div className="erp-table-responsive" style={{ marginTop: 18 }}>
                    <table className="erp-data-table">
                      <thead>
                        <tr>
                          <th>Mã giao dịch</th>
                          <th>Số Lô</th>
                          <th>NSX / HSD</th>
                          <th>Vị trí kho</th>
                          <th style={{ textAlign: 'right' }}>SL nhập</th>
                          <th>Người nhập</th>
                          <th>Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.inboundTransactions.map((txn) => (
                          <tr key={txn.id}>
                            <td className="erp-sku-cell">{txn.transactionCode}</td>
                            <td>{txn.stockLot?.lotNumber || '-'}</td>
                            <td>
                              {txn.stockLot?.manufactureDate || '-'} → {txn.stockLot?.expiryDate || '-'}
                            </td>
                            <td>{txn.stockLot?.locationCode || 'KHO-A1'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                              +{txn.quantity}
                            </td>
                            <td>{txn.createdBy?.fullName || 'Hệ thống'}</td>
                            <td>{new Date(txn.createdAt).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: DOCUMENT SIDEBAR */}
        <div className="erp-doc-sidebar">
          {/* Header mã chứng từ & hành động */}
          <div className="erp-doc-sidebar-header">
            <div>
              <div className="erp-sidebar-sub-title">{order.supplier?.name || 'Chưa chọn NCC'}</div>
              <div className="erp-sidebar-doc-code">{order.poCode}</div>
            </div>
            <div className="erp-sidebar-header-actions">
              <button 
                type="button" 
                className="erp-sidebar-icon-btn" 
                title="In chứng từ"
                onClick={handlePrint}
              >
                <Printer size={16} />
              </button>
              <button 
                type="button" 
                className={`erp-sidebar-icon-btn ${isFavorite ? 'favorite' : ''}`}
                title="Đánh dấu yêu thích"
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : 'currentColor'} />
              </button>
            </div>
          </div>

          <div className="erp-sidebar-actions-list">
            <div className="erp-sidebar-action-item" onClick={handleShare} style={{ cursor: 'pointer' }}>
              <div className="erp-sidebar-action-left">
                <Share2 size={15} />
                <span>Sao chép liên kết</span>
              </div>
              <button type="button" className="erp-sidebar-plus-btn">→</button>
            </div>
          </div>

          {/* Audit Trail Metadata */}
          <div className="erp-sidebar-audit-section">
            <div className="erp-audit-block">
              <div className="erp-audit-label">Chuyến xe INBOUND (D+3)</div>
              <div className="erp-audit-val">
                {order.deliveryTrip ? `${order.deliveryTrip.tripCode} (${order.deliveryTrip.status})` : 'Chưa phát hành'}
              </div>
            </div>

            <div className="erp-audit-block">
              <div className="erp-audit-label">Cập nhật gần nhất</div>
              <div className="erp-audit-val">
                {order.updatedAt ? new Date(order.updatedAt).toLocaleString('vi-VN') : '-'}
              </div>
            </div>

            <div className="erp-audit-block">
              <div className="erp-audit-label">Ngày tạo đơn</div>
              <div className="erp-audit-val">
                {new Date(order.createdAt).toLocaleDateString('vi-VN')}
              </div>
            </div>

            <div className="erp-audit-block">
              <div className="erp-audit-label">Kho nhận hàng</div>
              <div className="erp-audit-val">
                {order.warehouse?.name}
              </div>
            </div>

            <div className="erp-audit-block">
              <div className="erp-audit-label">Tổng trọng lượng ước tính</div>
              <div className="erp-audit-val">
                {order.metrics?.totalWeightKg || 0} kg
              </div>
            </div>
          </div>
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

      {/* Modal In chứng từ PO */}
      {isPrintModalOpen && order && (
        <PrintPurchaseOrderModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          order={order}
        />
      )}
    </div>
  );
};

export default PurchaseOrderDetail;
