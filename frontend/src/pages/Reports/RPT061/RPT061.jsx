import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Printer,
  Calendar,
  Search,
  RotateCw,
  FileSpreadsheet,
  Package,
  DollarSign,
  Gift,
  Filter
} from 'lucide-react';
import { getReportRpt061, exportReportRpt061 } from '../../../services/api';
import './RPT061.css';

const formatMoney = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(val) || 0) + ' đ';

const formatNumber = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(val) || 0);

export default function RPT061() {
  const [datePreset, setDatePreset] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineItems, setLineItems] = useState([]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Tính khoảng ngày theo Preset
  const computeDateRange = (preset) => {
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'today') {
      const d = now.toISOString().split('T')[0];
      start = d;
      end = d;
    } else if (preset === 'last_7_days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      start = past.toISOString().split('T')[0];
      end = now.toISOString().split('T')[0];
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    } else if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    }
    return { start, end };
  };

  useEffect(() => {
    if (datePreset !== 'custom') {
      const { start, end } = computeDateRange(datePreset);
      setStartDate(start);
      setEndDate(end);
    }
  }, [datePreset]);

  // Fetch dữ liệu dòng hàng
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(statusFilter && { status: statusFilter })
      };
      const res = await getReportRpt061(params);
      setLineItems(res.data || res || []);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Không thể tải báo cáo dòng hàng RPT061');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, statusFilter]);

  // Lọc theo từ khóa tìm kiếm
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return lineItems;
    const term = searchTerm.toLowerCase().trim();

    return lineItems.filter(
      (item) =>
        (item.orderCode && item.orderCode.toLowerCase().includes(term)) ||
        (item.sku && item.sku.toLowerCase().includes(term)) ||
        (item.productName && item.productName.toLowerCase().includes(term)) ||
        (item.retailerName && item.retailerName.toLowerCase().includes(term)) ||
        (item.retailerCode && item.retailerCode.toLowerCase().includes(term)) ||
        (item.vnbhName && item.vnbhName.toLowerCase().includes(term))
    );
  }, [lineItems, searchTerm]);

  // Phân trang dữ liệu
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  // Thống kê tổng quan
  const summary = useMemo(() => {
    const totalLines = filteredList.length;
    const totalQuantity = filteredList.reduce((s, it) => s + Number(it.quantity || 0), 0);
    const totalAmount = filteredList.reduce((s, it) => s + Number(it.totalAmount || 0), 0);
    const promoCount = filteredList.filter((it) => it.isPromotion).length;
    return { totalLines, totalQuantity, totalAmount, promoCount };
  }, [filteredList]);

  const handleExportExcel = () => {
    exportReportRpt061({
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(statusFilter && { status: statusFilter })
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-container rpt061-page">
      {/* 1. Header Toolbar */}
      <div className="report-header">
        <div className="report-title-section">
          <h2>RPT061 - Báo cáo Chi tiết Dòng hàng Bán (Line Item)</h2>
          <p>Bảng kê chi tiết từng mặt hàng xuất bán, giá bán, chiết khấu và doanh thu đối soát</p>
        </div>
        <div className="report-actions">
          <button className="btn-secondary" onClick={fetchReport} title="Làm mới" disabled={loading}>
            <RotateCw size={15} className={loading ? 'spin-icon' : ''} /> Làm mới
          </button>
          <button className="btn-secondary" onClick={handlePrint} title="In bảng kê">
            <Printer size={15} /> In bảng kê
          </button>
          <button className="btn-primary" onClick={handleExportExcel} title="Tải file Excel đầy đủ">
            <Download size={15} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-icon blue">
            <DollarSign size={22} />
          </div>
          <div>
            <h4 className="summary-card-title">Tổng Doanh số Dòng hàng (VNĐ)</h4>
            <p className="summary-card-value">{formatMoney(summary.totalAmount)}</p>
          </div>
        </div>

        <div className="summary-card green">
          <div className="summary-card-icon green">
            <Package size={22} />
          </div>
          <div>
            <h4 className="summary-card-title">Tổng Sản lượng Xuất bán</h4>
            <p className="summary-card-value">
              {formatNumber(summary.totalQuantity)} <span className="unit-label">Thùng</span>
            </p>
          </div>
        </div>

        <div className="summary-card purple">
          <div className="summary-card-icon purple">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h4 className="summary-card-title">Tổng Số Dòng Hàng</h4>
            <p className="summary-card-value">
              {formatNumber(summary.totalLines)} <span className="unit-label">Dòng</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filters Toolbar */}
      <div className="filters-card">
        <div className="filter-group">
          <label>Khoảng thời gian</label>
          <div className="filter-input-wrap">
            <Calendar size={16} className="filter-icon" />
            <select
              className="filter-select"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
            >
              <option value="today">Hôm nay</option>
              <option value="last_7_days">7 ngày gần nhất</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="custom">Tùy chỉnh...</option>
            </select>
          </div>
        </div>

        {datePreset === 'custom' && (
          <>
            <div className="filter-group">
              <label>Từ ngày</label>
              <input
                type="date"
                className="filter-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Đến ngày</label>
              <input
                type="date"
                className="filter-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="filter-group">
          <label>Trạng thái đơn</label>
          <div className="filter-input-wrap">
            <Filter size={16} className="filter-icon" />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="CONFIRMED">Đã duyệt (CONFIRMED)</option>
              <option value="ALLOCATED">Đã phân bổ kho (ALLOCATED)</option>
              <option value="DELIVERING">Đang giao hàng (DELIVERING)</option>
              <option value="DELIVERED">Đã giao hàng (DELIVERED)</option>
              <option value="INVOICED">Đã xuất hóa đơn (INVOICED)</option>
              <option value="COMPLETED">Hoàn tất (COMPLETED)</option>
            </select>
          </div>
        </div>

        <div className="filter-group search-group">
          <label>Tìm kiếm nhanh</label>
          <div className="filter-input-wrap">
            <Search size={16} className="filter-icon" />
            <input
              type="text"
              placeholder="Tìm mã SO, mã SKU, tên SP, đại lý, nhân viên..."
              className="filter-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="table-card">
        {error && <div className="rpt-error-box">{error}</div>}

        {loading ? (
          <div className="rpt-loading-state">
            <RotateCw size={28} className="spin-icon" />
            <p>Đang tải chi tiết dòng hàng...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rpt-empty-state">
            <FileSpreadsheet size={48} color="#94a3b8" />
            <h4>Không có dòng hàng nào phù hợp</h4>
            <p>Vui lòng thay đổi khoảng thời gian hoặc từ khóa lọc</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>STT</th>
                    <th style={{ width: '130px' }}>Mã Đơn (SO)</th>
                    <th style={{ width: '100px' }} className="text-center">Ngày Đặt</th>
                    <th>Khách Hàng / Đại Lý</th>
                    <th style={{ width: '130px' }}>Nhân Viên (VNBH)</th>
                    <th style={{ width: '110px' }}>Mã SKU</th>
                    <th>Tên Sản Phẩm</th>
                    <th style={{ width: '80px' }} className="text-center">ĐVT</th>
                    <th style={{ width: '80px' }} className="text-right">SL</th>
                    <th style={{ width: '110px' }} className="text-right">Đơn Giá</th>
                    <th style={{ width: '130px' }} className="text-right">Thành Tiền</th>
                    <th style={{ width: '130px' }}>Lô Xuất Kho</th>
                    <th style={{ width: '110px' }} className="text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((row, idx) => (
                    <tr key={idx} className={row.isPromotion ? 'promo-row' : ''}>
                      <td className="text-center">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td>
                        <span className="order-code-tag">{row.orderCode}</span>
                      </td>
                      <td className="text-center text-slate-600 text-sm">{row.orderDate}</td>
                      <td>
                        <div className="retailer-name-cell font-semibold text-slate-800">{row.retailerName}</div>
                        {row.retailerCode && <span className="text-xs text-slate-600">[{row.retailerCode}]</span>}
                      </td>
                      <td className="text-slate-600 text-sm">{row.vnbhName || 'Chưa gán'}</td>
                      <td>
                        <span className="sku-tag">{row.sku}</span>
                      </td>
                      <td>
                        <div className="font-medium text-slate-800">{row.productName}</div>
                        {row.isPromotion && (
                          <span className="promo-badge">
                            <Gift size={12} /> Hàng tặng 0đ
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="unit-badge">{row.unit || 'THÙNG'}</span>
                      </td>
                      <td className="text-right font-bold">{formatNumber(row.quantity)}</td>
                      <td className="text-right text-slate-600">
                        {row.isPromotion ? '0 đ' : formatMoney(row.unitPrice)}
                      </td>
                      <td className="text-right font-bold text-blue-700">
                        {row.isPromotion ? '0 đ' : formatMoney(row.totalAmount)}
                      </td>
                      <td className="text-sm text-slate-600">{row.allocatedLots || 'Chưa phân bổ'}</td>
                      <td className="text-center">
                        <span className={`status-pill status-${(row.status || '').toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-total-row">
                    <td colSpan={8} className="text-right font-bold">
                      TỔNG CỘNG ({filteredList.length} dòng):
                    </td>
                    <td className="text-right font-bold text-emerald-700">
                      {formatNumber(summary.totalQuantity)}
                    </td>
                    <td />
                    <td className="text-right font-bold text-blue-800">
                      {formatMoney(summary.totalAmount)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="rpt-pagination">
                <span className="pagination-info">
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredList.length)} trong tổng số {filteredList.length} dòng
                </span>
                <div className="pagination-buttons">
                  <button
                    className="btn-page"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>
                  <span className="page-current">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    className="btn-page"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
