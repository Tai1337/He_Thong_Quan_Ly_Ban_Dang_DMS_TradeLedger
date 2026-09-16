import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, 
  Package, 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { getInboundTripDetail } from '../../../services/api';
import { useInboundDeliveryTrips } from '../../../hooks/useInboundDeliveryTrips';
import ReceiveTripModal from './ReceiveTripModal';
import './PurchaseReceivingList.css';

const PurchaseReceivingList = () => {
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    dateFilter: 'TODAY_AND_PAST', // Mặc định hiển thị các chuyến đã đến hạn (D+3)
    page: 1,
    limit: 15
  });

  // Custom Hook Pattern
  const { trips, total, loading, error, refetch } = useInboundDeliveryTrips(filters);

  // Modal State
  const [selectedTripDetail, setSelectedTripDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Open Receive Modal
  const handleOpenReceiveModal = async (trip) => {
    setLoadingDetail(true);
    try {
      const detail = await getInboundTripDetail(trip.id, 1);
      setSelectedTripDetail(detail);
    } catch (err) {
      alert(err.message || 'Lỗi khi tải chi tiết chuyến xe');
    } finally {
      setLoadingDetail(false);
    }
  };

  const totalPages = Math.ceil(total / (filters.limit || 15)) || 1;

  // KPI calculations
  const dueCount = trips.filter(t => t.isDueForReceiving && t.status !== 'COMPLETED').length;
  const completedCount = trips.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="receiving-page-container">
      {/* 1. Header */}
      <div className="receiving-page-header">
        <div className="receiving-header-left">
          <h1>
            <Truck size={26} color="#2563eb" />
            <span>Nhập Kho Đặt Hàng — Chuyến Xe Giao Hàng (D+3)</span>
          </h1>
          <p>
            Quản lý các chuyến xe vận chuyển hàng từ Nhà máy / NCC về kho NPP. Tiến hành nhận hàng, kiểm đếm số lượng và cập nhật Lô - Hạn dùng.
          </p>
        </div>

        <div className="receiving-header-actions">
          <Link to="/purchase/purchase-orders" className="btn-link-po">
            <span>Quản lý Đơn mua PO</span>
          </Link>
        </div>
      </div>

      {/* 1.1 Thông báo quy trình D+3 */}
      <div className="receiving-workflow-banner">
        <div className="workflow-icon">
          <Calendar size={22} />
        </div>
        <div className="workflow-text">
          <strong>Quy trình giao hàng & Nhập kho tiêu chuẩn (D+3):</strong>
          <p>
            Đơn hàng mua sau khi được xác nhận được hệ thống sắp xếp Chuyến xe giao đến kho NPP với lịch hẹn giao tiêu chuẩn (D+3). 
            Khi chuyến xe đến kho đúng ngày hẹn, thủ kho / kế toán nhấp <u>"Tiến hành nhập kho"</u> để ghi nhận hàng thực tế và kích hoạt Lô hàng vào tồn kho sẵn sàng bán.
          </p>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="receiving-kpi-grid">
        <div 
          className={`kpi-card ${filters.dateFilter === 'ALL' && filters.status === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'ALL', status: 'ALL', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Layers size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{total}</span>
            <span className="kpi-label">Tổng chuyến xe INBOUND</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.dateFilter === 'TODAY_AND_PAST' && filters.status !== 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, dateFilter: 'TODAY_AND_PAST', status: 'SHIPPING', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ color: '#b91c1c' }}>{dueCount}</span>
            <span className="kpi-label" style={{ color: '#b91c1c' }}>Đã đến ngày nhận (D+3)</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, status: 'COMPLETED', dateFilter: 'ALL', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ color: '#16a34a' }}>{completedCount}</span>
            <span className="kpi-label">Đã hoàn tất nhập kho</span>
          </div>
        </div>
      </div>

      {/* 3. Filters */}
      <div className="receiving-filter-bar">
        <div className="filter-input-search">
          <Search size={16} />
          <input 
            type="text"
            placeholder="Tìm theo mã chuyến xe, mã PO, tên NCC..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>

        <div className="filter-select-group">
          <label>Lọc ngày giao:</label>
          <select 
            value={filters.dateFilter} 
            onChange={(e) => setFilters(prev => ({ ...prev, dateFilter: e.target.value, page: 1 }))}
          >
            <option value="TODAY_AND_PAST">Đã đến ngày nhận (Hôm nay & Quá hạn)</option>
            <option value="TODAY">Chỉ hôm nay</option>
            <option value="FUTURE">Chuyến tương lai (Sau hôm nay)</option>
            <option value="ALL">Tất cả thời gian</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Trạng thái:</label>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SHIPPING">Đang vận chuyển / Chờ nhập kho</option>
            <option value="COMPLETED">Đã hoàn tất nhập kho</option>
          </select>
        </div>

        <button 
          type="button" 
          className="btn-reset-filter"
          onClick={() => setFilters({ search: '', status: 'ALL', dateFilter: 'TODAY_AND_PAST', page: 1, limit: 15 })}
        >
          <RotateCcw size={14} />
          <span>Đặt lại</span>
        </button>
      </div>

      {/* 4. Trips Table */}
      <div className="receiving-table-card">
        {loading ? (
          <div className="loading-state">Đang tải danh sách chuyến xe...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <Truck size={42} color="#cbd5e1" />
            <p>Không có chuyến xe hàng về nào phù hợp với điều kiện lọc.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="receiving-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Mã Chuyến Xe</th>
                  <th style={{ width: '130px' }}>Đơn Mua (PO)</th>
                  <th>Nhà Cung Cấp</th>
                  <th>Kho Tiếp Nhận</th>
                  <th style={{ width: '150px' }}>Ngày Giao Dự Kiến</th>
                  <th style={{ width: '180px' }}>Tiến Độ Nhận Hàng</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ width: '160px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(trip => {
                  const isCompleted = trip.status === 'COMPLETED';
                  const percent = trip.metrics?.receivingPercentage || 0;

                  return (
                    <tr key={trip.id} className={trip.isDueForReceiving && !isCompleted ? 'row-due' : ''}>
                      <td>
                        <div className="trip-code-text">
                          <Truck size={15} color="#2563eb" />
                          <strong>{trip.tripCode}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                          {trip.metrics?.totalItemsCount || 0} mặt hàng
                        </div>
                      </td>

                      <td>
                        {trip.purchaseOrders?.map(po => (
                          <div key={po.id} style={{ fontWeight: 600, color: '#7c3aed' }}>
                            {po.poCode}
                          </div>
                        ))}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{trip.supplier?.name || 'Tân Hiệp Phát'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>SĐT: {trip.supplier?.phone || 'Chưa có'}</div>
                      </td>

                      <td>
                        <div style={{ color: '#334155' }}>{trip.warehouse?.name || 'Kho Tổng'}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: trip.isDueForReceiving && !isCompleted ? '#dc2626' : '#0f172a' }}>
                          <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                          {trip.expectedDeliveryDate || 'Chưa đặt'}
                        </div>
                        {trip.isDueForReceiving && !isCompleted && (
                          <span className="badge-due-tag">Đến hạn nhận (D+3)</span>
                        )}
                      </td>

                      <td>
                        <div className="progress-container">
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                          </div>
                          <div className="progress-text">
                            <span>{trip.metrics?.totalReceivedQty} / {trip.metrics?.totalOrderedQty}</span>
                            <span>{percent}%</span>
                          </div>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {isCompleted ? (
                          <span className="badge-status-completed">
                            <CheckCircle2 size={12} /> Đã hoàn tất
                          </span>
                        ) : (
                          <span className="badge-status-shipping">
                            <Clock size={12} /> Chờ nhập kho
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {!isCompleted ? (
                          <button 
                            type="button" 
                            className="btn-action-receive"
                            onClick={() => handleOpenReceiveModal(trip)}
                            disabled={loadingDetail}
                          >
                            <Package size={15} />
                            <span>Tiến hành nhập kho</span>
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            className="btn-action-viewed"
                            onClick={() => handleOpenReceiveModal(trip)}
                          >
                            <span>Xem phiếu nhập</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="receiving-pagination">
          <div className="pagination-text">
            Hiển thị <strong>{trips.length}</strong> / <strong>{total}</strong> chuyến xe
          </div>
          <div className="pagination-controls">
            <button 
              type="button" 
              className="page-nav-btn"
              disabled={filters.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>Trang {filters.page} / {totalPages}</span>
            <button 
              type="button" 
              className="page-nav-btn"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Receive Goods */}
      {selectedTripDetail && (
        <ReceiveTripModal
          isOpen={Boolean(selectedTripDetail)}
          trip={selectedTripDetail}
          onClose={() => setSelectedTripDetail(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default PurchaseReceivingList;
