import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  Wallet, 
  Tag, 
  CreditCard,
  Box,
  Layers,
  Archive,
  Search,
  Calendar,
  ChevronDown,
  X,
  Truck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Check,
  Ban,
  Send,
  Download,
  Info,
  SlidersHorizontal,
  ChevronUp,
  Plus
} from 'lucide-react';
import { useSalesOrders } from '../../../hooks/useSalesOrders';
import { 
  getWarehouses, 
  getSalesReps, 
  getRetailers, 
  getDeliveryTrips, 
  exportReportExcel 
} from '../../../services/api';
import Rpt005Modal from './Rpt005Modal';
import CreateSalesOrderModal from './CreateSalesOrderModal';
import './SalesOrderList.css';

// Helper format tiền tệ VNĐ
const formatCurrency = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

// Danh sách các trạng thái hỗ trợ multi-select
const ALL_STATUSES = [
  { code: 'PENDING', label: 'Chờ duyệt', color: 'badge-pending' },
  { code: 'SUBMITTED', label: 'Chờ phân bổ', color: 'badge-submitted' },
  { code: 'ALLOCATED', label: 'Chờ giao', color: 'badge-allocated' },
  { code: 'SHIPPED', label: 'Đang giao', color: 'badge-shipped' },
  { code: 'DELIVERED', label: 'Đã giao', color: 'badge-delivered' },
  { code: 'INVOICED', label: 'Đã lập HĐ', color: 'badge-invoiced' },
  { code: 'PAID', label: 'Đã đóng', color: 'badge-paid' },
  { code: 'CANCELLED', label: 'Đã huỷ', color: 'badge-cancelled' }
];

const DEFAULT_FILTERS = {
  dateType: 'expected',
  startDate: '',
  endDate: '',
  warehouseId: '',
  orderCode: '',
  vnbhCode: '',
  vnbhName: '',
  retailer: '',
  status: '', // Phân cách bằng dấu phẩy
  stockFilter: 'all' // 'all' | 'enough' | 'shortage'
};

