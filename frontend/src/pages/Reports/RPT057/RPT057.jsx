import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Printer,
  Calendar,
  Package,
  Store,
  Users,
  Search,
  RotateCw,
  TrendingUp,
  ShoppingCart,
  Percent
} from 'lucide-react';
import { getReportRpt057, exportReportRpt057 } from '../../../services/api';
import './RPT057.css';

const formatMoney = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(val) || 0) + ' đ';

const formatNumber = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(val) || 0);

export default function RPT057() {
  const [dimension, setDimension] = useState('product'); // 'product' | 'retailer' | 'vnbh'
  const [datePreset, setDatePreset] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    summary: {
      totalRevenue: 0,
      totalVolume: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      uniqueProducts: 0,
      uniqueRetailers: 0
    },
    data: []
  });

  // Tính toán khoảng ngày theo Preset
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
    } else if (preset === 'last_30_days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
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
    } else if (preset === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const lastDay = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
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

  // Fetch dữ liệu báo cáo
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        dimension,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };
      const res = await getReportRpt057(params);
      setReportData({
        summary: res.summary || {
          totalRevenue: 0,
          totalVolume: 0,
          totalOrders: 0,
          averageOrderValue: 0
        },
        data: res.data || []
      });
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu báo cáo RPT057');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dimension, startDate, endDate]);

  // Lọc dữ liệu hiển thị theo ô tìm kiếm
  const filteredList = useMemo(() => {
    const list = reportData.data || [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();

    return list.filter((item) => {
      if (dimension === 'product') {
        return (
          (item.sku && item.sku.toLowerCase().includes(term)) ||
          (item.productName && item.productName.toLowerCase().includes(term))
        );
      } else if (dimension === 'retailer') {
        return (
          (item.retailerCode && item.retailerCode.toLowerCase().includes(term)) ||
          (item.retailerName && item.retailerName.toLowerCase().includes(term)) ||
          (item.address && item.address.toLowerCase().includes(term))
        );
      } else {
        return (
          (item.vnbhCode && item.vnbhCode.toLowerCase().includes(term)) ||
          (item.vnbhName && item.vnbhName.toLowerCase().includes(term))
        );
      }
    });
  }, [reportData.data, searchTerm, dimension]);

  const handleExportExcel = () => {
    exportReportRpt057({
      dimension,
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-container rpt057-page">
      {/* 1. Header Toolbar */}
      <div className="report-header">
        <div className="report-title-section">
          <h2>RPT057 - Báo cáo Doanh số & Sản lượng</h2>
          <p>Dữ liệu doanh số bán hàng thực tế và phân tích sản lượng đa chiều của Nhà Phân Phối</p>
        </div>
        <div className="report-actions">
          <button className="btn-secondary" onClick={fetchReport} title="Làm mới dữ liệu" disabled={loading}>
            <RotateCw size={15} className={loading ? 'spin-icon' : ''} /> Làm mới
          </button>
          <button className="btn-secondary" onClick={handlePrint} title="In bảng báo cáo">
            <Printer size={15} /> In báo cáo
          </button>
          <button className="btn-primary" onClick={handleExportExcel} title="Tải file Excel mẫu chuẩn">
            <Download size={15} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-icon blue">
            <TrendingUp size={22} />
          </div>
          <div>
            <h4 className="summary-card-title">Tổng Doanh số thuần (VNĐ)</h4>
            <p className="summary-card-value">{formatMoney(reportData.summary.totalRevenue)}</p>
          </div>
        </div>

        <div className="summary-card green">
          <div className="summary-card-icon green">
            <Package size={22} />
          </div>
          <div>
            <h4 className="summary-card-title">Tổng Sản lượng xuất bán</h4>
            <p className="summary-card-value">
              {formatNumber(reportData.summary.totalVolume)} <span className="unit-label">Thùng</span>
            </p>
          </div>
        </div>

        <div className="summary-card orange">
          <div className="summary-card-icon orange">
            <ShoppingCart size={22} />
          </div>
          <div>
            <h4 className="summary-card-title">Số Đơn hàng Thành công</h4>
            <p className="summary-card-value">
              {formatNumber(reportData.summary.totalOrders)} <span className="unit-label">Đơn</span>
            </p>
          </div>
        </div>

        <div className="summary-card purple">
          <div className="summary-card-icon purple">
            <Percent size={22} />
          </div>
          <div>
            <h4 className="summary-card-title">Giá trị TB / Đơn (AOV)</h4>
            <p className="summary-card-value">{formatMoney(reportData.summary.averageOrderValue)}</p>
          </div>
        </div>
      </div>

      {/* 3. Dimension Tabs & Filters Toolbar */}
      <div className="rpt-control-panel">
        <div className="rpt-tabs">
          <button
            className={`rpt-tab-btn ${dimension === 'product' ? 'active' : ''}`}
            onClick={() => setDimension('product')}
          >
            <Package size={16} /> Theo Mặt hàng (SKU)
          </button>
          <button
            className={`rpt-tab-btn ${dimension === 'retailer' ? 'active' : ''}`}
            onClick={() => setDimension('retailer')}
          >
            <Store size={16} /> Theo Khách hàng / Đại lý
          </button>
          <button
            className={`rpt-tab-btn ${dimension === 'vnbh' ? 'active' : ''}`}
            onClick={() => setDimension('vnbh')}
          >
            <Users size={16} /> Theo Nhân viên Bán hàng (VNBH)
          </button>
        </div>

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
                <option value="this_quarter">Quý này</option>
                <option value="last_30_days">30 ngày qua</option>
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

          <div className="filter-group search-group">
            <label>Tìm kiếm nhanh</label>
            <div className="filter-input-wrap">
              <Search size={16} className="filter-icon" />
              <input
                type="text"
                placeholder={
                  dimension === 'product'
                    ? 'Tìm tên SKU, mã sản phẩm...'
                    : dimension === 'retailer'
                    ? 'Tìm tên đại lý, mã KH, địa chỉ...'
                    : 'Tìm tên hoặc mã nhân viên...'
                }
                className="filter-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="table-card">
        {error && <div className="rpt-error-box">{error}</div>}

        {loading ? (
          <div className="rpt-loading-state">
            <RotateCw size={28} className="spin-icon" />
            <p>Đang tải và tổng hợp dữ liệu doanh số...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rpt-empty-state">
            <Package size={48} color="#94a3b8" />
            <h4>Không có dữ liệu bán hàng trong kỳ này</h4>
            <p>Vui lòng thay đổi khoảng thời gian hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                {dimension === 'product' && (
                  <tr>
                    <th style={{ width: '50px' }}>STT</th>
                    <th style={{ width: '120px' }}>Mã SKU</th>
                    <th>Tên Sản Phẩm</th>
                    <th style={{ width: '90px' }} className="text-center">ĐVT</th>
                    <th style={{ width: '110px' }} className="text-right">Số đơn đặt</th>
                    <th style={{ width: '130px' }} className="text-right">Sản lượng bán</th>
                    <th style={{ width: '140px' }} className="text-right">Đơn giá BQ</th>
                    <th style={{ width: '160px' }} className="text-right">Doanh số (VNĐ)</th>
                    <th style={{ width: '140px' }}>Tỷ trọng (%)</th>
                  </tr>
                )}

                {dimension === 'retailer' && (
                  <tr>
                    <th style={{ width: '50px' }}>STT</th>
                    <th style={{ width: '120px' }}>Mã Đại Lý</th>
                    <th>Tên Khách Hàng / Điểm Bán</th>
                    <th>Địa chỉ / Khu vực</th>
                    <th style={{ width: '120px' }}>Điện thoại</th>
                    <th style={{ width: '100px' }} className="text-right">Số đơn</th>
                    <th style={{ width: '120px' }} className="text-right">Sản lượng (Thùng)</th>
                    <th style={{ width: '160px' }} className="text-right">Doanh số (VNĐ)</th>
                    <th style={{ width: '140px' }}>Tỷ trọng (%)</th>
                  </tr>
                )}

                {dimension === 'vnbh' && (
                  <tr>
                    <th style={{ width: '50px' }}>STT</th>
                    <th style={{ width: '140px' }}>Mã Nhân Viên</th>
                    <th>Họ Tên Nhân Viên (VNBH)</th>
                    <th style={{ width: '120px' }} className="text-right">Số đơn chốt</th>
                    <th style={{ width: '140px' }} className="text-right">Sản lượng bán (Thùng)</th>
                    <th style={{ width: '170px' }} className="text-right">Doanh số (VNĐ)</th>
                    <th style={{ width: '150px' }}>Tỷ trọng (%)</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {filteredList.map((row, idx) => (
                  <tr key={idx}>
                    <td className="text-center">{idx + 1}</td>

                    {dimension === 'product' && (
                      <>
                        <td>
                          <span className="sku-tag">{row.sku}</span>
                        </td>
                        <td className="font-semibold text-slate-800">{row.productName}</td>
                        <td className="text-center">
                          <span className="unit-badge">{row.unit || 'Thùng'}</span>
                        </td>
                        <td className="text-right">{formatNumber(row.orderCount)}</td>
                        <td className="text-right font-medium">{formatNumber(row.totalQuantity)}</td>
                        <td className="text-right text-slate-600">{formatMoney(row.avgPrice)}</td>
                        <td className="text-right font-bold text-blue-700">{formatMoney(row.totalAmount)}</td>
                        <td>
                          <div className="share-cell">
                            <div className="share-bar-wrap">
                              <div
                                className="share-bar-fill"
                                style={{ width: `${Math.min(100, row.revenueShare || 0)}%` }}
                              />
                            </div>
                            <span className="share-text">{row.revenueShare}%</span>
                          </div>
                        </td>
                      </>
                    )}

                    {dimension === 'retailer' && (
                      <>
                        <td>
                          <span className="sku-tag">{row.retailerCode}</span>
                        </td>
                        <td className="font-semibold text-slate-800">{row.retailerName}</td>
                        <td className="text-slate-600 text-sm">{row.address || 'Chưa cập nhật'}</td>
                        <td className="text-slate-600">{row.phone || 'N/A'}</td>
                        <td className="text-right">{formatNumber(row.orderCount)}</td>
                        <td className="text-right font-medium">{formatNumber(row.totalQuantity)}</td>
                        <td className="text-right font-bold text-blue-700">{formatMoney(row.totalAmount)}</td>
                        <td>
                          <div className="share-cell">
                            <div className="share-bar-wrap">
                              <div
                                className="share-bar-fill green"
                                style={{ width: `${Math.min(100, row.revenueShare || 0)}%` }}
                              />
                            </div>
                            <span className="share-text">{row.revenueShare}%</span>
                          </div>
                        </td>
                      </>
                    )}

                    {dimension === 'vnbh' && (
                      <>
                        <td>
                          <span className="sku-tag">{row.vnbhCode}</span>
                        </td>
                        <td className="font-semibold text-slate-800">{row.vnbhName}</td>
                        <td className="text-right">{formatNumber(row.totalOrders || row.orderCount)}</td>
                        <td className="text-right font-medium">{formatNumber(row.totalQuantity)}</td>
                        <td className="text-right font-bold text-blue-700">{formatMoney(row.totalAmount)}</td>
                        <td>
                          <div className="share-cell">
                            <div className="share-bar-wrap">
                              <div
                                className="share-bar-fill purple"
                                style={{ width: `${Math.min(100, row.revenueShare || 0)}%` }}
                              />
                            </div>
                            <span className="share-text">{row.revenueShare}%</span>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="table-total-row">
                  <td colSpan={dimension === 'retailer' ? 5 : dimension === 'vnbh' ? 3 : 4} className="text-right font-bold">
                    TỔNG CỘNG ({filteredList.length} dòng):
                  </td>
                  <td className="text-right font-bold">
                    {formatNumber(filteredList.reduce((s, r) => s + Number(r.orderCount || r.totalOrders || 0), 0))}
                  </td>
                  <td className="text-right font-bold">
                    {formatNumber(filteredList.reduce((s, r) => s + Number(r.totalQuantity || 0), 0))}
                  </td>
                  {dimension === 'product' && <td />}
                  <td className="text-right font-bold text-blue-800">
                    {formatMoney(filteredList.reduce((s, r) => s + Number(r.totalAmount || 0), 0))}
                  </td>
                  <td className="text-center font-bold">
                    {filteredList.reduce((s, r) => s + Number(r.revenueShare || 0), 0).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
