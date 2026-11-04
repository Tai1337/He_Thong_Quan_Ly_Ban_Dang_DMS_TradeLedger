import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Calendar, 
  Warehouse as WarehouseIcon, 
  FileText, 
  Package, 
  Layers, 
  Tag, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { getInventoryTransactions, exportInventoryTransactions, getWarehouses } from '../../../services/api';
import './InventoryTransactions.css';

export default function InventoryTransactions() {
  // Master states
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalInQty: 0,
    totalInCount: 0,
    totalOutQty: 0,
    totalOutCount: 0,
  });

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [warehouseId, setWarehouseId] = useState('');
  const [direction, setDirection] = useState(''); // '' | 'IN' | 'OUT'
  const [referenceType, setReferenceType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | '7DAYS' | 'THIS_MONTH' | 'CUSTOM'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Transaction detail modal
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load warehouses
  useEffect(() => {
    getWarehouses(1)
      .then((data) => setWarehouses(Array.isArray(data) ? data : data.data || []))
      .catch((err) => console.error('Lỗi tải danh sách kho:', err));
  }, []);

  // Handle Date Presets
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === '7DAYS') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 7);
      setFromDate(past7.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstDay.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    } else if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    }
  };

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInventoryTransactions({
        distributorId: 1,
        page,
        limit,
        warehouseId: warehouseId || undefined,
        direction: direction || undefined,
        referenceType: referenceType || undefined,
        search: debouncedSearch || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      setTransactions(res.data || []);
      setSummary(res.summary || {
        totalTransactions: 0,
        totalInQty: 0,
        totalInCount: 0,
        totalOutQty: 0,
        totalOutCount: 0,
      });
      if (res.pagination) {
        setTotal(res.pagination.total || 0);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Lỗi khi tải giao dịch kho:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, warehouseId, direction, referenceType, debouncedSearch, fromDate, toDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Export Excel
  const handleExportExcel = () => {
    exportInventoryTransactions({
      distributorId: 1,
      warehouseId: warehouseId || undefined,
      direction: direction || undefined,
      referenceType: referenceType || undefined,
      search: debouncedSearch || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    setWarehouseId('');
    setDirection('');
    setReferenceType('');
    setSearchTerm('');
    setDebouncedSearch('');
    setDatePreset('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const getReferenceLabel = (type) => {
    switch (type) {
      case 'PURCHASE_ORDER':
        return { label: 'Nhập mua hàng NCC', color: '#0284c7', bg: '#f0f9ff' };
      case 'SALES_ORDER':
        return { label: 'Xuất kho bán hàng', color: '#ea580c', bg: '#fff7ed' };
      case 'INVENTORY_COUNT':
        return { label: 'Cân đối kiểm kê', color: '#7c3aed', bg: '#f5f3ff' };
      case 'INVENTORY_ADJUSTMENT':
        return { label: 'Điều chỉnh kho', color: '#d97706', bg: '#fffbeb' };
      case 'STOCK_TRANSFER':
        return { label: 'Điều chuyển kho', color: '#059669', bg: '#ecfdf5' };
      case 'PURCHASE_RETURN':
        return { label: 'Trả hàng NCC', color: '#dc2626', bg: '#fef2f2' };
      default:
        return { label: type || 'Thủ công', color: '#64748b', bg: '#f8fafc' };
    }
  };

  const netQty = summary.totalInQty - summary.totalOutQty;

  return (
    <div className="inventory-transactions-page">
      {/* 1. Header Toolbar */}
      <div className="it-header-toolbar">
        <div className="it-header-left">
          <div className="it-breadcrumb">
            <span>Tồn kho</span>
            <span className="it-slash">/</span>
            <span className="current">Nhật Ký Giao Dịch Kho</span>
          </div>
          <h1 className="it-page-title">Sổ Nhật Ký Giao Dịch Xuất Nhập Kho</h1>
          <p className="it-page-desc">
            Theo dõi chi tiết toàn bộ dòng luân chuyển hàng hoá (FEFO, Số Lô, Đơn vị tính, Chứng từ gốc PO/SO)
          </p>
        </div>

        <div className="it-header-actions">
          <button 
            type="button" 
            className="it-btn outline"
            onClick={fetchTransactions}
            title="Tải lại danh sách"
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Làm mới</span>
          </button>

          <button 
            type="button" 
            className="it-btn export-btn"
            onClick={handleExportExcel}
            title="Xuất Excel sổ thẻ kho"
          >
            <Download size={15} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="it-kpi-grid">
        <div className="it-kpi-card">
          <div className="kpi-icon-wrap neutral">
            <FileText size={20} color="#0284c7" />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Tổng giao dịch ghi nhận</span>
            <div className="kpi-value-row">
              <strong className="kpi-number">{summary.totalTransactions.toLocaleString('vi-VN')}</strong>
              <span className="kpi-sub-text">lượt biến động</span>
            </div>
          </div>
        </div>

        <div className="it-kpi-card in-card">
          <div className="kpi-icon-wrap in">
            <ArrowDownLeft size={22} color="#059669" />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Tổng sản lượng NHẬP (IN)</span>
            <div className="kpi-value-row">
              <strong className="kpi-number in-text">+{summary.totalInQty.toLocaleString('vi-VN')}</strong>
              <span className="kpi-unit-tag">thùng/quy cách</span>
            </div>
            <span className="kpi-count-note">Ghi nhận từ {summary.totalInCount} lượt nhập</span>
          </div>
        </div>

        <div className="it-kpi-card out-card">
          <div className="kpi-icon-wrap out">
            <ArrowUpRight size={22} color="#dc2626" />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Tổng sản lượng XUẤT (OUT)</span>
            <div className="kpi-value-row">
              <strong className="kpi-number out-text">-{summary.totalOutQty.toLocaleString('vi-VN')}</strong>
              <span className="kpi-unit-tag">thùng/quy cách</span>
            </div>
            <span className="kpi-count-note">Ghi nhận từ {summary.totalOutCount} lượt xuất</span>
          </div>
        </div>

        <div className="it-kpi-card net-card">
          <div className="kpi-icon-wrap net">
            {netQty >= 0 ? (
              <TrendingUp size={22} color="#059669" />
            ) : (
              <TrendingDown size={22} color="#ea580c" />
            )}
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Biến động ròng (Tăng / Giảm kho)</span>
            <div className="kpi-value-row">
              <strong className={`kpi-number ${netQty >= 0 ? 'in-text' : 'out-text'}`}>
                {netQty > 0 ? `+${netQty.toLocaleString('vi-VN')}` : netQty.toLocaleString('vi-VN')}
              </strong>
              <span className="kpi-unit-tag">thùng</span>
            </div>
            <span className="kpi-count-note">
              {netQty >= 0 ? 'Tồn kho ròng tăng trong kỳ' : 'Tồn kho ròng giảm trong kỳ'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Section */}
      <div className="it-filter-card">
        <div className="it-filter-top-row">
          <div className="it-search-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text"
              placeholder="Tìm theo Mã GD (TXN-...), Tên sản phẩm, Mã SKU hoặc Số Lô (Lot)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button" 
                className="it-search-clear"
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="it-filter-dropdowns">
            {/* Warehouse select */}
            <select
              value={warehouseId}
              onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
              className="it-select"
            >
              <option value="">Tất cả kho hàng</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>

            {/* Direction select */}
            <select
              value={direction}
              onChange={(e) => { setDirection(e.target.value); setPage(1); }}
              className="it-select"
            >
              <option value="">Chiều giao dịch: Tất cả</option>
              <option value="IN">🟢 Nhập kho (IN)</option>
              <option value="OUT">🔴 Xuất kho (OUT)</option>
            </select>

            {/* Reference Type select */}
            <select
              value={referenceType}
              onChange={(e) => { setReferenceType(e.target.value); setPage(1); }}
              className="it-select"
            >
              <option value="">Tất cả loại nghiệp vụ</option>
              <option value="PURCHASE_ORDER">Nhập mua hàng NCC (PO)</option>
              <option value="SALES_ORDER">Xuất kho bán hàng (SO)</option>
              <option value="INVENTORY_COUNT">Cân đối kiểm kê kho</option>
              <option value="INVENTORY_ADJUSTMENT">Điều chỉnh tồn kho</option>
              <option value="STOCK_TRANSFER">Điều chuyển kho</option>
              <option value="PURCHASE_RETURN">Trả hàng NCC</option>
            </select>
          </div>
        </div>

        {/* Date presets row */}
        <div className="it-filter-date-row">
          <div className="it-preset-chips">
            <span className="it-preset-label">Thời gian:</span>
            <button
              type="button"
              className={`it-date-chip ${datePreset === 'ALL' ? 'active' : ''}`}
              onClick={() => applyDatePreset('ALL')}
            >
              Tất cả thời gian
            </button>
            <button
              type="button"
              className={`it-date-chip ${datePreset === 'TODAY' ? 'active' : ''}`}
              onClick={() => applyDatePreset('TODAY')}
            >
              Hôm nay
            </button>
            <button
              type="button"
              className={`it-date-chip ${datePreset === '7DAYS' ? 'active' : ''}`}
              onClick={() => applyDatePreset('7DAYS')}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              className={`it-date-chip ${datePreset === 'THIS_MONTH' ? 'active' : ''}`}
              onClick={() => applyDatePreset('THIS_MONTH')}
            >
              Tháng này
            </button>
            <button
              type="button"
              className={`it-date-chip ${datePreset === 'CUSTOM' ? 'active' : ''}`}
              onClick={() => setDatePreset('CUSTOM')}
            >
              Tùy chọn ngày
            </button>
          </div>

          {datePreset === 'CUSTOM' && (
            <div className="it-custom-date-inputs">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="it-date-input"
              />
              <span className="it-date-dash">đến</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="it-date-input"
              />
            </div>
          )}

          {(warehouseId || direction || referenceType || searchTerm || fromDate || toDate) && (
            <button
              type="button"
              className="it-reset-btn"
              onClick={handleResetFilters}
            >
              <X size={13} />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Transactions Data Table */}
      <div className="it-table-card">
        <div className="it-table-wrap">
          <table className="it-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                <th style={{ width: '135px' }}>Thời gian</th>
                <th style={{ width: '150px' }}>Mã giao dịch</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Chiều GD</th>
                <th style={{ width: '170px' }}>Loại nghiệp vụ</th>
                <th style={{ width: '140px' }}>Chứng từ gốc</th>
                <th style={{ minWidth: '220px' }}>Sản phẩm & Quy cách</th>
                <th style={{ width: '130px' }}>Số Lô (Lot)</th>
                <th style={{ width: '110px' }}>Hạn dùng</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Số lượng</th>
                <th style={{ width: '140px' }}>Kho bãi</th>
                <th style={{ width: '130px' }}>Người tạo</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Xem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" className="it-table-loading">
                    <RefreshCw size={24} className="spin-icon" color="#059669" />
                    <span>Đang tải dữ liệu giao dịch kho...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="13" className="it-table-empty">
                    <AlertCircle size={32} color="#94a3b8" />
                    <strong>Chưa có giao dịch xuất nhập kho nào phù hợp</strong>
                    <p>Hãy thử thay đổi điều kiện lọc hoặc thời gian tìm kiếm.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((t, index) => {
                  const isIN = t.direction === 'IN';
                  const refMeta = getReferenceLabel(t.referenceType);
                  const d = t.createdAt ? new Date(t.createdAt) : null;
                  const expDate = t.stockLot?.expiryDate ? new Date(t.stockLot.expiryDate) : null;

                  return (
                    <tr key={t.id} className="it-row" onClick={() => setSelectedTxn(t)}>
                      <td style={{ textAlign: 'center' }} className="it-cell-stt">
                        {(page - 1) * limit + index + 1}
                      </td>

                      <td className="it-cell-time">
                        {d ? (
                          <>
                            <strong>{d.toLocaleDateString('vi-VN')}</strong>
                            <small>{d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
                          </>
                        ) : '—'}
                      </td>

                      <td className="it-cell-code">
                        <span className="txn-code-pill">{t.transactionCode}</span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className={`direction-badge ${isIN ? 'in' : 'out'}`}>
                          {isIN ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                          {isIN ? 'NHẬP' : 'XUẤT'}
                        </span>
                      </td>

                      <td>
                        <span 
                          className="ref-type-pill" 
                          style={{ color: refMeta.color, backgroundColor: refMeta.bg }}
                        >
                          {refMeta.label}
                        </span>
                      </td>

                      <td>
                        {t.referenceCode ? (
                          <span className="ref-code-link" title={`Chứng từ tham chiếu: ${t.referenceCode}`}>
                            {t.referenceCode}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td className="it-cell-product">
                        <div className="product-title-line">
                          <strong className="sku-tag">{t.product.sku}</strong>
                          <span className="prod-name" title={t.product.name}>{t.product.name}</span>
                        </div>
                        <span className="prod-unit-meta">
                          Quy cách: {t.product.unit || 'Thùng'} 
                          {t.product.conversionRate > 1 && ` (${t.product.conversionRate} ${t.product.retailUnit || 'lẻ'})`}
                        </span>
                      </td>

                      <td>
                        <span className="lot-number-pill">{t.stockLot.lotNumber || 'MẶC ĐỊNH'}</span>
                      </td>

                      <td className="it-cell-exp">
                        {expDate ? expDate.toLocaleDateString('vi-VN') : '—'}
                      </td>

                      <td style={{ textAlign: 'right' }} className="it-cell-qty">
                        <strong className={`qty-val ${isIN ? 'qty-in' : 'qty-out'}`}>
                          {isIN ? `+${t.quantity.toLocaleString('vi-VN')}` : `-${t.quantity.toLocaleString('vi-VN')}`}
                        </strong>
                        <span className="qty-unit">{t.product.unit || 'thùng'}</span>
                      </td>

                      <td>
                        <span className="warehouse-name-tag">{t.warehouse.name}</span>
                      </td>

                      <td>
                        <span className="created-by-name">{t.createdBy.fullName || 'Hệ thống'}</span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="it-action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxn(t);
                          }}
                          title="Xem chi tiết giao dịch"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        <div className="it-pagination-bar">
          <div className="it-pagination-info">
            <span>Hiển thị <strong>{transactions.length}</strong> / <strong>{total}</strong> giao dịch</span>
            <div className="it-limit-selector">
              <span>Mỗi trang:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="it-pagination-controls">
            <button
              type="button"
              className="it-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
              <span>Trước</span>
            </button>

            <span className="it-page-display">
              Trang <strong>{page}</strong> / {totalPages || 1}
            </span>

            <button
              type="button"
              className="it-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <span>Sau</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Transaction Detail Modal */}
      {selectedTxn && (
        <div className="it-modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="it-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="it-modal-header">
              <div className="it-modal-title-cluster">
                <span className={`direction-badge large ${selectedTxn.direction === 'IN' ? 'in' : 'out'}`}>
                  {selectedTxn.direction === 'IN' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                  {selectedTxn.direction === 'IN' ? 'GIAO DỊCH NHẬP KHO' : 'GIAO DỊCH XUẤT KHO'}
                </span>
                <h3 className="it-modal-title">{selectedTxn.transactionCode}</h3>
              </div>
              <button 
                type="button" 
                className="it-modal-close"
                onClick={() => setSelectedTxn(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="it-modal-body">
              <div className="modal-info-grid">
                <div className="info-block">
                  <span className="info-lbl">Thời gian thực hiện</span>
                  <strong className="info-val">
                    {new Date(selectedTxn.createdAt).toLocaleDateString('vi-VN')} {new Date(selectedTxn.createdAt).toLocaleTimeString('vi-VN')}
                  </strong>
                </div>

                <div className="info-block">
                  <span className="info-lbl">Loại nghiệp vụ</span>
                  <span 
                    className="ref-type-pill" 
                    style={getReferenceLabel(selectedTxn.referenceType)}
                  >
                    {getReferenceLabel(selectedTxn.referenceType).label}
                  </span>
                </div>

                <div className="info-block">
                  <span className="info-lbl">Mã chứng từ tham chiếu</span>
                  <strong className="info-val text-primary">{selectedTxn.referenceCode || '—'}</strong>
                </div>

                <div className="info-block">
                  <span className="info-lbl">Kho bãi phát sinh</span>
                  <strong className="info-val">{selectedTxn.warehouse.name} ({selectedTxn.warehouse.code})</strong>
                </div>

                <div className="info-block full-col">
                  <span className="info-lbl">Sản phẩm</span>
                  <div className="modal-product-box">
                    <strong className="mp-name">[{selectedTxn.product.sku}] {selectedTxn.product.name}</strong>
                    <span className="mp-cat">Ngành hàng: {selectedTxn.product.categoryName || 'Tiêu dùng'}</span>
                  </div>
                </div>

                <div className="info-block">
                  <span className="info-lbl">Số Lô (Lot Number)</span>
                  <strong className="info-val lot-highlight">{selectedTxn.stockLot.lotNumber || 'MẶC ĐỊNH'}</strong>
                </div>

                <div className="info-block">
                  <span className="info-lbl">Hạn sử dụng (Exp Date)</span>
                  <strong className="info-val">
                    {selectedTxn.stockLot.expiryDate 
                      ? new Date(selectedTxn.stockLot.expiryDate).toLocaleDateString('vi-VN') 
                      : 'Không xác định'}
                  </strong>
                </div>

                <div className="info-block">
                  <span className="info-lbl">Số lượng biến động</span>
                  <strong className={`info-val qty-val large ${selectedTxn.direction === 'IN' ? 'qty-in' : 'qty-out'}`}>
                    {selectedTxn.direction === 'IN' ? `+${selectedTxn.quantity}` : `-${selectedTxn.quantity}`} {selectedTxn.product.unit || 'thùng'}
                  </strong>
                </div>

                <div className="info-block">
                  <span className="info-lbl">Người thực hiện</span>
                  <strong className="info-val">{selectedTxn.createdBy.fullName || 'Hệ thống'} ({selectedTxn.createdBy.email || 'N/A'})</strong>
                </div>
              </div>
            </div>

            <div className="it-modal-footer">
              <button
                type="button"
                className="it-btn outline"
                onClick={() => setSelectedTxn(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

