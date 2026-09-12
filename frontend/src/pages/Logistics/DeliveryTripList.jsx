import { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  RotateCcw, 
  Scale, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Send
} from 'lucide-react';
import { useDeliveryTrips } from '../../hooks/useDeliveryTrips';
import CreateTripModal from './CreateTripModal';
import TripDispatchConsoleModal from './TripDispatchConsoleModal';
import './DeliveryTripList.css';

export default function DeliveryTripList() {
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    tripType: 'ALL',
    page: 1,
    limit: 15
  });

  const { trips, total, loading, error, refetch } = useDeliveryTrips(filters);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);

  // KPI Calculations
  const waitingShipCount = trips.filter(t => t.status === 'WAITING_SHIP' || t.status === 'WAITING_CONFIRM').length;
  const shippingCount = trips.filter(t => t.status === 'SHIPPING').length;
  const completedCount = trips.filter(t => t.status === 'COMPLETED').length;

  const totalPages = Math.ceil(total / (filters.limit || 15)) || 1;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'WAITING_SHIP':
      case 'WAITING_CONFIRM':
        return (
          <span className="trip-status-badge waiting-ship">
            <Clock size={12} />
            <span>Chờ xếp xe</span>
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="trip-status-badge shipping">
            <Send size={12} />
            <span>Đang giao hàng</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="trip-status-badge completed">
            <CheckCircle2 size={12} />
            <span>Hoàn thành</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="trip-status-badge cancelled">
            <AlertTriangle size={12} />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return <span className="trip-status-badge">{status}</span>;
    }
  };

  const getMiniGaugeColor = (percent) => {
    if (percent > 100) return 'red';
    if (percent >= 85) return 'yellow';
    return 'green';
  };

  return (
    <div className="trips-page-container">
      {/* 1. Page Header */}
      <div className="trips-page-header">
        <div className="trips-header-left">
          <h1>
            <Truck size={24} color="#2563eb" />
            <span>Quản Lý Chuyến Xe Vận Chuyển & Điều Phối Đơn Hàng</span>
          </h1>
          <p>
            Giám sát tải trọng xe tải, kiểm soát bốc xếp hàng theo số lô và theo dõi chu trình giao hàng tới các điểm bán.
          </p>
        </div>

        <div className="trips-header-actions">
          <button 
            type="button" 
            className="btn-create-trip"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} />
            <span>Khởi Tạo Chuyến Xe</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="trips-kpi-grid">
        <div 
          className={`trips-kpi-card ${filters.status === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilters({ ...filters, status: 'ALL', page: 1 })}
        >
          <div className="kpi-icon-wrapper blue">
            <Truck size={22} />
          </div>
          <div className="kpi-text">
            <span className="kpi-title">Tổng số chuyến xe</span>
            <span className="kpi-count">{total}</span>
          </div>
        </div>

        <div 
          className={`trips-kpi-card ${filters.status === 'WAITING_SHIP' ? 'active' : ''}`}
          onClick={() => setFilters({ ...filters, status: 'WAITING_SHIP', page: 1 })}
        >
          <div className="kpi-icon-wrapper amber">
            <Clock size={22} />
          </div>
          <div className="kpi-text">
            <span className="kpi-title">Chờ xếp hàng / Đợi xuất</span>
            <span className="kpi-count">{waitingShipCount}</span>
          </div>
        </div>

        <div 
          className={`trips-kpi-card ${filters.status === 'SHIPPING' ? 'active' : ''}`}
          onClick={() => setFilters({ ...filters, status: 'SHIPPING', page: 1 })}
        >
          <div className="kpi-icon-wrapper purple">
            <Send size={22} />
          </div>
          <div className="kpi-text">
            <span className="kpi-title">Xe đang lăn bánh (SHIPPING)</span>
            <span className="kpi-count">{shippingCount}</span>
          </div>
        </div>

        <div 
          className={`trips-kpi-card ${filters.status === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setFilters({ ...filters, status: 'COMPLETED', page: 1 })}
        >
          <div className="kpi-icon-wrapper green">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-text">
            <span className="kpi-title">Đã giao hoàn tất</span>
            <span className="kpi-count">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="trips-toolbar-card">
        <div className="trips-toolbar-left">
          <div className="trips-search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo mã chuyến, biển số, tài xế..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>

          <select 
            className="trips-filter-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="WAITING_SHIP">Chờ xếp hàng (WAITING_SHIP)</option>
            <option value="SHIPPING">Đang giao hàng (SHIPPING)</option>
            <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          </select>

          <select 
            className="trips-filter-select"
            value={filters.tripType}
            onChange={(e) => setFilters({ ...filters, tripType: e.target.value, page: 1 })}
          >
            <option value="ALL">-- Tất cả loại chuyến --</option>
            <option value="OUTBOUND">Chuyến xuất giao đại lý (OUTBOUND)</option>
            <option value="INBOUND">Chuyến nhận hàng NCC (INBOUND)</option>
          </select>
        </div>

        <button 
          type="button" 
          className="btn-toolbar-refresh"
          onClick={refetch}
          disabled={loading}
          title="Làm mới danh sách"
        >
          <RotateCcw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 4. Table Card */}
      <div className="trips-table-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Đang tải dữ liệu chuyến xe...
          </div>
        ) : error ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#dc2626' }}>
            {error}
          </div>
        ) : trips.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', color: '#94a3b8' }}>
            Không tìm thấy chuyến xe nào phù hợp với bộ lọc.
          </div>
        ) : (
          <table className="trips-table">
            <thead>
              <tr>
                <th>Mã Chuyến Xe</th>
                <th>Biển Số Xe & Tuyến</th>
                <th>Tài Xế Phụ Trách</th>
                <th>Kho Xuất Hàng</th>
                <th>Tải Trọng & Đầy Tải (%)</th>
                <th>Đơn / Kiện</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(trip => (
                <tr key={trip.id}>
                  <td>
                    <strong>{trip.tripCode}</strong>
                    <div>
                      <span className={`trip-type-tag ${trip.tripType.toLowerCase()}`}>
                        {trip.tripType === 'OUTBOUND' ? 'Xuất Giao Đại Lý' : 'Nhập Hàng NCC'}
                      </span>
                    </div>
                  </td>

                  <td>
                    <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>
                      {trip.licensePlate}
                    </strong>
                    {trip.notes && (
                      <div style={{ fontSize: '11.5px', color: '#64748b', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {trip.notes}
                      </div>
                    )}
                  </td>

                  <td>
                    <strong>{trip.driver?.fullName || 'Chưa chỉ định'}</strong>
                    {trip.driver?.phone && (
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{trip.driver.phone}</div>
                    )}
                  </td>

                  <td>
                    <span>{trip.warehouse?.name || 'Kho mặc định'}</span>
                  </td>

                  <td>
                    <div className="weight-mini-gauge">
                      <div className="mini-gauge-track">
                        <div 
                          className={`mini-gauge-fill ${getMiniGaugeColor(trip.loadPercentage)}`}
                          style={{ width: `${Math.min(100, trip.loadPercentage)}%` }}
                        />
                      </div>
                      <div className="mini-gauge-text">
                        <span><strong>{trip.currentWeightKg}</strong> / {trip.maxWeightKg} kg</span>
                        <span style={{ fontWeight: 700 }}>{trip.loadPercentage}%</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <strong>{trip.ordersCount}</strong> đơn
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{trip.totalPackagesCount} thùng</div>
                  </td>

                  <td>
                    {renderStatusBadge(trip.status)}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button 
                      type="button" 
                      className="btn-table-action-dispatch"
                      onClick={() => setSelectedTripId(trip.id)}
                    >
                      <SlidersHorizontal size={13} />
                      <span>Bàn Điều Phối & Lô</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        <div className="trips-pagination-bar">
          <span>Trang {filters.page} / {totalPages} (Tổng {total} chuyến xe)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              type="button" 
              className="pagination-btn"
              disabled={filters.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              type="button" 
              className="pagination-btn"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Khởi tạo chuyến xe mới */}
      <CreateTripModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={refetch} 
      />

      {/* Modal Bàn điều phối bốc xếp đơn hàng & Bảng kê số lô */}
      {selectedTripId && (
        <TripDispatchConsoleModal 
          tripId={selectedTripId}
          isOpen={Boolean(selectedTripId)}
          onClose={() => setSelectedTripId(null)}
          onRefreshList={refetch}
        />
      )}
    </div>
  );
}
