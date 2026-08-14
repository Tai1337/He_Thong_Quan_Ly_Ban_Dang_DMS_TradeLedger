import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Info
} from 'lucide-react';
import { useSalesOrders } from '../../../hooks/useSalesOrders';
import './SalesOrderList.css';

// Helper để format tiền
const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN').format(value || 0);
};

const SalesOrderList = () => {
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  
  // Local state for filter form inputs
  const [filterForm, setFilterForm] = useState({
    startDate: '',
    endDate: '',
    warehouseId: '',
    status: '',
    orderCode: ''
  });

  // Use Custom Hook
  const { 
    data: orders, 
    kpis, 
    pagination, 
    loading, 
    error, 
    applyFilters,
    setLimit 
  } = useSalesOrders({ distributorId: 1 }); // Hardcoded distributorId for now

  const handleFilterChange = (field, value) => {
    setFilterForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    // When clicking search, pass local state to hook
    applyFilters({
      ...filterForm,
      distributorId: 1 // Keep distributor context
    });
  };

  return (
    <div className="sales-order-list-container">
      {/* Header */}
      <div className="page-header-row">
        <h2>Danh sách Đơn bán hàng theo NPP</h2>
        <button 
          className="filter-toggle"
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          {isFilterExpanded ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc'}
          {isFilterExpanded ? <X size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Filters */}
      {isFilterExpanded && (
        <div className="filters-section">
          <div className="filter-row">
            <div className="filter-item">
              <select>
                <option>Ngày giao dự kiến</option>
              </select>
            </div>
            <div className="filter-item" style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              <input 
                type="date" 
                value={filterForm.startDate} 
                onChange={(e) => handleFilterChange('startDate', e.target.value)} 
                title="Từ ngày"
              />
              <input 
                type="date" 
                value={filterForm.endDate} 
                onChange={(e) => handleFilterChange('endDate', e.target.value)} 
                title="Đến ngày"
              />
            </div>
            <div className="filter-item">
              <select disabled>
                <option>[G-10KF1292] Nhà Phân Phối G KF1292</option>
              </select>
            </div>
            <div className="filter-item">
              <select 
                value={filterForm.warehouseId}
                onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
              >
                <option value="">Chọn kho NPP</option>
                <option value="1">Kho chính</option>
                <option value="2">Kho phụ</option>
              </select>
            </div>
            <div className="filter-item">
              <select
                value={filterForm.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Chọn trạng thái</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="ALLOCATED">Đã giữ chỗ</option>
                <option value="SHIPPED">Đã giao</option>
                <option value="PAID">Đã thanh toán</option>
              </select>
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-item">
              <select>
                <option>Chọn Tỉnh/Thành phố</option>
              </select>
            </div>
            <div className="filter-item">
              <select>
                <option>Chọn Phường/Xã</option>
              </select>
            </div>
            <div className="filter-item">
              <input 
                type="text" 
                placeholder="Mã đơn hàng" 
                value={filterForm.orderCode}
                onChange={(e) => handleFilterChange('orderCode', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <div className="filter-item filter-buttons" style={{ flex: 2 }}>
              <button className="btn-filter active">Tất cả</button>
              <button className="btn-filter">Đủ tồn</button>
              <button className="btn-filter">Thiếu tồn</button>
              
              <button className="btn-search" style={{ marginLeft: 'auto' }} onClick={handleSearch}>
                <Search size={16} /> Tìm kiếm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
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
            <p>{formatCurrency(kpis.totalAmount)}</p>
          </div>
          <div className="kpi-icon"><Wallet size={20} /></div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-info">
            <h4>Tổng chiết khấu</h4>
            <p>{formatCurrency(kpis.totalDiscount)}</p>
          </div>
          <div className="kpi-icon"><Tag size={20} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-info">
            <h4>Tổng tiền đơn hàng</h4>
            <p>{formatCurrency(kpis.totalOrderValue)}</p>
          </div>
          <div className="kpi-icon"><CreditCard size={20} /></div>
        </div>
        <div className="kpi-card lightblue">
          <div className="kpi-info">
            <h4>Tổng tấn</h4>
            <p>{kpis.totalTons || '0.00000'}</p>
          </div>
          <div className="kpi-icon"><Box size={20} /></div>
        </div>
        <div className="kpi-card gray">
          <div className="kpi-info">
            <h4>Tổng khối</h4>
            <p>{kpis.totalCbm || '0.00000'}</p>
          </div>
          <div className="kpi-icon"><Layers size={20} /></div>
        </div>
        <div className="kpi-card pink">
          <div className="kpi-info">
            <h4>Tổng P...</h4>
            <p>0.00000</p>
          </div>
          <div className="kpi-icon"><Archive size={20} /></div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">
        <div className="table-toolbar">
          <h3>Danh sách</h3>
          <div className="quick-reports">
            <button className="btn-report"><FileText size={14} /> RPT057 - Báo cáo doanh số và sản lượng</button>
            <button className="btn-report"><FileText size={14} /> RPT036 - Bảng kê chọn hàng xuất theo NVGH</button>
            <button className="btn-report green"><FileText size={14} /> RPT005 - Báo cáo kiểm tra tồn kho</button>
            <button className="btn-report green"><FileText size={14} /> RPT061 - Báo cáo line item</button>
            <button className="btn-report green"><FileText size={14} /> Xuất excel</button>
          </div>
        </div>
        
        <div className="table-controls">
          <button className="btn-action-dropdown">Thao tác <ChevronDown size={14} /></button>
          <select 
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
            value={pagination.limit}
            onChange={(e) => setLimit(e.target.value)}
          >
            <option value="10">Xem 10 bản ghi mỗi trang</option>
            <option value="20">Xem 20 bản ghi mỗi trang</option>
            <option value="50">Xem 50 bản ghi mỗi trang</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto', minHeight: '300px' }}>
          {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Không tìm thấy đơn hàng nào phù hợp.</div>
          ) : (
            <table className="so-table">
              <thead>
                <tr>
                  <th className="checkbox-cell"><input type="checkbox" /></th>
                  <th>Mã đơn hàng</th>
                  <th>Cửa hàng</th>
                  <th>Địa chỉ giao</th>
                  <th>Ngày giao dự kiến</th>
                  <th>Trạng thái</th>
                  <th>TT tồn kho <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} /></th>
                  <th style={{ textAlign: 'right' }}>Tổng thành tiền</th>
                  <th style={{ textAlign: 'right' }}>Tổng chiết khấu</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((row) => (
                  <tr key={row.id}>
                    <td className="checkbox-cell"><input type="checkbox" /></td>
                    <td>
                      <Link to={`/sales/sales-orders/${row.id}`} className="order-link">
                        {row.orderCode}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>[{row.retailerCode}]</div>
                      <div className="shop-info">{row.retailerName}</div>
                    </td>
                    <td>{row.address}</td>
                    <td>
                      <div className="delivery-date">
                        <Calendar size={14} /> 
                        {new Date(row.expectedDate).toLocaleString('vi-VN', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                      <div className="delivery-truck"><Truck size={14} /> {row.truckCode}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${row.status === 'SHIPPED' || row.status === 'PAID' ? 'delivered' : 'closed'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <span className="stock-badge">
                        <CheckCircle2 size={12} /> {row.stockStatus}
                      </span>
                    </td>
                    <td className="money-text">{formatCurrency(row.totalAmount)}</td>
                    <td className="money-text">{formatCurrency(row.discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesOrderList;
