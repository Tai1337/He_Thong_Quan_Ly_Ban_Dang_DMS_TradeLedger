import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  PackageCheck, 
  Ban, 
  CheckSquare, 
  Clock, 
  Truck, 
  CheckCircle2, 
  AlertCircle,
  Printer,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  UserPlus,
  Paperclip,
  Tag,
  Share2,
  Boxes,
  X
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
  const navigate = useNavigate();

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

  // Right sidebar mock tags & attachments
  const [tags, setTags] = useState(['#HangChinhHang', '#UuTienD+3']);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

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

  const toggleAccordion = (section) => {
    setAccordionState(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags(prev => [...prev, newTagInput.startsWith('#') ? newTagInput.trim() : `#${newTagInput.trim()}`]);
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Đã sao chép liên kết chứng từ vào clipboard!');
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
                <span className="erp-badge-dot"></span> Completed
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
                title="Chứng từ trước"
                onClick={() => navigate('/purchase/purchase-orders')}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                type="button" 
                className="erp-ctrl-btn" 
                title="Chứng từ kế tiếp"
                onClick={() => navigate('/purchase/purchase-orders')}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button type="button" className="erp-ctrl-btn" title="Tùy chọn khác">
              <MoreHorizontal size={16} />
            </button>

            {/* Quick Action Buttons */}
            {order.status === 'DRAFT' && (
              <>
                <button 
                  type="button" 
                  className="erp-btn-secondary"
                  onClick={() => setIsEditModalOpen(true)}
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

            {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
              <button 
                type="button" 
                className="erp-btn-secondary"
                onClick={handlePrint}
              >
                <Printer size={15} />
                <span>In chứng từ</span>
              </button>
            )}
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
                  <span className="erp-accordion-title">Order Status</span>
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
                  <span className="erp-accordion-title">Supplier Information</span>
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
                    Items ({order.items?.length || 0})
                  </span>
                  <ChevronDown size={16} className="erp-accordion-chevron" />
                </div>

                <div className="erp-accordion-collapse-wrapper">
                  <div className="erp-accordion-content-inner">
                    <div className="erp-accordion-content no-padding">
                      <div className="erp-table-responsive">
                        <table className="erp-data-table">
                          <thead>
                            <tr>
                              <th style={{ width: '40px', textAlign: 'center' }}>No.</th>
                              <th style={{ width: '130px' }}>Item Code</th>
                              <th>Item Name</th>
                              <th style={{ width: '80px', textAlign: 'center' }}>UOM</th>
                              <th style={{ width: '110px', textAlign: 'right' }}>Rate (đ)</th>
                              <th style={{ width: '90px', textAlign: 'right' }}>Qty</th>
                              <th style={{ width: '100px', textAlign: 'right' }}>Received</th>
                              <th style={{ width: '100px', textAlign: 'right' }}>Remaining</th>
                              <th style={{ width: '130px', textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(order.items || []).map((item, idx) => (
                              <tr key={item.id}>
                                <td style={{ textAlign: 'center', color: '#9ca3af' }}>{idx + 1}</td>
                                <td className="erp-sku-cell">{item.product?.sku}</td>
                                <td className="erp-name-cell">{item.product?.name}</td>
                                <td style={{ textAlign: 'center', color: '#6b7280' }}>{item.product?.unit}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: item.quantityReceived > 0 ? '#16a34a' : '#9ca3af' }}>
                                  {item.quantityReceived}
                                </td>
                                <td style={{ textAlign: 'right', color: item.quantityRemaining > 0 ? '#d97706' : '#9ca3af' }}>
                                  {item.quantityRemaining}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                                  {formatCurrency(item.lineTotal)} đ
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>Total:</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>{order.metrics?.totalOrderedQty || 0}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{order.metrics?.totalReceivedQty || 0}</td>
                              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px', color: '#1d4ed8' }}>
                                {formatCurrency(order.metrics?.totalAmount)} đ
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
                    <h3 className="erp-section-heading">Activity</h3>
                    <button 
                      type="button" 
                      className="erp-btn-secondary small"
                      onClick={() => alert('Thêm email / biên bản liên hệ NCC')}
                    >
                      + New Email
                    </button>
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
                <h4>Chứng từ liên quan</h4>
                <div className="erp-conn-grid">
                  <div className="erp-conn-box">
                    <Truck size={20} color="#2563eb" />
                    <div>
                      <div className="erp-conn-title">Chuyến xe giao hàng (D+3)</div>
                      <div className="erp-conn-desc">1 chuyến nhập kho dự kiến</div>
                    </div>
                    <button className="erp-conn-link" onClick={() => navigate('/purchase/receiving')}>Xem</button>
                  </div>

                  <div className="erp-conn-box">
                    <Boxes size={20} color="#059669" />
                    <div>
                      <div className="erp-conn-title">Phiếu nhập kho liên kết</div>
                      <div className="erp-conn-desc">{order.metrics?.totalReceivedQty > 0 ? 'Đã có phiếu nhập kho' : 'Chưa có phiếu nhập'}</div>
                    </div>
                    <button className="erp-conn-link" onClick={() => navigate('/purchase/receiving')}>Chi tiết</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: DOCUMENT SIDEBAR (ERPNext Right Sidebar) */}
        <div className="erp-doc-sidebar">
          {/* Header mã chứng từ & hành động */}
          <div className="erp-doc-sidebar-header">
            <div>
              <div className="erp-sidebar-sub-title">{order.supplier?.name || 'Masan Consumer'}</div>
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

          {/* Quick Action Links with '+' */}
          <div className="erp-sidebar-actions-list">
            {/* Assign */}
            <div className="erp-sidebar-action-item">
              <div className="erp-sidebar-action-left">
                <UserPlus size={15} />
                <span>Assign</span>
              </div>
              <button 
                type="button" 
                className="erp-sidebar-plus-btn"
                onClick={() => alert('Gán nhân viên phụ trách chứng từ này')}
              >
                +
              </button>
            </div>

            {/* Attachments */}
            <div className="erp-sidebar-action-group">
              <div className="erp-sidebar-action-item">
                <div className="erp-sidebar-action-left">
                  <Paperclip size={15} />
                  <span>Attachments</span>
                </div>
                <button 
                  type="button" 
                  className="erp-sidebar-plus-btn"
                  onClick={() => alert('Chọn tệp đính kèm')}
                >
                  +
                </button>
              </div>
              <div className="erp-sidebar-attachment-item">
                <span className="erp-attachment-name" title="photo-camera-subject-phot...">photo-camera-subject-phot...</span>
                <button type="button" className="erp-remove-chip-btn">
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="erp-sidebar-action-group">
              <div className="erp-sidebar-action-item">
                <div className="erp-sidebar-action-left">
                  <Tag size={15} />
                  <span>Tags</span>
                </div>
                <button 
                  type="button" 
                  className="erp-sidebar-plus-btn"
                  onClick={() => setIsAddingTag(!isAddingTag)}
                >
                  +
                </button>
              </div>
              {isAddingTag && (
                <div className="erp-tag-input-row">
                  <input 
                    type="text" 
                    placeholder="Tên tag..."
                    className="erp-tag-input"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <button type="button" className="erp-btn-primary small" onClick={handleAddTag}>Lưu</button>
                </div>
              )}
              <div className="erp-tags-container">
                {tags.map(t => (
                  <span key={t} className="erp-tag-chip">
                    {t}
                    <button type="button" onClick={() => handleRemoveTag(t)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="erp-sidebar-action-item" onClick={handleShare} style={{ cursor: 'pointer' }}>
              <div className="erp-sidebar-action-left">
                <Share2 size={15} />
                <span>Share</span>
              </div>
              <button type="button" className="erp-sidebar-plus-btn">+</button>
            </div>
          </div>

          {/* Audit Trail Metadata (ERPNext style) */}
          <div className="erp-sidebar-audit-section">
            <div className="erp-audit-block">
              <div className="erp-audit-label">Last Edited By You</div>
              <div className="erp-audit-val">yesterday</div>
            </div>

            <div className="erp-audit-block">
              <div className="erp-audit-label">Created By You</div>
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
