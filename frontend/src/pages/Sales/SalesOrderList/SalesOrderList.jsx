import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
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
  Download,
  Gift,
  SlidersHorizontal,
  ChevronUp,
  Plus,
  Menu
} from 'lucide-react';
import { useSalesOrders } from '../../../hooks/useSalesOrders';
import {
  getWarehouses,
  getSalesReps,
  getRetailers,
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
  // Autocomplete UI states
  const [showVnbhDropdown, setShowVnbhDropdown] = useState(false);
  const [showRetailerDropdown, setShowRetailerDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusPopoverRef = useRef(null);
  const noticeDialogRef = useRef(null);
  const [noticeMessage, setNoticeMessage] = useState('');

  // Native Popover API: tự đóng khi click ra ngoài / nhấn Escape.
  useEffect(() => {
    const popover = statusPopoverRef.current;
    if (!popover) return;

    if (showStatusDropdown && !popover.matches(':popover-open')) {
      popover.showPopover();
    } else if (!showStatusDropdown && popover.matches(':popover-open')) {
      popover.hidePopover();
    }
  }, [showStatusDropdown]);

  // Native HTMLDialogElement cho thông báo nghiệp vụ.
  useEffect(() => {
    const dialog = noticeDialogRef.current;
    if (noticeMessage && dialog && !dialog.open) dialog.showModal();
  }, [noticeMessage]);

  const showNotice = (message) => setNoticeMessage(message);
  const closeNotice = () => {
    if (noticeDialogRef.current?.open) noticeDialogRef.current.close();
    setNoticeMessage('');
  };

  // Modals
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRpt005Open, setIsRpt005Open] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // Tạo chuyến xe từ các đơn hàng đã chọn
  const handleCreateTripFromSelected = () => {
    setIsActionMenuOpen(false);
    if (!selectedIds || selectedIds.length === 0) {
      showNotice('Vui lòng chọn ít nhất 1 đơn hàng đã xác nhận ("Chờ giao") để tạo chuyến xe.');
      return;
    }

    const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
    const nonAllocated = selectedOrders.filter(o => o.status !== 'ALLOCATED');

    if (nonAllocated.length > 0) {
      showNotice(`Có ${nonAllocated.length} đơn hàng được chọn chưa ở trạng thái "Chờ giao" (ALLOCATED). Vui lòng chỉ chọn các đơn hàng đã xác nhận đủ tồn để xếp chuyến xe.`);
      return;
    }

    navigate('/logistics/delivery-trips', {
      state: {
        selectedOrderIds: selectedIds,
        autoCreate: true
      }
    });
  };

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
    handleBulkConfirm,
    refresh
  } = useSalesOrders(filterForm);

  // Tải Master data khi mount
  useEffect(() => {
    getWarehouses(1).then(setWarehouses).catch(console.error);
    getSalesReps({ distributorId: 1 }).then(setSalesReps).catch(console.error);
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
          <CheckCircle2 size={16} /> {successMessage}
        </div>
      )}
      {error && (
        <div className="toast-banner error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2>Danh sách Đơn bán hàng (Sales Orders)</h2>
          <p className="page-subtitle">Quản lý vòng đời đơn hàng, phân bổ lô FEFO và xuất báo cáo vận hành</p>
        </div>
        <div className="page-header-actions">
<<<<<<< Updated upstream
          <button
=======
          <button 
>>>>>>> Stashed changes
            className="btn-create-order"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} /> Tạo đơn bán hàng (BH_BM1)
          </button>
          <button
            className="filter-toggle"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          >
            {isFilterExpanded ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc'}
            {isFilterExpanded ? <ChevronUp size={16} /> : <SlidersHorizontal size={16} />}
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {isFilterExpanded && (
        <div className="filters-section">
          <div className="filter-grid">
            {/* Hàng 1: Loại ngày (2) + Khoảng ngày (4) + NPP (2) + Kho (2) + Mã đơn (2) = 12 cột */}
            <div className="filter-item filter-col-2">
              <select
                value={filterForm.dateType}
                onChange={(e) => handleFilterChange('dateType', e.target.value)}
              >
                <option value="expected">Ngày giao dự kiến</option>
                <option value="created">Ngày tạo đơn</option>
              </select>
            </div>

            <div className="filter-item filter-col-4 date-range-inputs">
              <input
                type="date"
                value={filterForm.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                title="Từ ngày"
              />
              <span className="date-sep">–</span>
              <input
                type="date"
                value={filterForm.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                title="Đến ngày"
              />
            </div>

            <div className="filter-item filter-col-2">
              <select disabled title="Nhà phân phối hiện tại">
                <option>[NPP-TEST] Nhà Phân Phối Test</option>
              </select>
            </div>

            <div className="filter-item filter-col-2">
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

            <div className="filter-item filter-col-2">
              <input
                type="text"
                placeholder="Mã đơn hàng (SO-...)"
                value={filterForm.orderCode}
                onChange={(e) => handleFilterChange('orderCode', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Hàng 2: VNBH (3) + Cửa hàng (3) + Trạng thái (3) + Nút thao tác (3) = 12 cột */}
            <div className="filter-item filter-col-3 filter-item-rel">
<<<<<<< Updated upstream
              <input
                type="text"
                placeholder="Mã hoặc Tên VNBH"
=======
              <input 
                type="text" 
                placeholder="Mã hoặc Tên VNBH" 
>>>>>>> Stashed changes
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

            <div className="filter-item filter-col-3 filter-item-rel">
<<<<<<< Updated upstream
              <input
                type="text"
                placeholder="Mã hoặc Tên Cửa hàng / Đại lý"
=======
              <input 
                type="text" 
                placeholder="Mã hoặc Tên Cửa hàng / Đại lý" 
>>>>>>> Stashed changes
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
                      <div className="autocomplete-sub">{r.address}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-item filter-col-3 filter-item-rel">
<<<<<<< Updated upstream
              <button
=======
              <button 
>>>>>>> Stashed changes
                type="button"
                className="btn-status-multiselect"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                aria-expanded={showStatusDropdown}
                aria-haspopup="true"
              >
                <span className="status-multiselect-text">
                  {selectedStatusList.length === 0
                    ? 'Tất cả trạng thái'
                    : `Đã chọn (${selectedStatusList.length}) trạng thái`}
                </span>
                <ChevronDown size={14} />
              </button>
              {showStatusDropdown && (
                <div
                  ref={statusPopoverRef}
                  className="status-dropdown-menu"
                  popover="auto"
                  onToggle={(event) => setShowStatusDropdown(event.newState === 'open')}
                >
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
                        <span className={`status-pill ${st.color}`}>
                          <span className="status-dot" />
                          {st.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="filter-item filter-col-3 filter-actions">
              <button className="btn-search" onClick={handleSearch} disabled={loading}>
                <Search size={16} /> Tìm kiếm
              </button>
              <button className="btn-reset" onClick={handleResetFilters} title="Xoá bộ lọc">
                <RotateCcw size={16} /> Xoá lọc
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
        <div className="kpi-card">
          <div className="kpi-info">
            <h4>Tổng đơn</h4>
            <p>{kpis.totalOrders || 0}</p>
          </div>
          <div className="kpi-icon"><FileText size={16} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <h4>Tổng thành tiền</h4>
            <p>{formatCurrency(kpis.totalAmount)} đ</p>
          </div>
          <div className="kpi-icon"><Wallet size={16} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <h4>Tổng chiết khấu</h4>
            <p>{formatCurrency(kpis.totalDiscount)} đ</p>
          </div>
          <div className="kpi-icon"><Tag size={16} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <h4>Tổng tiền đơn hàng</h4>
            <p>{formatCurrency(kpis.totalOrderValue)} đ</p>
          </div>
          <div className="kpi-icon"><CreditCard size={16} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <h4>Tổng tấn</h4>
            <p>{kpis.totalTons || '0.0000'}</p>
          </div>
          <div className="kpi-icon"><Box size={16} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <h4>Tổng khối</h4>
            <p>{kpis.totalCbm || '0.0000'}</p>
          </div>
          <div className="kpi-icon"><Layers size={16} /></div>
        </div>
<<<<<<< Updated upstream
        <div
=======
        <div 
>>>>>>> Stashed changes
          className="kpi-card kpi-card-alert"
          title="Nhấn để lọc các đơn đã giao / lập hóa đơn đang chờ đóng đơn"
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
          onClick={() => {
            setSelectedStatusList(['DELIVERED', 'INVOICED']);
            const nextFilters = { ...filterForm, status: 'DELIVERED,INVOICED' };
            setFilterForm(nextFilters);
            sessionStorage.setItem('dms_sales_order_filters', JSON.stringify(nextFilters));
            applyFilters(nextFilters);
          }}
        >
          <div className="kpi-info">
            <h4>Đơn chưa đóng</h4>
            <p>
              {kpis.unclosedOrdersCount || 0}
              <span className="kpi-sub-amount">
                ({formatCurrency(kpis.unclosedOrdersAmount)} đ)
              </span>
            </p>
          </div>
          <div className="kpi-icon kpi-icon-alert"><Truck size={16} /></div>
        </div>
      </div>

      {/* Table & Reports Section */}
      <div className="table-section">
        {/* Table Toolbar & Report Buttons */}
        <div className="table-toolbar">
          <div className="table-toolbar-row-top">
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
          </div>

          <div className="table-toolbar-row-bottom">
            <div className="table-toolbar-left">
              <div className="list-action-menu">
                <button
                  type="button"
                  className="btn-list-actions"
                  onClick={() => setIsActionMenuOpen((isOpen) => !isOpen)}
                  aria-expanded={isActionMenuOpen}
                  aria-haspopup="menu"
                >
                  <Menu size={14} /> Thao tác <ChevronDown size={14} />
                </button>
                {isActionMenuOpen && (
                  <div className="list-action-dropdown" role="menu">
                    <button type="button" role="menuitem" onClick={handleCreateTripFromSelected}>
                      <Truck size={14} /> Tạo chuyến xe
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="table-toolbar-right quick-reports">
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
                <Check size={14} /> Xác nhận hàng loạt (FEFO)
              </button>
              <button className="btn-bulk-cancel" onClick={clearSelection}>
                Huỷ chọn
              </button>
            </div>
          </div>
        )}

        <div className="table-controls">
          <span className="table-count-summary">
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
                  <th onClick={() => toggleSort('orderCode')} className="th-sortable">
                    Mã đơn hàng {sortBy === 'orderCode' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Cửa hàng / Đại lý</th>
                  <th>Địa chỉ giao</th>
                  <th onClick={() => toggleSort('createdAt')} className="th-sortable">
                    Ngày đặt / Giao dự kiến {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>VNBH</th>
                  <th>Chuyến xe</th>
                  <th onClick={() => toggleSort('status')} className="th-sortable">
                    Trạng thái {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>TT Tồn kho</th>
                  <th className="th-amount">Tổng thành tiền</th>
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
                      <div className="order-code-cell">
                        <Link to={`/sales/sales-orders/${row.id}`} className="order-link">
                          {row.orderCode}
                        </Link>
                        <div className="order-item-count">{row.itemCount} mặt hàng</div>
                        {(row.orderCode?.startsWith('R-') || row.hasPromotion || row.discount > 0) && (
                          <div className="order-tags-row">
                            {row.orderCode?.startsWith('R-') && (
                              <span className="order-tag order-tag-web" title="Đơn hàng trực tuyến từ Web Bán Hàng">
                                Web Retailer
                              </span>
                            )}
                            {row.hasPromotion && (
                              <span className="order-tag order-tag-promo" title={`Có quà tặng khuyến mãi FOC (+${row.freeGiftsCount || 1} phần)`}>
                                <Gift size={12} /> Quà KM
                              </span>
                            )}
                            {row.discount > 0 && (
                              <span className="order-tag order-tag-discount" title={`Chiết khấu bậc thang: -${formatCurrency(row.discount)} đ`}>
                                <Tag size={12} /> -{formatCurrency(row.discount)}đ
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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
<<<<<<< Updated upstream
                        <Calendar size={14} />
=======
                        <Calendar size={14} /> 
>>>>>>> Stashed changes
                        {new Date(row.expectedDate).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="order-created-time">
                        Tạo: {new Date(row.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td>
                      <div className="vnbh-name">{row.vnbhName}</div>
                      <div className="vnbh-code">{row.vnbhCode}</div>
                    </td>
                    <td>
                      <div className="delivery-truck">
                        <Truck size={14} /> {row.truckCode}
                      </div>
                      {row.driverName && <div className="driver-name">{row.driverName}</div>}
                    </td>
                    <td>
                      <span className={`status-badge ${row.status.toLowerCase()}`}>
                        <span className="status-dot" />
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
                      <div>{formatCurrency(row.totalAmount)} đ</div>
                      {row.discount > 0 && (
                        <div className="money-discount-note">
                          (Đã giảm {formatCurrency(row.discount)} đ)
                        </div>
                      )}
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

      {/* Native Chrome/HTML dialog for validation notices */}
      <dialog
        ref={noticeDialogRef}
        className="native-notice-dialog"
        aria-labelledby="sales-order-notice-title"
        onCancel={() => setNoticeMessage('')}
        onClose={() => setNoticeMessage('')}
      >
        <div className="native-dialog-icon"><AlertCircle size={20} /></div>
        <div className="native-dialog-copy">
          <h3 id="sales-order-notice-title">Chưa thể thực hiện thao tác</h3>
          <p>{noticeMessage}</p>
        </div>
        <div className="native-dialog-actions">
          <button type="button" className="native-dialog-primary" onClick={closeNotice}>Đã hiểu</button>
        </div>
      </dialog>

      {/* MODAL 1: RPT005 Báo cáo thiếu tồn & Sửa số lượng */}
      <Rpt005Modal
        isOpen={isRpt005Open}
        onClose={handleCloseRpt005Modal}
        appliedFilters={filterForm}
        onOrderUpdated={refresh}
      />

      {/* MODAL 2: Biểu mẫu tạo đơn đặt hàng bán BH_BM1 */}
      <CreateSalesOrderModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onOrderCreated={refresh}
      />
    </div>
  );
};

export default SalesOrderList;