import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
  Send,
  Lock,
  User,
  Users,
  Printer,
  FileText
} from 'lucide-react';
import { useDeliveryTrips } from '../../hooks/useDeliveryTrips';
import { getDriverAvailability } from '../../services/api';
import CreateTripModal from './CreateTripModal';
import BatchPrintRPT002Modal from './BatchPrintRPT002Modal';
import DmsSectionPanel from '../../components/DmsUi/DmsSectionPanel';
import './DeliveryTripList.css';

export default function DeliveryTripList() {
  const location = useLocation();
  const incomingOrderIds = location.state?.selectedOrderIds || [];
  const autoCreate = location.state?.autoCreate || false;

  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    tripType: 'ALL',
    page: 1,
    limit: 15
  });

  const { trips, total, loading, error, refetch } = useDeliveryTrips(filters);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(() => autoCreate && incomingOrderIds.length > 0);

  // Multi-select or single-row Print RPT002
  const [selectedTripIds, setSelectedTripIds] = useState([]);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);
  const [singlePrintTripId, setSinglePrintTripId] = useState(null);

  // Trạng thái đội ngũ tài xế
  const [driverFleet, setDriverFleet] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(false);

  const isAllSelected = trips.length > 0 && trips.every(t => selectedTripIds.includes(t.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTripIds(prev => prev.filter(id => !trips.some(t => t.id === id)));
    } else {
      const newIds = trips.map(t => t.id);
      setSelectedTripIds(prev => Array.from(new Set([...prev, ...newIds])));
    }
  };

  const toggleSelectTrip = (tripId) => {
    setSelectedTripIds(prev =>
      prev.includes(tripId) ? prev.filter(id => id !== tripId) : [...prev, tripId]
    );
  };

  useEffect(() => {
    setLoadingFleet(true);
    getDriverAvailability(1)
      .then(data => setDriverFleet(data || []))
      .catch(console.error)
      .finally(() => setLoadingFleet(false));
  }, [trips]);

  const availableDriversCount = driverFleet.filter(d => d.availabilityStatus === 'AVAILABLE').length;
  const busyDriversCount = driverFleet.filter(d => d.availabilityStatus === 'SHIPPING').length;
  const waitingDriversCount = driverFleet.filter(d => d.availabilityStatus === 'WAITING_SHIP').length;

  // KPI Calculations
  const waitingShipCount = trips.filter(t => t.status === 'WAITING_SHIP' || t.status === 'WAITING_CONFIRM').length;
  const shippingCount = trips.filter(t => t.status === 'SHIPPING').length;
  const completedCount = trips.filter(t => t.status === 'COMPLETED').length;

  const totalPages = Math.ceil(total / (filters.limit || 15)) || 1;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'WAITING_CONFIRM':
        return (
          <span className="trip-status-badge waiting-confirm" style={{ background: '#f1f5f9', color: '#475569' }}>
            <Clock size={12} />
            <span>Chờ xác nhận</span>
          </span>
        );
      case 'WAITING_SHIP':
        return (
          <span className="trip-status-badge waiting-ship">
            <Clock size={12} />
            <span>Chờ xuất bến</span>
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
      case 'CLOSED':
        return (
          <span className="trip-status-badge closed" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
            <Lock size={12} />
            <span>Đã đóng chuyến</span>
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
      <div className="dms-page-title-bar">
        <div>
          <h2>Quản Lý Chuyến Xe Vận Chuyển & Điều Phối Đơn Hàng</h2>
          <p className="dms-page-subtitle">
            Giám sát tải trọng xe tải, kiểm soát bốc xếp hàng theo số lô và theo dõi chu trình giao hàng tới các điểm bán.
          </p>
        </div>

        <div className="trips-header-actions">
          <button 
            type="button" 
            className="dms-btn dms-btn-steel"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={15} />
            <span>Khởi Tạo Chuyến Xe</span>
          </button>
        </div>
      </div>

      {/* Fleet Driver Availability Strip (UI-UX Pro Max) */}
      <div className="fleet-availability-strip">
        <div className="fleet-strip-left">
          <div className="fleet-strip-icon">
            <Users size={16} />
          </div>
          <div className="fleet-strip-info">
            <span className="fleet-strip-title">Năng lực đội xe hôm nay:</span>
            <span className="fleet-strip-desc">
              Tổng số {driverFleet.length} tài xế đăng ký trong NPP
            </span>
          </div>
        </div>

        <div className="fleet-strip-badges">
          <div className="fleet-badge-chip available" title="Tài xế sẵn sàng nhận chuyến mới">
            <span className="dot-pulse green"></span>
            <strong>{availableDriversCount}</strong> Tài xế rảnh
          </div>

          <div className="fleet-badge-chip shipping" title="Tài xế đang chở hàng trên đường">
            <span className="dot-pulse red"></span>
            <strong>{busyDriversCount}</strong> Đang giao hàng
          </div>

          <div className="fleet-badge-chip waiting" title="Tài xế đã nhận lịch, chờ bốc xếp">
            <span className="dot-pulse amber"></span>
            <strong>{waitingDriversCount}</strong> Chờ xuất bến
          </div>
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
      <DmsSectionPanel title="Tìm kiếm & Điều phối chuyến xe">
        <div className="trips-toolbar-card" style={{ border: 'none', padding: 0, boxShadow: 'none' }}>
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
            <option value="WAITING_CONFIRM">Chờ xác nhận (WAITING_CONFIRM)</option>
            <option value="WAITING_SHIP">Chờ xuất bến (WAITING_SHIP)</option>
            <option value="SHIPPING">Đang giao hàng (SHIPPING)</option>
            <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
            <option value="CLOSED">Đã đóng chuyến (CLOSED)</option>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedTripIds.length > 0 && (
            <button
              type="button"
              className="btn-batch-print-action"
              onClick={() => setIsBatchPrintOpen(true)}
              title="In tổng hợp phiếu xuất kho gom hàng cho các chuyến xe đã chọn"
            >
              <Printer size={15} />
              <span>In Tổng Hợp RPT002 ({selectedTripIds.length} chuyến)</span>
            </button>
          )}

          <button 
            type="button" 
            className="dms-btn dms-btn-outline"
            onClick={refetch}
            disabled={loading}
            title="Làm mới danh sách"
          >
            <RotateCcw size={14} />
            <span>Làm mới</span>
          </button>
        </div>
        </div>
      </DmsSectionPanel>

      {/* 4. Table Card */}
      <DmsSectionPanel title="Danh sách chuyến xe giao nhận" count={total} noPadding>
        <div className="dms-ledger-table-wrap" style={{ border: 'none' }}>
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
          <table className="dms-ledger-table trips-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    title="Chọn tất cả trên trang"
                  />
                </th>
                <th>Mã Chuyến Xe</th>
                <th>Biển Số Xe & Tuyến</th>
                <th>Tài Xế Phụ Trách</th>
                <th>Kho Xuất Hàng</th>
                <th>Tải Trọng & Đầy Tải (%)</th>
                <th>Đơn / Kiện</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'center', width: 210 }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(trip => (
                <tr key={trip.id} className={selectedTripIds.includes(trip.id) ? 'row-selected' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedTripIds.includes(trip.id)}
                      onChange={() => toggleSelectTrip(trip.id)}
                    />
                  </td>

                  <td>
                    <Link
                      to={`/logistics/delivery-trips/${trip.id}`}
                      className="trip-code-link"
                      title="Xem chi tiết chuyến xe và in các biểu mẫu RPT"
                    >
                      {trip.tripCode}
                    </Link>
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
                    <div className="trip-row-actions">
                      <Link
                        to={`/logistics/delivery-trips/${trip.id}`}
                        className="btn-table-action-detail"
                        title="Xem chi tiết chuyến xe, điều phối và chứng từ"
                      >
                        <FileText size={13} />
                        <span>Chi tiết</span>
                      </Link>

                      <button
                        type="button"
                        className="btn-table-action-dispatch"
                        onClick={() => setSinglePrintTripId(trip.id)}
                        title="In nhanh Phiếu Xuất Kho (RPT002) cho chuyến xe này"
                      >
                        <Printer size={13} />
                        <span>In RPT002</span>
                      </button>
                    </div>
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
      </DmsSectionPanel>

      {/* Modal Khởi tạo chuyến xe mới */}
      <CreateTripModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={refetch} 
        initialOrderIds={incomingOrderIds}
      />

      {/* Modal In Phiếu Xuất Kho (RPT002) - đơn lẻ hoặc gộp nhiều chuyến */}
      <BatchPrintRPT002Modal
        isOpen={isBatchPrintOpen || Boolean(singlePrintTripId)}
        onClose={() => {
          setIsBatchPrintOpen(false);
          setSinglePrintTripId(null);
        }}
        tripIds={singlePrintTripId ? [singlePrintTripId] : selectedTripIds}
      />
    </div>
  );
}
