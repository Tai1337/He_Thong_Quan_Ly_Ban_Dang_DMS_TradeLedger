import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Warehouse as WarehouseIcon, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ArrowRight,
  RotateCcw,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import { getInventoryCounts, createInventoryCount, getWarehouses } from '../../../services/api';
import './InventoryCountList.css';

const statusConfig = {
  DRAFT: { label: 'Bản nháp', color: '#64748b', bg: '#f1f5f9' },
  WAITING_APPROVAL: { label: 'Chờ duyệt', color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'Đã duyệt', color: '#0284c7', bg: '#e0f2fe' },
  COMPLETED: { label: 'Đã cân kho', color: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'Từ chối', color: '#dc2626', bg: '#fee2e2' },
  CANCELLED: { label: 'Đã hủy', color: '#94a3b8', bg: '#f8fafc' },
};

const InventoryCountList = () => {
  const navigate = useNavigate();

  // State
  const [counts, setCounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouses, setWarehouses] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    warehouseId: '',
    status: '',
    countType: '',
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 15,
  });

  // Modal tạo phiếu mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    warehouseId: '',
    countType: 'MONTHLY',
    notes: '',
  });
  const [creating, setCreating] = useState(false);

  // Load kho hàng
  useEffect(() => {
    getWarehouses(1)
      .then((data) => setWarehouses(data || []))
      .catch((err) => console.error('Lỗi tải danh sách kho:', err));
  }, []);

  // Fetch danh sách phiếu kiểm kê
  const fetchCounts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getInventoryCounts(filters);
      setCounts(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách phiếu kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [filters.page, filters.warehouseId, filters.status, filters.countType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
    fetchCounts();
  };

  // Submit tạo phiếu mới
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.warehouseId) {
      alert('Vui lòng chọn kho hàng cần kiểm kê!');
      return;
    }

    setCreating(true);
    try {
      const newCount = await createInventoryCount({
        warehouseId: createForm.warehouseId,
        countType: createForm.countType,
        notes: createForm.notes,
      }, 1);

      setShowCreateModal(false);
      // Điều hướng ngay sang trang chi tiết để kiểm đếm
      navigate(`/inventory/counts/${newCount.id}`);
    } catch (err) {
      alert(err.message || 'Không thể tạo phiếu kiểm kê');
    } finally {
      setCreating(false);
    }
  };

  // Tính toán KPI nhanh
  const waitingApprovalCount = counts.filter((c) => c.status === 'WAITING_APPROVAL').length;
  const completedCount = counts.filter((c) => c.status === 'COMPLETED').length;
  const varianceCount = counts.filter((c) => c.summary?.hasVariance).length;

  const totalPages = Math.ceil(total / filters.limit) || 1;

  return (
    <div className="count-page-container">
      {/* Page Header */}
      <div className="count-page-header">
        <div className="header-left">
          <div className="header-icon-box">
            <ClipboardCheck size={28} color="#0b3d70" />
          </div>
          <div>
            <h1 className="header-title">Kiểm Kê Kho Hàng</h1>
            <p className="header-subtitle">
              Quản lý các đợt kiểm kê định kỳ tháng & đột xuất, đối soát số dư tồn và cân kho tự động
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="btn-create-count"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            <span>Mở Phiếu Kiểm Kê Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="count-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper blue">
            <FileText size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tổng số phiếu kiểm kê</span>
            <span className="kpi-value">{total}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper amber">
            <Clock size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Chờ duyệt cân kho</span>
            <span className="kpi-value">{waitingApprovalCount}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper green">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Đã cân kho hoàn tất</span>
            <span className="kpi-value">{completedCount}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper red">
            <AlertCircle size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Phiếu có chênh lệch</span>
            <span className="kpi-value">{varianceCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="count-filter-toolbar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text"
              placeholder="Tìm theo mã phiếu KKxxxxxx..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-search">Tìm</button>
        </form>

        <div className="filter-group">
          {/* Lọc theo kho */}
          <div className="filter-select-wrapper">
            <WarehouseIcon size={16} className="select-icon" />
            <select
              value={filters.warehouseId}
              onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value, page: 1 })}
            >
              <option value="">Tất cả kho hàng</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Lọc theo trạng thái */}
          <div className="filter-select-wrapper">
            <Filter size={16} className="select-icon" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="WAITING_APPROVAL">Chờ duyệt</option>
              <option value="COMPLETED">Đã cân kho</option>
              <option value="REJECTED">Bị từ chối</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Lọc theo hình thức */}
          <div className="filter-select-wrapper">
            <Layers size={16} className="select-icon" />
            <select
              value={filters.countType}
              onChange={(e) => setFilters({ ...filters, countType: e.target.value, page: 1 })}
            >
              <option value="">Tất cả hình thức</option>
              <option value="MONTHLY">Định kỳ tháng</option>
              <option value="BY_SKU">Theo mặt hàng (Đột xuất)</option>
            </select>
          </div>

          <button 
            type="button" 
            className="btn-refresh"
            onClick={fetchCounts}
            title="Tải lại danh sách"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="count-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu kiểm kê kho...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertCircle size={32} color="#dc2626" />
            <p>{error}</p>
            <button onClick={fetchCounts} className="btn-retry">Thử lại</button>
          </div>
        ) : counts.length === 0 ? (
          <div className="empty-state">
            <ClipboardCheck size={48} color="#94a3b8" />
            <h3>Chưa có phiếu kiểm kê nào</h3>
            <p>Bấm nút "Mở Phiếu Kiểm Kê Mới" phía trên để khởi tạo đợt kiểm kho.</p>
          </div>
        ) : (
          <table className="count-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Kho kiểm kê</th>
                <th>Hình thức</th>
                <th>Ngày tạo</th>
                <th>Người lập</th>
                <th>Số lượng SKU</th>
                <th>Kết quả đối soát</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => {
                const cfg = statusConfig[c.status] || statusConfig.DRAFT;
                const summary = c.summary || {};

                return (
                  <tr key={c.id}>
                    <td>
                      <span className="count-code-badge">{c.countCode}</span>
                    </td>
                    <td>
                      <div className="warehouse-cell">
                        <span className="wh-name">{c.warehouse?.name}</span>
                        <span className="wh-code">{c.warehouse?.code}</span>
                      </div>
                    </td>
                    <td>
                      <span className="count-type-badge">
                        {c.countType === 'MONTHLY' ? 'Định kỳ tháng' : 'Đột xuất SKU'}
                      </span>
                    </td>
                    <td>
                      <span className="date-cell">
                        {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td>{c.createdBy?.fullName || 'Hệ thống'}</td>
                    <td>
                      <span className="sku-count-pill">{summary.totalSkus || c._count?.items || 0} SKU</span>
                    </td>
                    <td>
                      {summary.uncountedCount > 0 ? (
                        <span className="audit-pill pending">
                          <Clock size={13} />
                          Còn {summary.uncountedCount} chưa đếm
                        </span>
                      ) : summary.hasVariance ? (
                        <span className="audit-pill variance">
                          <AlertCircle size={13} />
                          Lệch: +{summary.surplusCount || 0} / -{summary.deficitCount || 0}
                        </span>
                      ) : (
                        <span className="audit-pill match">
                          <CheckCircle2 size={13} />
                          Khớp 100%
                        </span>
                      )}
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ color: cfg.color, backgroundColor: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn-view-detail"
                        onClick={() => navigate(`/inventory/counts/${c.id}`)}
                      >
                        <span>Chi tiết</span>
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="count-pagination">
            <span className="pagination-info">
              Hiển thị {counts.length} / {total} phiếu
            </span>
            <div className="pagination-controls">
              <button 
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="page-current">Trang {filters.page} / {totalPages}</span>
              <button 
                disabled={filters.page >= totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Mở phiếu kiểm kê mới */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-modal-card">
            <div className="modal-header">
              <div className="modal-title-box">
                <ClipboardCheck size={22} color="#0b3d70" />
                <h3>Mở Đợt Kiểm Kê Kho Mới</h3>
              </div>
              <button 
                className="btn-close-modal"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="modal-body">
              <div className="form-group">
                <label>Kho hàng cần kiểm kê <span className="required">*</span></label>
                <select 
                  required
                  value={createForm.warehouseId}
                  onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
                >
                  <option value="">-- Chọn kho hàng --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                <span className="form-help">Hệ thống sẽ tự động chốt số dư tồn kho hiện hành để đối chiếu</span>
              </div>

              <div className="form-group">
                <label>Hình thức kiểm kê</label>
                <div className="count-type-options">
                  <label className={`type-option ${createForm.countType === 'MONTHLY' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="countType" 
                      value="MONTHLY"
                      checked={createForm.countType === 'MONTHLY'}
                      onChange={() => setCreateForm({ ...createForm, countType: 'MONTHLY' })}
                    />
                    <div>
                      <strong>Định kỳ toàn kho (Tháng)</strong>
                      <p>Tự động nạp toàn bộ danh mục sản phẩm và lô hàng có trong kho</p>
                    </div>
                  </label>

                  <label className={`type-option ${createForm.countType === 'BY_SKU' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="countType" 
                      value="BY_SKU"
                      checked={createForm.countType === 'BY_SKU'}
                      onChange={() => setCreateForm({ ...createForm, countType: 'BY_SKU' })}
                    />
                    <div>
                      <strong>Đột xuất theo SKU</strong>
                      <p>Kiểm tra chọn lọc danh sách mặt hàng chỉ định</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú kiểm kê</label>
                <textarea 
                  rows={3}
                  placeholder="Nhập mục đích hoặc lý do đợt kiểm kho (ví dụ: Kiểm kê cuối tháng 10/2026)..."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={creating}
                >
                  {creating ? 'Đang khởi tạo...' : 'Tạo Phiếu Kiểm Kê (Mã KKxxxxxx)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCountList;
