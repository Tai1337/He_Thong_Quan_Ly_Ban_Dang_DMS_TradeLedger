import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Plus, 
  Filter, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Ban, 
  PackageCheck, 
  Send, 
  Edit, 
  Eye, 
  CheckSquare, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Truck,
  Layers
} from 'lucide-react';
import { usePurchaseOrders } from '../../../hooks/usePurchaseOrders';
import { 
  getWarehouses, 
  getSuppliers, 
  sendPurchaseOrderToSupplier,
  exportPurchaseOrdersExcel 
} from '../../../services/api';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';
import ReceiveGoodsModal from './ReceiveGoodsModal';
import CancelCloseModal from './CancelCloseModal';
import DiscrepancyModal from './DiscrepancyModal';
import './PurchaseOrderList.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const STATUS_LIST = [
  { code: 'DRAFT', label: 'Nháp', colorClass: 'badge-draft' },
  { code: 'WAITING_RECEIVE', label: 'Đã gửi NCC', colorClass: 'badge-waiting' },
  { code: 'PARTIALLY_RECEIVED', label: 'Đã nhận một phần', colorClass: 'badge-partial' },
  { code: 'COMPLETED', label: 'Hoàn tất', colorClass: 'badge-completed' },
  { code: 'CANCELLED', label: 'Đã huỷ', colorClass: 'badge-cancelled' }
];

