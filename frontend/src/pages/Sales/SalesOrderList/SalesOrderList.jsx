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
  Info,
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
      alert('Vui lòng chọn ít nhất 1 đơn hàng đã xác nhận ("Chờ giao") để tạo chuyến xe.');
      return;
    }

    const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
    const nonAllocated = selectedOrders.filter(o => o.status !== 'ALLOCATED');
    
    if (nonAllocated.length > 0) {
      alert(`Có ${nonAllocated.length} đơn hàng được chọn chưa ở trạng thái "Chờ giao" (ALLOCATED). Vui lòng chỉ chọn các đơn hàng đã xác nhận đủ tồn để xếp chuyến xe.`);
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
            <Plus size={16} /> Tạo đơn bán hàng (BH_BM1)
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
                <option>[NPP-TEST] Nhà Phân Phối Test</option>
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
                  <Menu size={15} /> Thao tác <ChevronDown size={14} />
                </button>
                {isActionMenuOpen && (
                  <div className="list-action-dropdown" role="menu">
                    <button type="button" role="menuitem" onClick={handleCreateTripFromSelected}>
                      <Truck size={15} /> Tạo chuyến xe
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
                        {row.orderCode?.startsWith('R-') && (
                          <span style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }} title="Đơn hàng trực tuyến từ Web Bán Hàng">
                            Web Retailer
                          </span>
                        )}
                      </div>
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