const SalesOrderList = () => {
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Phục hồi bộ lọc từ sessionStorage nếu có
  const [filterForm, setFilterForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dms_sales_order_filters');
      return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  // State cho mảng trạng thái đang chọn (Multi-select)
  const [selectedStatusList, setSelectedStatusList] = useState(() => {
    if (filterForm.status) {
      return filterForm.status.split(',').filter(Boolean);
    }
    return [];
  });

  // Master Data States
  const [warehouses, setWarehouses] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [retailerSuggestions, setRetailerSuggestions] = useState([]);
  const [deliveryTrips, setDeliveryTrips] = useState([]);

  // Autocomplete UI states
  const [showVnbhDropdown, setShowVnbhDropdown] = useState(false);
  const [showRetailerDropdown, setShowRetailerDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Modals
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRpt005Open, setIsRpt005Open] = useState(false);
  const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, reason: '' });
  const [tripModal, setTripModal] = useState({ isOpen: false, order: null, tripId: '' });
  const [deliveryModal, setDeliveryModal] = useState({ isOpen: false, order: null, isSuccess: true, note: '' });

  // Tự động mở modal nếu có query params (từ Home hoặc Header link)
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
    }
    if (searchParams.get('rpt005') === 'true') {
      setIsRpt005Open(true);
    }
  }, [searchParams]);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    if (searchParams.get('create')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('create');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleCloseRpt005Modal = () => {
    setIsRpt005Open(false);
    if (searchParams.get('rpt005')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('rpt005');
      setSearchParams(nextParams, { replace: true });
    }
  };

  // Custom Hook
  const { 
    data: orders, 
    kpis, 
    pagination, 
    loading, 
    actionLoading,
    error, 
    successMessage,
    selectedIds,
    sortBy,
    sortOrder,
    toggleSort,
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,
    applyFilters,
    setPage,
    setLimit,
    handleConfirm,
    handleBulkConfirm,
    handleCancel,
    handleAssignTrip,
    handleConfirmDelivery,
    handleClose,
    refresh
  } = useSalesOrders(filterForm);

  // Tải Master data khi mount
  useEffect(() => {
    getWarehouses(1).then(setWarehouses).catch(console.error);
    getSalesReps({ distributorId: 1 }).then(setSalesReps).catch(console.error);
    getDeliveryTrips({ distributorId: 1 }).then(setDeliveryTrips).catch(console.error);
  }, []);

  // Lấy gợi ý khách hàng khi gõ
  useEffect(() => {
    if (filterForm.retailer && filterForm.retailer.trim().length > 1) {
      const timer = setTimeout(() => {
        getRetailers({ search: filterForm.retailer, distributorId: 1 })
          .then(setRetailerSuggestions)
          .catch(console.error);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setRetailerSuggestions([]);
    }
  }, [filterForm.retailer]);

  const handleFilterChange = (field, value) => {
    setFilterForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleStatusSelection = (code) => {
    setSelectedStatusList(prev => {
      const exists = prev.includes(code);
      const next = exists ? prev.filter(c => c !== code) : [...prev, code];
      setFilterForm(f => ({ ...f, status: next.join(',') }));
      return next;
    });
  };

  const handleSearch = () => {
    const filtersToApply = {
      ...filterForm,
      status: selectedStatusList.join(',')
    };
    sessionStorage.setItem('dms_sales_order_filters', JSON.stringify(filtersToApply));
    applyFilters(filtersToApply);
  };

  const handleResetFilters = () => {
    setFilterForm(DEFAULT_FILTERS);
    setSelectedStatusList([]);
    sessionStorage.removeItem('dms_sales_order_filters');
    applyFilters(DEFAULT_FILTERS);
  };

  const handleStockFilterClick = (stockType) => {
    const updated = { ...filterForm, stockFilter: stockType };
    setFilterForm(updated);
    sessionStorage.setItem('dms_sales_order_filters', JSON.stringify(updated));
    applyFilters(updated);
  };

  // Submit Modal Handlers
  const submitCancel = async () => {
    if (!cancelModal.reason.trim()) {
      alert('Vui lòng nhập lý do huỷ đơn hàng');
      return;
    }
    const success = await handleCancel(cancelModal.order.id, cancelModal.reason);
    if (success) {
      setCancelModal({ isOpen: false, order: null, reason: '' });
    }
  };

  const submitAssignTrip = async () => {
    if (!tripModal.tripId) {
      alert('Vui lòng chọn chuyến xe giao hàng');
      return;
    }
    const success = await handleAssignTrip(tripModal.order.id, tripModal.tripId);
    if (success) {
      setTripModal({ isOpen: false, order: null, tripId: '' });
    }
  };

  const submitDelivery = async () => {
    const success = await handleConfirmDelivery(
      deliveryModal.order.id, 
      deliveryModal.isSuccess, 
      deliveryModal.note
    );
    if (success) {
      setDeliveryModal({ isOpen: false, order: null, isSuccess: true, note: '' });
    }
  };

  // Export handlers
  const handleExportList = () => {
    exportReportExcel('sales-orders', filterForm);
  };

  const handleExportRpt = (reportCode) => {
    exportReportExcel(reportCode, filterForm);
  };

  return (
    <div className="sales-order-list-container">
      {/* Alert Banners */}
      {successMessage && (
        <div className="toast-banner success">
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}
      {error && (
        <div className="toast-banner error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2>Danh sách Đơn bán hàng (Sales Orders)</h2>
          <p className="page-subtitle">Quản lý vòng đời đơn hàng, phân bổ lô FEFO và xuất báo cáo vận hành</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn-create-order"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} /> + Tạo đơn hàng mới (BH_BM1)
          </button>
          <button 
            className="filter-toggle"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          >
            {isFilterExpanded ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc'}
            {isFilterExpanded ? <ChevronUp size={15} /> : <SlidersHorizontal size={15} />}
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {isFilterExpanded && (
        <div className="filters-section">
          <div className="filter-row">
            {/* Loại ngày & Date Range */}
            <div className="filter-item date-type-item">
              <select 
                value={filterForm.dateType} 
                onChange={(e) => handleFilterChange('dateType', e.target.value)}
              >
                <option value="expected">Ngày giao dự kiến</option>
                <option value="created">Ngày tạo đơn</option>
              </select>
            </div>

            <div className="filter-item date-range-inputs">
              <input 
                type="date" 
                value={filterForm.startDate} 
                onChange={(e) => handleFilterChange('startDate', e.target.value)} 
                title="Từ ngày"
              />
              <span className="date-sep">-</span>
              <input 
                type="date" 
                value={filterForm.endDate} 
                onChange={(e) => handleFilterChange('endDate', e.target.value)} 
                title="Đến ngày"
              />
            </div>

            {/* NPP & Kho */}
            <div className="filter-item">
              <select disabled title="Nhà phân phối hiện tại">
                <option>[G-10KF1292] Nhà Phân Phối G KF1292</option>
              </select>
            </div>

            <div className="filter-item">
              <select 
                value={filterForm.warehouseId}
                onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
              >
                <option value="">-- Tất cả kho NPP --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>[{w.code}] {w.name}</option>
                ))}
              </select>
            </div>

            {/* Mã đơn hàng */}
            <div className="filter-item">
              <input 
                type="text" 
                placeholder="Mã đơn hàng (SO-...)" 
                value={filterForm.orderCode}
                onChange={(e) => handleFilterChange('orderCode', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          
          <div className="filter-row">
            {/* VNBH Mã / Tên */}
            <div className="filter-item" style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Mã hoặc Tên VNBH" 
                value={filterForm.vnbhName}
                onChange={(e) => {
                  handleFilterChange('vnbhName', e.target.value);
                  setShowVnbhDropdown(true);
                }}
                onFocus={() => setShowVnbhDropdown(true)}
              />
              {showVnbhDropdown && salesReps.length > 0 && (
                <div className="autocomplete-dropdown">
                  <div 
                    className="autocomplete-item"
                    onClick={() => {
                      handleFilterChange('vnbhName', '');
                      handleFilterChange('vnbhCode', '');
                      setShowVnbhDropdown(false);
                    }}
                  >
                    -- Tất cả VNBH --
                  </div>
                  {salesReps
                    .filter(s => s.fullName.toLowerCase().includes(filterForm.vnbhName.toLowerCase()) || s.username.toLowerCase().includes(filterForm.vnbhName.toLowerCase()))
                    .map(s => (
                      <div 
                        key={s.id} 
                        className="autocomplete-item"
                        onClick={() => {
                          handleFilterChange('vnbhName', s.fullName);
                          handleFilterChange('vnbhCode', s.username);
                          setShowVnbhDropdown(false);
                        }}
                      >
                        <strong>{s.username}</strong> - {s.fullName} ({s.phone})
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Khách hàng / Cửa hàng Autocomplete */}
            <div className="filter-item" style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Mã hoặc Tên Cửa hàng / Đại lý" 
                value={filterForm.retailer}
                onChange={(e) => {
                  handleFilterChange('retailer', e.target.value);
                  setShowRetailerDropdown(true);
                }}
                onFocus={() => setShowRetailerDropdown(true)}
              />
              {showRetailerDropdown && retailerSuggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {retailerSuggestions.map(r => (
                    <div 
                      key={r.id} 
                      className="autocomplete-item"
                      onClick={() => {
                        handleFilterChange('retailer', r.name);
                        setShowRetailerDropdown(false);
                      }}
                    >
                      <strong>[{r.code}]</strong> {r.name}
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{r.address}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trạng thái Multi-select dropdown */}
            <div className="filter-item" style={{ position: 'relative' }}>
              <button 
                type="button"
                className="btn-status-multiselect"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                <span>
                  {selectedStatusList.length === 0 
                    ? 'Tất cả trạng thái' 
                    : `Đã chọn (${selectedStatusList.length}) trạng thái`}
                </span>
                <ChevronDown size={14} />
              </button>
              {showStatusDropdown && (
                <div className="status-dropdown-menu">
                  <div className="status-dropdown-header">
                    <span>Chọn trạng thái đơn</span>
                    <button 
                      type="button" 
                      className="btn-link"
                      onClick={() => {
                        setSelectedStatusList([]);
                        handleFilterChange('status', '');
                      }}
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                  {ALL_STATUSES.map(st => {
                    const isChecked = selectedStatusList.includes(st.code);
                    return (
                      <label key={st.code} className="status-checkbox-item">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStatusSelection(st.code)}
                        />
                        <span className={`status-pill ${st.color}`}>{st.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nút lọc & Reset */}
            <div className="filter-item filter-actions">
              <button className="btn-search" onClick={handleSearch} disabled={loading}>
                <Search size={15} /> Tìm kiếm
              </button>
              <button className="btn-reset" onClick={handleResetFilters} title="Xoá bộ lọc">
                <RotateCcw size={15} /> Xoá lọc
              </button>
            </div>
          </div>

          {/* Badges trạng thái đang chọn */}
          {selectedStatusList.length > 0 && (
            <div className="active-status-tags">
              <span className="tags-label">Trạng thái lọc:</span>
              {selectedStatusList.map(code => {
                const item = ALL_STATUSES.find(s => s.code === code);
                return (
                  <span key={code} className="active-tag">
                    {item?.label || code}
                    <X size={12} onClick={() => toggleStatusSelection(code)} />
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="kpi-cards-row">
        <div className="kpi-card blue">
          <div className="kpi-info">
            <h4>Tổng đơn</h4>
            <p>{kpis.totalOrders || 0}</p>
          </div>
          <div className="kpi-icon"><FileText size={20} /></div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-info">
            <h4>Tổng thành tiền</h4>
            <p>{formatCurrency(kpis.totalAmount)} đ</p>
          </div>
          <div className="kpi-icon"><Wallet size={20} /></div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-info">
            <h4>Tổng chiết khấu</h4>
            <p>{formatCurrency(kpis.totalDiscount)} đ</p>
          </div>
          <div className="kpi-icon"><Tag size={20} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-info">
            <h4>Tổng tiền đơn hàng</h4>
            <p>{formatCurrency(kpis.totalOrderValue)} đ</p>
          </div>
          <div className="kpi-icon"><CreditCard size={20} /></div>
        </div>
        <div className="kpi-card lightblue">
          <div className="kpi-info">
            <h4>Tổng tấn</h4>
            <p>{kpis.totalTons || '0.0000'}</p>
          </div>
          <div className="kpi-icon"><Box size={20} /></div>
        </div>
        <div className="kpi-card gray">
          <div className="kpi-info">
            <h4>Tổng khối</h4>
            <p>{kpis.totalCbm || '0.0000'}</p>
          </div>
          <div className="kpi-icon"><Layers size={20} /></div>
        </div>
        <div 
          className="kpi-card amber"
          title="Nhấn để lọc các đơn đã giao / lập hóa đơn đang chờ đóng đơn"
          onClick={() => {
            setSelectedStatusList(['DELIVERED', 'INVOICED']);
            const nextFilters = { ...filterForm, status: 'DELIVERED,INVOICED' };
            setFilterForm(nextFilters);
            sessionStorage.setItem('dms_sales_order_filters', JSON.stringify(nextFilters));
            applyFilters(nextFilters);
          }}
        >
          <div className="kpi-info">
            <h4 style={{ color: '#c2410c', fontWeight: 600 }}>Đơn chưa đóng ⚠️</h4>
            <p style={{ color: '#ea580c', fontWeight: 700 }}>
              {kpis.unclosedOrdersCount || 0}
              <span style={{ fontSize: '12px', fontWeight: 500, marginLeft: '6px', color: '#9a3412' }}>
                ({formatCurrency(kpis.unclosedOrdersAmount)} đ)
              </span>
            </p>
          </div>
          <div className="kpi-icon" style={{ color: '#ea580c' }}><Truck size={20} /></div>
        </div>
      </div>

      {/* Table & Reports Section */}
      <div className="table-section">
        {/* Table Toolbar & Report Buttons */}
        <div className="table-toolbar">
          <div className="stock-tabs">
            <button 
              className={`stock-tab ${filterForm.stockFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleStockFilterClick('all')}
            >
              Tất cả ({pagination.total || 0})
            </button>
            <button 
              className={`stock-tab ${filterForm.stockFilter === 'enough' ? 'active' : ''}`}
              onClick={() => handleStockFilterClick('enough')}
            >
              Đủ tồn
            </button>
            <button 
              className={`stock-tab danger ${filterForm.stockFilter === 'shortage' ? 'active' : ''}`}
              onClick={() => handleStockFilterClick('shortage')}
            >
              Thiếu tồn
            </button>
          </div>

          <div className="quick-reports">
            <button className="btn-report highlight" onClick={() => setIsRpt005Open(true)}>
              <AlertCircle size={14} /> RPT005 - Kiểm tra thiếu tồn
            </button>
            <button className="btn-report" onClick={() => handleExportRpt('rpt057')}>
              <Download size={14} /> RPT057 - Doanh số & Sản lượng
            </button>
            <button className="btn-report" onClick={() => handleExportRpt('rpt006')}>
              <Download size={14} /> RPT006 - Bảng kê theo NVGH
            </button>
            <button className="btn-report" onClick={() => handleExportRpt('rpt061')}>
              <Download size={14} /> RPT061 - Line Item
            </button>
            <button className="btn-report green" onClick={handleExportList}>
              <Download size={14} /> Xuất Excel danh sách
            </button>
          </div>
        </div>
        
        {/* Bulk Action Bar (Hiển thị khi có dòng được chọn) */}
        {selectedIds.length > 0 && (
          <div className="bulk-action-bar">
            <span>Đã chọn <strong>{selectedIds.length}</strong> đơn hàng</span>
            <div className="bulk-buttons">
              <button 
                className="btn-bulk-confirm"
                onClick={handleBulkConfirm}
                disabled={actionLoading}
              >
                <Check size={15} /> Xác nhận hàng loạt (FEFO)
              </button>
              <button className="btn-bulk-cancel" onClick={clearSelection}>
                Huỷ chọn
              </button>
            </div>
          </div>
        )}

        <div className="table-controls">
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Hiển thị <strong>{orders.length}</strong> / <strong>{pagination.total}</strong> đơn hàng
          </span>
          <select 
            className="select-limit"
            value={pagination.limit}
            onChange={(e) => setLimit(e.target.value)}
          >
            <option value="10">Xem 10 đơn mỗi trang</option>
            <option value="20">Xem 20 đơn mỗi trang</option>
            <option value="50">Xem 50 đơn mỗi trang</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="so-table-container">
          {loading ? (
            <div className="table-loading">Đang tải danh sách đơn hàng...</div>
          ) : orders.length === 0 ? (
            <div className="table-empty">Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</div>
          ) : (
            <table className="so-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === orders.length && orders.length > 0}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th onClick={() => toggleSort('orderCode')} style={{ cursor: 'pointer' }}>
                    Mã đơn hàng {sortBy === 'orderCode' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Cửa hàng / Đại lý</th>
                  <th>Địa chỉ giao</th>
                  <th onClick={() => toggleSort('createdAt')} style={{ cursor: 'pointer' }}>
                    Ngày đặt / Giao dự kiến {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>VNBH</th>
                  <th>Chuyến xe</th>
                  <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                    Trạng thái {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>TT Tồn kho</th>
                  <th style={{ textAlign: 'right' }}>Tổng thành tiền</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((row) => (
                  <tr key={row.id} className={selectedIds.includes(row.id) ? 'row-selected' : ''}>
                    <td className="checkbox-cell">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelectOne(row.id)}
                      />
                    </td>
                    <td>
                      <Link to={`/sales/sales-orders/${row.id}`} className="order-link">
                        {row.orderCode}
                      </Link>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{row.itemCount} mặt hàng</div>
                    </td>
                    <td>
                      <div className="shop-title">[{row.retailerCode}]</div>
                      <div className="shop-name">{row.retailerName}</div>
                      {row.phone && <div className="shop-phone">{row.phone}</div>}
                    </td>
                    <td className="address-col" title={row.address}>
                      {row.address || 'Tại cửa hàng'}
                    </td>
                    <td>
                      <div className="delivery-date">
                        <Calendar size={13} /> 
                        {new Date(row.expectedDate).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="order-created-time">
                        Tạo: {new Date(row.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{row.vnbhName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{row.vnbhCode}</div>
                    </td>
                    <td>
                      <div className="delivery-truck">
                        <Truck size={13} /> {row.truckCode}
                      </div>
                      {row.driverName && <div className="driver-name">{row.driverName}</div>}
                    </td>
                    <td>
                      <span className={`status-badge ${row.status.toLowerCase()}`}>
                        {ALL_STATUSES.find(s => s.code === row.status)?.label || row.status}
                      </span>
                    </td>
                    <td>
                      {row.isShortage ? (
                        <span className="stock-badge shortage">
                          <AlertCircle size={12} /> Thiếu tồn
                        </span>
                      ) : (
                        <span className="stock-badge enough">
                          <CheckCircle2 size={12} /> Đủ tồn
                        </span>
                      )}
                    </td>
                    <td className="money-text">
                      {formatCurrency(row.totalAmount)} đ
                    </td>
                    <td className="action-cell">
                      <div className="action-buttons-group">
                        <Link to={`/sales/sales-orders/${row.id}`} className="btn-action view" title="Xem chi tiết">
                          Chi tiết
                        </Link>

                        {/* Thao tác tuỳ theo trạng thái vòng đời */}
                        {row.status === 'PENDING' && (
                          <>
                            <button 
                              className="btn-action confirm" 
                              title="Xác nhận & Phân bổ lô FEFO"
                              onClick={() => handleConfirm(row.id)}
                              disabled={actionLoading}
                            >
                              Xác nhận
                            </button>
                            <button 
                              className="btn-action cancel" 
                              title="Huỷ đơn hàng"
                              onClick={() => setCancelModal({ isOpen: true, order: row, reason: '' })}
                            >
                              Huỷ
                            </button>
                          </>
                        )}

                        {row.status === 'ALLOCATED' && (
                          <>
                            <button 
                              className="btn-action trip" 
                              title="Gán chuyến xe giao hàng"
                              onClick={() => setTripModal({ isOpen: true, order: row, tripId: '' })}
                            >
                              Gán xe
                            </button>
                            <button 
                              className="btn-action cancel" 
                              title="Huỷ đơn hàng (Hoàn tồn kho giữ chỗ)"
                              onClick={() => setCancelModal({ isOpen: true, order: row, reason: '' })}
                            >
                              Huỷ
                            </button>
                          </>
                        )}

                        {row.status === 'SHIPPED' && (
                          <button 
                            className="btn-action delivery" 
                            title="Xác nhận giao hàng thành công"
                            onClick={() => setDeliveryModal({ isOpen: true, order: row, isSuccess: true, note: '' })}
                          >
                            Giao hàng
                          </button>
                        )}

                        {row.status === 'DELIVERED' && (
                          <button 
                            className="btn-action close" 
                            title="Đối soát & Đóng đơn"
                            onClick={() => handleClose(row.id)}
                            disabled={actionLoading}
                          >
                            Đóng đơn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="table-pagination">
          <button 
            disabled={pagination.page <= 1}
            onClick={() => setPage(pagination.page - 1)}
          >
            ‹ Trang trước
          </button>
          <span>Trang <strong>{pagination.page}</strong> / {Math.max(1, Math.ceil(pagination.total / pagination.limit))}</span>
          <button 
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            onClick={() => setPage(pagination.page + 1)}
          >
            Trang sau ›
          </button>
        </div>
      </div>

      {/* MODAL 1: Huỷ đơn hàng */}
      {cancelModal.isOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Huỷ đơn hàng: {cancelModal.order?.orderCode}</h3>
              <button className="btn-close" onClick={() => setCancelModal({ isOpen: false, order: null, reason: '' })}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                {cancelModal.order?.status === 'ALLOCATED' 
                  ? 'Đơn hàng đã được phân bổ lô (Reserved Stock). Khi huỷ đơn, toàn bộ lượng hàng giữ chỗ sẽ được tự động hoàn trả về kho khả dụng.' 
                  : 'Vui lòng nhập lý do huỷ đơn hàng:'}
              </p>
              <div className="form-group">
                <label>Lý do huỷ đơn <span style={{ color: 'red' }}>*</span></label>
                <textarea 
                  rows="3"
                  className="modal-textarea"
                  placeholder="Ví dụ: Đại lý yêu cầu hoãn đơn / Sai thông tin đặt hàng..."
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setCancelModal({ isOpen: false, order: null, reason: '' })}>
                Đóng
              </button>
              <button className="btn-danger" onClick={submitCancel} disabled={actionLoading}>
                <Ban size={15} /> Xác nhận Huỷ đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Gán chuyến xe */}
      {tripModal.isOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Gán chuyến xe: {tripModal.order?.orderCode}</h3>
              <button className="btn-close" onClick={() => setTripModal({ isOpen: false, order: null, tripId: '' })}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                Chọn chuyến xe vận chuyển để chuyển đơn hàng sang trạng thái <strong>"Đang giao" (SHIPPED)</strong>:
              </p>
              <div className="form-group">
                <label>Chuyến xe giao hàng <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="modal-select"
                  value={tripModal.tripId}
                  onChange={(e) => setTripModal(prev => ({ ...prev, tripId: e.target.value }))}
                >
                  <option value="">-- Chọn chuyến xe --</option>
                  {deliveryTrips.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.tripCode}] - Tài xế: {t.driverName} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setTripModal({ isOpen: false, order: null, tripId: '' })}>
                Đóng
              </button>
              <button className="btn-primary" onClick={submitAssignTrip} disabled={actionLoading}>
                <Truck size={15} /> Xác nhận Gán xe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Xác nhận giao hàng */}
      {deliveryModal.isOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Xác nhận giao hàng: {deliveryModal.order?.orderCode}</h3>
              <button className="btn-close" onClick={() => setDeliveryModal({ isOpen: false, order: null, isSuccess: true, note: '' })}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                Xác nhận kết quả giao hàng đến đại lý. Khi thành công, hệ thống sẽ <strong>xuất kho vật lý</strong> và tạo giao dịch xuất kho:
              </p>
              <div className="form-group radio-group">
                <label>
                  <input 
                    type="radio" 
                    name="delivSuccess" 
                    checked={deliveryModal.isSuccess} 
                    onChange={() => setDeliveryModal(prev => ({ ...prev, isSuccess: true }))}
                  /> Giao hàng thành công (Đã giao)
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="delivSuccess" 
                    checked={!deliveryModal.isSuccess} 
                    onChange={() => setDeliveryModal(prev => ({ ...prev, isSuccess: false }))}
                  /> Giao hàng thất bại (Quay về Chờ giao)
                </label>
              </div>
              <div className="form-group">
                <label>Ghi chú đối soát</label>
                <input 
                  type="text"
                  className="modal-input"
                  placeholder="Ghi chú người nhận hàng hoặc lý do giao thất bại..."
                  value={deliveryModal.note}
                  onChange={(e) => setDeliveryModal(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeliveryModal({ isOpen: false, order: null, isSuccess: true, note: '' })}>
                Đóng
              </button>
              <button className="btn-primary" onClick={submitDelivery} disabled={actionLoading}>
                <CheckCircle2 size={15} /> Cập nhật kết quả giao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RPT005 Báo cáo thiếu tồn & Sửa số lượng */}
      <Rpt005Modal 
        isOpen={isRpt005Open}
        onClose={handleCloseRpt005Modal}
        appliedFilters={filterForm}
        onOrderUpdated={refresh}
      />

      {/* MODAL 5: Biểu mẫu tạo đơn đặt hàng bán BH_BM1 */}
      <CreateSalesOrderModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onOrderCreated={refresh}
      />
    </div>
  );
};

export default SalesOrderList;