const PurchaseOrderList = () => {
  // Filters State
  const [filters, setFilters] = useState({
    poCode: '',
    supplierId: '',
    warehouseId: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    page: 1,
    limit: 15
  });

  // Master Data
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState(null);

  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonActionType, setReasonActionType] = useState('CANCEL'); // 'CANCEL' | 'CLOSE'
  const [reasonOrder, setReasonOrder] = useState(null);

  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);

  // Fetch POs with Custom Hook
  const { orders, summary, total, loading, error, refetch } = usePurchaseOrders(filters);

  // Load master data
  useEffect(() => {
    const loadMaster = async () => {
      try {
        const [whRes, supRes] = await Promise.all([
          getWarehouses(1),
          getSuppliers()
        ]);
        setWarehouses(whRes || []);
        setSuppliers(supRes || []);
      } catch (err) {
        console.error('Lỗi nạp danh mục:', err);
      }
    };
    loadMaster();
  }, []);

  // Multi-select status handler
  const handleStatusToggle = (statusCode) => {
    let current = filters.status ? filters.status.split(',').filter(Boolean) : [];
    if (current.includes(statusCode)) {
      current = current.filter(c => c !== statusCode);
    } else {
      current.push(statusCode);
    }
    setFilters(prev => ({
      ...prev,
      status: current.join(','),
      page: 1
    }));
  };

  // KPI card click to filter by status
  const handleKpiCardClick = (statusCode) => {
    if (filters.status === statusCode) {
      setFilters(prev => ({ ...prev, status: '', page: 1 }));
    } else {
      setFilters(prev => ({ ...prev, status: statusCode, page: 1 }));
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      poCode: '',
      supplierId: '',
      warehouseId: '',
      dateFrom: '',
      dateTo: '',
      status: '',
      page: 1,
      limit: 15
    });
  };

  // Quick Action: Gửi đơn cho NCC
  const handleQuickSend = async (order) => {
    if (!window.confirm(`Xác nhận gửi đơn đặt hàng mua [${order.poCode}] cho Nhà cung cấp?`)) return;
    try {
      await sendPurchaseOrderToSupplier(order.id, {
        distributorId: 1,
        notes: 'Gửi đơn cho NCC từ danh sách PO'
      });
      refetch();
    } catch (err) {
      alert(err.message || 'Lỗi khi gửi đơn hàng');
    }
  };

  // Quick Action: Mở modal nhận hàng
  const handleOpenReceiveModal = (order) => {
    setReceivingOrder(order);
    setIsReceiveModalOpen(true);
  };

  // Quick Action: Mở modal huỷ đơn
  const handleOpenCancelModal = (order) => {
    setReasonOrder(order);
    setReasonActionType('CANCEL');
    setIsReasonModalOpen(true);
  };

  // Quick Action: Mở modal đóng đơn thiếu
  const handleOpenCloseModal = (order) => {
    setReasonOrder(order);
    setReasonActionType('CLOSE');
    setIsReasonModalOpen(true);
  };

  // Mở modal sửa PO
  const handleEditDraftOrder = (order) => {
    setEditingOrder(order);
    setIsCreateModalOpen(true);
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    exportPurchaseOrdersExcel(filters);
  };

  const totalPages = Math.ceil(total / (filters.limit || 15)) || 1;

  return (
    <div className="po-page-container">
      {/* 1. Header & Quick Actions */}
      <div className="po-page-header">
        <div className="po-header-left">
          <h1>
            <ShoppingCart size={26} color="#2563eb" />
            <span>Quản lý Đơn đặt hàng mua (PO) & Nhập kho</span>
          </h1>
          <p>Lập đơn mua từ Nhà cung cấp, theo dõi tiến độ giao hàng và nhập kho theo số lô/hạn dùng</p>
        </div>

        <div className="po-header-actions">
          <button 
            type="button" 
            className="btn-secondary-action"
            onClick={() => setIsDiscrepancyModalOpen(true)}
          >
            <AlertTriangle size={16} color="#d97706" />
            <span>Báo cáo chênh lệch nhận</span>
          </button>

          <button 
            type="button" 
            className="btn-secondary-action"
            onClick={handleExportExcel}
          >
            <Download size={16} />
            <span>Xuất Excel</span>
          </button>

          <button 
            type="button" 
            className="btn-primary-action"
            onClick={() => {
              setEditingOrder(null);
              setIsCreateModalOpen(true);
            }}
          >
            <Plus size={18} />
            <span>+ Lập Đơn đặt hàng mua</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="po-kpi-grid">
        <div 
          className={`kpi-card ${filters.status === '' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, status: '', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#f1f5f9', color: '#334155' }}>
            <Layers size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{summary.totalOrders || 0}</span>
            <span className="kpi-label">Tổng đơn mua</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'DRAFT' ? 'active' : ''}`}
          onClick={() => handleKpiCardClick('DRAFT')}
        >
          <div className="kpi-icon-wrap" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <Clock size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{summary.DRAFT || 0}</span>
            <span className="kpi-label">Bản nháp</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'WAITING_RECEIVE' ? 'active' : ''}`}
          onClick={() => handleKpiCardClick('WAITING_RECEIVE')}
        >
          <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Truck size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{summary.WAITING_RECEIVE || 0}</span>
            <span className="kpi-label">Chờ nhận hàng</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'PARTIALLY_RECEIVED' ? 'active' : ''}`}
          onClick={() => handleKpiCardClick('PARTIALLY_RECEIVED')}
        >
          <div className="kpi-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
            <PackageCheck size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{summary.PARTIALLY_RECEIVED || 0}</span>
            <span className="kpi-label">Nhận một phần</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => handleKpiCardClick('COMPLETED')}
        >
          <div className="kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{summary.COMPLETED || 0}</span>
            <span className="kpi-label">Đã hoàn tất</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => handleKpiCardClick('CANCELLED')}
        >
          <div className="kpi-icon-wrap" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <Ban size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{summary.CANCELLED || 0}</span>
            <span className="kpi-label">Đã huỷ</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Box */}
      <div className="po-filter-card">
        <div className="po-filter-row-top">
          <div className="filter-heading">
            <Filter size={18} color="#2563eb" />
            <span>Bộ lọc tra cứu đơn đặt hàng mua</span>
          </div>
          <button 
            type="button" 
            className="action-icon-btn" 
            onClick={handleResetFilters}
            title="Làm mới bộ lọc"
          >
            <RotateCcw size={14} />
            <span>Xoá bộ lọc</span>
          </button>
        </div>

        <div className="po-filter-grid">
          <div className="filter-field">
            <label>Mã Đơn hàng (PO)</label>
            <input 
              type="text" 
              placeholder="VD: PO-2026..." 
              value={filters.poCode}
              onChange={(e) => setFilters(prev => ({ ...prev, poCode: e.target.value, page: 1 }))}
            />
          </div>

          <div className="filter-field">
            <label>Nhà cung cấp (NCC)</label>
            <select 
              value={filters.supplierId}
              onChange={(e) => setFilters(prev => ({ ...prev, supplierId: e.target.value, page: 1 }))}
            >
              <option value="">-- Tất cả Nhà cung cấp --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Kho nhận hàng</label>
            <select 
              value={filters.warehouseId}
              onChange={(e) => setFilters(prev => ({ ...prev, warehouseId: e.target.value, page: 1 }))}
            >
              <option value="">-- Tất cả Kho --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Khoảng ngày tạo</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input 
                type="date" 
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
              />
              <span style={{ color: '#94a3b8' }}>-</span>
              <input 
                type="date" 
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, page: 1 }))}
              />
            </div>
          </div>
        </div>

        {/* Multi-select trạng thái */}
        <div className="status-multi-select-wrap">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Lọc theo trạng thái:</span>
          {STATUS_LIST.map(st => {
            const isSelected = filters.status ? filters.status.split(',').includes(st.code) : false;
            return (
              <button
                key={st.code}
                type="button"
                className={`status-tag-filter ${isSelected ? 'selected' : ''}`}
                onClick={() => handleStatusToggle(st.code)}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="po-table-card">
        <div className="po-table-responsive">
          <table className="po-data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                <th style={{ width: '150px' }}>Mã PO</th>
                <th style={{ width: '110px' }}>Ngày tạo</th>
                <th style={{ width: '110px' }}>Ngày nhận DK</th>
                <th style={{ width: '220px' }}>Nhà cung cấp</th>
                <th style={{ width: '140px' }}>Kho nhận hàng</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Tổng tiền đặt (đ)</th>
                <th style={{ width: '180px' }}>Tiến độ nhận hàng</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '160px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Đang nạp danh sách đơn đặt hàng mua...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Không tìm thấy đơn hàng mua nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                orders.map((po, index) => {
                  const percent = po.metrics?.receivedPercentage || 0;
                  const progressColor = percent === 100 ? '#059669' : percent > 0 ? '#d97706' : '#94a3b8';

                  return (
                    <tr key={po.id}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                        {(filters.page - 1) * filters.limit + index + 1}
                      </td>

                      {/* Mã PO */}
                      <td>
                        <Link to={`/purchase/purchase-orders/${po.id}`} className="po-code-link">
                          <span>{po.poCode}</span>
                        </Link>
                      </td>

                      {/* Ngày tạo */}
                      <td style={{ color: '#475569' }}>
                        {new Date(po.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Ngày dự kiến */}
                      <td style={{ color: '#475569' }}>
                        {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('vi-VN') : '-'}
                      </td>

                      {/* NCC */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {po.supplier?.name || 'Chưa chọn'}
                        </div>
                        {po.supplier?.code && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {po.supplier.code}
                          </div>
                        )}
                      </td>

                      {/* Kho */}
                      <td style={{ color: '#334155' }}>
                        {po.warehouse?.name || '-'}
                      </td>

                      {/* Tổng tiền */}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(po.metrics?.totalAmount)} đ
                      </td>

                      {/* Tiến độ nhận hàng */}
                      <td>
                        <div className="receive-progress-container">
                          <div className="receive-progress-label">
                            <span>{po.metrics?.totalReceivedQty} / {po.metrics?.totalOrderedQty} SP</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="receive-progress-bar-bg">
                            <div 
                              className="receive-progress-bar-fill" 
                              style={{ width: `${percent}%`, background: progressColor }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Trạng thái Badge */}
                      <td style={{ textAlign: 'center' }}>
                        {po.status === 'DRAFT' && (
                          <span className="badge-status badge-draft">
                            <Clock size={13} /> Nháp
                          </span>
                        )}
                        {po.status === 'WAITING_RECEIVE' && (
                          <span className="badge-status badge-waiting">
                            <Truck size={13} /> Đã gửi NCC
                          </span>
                        )}
                        {po.status === 'PARTIALLY_RECEIVED' && (
                          <span className="badge-status badge-partial">
                            <PackageCheck size={13} /> Nhận 1 phần
                          </span>
                        )}
                        {po.status === 'COMPLETED' && (
                          <span className="badge-status badge-completed">
                            <CheckCircle2 size={13} /> Hoàn tất
                          </span>
                        )}
                        {po.status === 'CANCELLED' && (
                          <span className="badge-status badge-cancelled">
                            <Ban size={13} /> Đã huỷ
                          </span>
                        )}
                      </td>

                      {/* Thao tác theo vòng đời */}
                      <td>
                        <div className="po-row-actions" style={{ justifyContent: 'center' }}>
                          <Link 
                            to={`/purchase/purchase-orders/${po.id}`}
                            className="action-icon-btn"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye size={15} />
                          </Link>

                          {/* Trạng thái Nháp (DRAFT) */}
                          {po.status === 'DRAFT' && (
                            <>
                              <button 
                                type="button" 
                                className="action-icon-btn"
                                onClick={() => handleEditDraftOrder(po)}
                                title="Sửa đơn nháp"
                              >
                                <Edit size={15} />
                              </button>
                              <button 
                                type="button" 
                                className="action-icon-btn primary"
                                onClick={() => handleQuickSend(po)}
                                title="Gửi đơn cho NCC"
                              >
                                <Send size={15} />
                              </button>
                              <button 
                                type="button" 
                                className="action-icon-btn danger"
                                onClick={() => handleOpenCancelModal(po)}
                                title="Huỷ đơn"
                              >
                                <Ban size={15} />
                              </button>
                            </>
                          )}

                          {/* Trạng thái Đã gửi NCC (WAITING_RECEIVE) */}
                          {po.status === 'WAITING_RECEIVE' && (
                            <>
                              <button 
                                type="button" 
                                className="action-icon-btn success"
                                onClick={() => handleOpenReceiveModal(po)}
                                title="Nhận hàng nhập kho"
                              >
                                <PackageCheck size={15} />
                                <span>Nhận</span>
                              </button>
                              <button 
                                type="button" 
                                className="action-icon-btn danger"
                                onClick={() => handleOpenCancelModal(po)}
                                title="Huỷ đơn"
                              >
                                <Ban size={15} />
                              </button>
                            </>
                          )}

                          {/* Trạng thái Đã nhận một phần (PARTIALLY_RECEIVED) */}
                          {po.status === 'PARTIALLY_RECEIVED' && (
                            <>
                              <button 
                                type="button" 
                                className="action-icon-btn success"
                                onClick={() => handleOpenReceiveModal(po)}
                                title="Tiếp tục nhận đợt tiếp theo"
                              >
                                <PackageCheck size={15} />
                                <span>Nhận tiếp</span>
                              </button>
                              <button 
                                type="button" 
                                className="action-icon-btn warning"
                                onClick={() => handleOpenCloseModal(po)}
                                title="Đóng đơn thiếu hàng"
                              >
                                <CheckSquare size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination */}
        <div className="po-pagination-bar">
          <div>
            Hiển thị <strong>{orders.length}</strong> / <strong>{total}</strong> đơn đặt hàng mua
          </div>

          <div className="pagination-controls">
            <button 
              type="button" 
              className="page-nav-btn"
              disabled={filters.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>Trang {filters.page} / {totalPages}</span>
            <button 
              type="button" 
              className="page-nav-btn"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Modals */}
      {isCreateModalOpen && (
        <CreatePurchaseOrderModal 
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingOrder(null);
          }}
          onSuccess={() => {
            refetch();
          }}
          initialOrder={editingOrder}
        />
      )}

      {isReceiveModalOpen && receivingOrder && (
        <ReceiveGoodsModal
          isOpen={isReceiveModalOpen}
          order={receivingOrder}
          onClose={() => {
            setIsReceiveModalOpen(false);
            setReceivingOrder(null);
          }}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {isReasonModalOpen && reasonOrder && (
        <CancelCloseModal
          isOpen={isReasonModalOpen}
          order={reasonOrder}
          actionType={reasonActionType}
          onClose={() => {
            setIsReasonModalOpen(false);
            setReasonOrder(null);
          }}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {isDiscrepancyModalOpen && (
        <DiscrepancyModal
          isOpen={isDiscrepancyModalOpen}
          onClose={() => setIsDiscrepancyModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PurchaseOrderList;
