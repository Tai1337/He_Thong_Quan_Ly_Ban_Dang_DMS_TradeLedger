import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  Calendar,
  MapPin,
  User,
  Phone,
  Scale,
  Package,
  DollarSign,
  ArrowLeft,
  Printer,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  Lock,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Check,
  CheckCheck,
  Map as MapIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  getDeliveryTripDetail,
  getTripMapData,
  getTripReturnSummary,
  updateDeliveryTripStatus
} from '../../services/api';
import DeliveryMap from '../../components/Map/DeliveryMap';
import TripDispatchConsoleModal from './TripDispatchConsoleModal';
import TripReportPrintModal from './TripReportPrintModal';
import TripClosingModal from './TripClosingModal';
import ConfirmDeliveryModal from './ConfirmDeliveryModal';
import { useNotification } from '../../components/Common/NotificationProvider';
import './DeliveryTripDetail.css';

const TRIP_PIPELINE_STEPS = [
  { key: 'WAITING_CONFIRM', label: 'Chờ xác nhận', sub: 'Khởi tạo & xếp đơn', icon: Clock },
  { key: 'WAITING_SHIP', label: 'Chờ xuất bến', sub: 'Bốc hàng & kiểm tải', icon: Package },
  { key: 'SHIPPING', label: 'Đang giao hàng', sub: 'Xe đang đi tuyến', icon: Send },
  { key: 'COMPLETED', label: 'Đã giao hoàn tất', sub: 'Hoàn tất giao nhận', icon: CheckCircle2 },
  { key: 'CLOSED', label: 'Đã đóng chuyến', sub: 'Hạ tải & chốt COD', icon: Lock }
];

const formatMoney = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(val) || 0) + ' đ';

const formatNumber = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(val) || 0);

