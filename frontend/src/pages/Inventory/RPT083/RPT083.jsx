import { useState } from 'react';
import {
  X,
  Search,
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { useInventoryRpt083 } from '../../../hooks/useInventoryRpt083';
import DmsSectionPanel from '../../../components/DmsUi/DmsSectionPanel';
import './RPT083.css';

const DEFAULT_FILTER_FORM = {
  warehouseId: '',
  status: '',
  lotNumber: '',
  searchProduct: '',
  stockFilter: '',
  dateType: '',
  fromDate: '',
  toDate: '',
  productType: '',
  locationName: ''
};

const RPT083 = ({ user }) => {
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [showLot, setShowLot] = useState(true);

  const distributorId = user?.distributorId || 1;
  const distributorName = user?.distributor
    ? `[${user.distributor.code}] ${user.distributor.name}`
    : '[NPP-TEST] Nhà Phân Phối Test';

  const [filterForm, setFilterForm] = useState(DEFAULT_FILTER_FORM);

  const {
    data,
    warehouses,
    loading,
    error,
    applyFilters,
    pagination,
    setLimit,
    setPage
  } = useInventoryRpt083({ distributorId });

  const handleFilterChange = (field, value) => {
    setFilterForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    applyFilters({
      ...filterForm,
      distributorId
    });
  };

  const handleReset = () => {
    setFilterForm(DEFAULT_FILTER_FORM);
    applyFilters({
      ...DEFAULT_FILTER_FORM,
      distributorId
    });
  };

  const handleExport = () => {
    const queryParams = new URLSearchParams({
      ...filterForm,
      distributorId
    }).toString();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const exportUrl = `${API_URL}/inventory/rpt083/export?${queryParams}`;
    window.open(exportUrl, '_blank');
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '';
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="rpt083-container">
      <div className="dms-page-title-bar">
        <div>
          <h2>Báo cáo Tồn kho NPP (RPT083)</h2>
          <p className="dms-page-subtitle">
            Theo dõi số lượng tồn chẵn/lẻ theo từng kho, lô hàng và hạn sử dụng FEFO
          </p>
        </div>

        <button
          type="button"
          className="dms-btn dms-btn-outline"
          onClick={() => setIsFilterVisible((prev) => !prev)}
        >
          {isFilterVisible ? <ChevronUp size={15} /> : <SlidersHorizontal size={15} />}
          <span>{isFilterVisible ? 'Thu gọn bộ lọc' : 'Mở bộ lọc'}</span>
        </button>
      </div>

      {isFilterVisible && (
        <DmsSectionPanel
          title="Tìm kiếm & Lọc tồn kho"
          actions={
            <>
              <button type="button" className="dms-btn dms-btn-outline" onClick={handleReset} title="Xoá bộ lọc">
                <RotateCcw size={14} />
                <span>Xoá lọc</span>
              </button>
              <button type="button" className="dms-btn dms-btn-steel" onClick={handleSearch}>
                <Search size={14} />
                <span>Tìm kiếm</span>
              </button>
            </>
          }
        >
          <div className="rpt083-filter-grid">
            <div className="rpt083-filter-field">
              <select defaultValue={distributorId} disabled title="Nhà phân phối hiện tại">
                <option value={distributorId}>{distributorName}</option>
              </select>
            </div>
            <div className="rpt083-filter-field">
              <select
                value={filterForm.warehouseId}
                onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
              >
                <option value="">-- Tất cả Kho NPP --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.category ? `(${w.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="rpt083-filter-field">
              <input
                type="text"
                placeholder="Nhập địa chỉ / Vị trí kho"
                value={filterForm.locationName}
                onChange={(e) => handleFilterChange('locationName', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="rpt083-filter-field">
              <select
                value={filterForm.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">-- Tất cả trạng thái --</option>
                <option value="GOOD">Good</option>
                <option value="DEFECTIVE">Defective</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <div className="rpt083-filter-field">
              <select
                value={filterForm.stockFilter}
                onChange={(e) => handleFilterChange('stockFilter', e.target.value)}
              >
                <option value="">Lọc tồn kho (Tất cả)</option>
                <option value="POSITIVE">Tồn kho &gt; 0</option>
                <option value="ZERO">Tồn kho = 0</option>
              </select>
            </div>
            <div className="rpt083-filter-field">
              <select
                value={filterForm.productType}
                onChange={(e) => handleFilterChange('productType', e.target.value)}
              >
                <option value="">Loại Sản phẩm (Tất cả)</option>
                <option value="FG">FG (Thành phẩm)</option>
                <option value="POSM">POSM</option>
              </select>
            </div>
            <div className="rpt083-filter-field">
              <input
                type="text"
                placeholder="Số lô"
                value={filterForm.lotNumber}
                onChange={(e) => handleFilterChange('lotNumber', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="rpt083-filter-field">
              <input
                type="text"
                placeholder="Mã hoặc tên sản phẩm"
                value={filterForm.searchProduct}
                onChange={(e) => handleFilterChange('searchProduct', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="rpt083-filter-field">
              <select
                value={filterForm.dateType}
                onChange={(e) => handleFilterChange('dateType', e.target.value)}
              >
                <option value="">Chọn loại thời gian</option>
                <option value="MFG">Ngày sản xuất</option>
                <option value="EXP">Hạn sử dụng</option>
              </select>
            </div>
            <div className="rpt083-filter-field">
              <input
                type="date"
                title="Từ ngày"
                value={filterForm.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>
            <div className="rpt083-filter-field">
              <input
                type="date"
                title="Đến ngày"
                value={filterForm.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
              />
            </div>
          </div>
        </DmsSectionPanel>
      )}

      <DmsSectionPanel
        title="Danh sách tồn kho NPP"
        count={pagination.total || data.length}
        noPadding
        actions={
          <div className="rpt083-table-actions">
            <div className="rpt083-toggle-group">
              <span>Hiện số lô</span>
              <div
                className="rpt083-toggle-switch"
                onClick={() => setShowLot(!showLot)}
                style={{ backgroundColor: showLot ? '#059669' : '#cbd5e1' }}
              >
                <div
                  className="rpt083-toggle-knob"
                  style={{
                    right: showLot ? '2px' : 'auto',
                    left: showLot ? 'auto' : '2px'
                  }}
                >
                  {showLot && <Check size={12} color="#059669" />}
                </div>
              </div>
            </div>
            <button type="button" className="dms-btn dms-btn-steel" onClick={handleExport}>
              <Download size={14} /> Xuất Excel
            </button>
          </div>
        }
      >
        <div className="dms-ledger-table-wrap" style={{ border: 'none' }}>
          {error && <div className="rpt083-error-box">{error}</div>}
          {loading ? (
            <div className="rpt083-empty-box">Đang tải dữ liệu tồn kho...</div>
          ) : data.length === 0 ? (
            <div className="rpt083-empty-box">Không tìm thấy dữ liệu tồn kho nào phù hợp.</div>
          ) : (
            <table className="dms-ledger-table rpt-table">
              <thead>
                <tr>
                  <th style={{ width: '44px' }}>#</th>
                  <th style={{ minWidth: '115px' }}>Mã SP</th>
                  <th className="text-left" style={{ minWidth: '260px' }}>Tên sản phẩm</th>
                  <th style={{ minWidth: '72px' }}>Loại</th>
                  <th className="text-right">SL chẵn</th>
                  <th className="text-right">SL lẻ</th>
                  <th>ĐVT chẵn</th>
                  <th>ĐVT lẻ</th>
                  <th className="text-right">Tổng SL lẻ</th>
                  <th className="text-right">Đơn giá</th>
                  <th className="text-right">Thành tiền</th>
                  <th className="text-right">SL chẵn TT</th>
                  <th className="text-right">SL lẻ TT</th>
                  <th>Trạng thái</th>
                  {showLot && <th>Số lô</th>}
                  {showLot && <th>Ngày SX</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td className="text-center">{row.index}</td>
                    <td className="text-center">
                      <code className="rpt083-sku-code">{row.productCode}</code>
                    </td>
                    <td className="text-left">{row.productName}</td>
                    <td className="text-center">{row.type}</td>
                    <td className="text-right tabular-nums">{formatNumber(row.qtyBig)}</td>
                    <td className="text-right tabular-nums">{formatNumber(row.qtySmall)}</td>
                    <td className="text-center">{row.unitBig}</td>
                    <td className="text-center">{row.unitSmall}</td>
                    <td className="text-right tabular-nums">{formatNumber(row.totalSmall)}</td>
                    <td className="text-right tabular-nums">{formatNumber(row.price)}</td>
                    <td className="text-right tabular-nums">{formatNumber(row.amount)}</td>
                    <td className="text-right tabular-nums">
                      {row.actualBig !== null ? formatNumber(row.actualBig) : ''}
                    </td>
                    <td className="text-right tabular-nums">
                      {row.actualSmall !== null ? formatNumber(row.actualSmall) : ''}
                    </td>
                    <td className="text-center">
                      <span className={`rpt083-status-badge ${String(row.status || '').toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                    {showLot && <td className="text-center">{row.lotNumber}</td>}
                    {showLot && <td className="text-center">{row.mfgDate}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && data.length > 0 && (
          <div className="rpt083-pagination-container">
            <div className="rpt083-pagination-info">
              <span>Hiển thị:</span>
              <select
                value={pagination.limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="rpt083-pagination-controls">
              <span>
                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
              </span>

              <div className="rpt083-pagination-buttons">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(1)}
                  title="Trang đầu"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                  title="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  onClick={() => setPage(pagination.page + 1)}
                  title="Trang sau"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  onClick={() => setPage(Math.ceil(pagination.total / pagination.limit))}
                  title="Trang cuối"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </DmsSectionPanel>
    </div>
  );
};

export default RPT083;
