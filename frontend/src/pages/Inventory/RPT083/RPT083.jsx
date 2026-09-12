import { useState } from 'react';
import { X, Search, Check, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useInventoryRpt083 } from '../../../hooks/useInventoryRpt083';
import './RPT083.css';

const RPT083 = ({ user }) => {
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [showLot, setShowLot] = useState(true);

  // Lấy ID và thông tin của Nhà phân phối từ user đang đăng nhập
  const distributorId = user?.distributorId || 1;
  const distributorName = user?.distributor ? `[${user.distributor.code}] ${user.distributor.name}` : '[NPP-TEST] Nhà Phân Phối Test';

  const [filterForm, setFilterForm] = useState({
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
  });

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
    setFilterForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    applyFilters({
      ...filterForm,
      distributorId
    });
  };

  const handleExport = () => {
    // Construct query parameters based on current filter form
    const queryParams = new URLSearchParams({
      ...filterForm,
      distributorId
    }).toString();
    
    // In production, use your actual API URL base
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
      <h2 className="page-title">BÁO CÁO TỒN KHO NPP</h2>

      {isFilterVisible && (
        <div className="filter-card">
          <div className="filter-card-header">
            <h3>Lọc dữ liệu</h3>
            <button className="btn-close" onClick={() => setIsFilterVisible(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div className="filter-grid" style={{ marginBottom: '16px' }}>
            <div className="filter-field">
              <select defaultValue={distributorId}>
                <option value={distributorId}>{distributorName}</option>
              </select>
            </div>
            <div className="filter-field">
              <select 
                value={filterForm.warehouseId}
                onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
              >
                <option value="">Chọn Kho NPP</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.category ? `(${w.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <input 
                type="text" 
                placeholder="Nhập địa chỉ/Vị trí kho" 
                value={filterForm.locationName}
                onChange={(e) => handleFilterChange('locationName', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="filter-field">
              <select
                value={filterForm.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Chọn trạng thái</option>
                <option value="GOOD">Good</option>
                <option value="DEFECTIVE">Defective</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>

          <div className="filter-grid" style={{ marginBottom: '16px' }}>
            <div className="filter-field">
              <select 
                value={filterForm.stockFilter}
                onChange={(e) => handleFilterChange('stockFilter', e.target.value)}
              >
                <option value="">Lọc tồn kho (Tất cả)</option>
                <option value="POSITIVE">Tồn kho &gt; 0</option>
                <option value="ZERO">Tồn kho = 0</option>
              </select>
            </div>
            <div className="filter-field">
              <select 
                value={filterForm.productType}
                onChange={(e) => handleFilterChange('productType', e.target.value)}
              >
                <option value="">Loại Sản phẩm (Tất cả)</option>
                <option value="FG">FG (Thành phẩm)</option>
                <option value="POSM">POSM</option>
              </select>
            </div>
            <div className="filter-field">
              <input 
                type="text" 
                placeholder="Số lô" 
                value={filterForm.lotNumber}
                onChange={(e) => handleFilterChange('lotNumber', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="filter-field search-field">
              <input 
                type="text" 
                placeholder="Mã hoặc tên sản phẩm" 
                value={filterForm.searchProduct}
                onChange={(e) => handleFilterChange('searchProduct', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn-search" onClick={handleSearch}>
                <Search size={14} /> Tìm
              </button>
            </div>
          </div>

          <div className="filter-grid">
            <div className="filter-field">
              <select 
                value={filterForm.dateType}
                onChange={(e) => handleFilterChange('dateType', e.target.value)}
              >
                <option value="">Chọn loại thời gian</option>
                <option value="MFG">Ngày sản xuất</option>
                <option value="EXP">Hạn sử dụng</option>
              </select>
            </div>
            <div className="filter-field">
              <input 
                type="date" 
                placeholder="Từ ngày"
                value={filterForm.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>
            <div className="filter-field">
              <input 
                type="date" 
                placeholder="Đến ngày"
                value={filterForm.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
              />
            </div>
            <div className="filter-field">
              {/* Empty placeholder to keep the 4-column grid aligned */}
            </div>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-header">
          <h3>Danh sách tồn kho NPP</h3>
          <div className="table-actions">
            <div className="toggle-group">
              <span>Hiện số lô</span>
              <div 
                className="toggle-switch" 
                onClick={() => setShowLot(!showLot)}
                style={{ backgroundColor: showLot ? '#10b981' : '#cbd5e1' }}
              >
                <div 
                  className="toggle-knob"
                  style={{ 
                    right: showLot ? '2px' : 'auto', 
                    left: showLot ? 'auto' : '2px' 
                  }}
                >
                  {showLot && <Check size={12} color="#10b981" />}
                </div>
              </div>
            </div>
            <button className="btn-export" onClick={handleExport}>
              <Download size={14} /> Xuất excel
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : data.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Không tìm thấy dữ liệu tồn kho nào phù hợp.</div>
          ) : (
            <table className="rpt-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ minWidth: '120px' }}>Mã Sản<br/>phẩm</th>
                  <th className="text-left" style={{ minWidth: '300px' }}>Tên sản phẩm</th>
                  <th style={{ minWidth: '80px' }}>Loại<br/>Sản<br/>phẩm</th>
                  <th className="text-right">Số<br/>lượng<br/>chẵn</th>
                  <th className="text-right">Số<br/>lượng<br/>lẻ</th>
                  <th>ĐVT<br/>chẵn</th>
                  <th>ĐVT<br/>lẻ</th>
                  <th className="text-right">Tổng<br/>Số<br/>lượng<br/>lẻ</th>
                  <th className="text-right">Đơn giá</th>
                  <th className="text-right">Thành<br/>tiền</th>
                  <th className="text-right">Số<br/>lượng<br/>chẵn<br/>thực tế</th>
                  <th className="text-right">Số<br/>lượng<br/>lẻ thực<br/>tế</th>
                  <th>Trạng<br/>thái</th>
                  {showLot && <th>Số lô</th>}
                  {showLot && <th>Ngày sản<br/>xuất</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="text-center">{row.index}</td>
                    <td className="text-center">
                      <a href="#" className="product-link">{row.productCode}</a>
                    </td>
                    <td className="text-left">{row.productName}</td>
                    <td className="text-center">{row.type}</td>
                    <td className="text-right">{formatNumber(row.qtyBig)}</td>
                    <td className="text-right">{formatNumber(row.qtySmall)}</td>
                    <td className="text-center">{row.unitBig}</td>
                    <td className="text-center">{row.unitSmall}</td>
                    <td className="text-right">{formatNumber(row.totalSmall)}</td>
                    <td className="text-right">{formatNumber(row.price)}</td>
                    <td className="text-right">{formatNumber(row.amount)}</td>
                    <td className="text-right">{row.actualBig !== null ? formatNumber(row.actualBig) : ''}</td>
                    <td className="text-right">{row.actualSmall !== null ? formatNumber(row.actualSmall) : ''}</td>
                    <td className="text-center">
                      <span className={`status-badge ${row.status.toLowerCase()}`}>
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
        
        {/* Simple pagination control matching style */}
        {!loading && data.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              <span>Items per page: </span>
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
            
            <div className="pagination-controls">
              <span>
                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              
              <div className="pagination-buttons">
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(1)}
                  title="First Page"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  onClick={() => setPage(pagination.page + 1)}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
                <button 
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  onClick={() => setPage(Math.ceil(pagination.total / pagination.limit))}
                  title="Last Page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RPT083;