export default function DeliveryTripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, confirm } = useNotification();

  const [trip, setTrip] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [returnSummary, setReturnSummary] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [showMapSection, setShowMapSection] = useState(true);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'cargo' | 'returns'
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    reportType: 'rpt002',
    initialOrder: null
  });
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setMapLoading(true);
    setError('');
    try {
      const [data, mapRes, retRes] = await Promise.all([
        getDeliveryTripDetail(id, 1),
        getTripMapData(id, 1).catch(() => null),
        getTripReturnSummary(id, 1).catch(() => null)
      ]);
      setTrip(data);
      setMapData(mapRes);
      setReturnSummary(retRes);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tải thông tin chi tiết chuyến xe');
    } finally {
      setLoading(false);
      setMapLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleStatusAdvance = async (toStatus) => {
    if (!trip) return;
    let confirmTitle = 'Xác nhận chuyển trạng thái';
    let confirmMsg = `Xác nhận chuyển trạng thái chuyến xe sang "${toStatus}"?`;
    let confirmText = 'Xác nhận';
    if (toStatus === 'WAITING_SHIP') {
      confirmTitle = 'Xác nhận sẵn sàng bốc hàng';
      confirmMsg = `Xác nhận chuyến xe [${trip.licensePlate || trip.tripCode}] đã hoàn tất chuẩn bị và sẵn sàng xuất bến?`;
      confirmText = 'Xác nhận sẵn sàng';
    } else if (toStatus === 'SHIPPING') {
      confirmTitle = 'Xác nhận xuất bến giao hàng';
      confirmMsg = `Xác nhận xuất bến chuyến xe [${trip.licensePlate || trip.tripCode}]? Tất cả đơn hàng trên xe sẽ chuyển sang "Đang giao".`;
      confirmText = 'Xuất bến ngay';
    } else if (toStatus === 'COMPLETED') {
      const pendingShipped = (trip.orders || trip.salesOrders || []).filter((o) => o.status === 'SHIPPED').length;
      confirmTitle = 'Hoàn tất chuyến xe';
      confirmMsg =
        pendingShipped > 0
          ? `Hiện còn ${pendingShipped} đơn đang ở trạng thái Đang giao. Nếu hoàn tất ngay, các đơn này sẽ được tính là giao đủ 100%. Nếu có đơn rớt hàng, hãy bấm Hủy để xác nhận giao/rớt hàng từng đơn trước.`
          : 'Xác nhận hoàn tất chuyến xe để chuyển sang bước hạ tải hàng rớt & quyết toán COD?';
      confirmText = 'Hoàn tất chuyến';
    }
    const ok = await confirm({
      title: confirmTitle,
      message: confirmMsg,
      confirmText,
      cancelText: 'Hủy bỏ'
    });
    if (!ok) return;

    setStatusLoading(true);
    try {
      const res = await updateDeliveryTripStatus(trip.id, toStatus);
      notify.success(res.message || `Đã chuyển trạng thái chuyến xe sang ${toStatus}`);
      await loadData();
    } catch (err) {
      notify.error(err.message || 'Không thể cập nhật trạng thái chuyến xe');
    } finally {
      setStatusLoading(false);
    }
  };

  const openPrintModal = (reportType, initialOrder = null) => {
    setPrintModal({
      isOpen: true,
      reportType,
      initialOrder
    });
  };

  const closePrintModal = () => {
    setPrintModal((prev) => ({ ...prev, isOpen: false }));
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'WAITING_CONFIRM':
        return (
          <span className="trip-status-badge waiting-confirm">
            <Clock size={13} />
            <span>Chờ xác nhận</span>
          </span>
        );
      case 'WAITING_SHIP':
        return (
          <span className="trip-status-badge waiting-ship">
            <Clock size={13} />
            <span>Chờ xuất bến</span>
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="trip-status-badge shipping">
            <Send size={13} />
            <span>Đang giao hàng</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="trip-status-badge completed">
            <CheckCircle2 size={13} />
            <span>Đã giao hoàn tất</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="trip-status-badge closed">
            <Lock size={13} />
            <span>Đã đóng chuyến</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="trip-status-badge cancelled">
            <AlertTriangle size={13} />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return <span className="trip-status-badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="trip-detail-container loading-state">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu chuyến xe...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="trip-detail-container error-state">
        <div className="error-icon">
          <AlertTriangle size={36} color="#dc2626" />
        </div>
        <h3>Không thể hiển thị chuyến xe</h3>
        <p>{error || 'Chuyến xe không tồn tại hoặc đã bị xóa.'}</p>
        <button type="button" className="btn-secondary" onClick={() => navigate('/logistics/delivery-trips')}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
      </div>
    );
  }

  const orders = trip.orders || trip.salesOrders || [];
  const totalCod = orders.reduce((sum, o) => sum + Number(o.codAmount || 0), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const totalPackages = orders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((s, it) => s + Number(it.quantity || 0), 0);
  }, 0);

  // Tổng hợp hàng hóa trên chuyến xe theo SKU & Khuyến mãi
  const aggregatedCargo = [];
  const cargoMap = {};
  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const sku = it.productSku || it.product?.sku || 'N/A';
      const name = it.productName || it.product?.name || 'Sản phẩm';
      const unit = it.unit || it.product?.unit || 'THÙNG';
      const isPromo = Boolean(it.isPromotion);
      const qty = Number(it.quantity) || 0;
      const weight = Number(it.totalWeightKg) || 0;
      const key = `${sku}_${isPromo ? 'P' : 'C'}`;

      if (!cargoMap[key]) {
        cargoMap[key] = {
          sku,
          name,
          unit,
          isPromo,
          totalQty: 0,
          totalWeight: 0,
          allocations: []
        };
        aggregatedCargo.push(cargoMap[key]);
      }
      cargoMap[key].totalQty += qty;
      cargoMap[key].totalWeight += weight;
      if (it.allocations && it.allocations.length > 0) {
        it.allocations.forEach((al) => {
          if (!cargoMap[key].allocations.some((x) => x.lotNumber === al.lotNumber)) {
            cargoMap[key].allocations.push(al);
          }
        });
      }
    });
  });

  return (
    <div className="trip-detail-page">
      {/* 1. Breadcrumb & Top Bar */}
      <div className="trip-detail-top-nav">
        <div className="trip-breadcrumb">
          <Link to="/logistics/delivery-trips" className="breadcrumb-link">
            Quản lý chuyến xe
          </Link>
          <ChevronRight size={14} className="breadcrumb-sep" />
          <span className="breadcrumb-current">Chi tiết chuyến xe {trip.tripCode}</span>
        </div>

        <div className="trip-header-action-group">
          <button
            type="button"
            className="btn-outline-back"
            onClick={() => navigate('/logistics/delivery-trips')}
          >
            <ArrowLeft size={15} />
            <span>Danh sách</span>
          </button>

          <button
            type="button"
            className="btn-outline-refresh"
            onClick={loadData}
            title="Làm mới dữ liệu"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            className="btn-primary-dispatch"
            onClick={() => setIsDispatchModalOpen(true)}
          >
            <SlidersHorizontal size={15} />
            <span>Bàn Điều Phối & Bốc Xếp</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Header Card */}
      <div className="trip-hero-card">
        <div className="trip-hero-main">
          <div className="trip-hero-title-row">
            <div className="trip-code-box">
              <Truck size={22} className="truck-icon" />
              <h1>{trip.tripCode}</h1>
              {renderStatusBadge(trip.status)}
              <span className={`trip-type-tag ${String(trip.tripType).toLowerCase()}`}>
                {trip.tripType === 'OUTBOUND' ? 'Chuyến Xuất Bán Hàng' : 'Chuyến Nhận NCC'}
              </span>
            </div>
            {trip.notes && <p className="trip-hero-notes">Ghi chú: {trip.notes}</p>}
          </div>

          <div className="trip-quick-meta-grid">
            <div className="meta-block">
              <span className="meta-label">Biển số xe:</span>
              <span className="meta-val font-mono">{trip.licensePlate || 'Chưa xếp xe'}</span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Tài xế phụ trách:</span>
              <span className="meta-val">
                {trip.driver?.fullName || 'Chưa phân công'}
                {trip.driver?.phone ? ` (${trip.driver.phone})` : ''}
              </span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Kho xuất hàng:</span>
              <span className="meta-val">{trip.warehouse?.name || 'Kho Trung Tâm'}</span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Ngày dự kiến giao:</span>
              <span className="meta-val">
                {trip.expectedDeliveryDate ? trip.expectedDeliveryDate.slice(0, 10) : 'Chưa thiết lập'}
              </span>
            </div>
          </div>
        </div>

        {/* Action In ấn nhanh các mẫu RPT (mở hộp thoại xem trước & in, không tách thành trang riêng) */}
        <div className="trip-print-quick-actions">
          <span className="print-actions-title">In chứng từ chuyến xe:</span>
          <div className="print-buttons-row">
            <button
              type="button"
              className="btn-report-quick"
              onClick={() => openPrintModal('rpt002')}
              title="In Phiếu xuất kho cho thủ kho bốc hàng lên xe"
            >
              <Printer size={15} />
              <span>In Phiếu Xuất Kho (RPT002)</span>
            </button>

            <button
              type="button"
              className="btn-report-quick"
              onClick={() => openPrintModal('rpt004')}
              title="In Phiếu giao nhận kèm đối soát thanh toán cho cửa hàng"
            >
              <Printer size={15} />
              <span>In Phiếu Giao Nhận (RPT004)</span>
            </button>

            <button
              type="button"
              className="btn-report-quick"
              onClick={() => openPrintModal('rpt006')}
              title="In Bảng kê giao hàng & thu tiền COD đối soát với kế toán"
            >
              <Printer size={15} />
              <span>In Bảng Kê Thu Tiền (RPT006)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2b. Đường dây trạng thái chuyến xe (Status Stepper Pipeline) */}
      <div className="trip-status-pipeline-card">
        <div className="pipeline-header-row">
          <div className="pipeline-title-wrap">
            <h3>Tiến trình trạng thái chuyến xe</h3>
            {trip.status === 'SHIPPING' && (
              <span className="pipeline-progress-pill">
                Đã giao: {orders.filter((o) => o.status === 'DELIVERED' || o.status === 'DELIVERY_FAILED').length} / {orders.length} đơn
              </span>
            )}
          </div>

          <div className="pipeline-action-wrap">
            {trip.status === 'WAITING_CONFIRM' && (
              <button
                type="button"
                className="btn-pipeline-next"
                disabled={statusLoading || orders.length === 0}
                onClick={() => handleStatusAdvance('WAITING_SHIP')}
                title={orders.length === 0 ? 'Cần xếp ít nhất 1 đơn hàng lên xe' : ''}
              >
                <CheckCircle2 size={15} />
                <span>Xác nhận sẵn sàng bốc</span>
              </button>
            )}

            {trip.status === 'WAITING_SHIP' && (
              <button
                type="button"
                className="btn-pipeline-next"
                disabled={statusLoading || orders.length === 0}
                onClick={() => handleStatusAdvance('SHIPPING')}
                title={orders.length === 0 ? 'Cần xếp ít nhất 1 đơn hàng lên xe' : ''}
              >
                <Send size={15} />
                <span>Xuất bến giao hàng</span>
              </button>
            )}

            {trip.status === 'SHIPPING' && (
              <button
                type="button"
                className="btn-pipeline-complete"
                disabled={statusLoading}
                onClick={() => handleStatusAdvance('COMPLETED')}
              >
                <CheckCheck size={15} />
                <span>Hoàn tất chuyến xe</span>
              </button>
            )}

            {trip.status === 'COMPLETED' && (
              <button
                type="button"
                className="btn-pipeline-close"
                onClick={() => setIsClosingModalOpen(true)}
              >
                <Lock size={15} />
                <span>Hạ tải hàng rớt & Đóng chuyến</span>
              </button>
            )}

            {trip.status === 'CLOSED' && (
              <button
                type="button"
                className="btn-pipeline-view"
                onClick={() => setIsClosingModalOpen(true)}
              >
                <FileText size={15} />
                <span>Xem biên bản đóng chuyến</span>
              </button>
            )}
          </div>
        </div>

        {trip.status === 'CANCELLED' ? (
          <div className="pipeline-cancelled-banner">
            <AlertTriangle size={18} />
            <span>Chuyến xe này đã bị hủy và không thể tiếp tục điều phối.</span>
          </div>
        ) : (
          <div className="pipeline-steps-track">
            {TRIP_PIPELINE_STEPS.map((step, idx) => {
              const currentIdx = TRIP_PIPELINE_STEPS.findIndex((s) => s.key === trip.status);
              const isCompleted = currentIdx > idx || trip.status === 'CLOSED';
              const isCurrent = currentIdx === idx && trip.status !== 'CLOSED';
              const StepIcon = step.icon;

              return (
                <div
                  key={step.key}
                  className={`pipeline-step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  {idx > 0 && (
                    <div className={`pipeline-connector ${currentIdx >= idx ? 'filled' : ''}`} />
                  )}
                  <div className="pipeline-step-node">
                    {isCompleted ? <Check size={16} /> : <StepIcon size={16} />}
                  </div>
                  <div className="pipeline-step-text">
                    <span className="pipeline-step-label">{step.label}</span>
                    <span className="pipeline-step-sub">{step.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Metrics Summary Strip */}
      <div className="trip-summary-metrics-strip">
        <div className="metric-pill">
          <div className="metric-icon blue">
            <Package size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Điểm giao / Đơn hàng</span>
            <span className="metric-value">{orders.length} đơn ({totalPackages} kiện)</span>
          </div>
        </div>

        <div className="metric-pill">
          <div className="metric-icon amber">
            <Scale size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Tải trọng & Đầy tải</span>
            <span className="metric-value">
              {formatNumber(trip.currentWeightKg)} / {formatNumber(trip.maxWeightKg)} kg ({trip.loadPercentage}%)
            </span>
          </div>
        </div>

        <div className="metric-pill">
          <div className="metric-icon purple">
            <DollarSign size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Tổng giá trị đơn</span>
            <span className="metric-value">{formatMoney(totalRevenue)}</span>
          </div>
        </div>

        <div className="metric-pill highlight">
          <div className="metric-icon green">
            <DollarSign size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Phải thu COD (NVGH thu)</span>
            <span className="metric-value font-bold text-green-700">{formatMoney(totalCod)}</span>
          </div>
        </div>
      </div>

      {/* 3b. Bản đồ lộ trình giao hàng & Các điểm dừng */}
      <div className="trip-map-section-card">
        <div className="trip-map-header">
          <div className="trip-map-title-group">
            <div className="trip-map-icon">
              <MapIcon size={18} />
            </div>
            <div>
              <h3>Bản đồ lộ trình giao hàng ({mapData?.stops?.length || orders.length} điểm dừng)</h3>
              <p>
                Xuất phát từ <strong>{mapData?.warehouseName || trip.warehouse?.name || 'Kho trung tâm'}</strong> qua các cửa hàng trên tuyến.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-toggle-map"
            onClick={() => setShowMapSection((prev) => !prev)}
          >
            {showMapSection ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            <span>{showMapSection ? 'Thu gọn bản đồ' : 'Hiển thị bản đồ'}</span>
          </button>
        </div>

        {showMapSection && (
          <div className="trip-map-body-grid">
            <div className="trip-map-canvas-wrap">
              {mapLoading ? (
                <div className="trip-map-placeholder">
                  <span>Đang tải dữ liệu bản đồ lộ trình...</span>
                </div>
              ) : mapData?.stops && mapData.stops.length > 0 ? (
                <DeliveryMap
                  stops={mapData.stops}
                  height="380px"
                  showRoute={true}
                  mode="trip"
                  warehouseName={mapData.warehouseName}
                  warehouseCoords={mapData.warehouseCoords}
                />
              ) : (
                <div className="trip-map-placeholder">
                  <MapPin size={32} color="#94a3b8" />
                  <strong>Chưa có tọa độ GPS cho các điểm giao trên chuyến xe này</strong>
                  <span>Hãy xếp đơn hàng có tọa độ cửa hàng vào chuyến để hiển thị bản đồ tuyến đường.</span>
                </div>
              )}
            </div>

            <div className="trip-map-stops-sidebar">
              <div className="stops-sidebar-title">Thứ tự điểm giao trên tuyến</div>
              <div className="stops-sidebar-list">
                <div className="stop-origin-row">
                  <span className="stop-badge origin">KHO</span>
                  <div className="stop-row-info">
                    <strong>{mapData?.warehouseName || trip.warehouse?.name || 'Kho xuất hàng'}</strong>
                    <span>Điểm xuất phát</span>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="stops-empty-note">Chưa có điểm giao nào được gán.</div>
                ) : (
                  orders.map((ord, idx) => (
                    <div key={ord.id || idx} className="stop-order-row">
                      <span className={`stop-badge ${String(ord.status).toLowerCase()}`}>
                        {idx + 1}
                      </span>
                      <div className="stop-row-info">
                        <div className="stop-row-top">
                          <strong>{ord.retailer?.name || 'Cửa hàng'}</strong>
                          <Link to={`/sales/sales-orders/${ord.id}`} className="stop-order-code">
                            {ord.orderCode}
                          </Link>
                        </div>
                        <span>{ord.retailer?.address || 'Chưa cập nhật địa chỉ'}</span>
                        {(ord.totalFailedQty > 0 || ord.status === 'DELIVERY_FAILED') && (
                          <span className="stop-dropped-chip">
                            {ord.status === 'DELIVERY_FAILED'
                              ? 'Giao thất bại toàn bộ (rớt đơn)'
                              : `Rớt ${ord.totalFailedQty} thùng`}
                          </span>
                        )}
                        {trip.status === 'SHIPPING' && ord.status === 'SHIPPED' && (
                          <button
                            type="button"
                            className="btn-stop-confirm-delivery"
                            onClick={() => setSelectedOrderForDelivery(ord)}
                          >
                            <CheckCircle2 size={13} />
                            <span>Xác nhận Giao / Rớt hàng</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Tab Navigation Bar (chỉ giữ các tab nghiệp vụ, báo cáo dùng nút In) */}
      <div className="trip-detail-tabs-bar">
        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={16} />
          <span>Danh sách đơn hàng ({orders.length})</span>
        </button>

        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'cargo' ? 'active' : ''}`}
          onClick={() => setActiveTab('cargo')}
        >
          <Layers size={16} />
          <span>Hàng hóa bốc xếp & Lô ({aggregatedCargo.length} SKU)</span>
        </button>

        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'returns' ? 'active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          <RotateCcw size={16} />
          <span>Hàng rớt & Quyết toán COD</span>
          {(returnSummary?.returnedItems?.length || 0) > 0 && (
            <span className="tab-dropped-badge">{returnSummary.returnedItems.length}</span>
          )}
        </button>
      </div>

      {/* 5. Tab Content Views */}
      <div className="trip-tab-content-wrapper">
        {/* TAB 1: Danh sách đơn hàng */}
        {activeTab === 'orders' && (
          <div className="tab-pane-card">
            <div className="tab-pane-header">
              <div>
                <h3>Danh Sách Đơn Hàng Phân Bổ Trên Chuyến Xe</h3>
                <p>Danh sách các điểm bán, tiến độ giao nhận và số tiền cần thu theo từng cửa hàng.</p>
              </div>
              <div className="tab-pane-header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-preview-print"
                  onClick={() => openPrintModal('rpt004')}
                >
                  <Printer size={15} />
                  <span>In tất cả RPT004 ({orders.length} đơn)</span>
                </button>
                <button
                  type="button"
                  className="btn-preview-print"
                  onClick={() => openPrintModal('rpt006')}
                >
                  <Printer size={15} />
                  <span>In Bảng Kê COD (RPT006)</span>
                </button>
              </div>
            </div>

            {trip.status === 'SHIPPING' && (
              <div className="shipping-guidance-banner">
                <Truck size={16} />
                <span>
                  Chuyến xe đang giao hàng: Bấm <strong>Giao / Rớt hàng</strong> ở từng đơn để ghi nhận giao đủ 100%, giao thiếu (đơn rớt hàng) hoặc giao thất bại.
                </span>
              </div>
            )}

            {orders.length === 0 ? (
              <div className="empty-tab-state">
                <Package size={40} color="#94a3b8" />
                <p>Chưa có đơn hàng nào được xếp vào chuyến xe này.</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsDispatchModalOpen(true)}
                >
                  <SlidersHorizontal size={15} /> Mở bàn bốc xếp đơn
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="trip-orders-table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>STT</th>
                      <th>Mã Đơn Hàng</th>
                      <th>Khách Hàng / Điểm Bán</th>
                      <th>Địa Chỉ Giao Hàng</th>
                      <th style={{ textAlign: 'center' }}>Số Mặt Hàng</th>
                      <th style={{ textAlign: 'right' }}>Tổng Tiền</th>
                      <th style={{ textAlign: 'right' }}>Phải Thu COD</th>
                      <th style={{ textAlign: 'center' }}>Trạng Thái Đơn</th>
                      <th style={{ textAlign: 'center', width: 220 }}>Thao Tác & In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord, idx) => {
                      const itemCount = (ord.items || []).length;
                      const orderKg = Number(ord.orderWeightKg || 0);
                      const isShippedOrder = trip.status === 'SHIPPING' && ord.status === 'SHIPPED';

                      return (
                        <tr key={ord.id || idx}>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                            {idx + 1}
                          </td>
                          <td>
                            <Link
                              to={`/sales/sales-orders/${ord.id}`}
                              className="order-code-link"
                              title="Xem chi tiết đơn hàng"
                            >
                              {ord.orderCode}
                            </Link>
                            <div className="order-sub-weight">
                              ~{formatNumber(orderKg)} kg
                            </div>
                          </td>
                          <td>
                            <div className="retailer-name-cell">
                              <strong>{ord.retailer?.name || 'Khách lẻ'}</strong>
                              {ord.retailer?.phone && (
                                <span className="retailer-phone">
                                  <Phone size={11} /> {ord.retailer.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="retailer-address-cell">
                              <MapPin size={13} className="pin-icon" />
                              <span>{ord.retailer?.address || 'Tại cửa hàng'}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge-item-count">{itemCount} SP</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatMoney(ord.totalAmount)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={`cod-highlight-tag ${Number(ord.codAmount || 0) > 0 ? 'has-cod' : 'no-cod'}`}>
                              {formatMoney(ord.codAmount)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <span className={`badge-order-status ${String(ord.status).toLowerCase()}`}>
                                {ord.status}
                              </span>
                              {(ord.totalFailedQty > 0 || ord.status === 'DELIVERY_FAILED') && (
                                <span className="badge-dropped-qty">
                                  {ord.status === 'DELIVERY_FAILED'
                                    ? 'Rớt toàn bộ'
                                    : `Rớt ${ord.totalFailedQty} thùng`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="order-row-actions-group">
                              {isShippedOrder && (
                                <button
                                  type="button"
                                  className="btn-confirm-stop-inline"
                                  onClick={() => setSelectedOrderForDelivery(ord)}
                                  title="Xác nhận giao đủ, giao thiếu (rớt hàng) hoặc thất bại"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Giao / Rớt hàng</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-print-single-rpt"
                                onClick={() => openPrintModal('rpt004', ord)}
                                title="In phiếu giao nhận RPT004 riêng cho đơn hàng này"
                              >
                                <Printer size={13} />
                                <span>In RPT004</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="table-total-row">
                      <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>
                        TỔNG CỘNG ({orders.length} ĐIỂM GIAO):
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {totalPackages} Kiện
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>
                        {formatMoney(totalRevenue)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                        {formatMoney(totalCod)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Hàng hóa bốc xếp & Lô hàng */}
        {activeTab === 'cargo' && (
          <div className="tab-pane-card">
            <div className="tab-pane-header">
              <div>
                <h3>Bảng Kê Hàng Hóa & Số Lô Bốc Xếp (Cargo Manifest)</h3>
                <p>Tổng hợp sản phẩm theo SKU để thủ kho bốc dỡ hàng lên xe đúng quy cách và kiểm tra hạn sử dụng.</p>
              </div>
              <button
                type="button"
                className="btn-preview-print"
                onClick={() => openPrintModal('rpt002')}
              >
                <Printer size={15} />
                <span>In Phiếu Xuất Kho (RPT002)</span>
              </button>
            </div>

            {aggregatedCargo.length === 0 ? (
              <div className="empty-tab-state">
                <Layers size={40} color="#94a3b8" />
                <p>Không có sản phẩm nào trên chuyến xe.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="trip-orders-table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>STT</th>
                      <th>Mã SKU</th>
                      <th>Tên Sản Phẩm</th>
                      <th>Đơn Vị Tính</th>
                      <th>Phân Loại</th>
                      <th style={{ textAlign: 'right' }}>Tổng Số Lượng</th>
                      <th>Số Lô & Hạn Sử Dụng (Lot & Expiry)</th>
                      <th style={{ textAlign: 'right' }}>Khối Lượng Ước Tính</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedCargo.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <span className="font-mono font-bold text-blue-700">{item.sku}</span>
                        </td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>
                          <span className="badge-unit">{item.unit}</span>
                        </td>
                        <td>
                          {item.isPromo ? (
                            <span className="badge-promo-tag">Quà tặng (KM 0đ)</span>
                          ) : (
                            <span className="badge-commercial-tag">Hàng thương mại</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px' }}>
                          {formatNumber(item.totalQty)}
                        </td>
                        <td>
                          {item.allocations && item.allocations.length > 0 ? (
                            <div className="lot-badges-list">
                              {item.allocations.map((al, aIdx) => (
                                <span key={aIdx} className="lot-chip">
                                  <strong>Lô:</strong> {al.lotNumber}
                                  {al.expiryDate ? ` (HSD: ${al.expiryDate})` : ''}
                                  {al.locationCode ? ` [${al.locationCode}]` : ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-gray">Xuất theo FIFO mặc định</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: '#475569' }}>
                          ~{formatNumber(item.totalWeight)} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-total-row">
                      <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>
                        TỔNG CỘNG:
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>
                        {formatNumber(aggregatedCargo.reduce((s, it) => s + it.totalQty, 0))} Kiện
                      </td>
                      <td></td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        ~{formatNumber(aggregatedCargo.reduce((s, it) => s + it.totalWeight, 0))} kg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Hàng rớt & Quyết toán COD */}
        {activeTab === 'returns' && (
          <div className="tab-pane-card">
            <div className="tab-pane-header">
              <div>
                <h3>Tổng Hợp Hàng Rớt & Đối Soát COD Chuyến Xe</h3>
                <p>Theo dõi các mặt hàng khách từ chối/giao thiếu mang về kho và tiền mặt COD thực tế phải thu.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-preview-print"
                  onClick={() => openPrintModal('rpt006')}
                >
                  <Printer size={15} />
                  <span>In Bảng Kê COD (RPT006)</span>
                </button>
                {(trip.status === 'COMPLETED' || trip.status === 'CLOSED') && (
                  <button
                    type="button"
                    className="btn-pipeline-close"
                    onClick={() => setIsClosingModalOpen(true)}
                  >
                    <Lock size={15} />
                    <span>{trip.status === 'CLOSED' ? 'Xem Biên Bản Đóng Chuyến' : 'Hạ Tải & Đóng Chuyến'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="returns-summary-strip">
              <div className="returns-summary-box">
                <span>Giá trị đặt ban đầu</span>
                <strong>{formatMoney(returnSummary?.codSummary?.totalOrderValueOriginal ?? totalRevenue)}</strong>
              </div>
              <div className="returns-summary-box danger">
                <span>Hàng rớt hoàn kho</span>
                <strong>
                  {returnSummary?.totalReturnedPackages || 0} thùng ({formatMoney(returnSummary?.totalReturnedValue || 0)})
                </strong>
              </div>
              <div className="returns-summary-box success">
                <span>COD thực tế phải thu</span>
                <strong>{formatMoney(returnSummary?.codSummary?.totalCodExpected ?? totalCod)}</strong>
              </div>
            </div>

            {!returnSummary?.returnedItems || returnSummary.returnedItems.length === 0 ? (
              <div className="empty-tab-state">
                <CheckCircle2 size={38} color="#16a34a" />
                <p>
                  {trip.status === 'SHIPPING'
                    ? 'Chưa ghi nhận mặt hàng rớt nào. Bạn có thể bấm "Giao / Rớt hàng" ở từng đơn khi tài xế báo giao thiếu hoặc thất bại.'
                    : 'Chuyến xe không có hàng rớt (100% đơn hàng đã giao đủ).'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="trip-orders-table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>STT</th>
                      <th>Mã Đơn Hàng</th>
                      <th>Cửa Hàng / Điểm Bán</th>
                      <th>Mã SKU</th>
                      <th>Tên Sản Phẩm</th>
                      <th style={{ textAlign: 'right' }}>Đặt</th>
                      <th style={{ textAlign: 'right' }}>Thực Giao</th>
                      <th style={{ textAlign: 'right' }}>SL Rớt</th>
                      <th style={{ textAlign: 'right' }}>Giá Trị Rớt</th>
                      <th>Lý Do Rớt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnSummary.returnedItems.map((ret, idx) => (
                      <tr key={ret.itemId || idx}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                        <td>
                          <Link to={`/sales/sales-orders/${ret.orderId}`} className="order-code-link">
                            {ret.orderCode}
                          </Link>
                        </td>
                        <td><strong>{ret.retailerName}</strong></td>
                        <td><span className="font-mono font-bold text-blue-700">{ret.productSku}</span></td>
                        <td>{ret.productName}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(ret.orderedQty)}</td>
                        <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                          {formatNumber(ret.deliveredQty)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                          {formatNumber(ret.failedQty)} {ret.unit}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                          {formatMoney(ret.droppedValue)}
                        </td>
                        <td style={{ color: '#475569', fontSize: 12.5 }}>{ret.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Xem trước & In Chứng từ (RPT002 / RPT004 / RPT006) */}
      <TripReportPrintModal
        isOpen={printModal.isOpen}
        onClose={closePrintModal}
        reportType={printModal.reportType}
        trip={trip}
        initialOrder={printModal.initialOrder}
      />

      {/* Modal Xác nhận giao / rớt hàng cho từng đơn trên chuyến */}
      {selectedOrderForDelivery && (
        <ConfirmDeliveryModal
          isOpen={Boolean(selectedOrderForDelivery)}
          onClose={() => setSelectedOrderForDelivery(null)}
          tripId={trip.id}
          order={selectedOrderForDelivery}
          onDeliveryConfirmed={() => {
            setSelectedOrderForDelivery(null);
            loadData();
          }}
        />
      )}

      {/* Modal Bàn Điều Phối & Bốc Xếp (nếu người dùng bấm mở) */}
      {isDispatchModalOpen && (
        <TripDispatchConsoleModal
          tripId={trip.id}
          isOpen={isDispatchModalOpen}
          onClose={() => setIsDispatchModalOpen(false)}
          onRefreshList={loadData}
        />
      )}

      {/* Modal Hạ tải hàng rớt & Đóng chuyến (COMPLETED -> CLOSED) */}
      {isClosingModalOpen && (
        <TripClosingModal
          isOpen={isClosingModalOpen}
          onClose={() => setIsClosingModalOpen(false)}
          tripId={trip.id}
          onTripClosed={() => {
            setIsClosingModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

