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
  Check
} from 'lucide-react';
import { getDeliveryTripDetail } from '../../services/api';
import RPT002PrintView from './Reports/RPT002PrintView';
import RPT004PrintView from './Reports/RPT004PrintView';
import RPT006PrintView from './Reports/RPT006PrintView';
import TripDispatchConsoleModal from './TripDispatchConsoleModal';
import './DeliveryTripDetail.css';

const formatMoney = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(val) || 0) + ' đ';

const formatNumber = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(val) || 0);

export default function DeliveryTripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'cargo', 'rpt002', 'rpt004', 'rpt006'
  const [selectedOrderForRpt004, setSelectedOrderForRpt004] = useState(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getDeliveryTripDetail(id, 1);
      setTrip(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tải thông tin chi tiết chuyến xe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSingleOrder = (order) => {
    setSelectedOrderForRpt004(order);
    setActiveTab('rpt004');
    setTimeout(() => {
      window.print();
    }, 300);
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

        {/* Action In ấn nhanh các mẫu RPT */}
        <div className="trip-print-quick-actions">
          <span className="print-actions-title">In ấn chứng từ chuyến xe:</span>
          <div className="print-buttons-row">
            <button
              type="button"
              className={`btn-report-quick ${activeTab === 'rpt002' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('rpt002');
              }}
              title="Phiếu xuất kho: Thủ kho kiểm kê lấy hàng bốc lên xe"
            >
              <FileText size={15} />
              <span>RPT002: Phiếu Xuất Kho</span>
            </button>

            <button
              type="button"
              className={`btn-report-quick ${activeTab === 'rpt004' ? 'active' : ''}`}
              onClick={() => {
                setSelectedOrderForRpt004(null);
                setActiveTab('rpt004');
              }}
              title="Phiếu giao nhận: Giao cho từng cửa hàng kèm đối soát thanh toán"
            >
              <FileText size={15} />
              <span>RPT004: Phiếu Giao Nhận</span>
            </button>

            <button
              type="button"
              className={`btn-report-quick ${activeTab === 'rpt006' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('rpt006');
              }}
              title="Bảng kê giao hàng: Đối soát tiền thu COD với kế toán"
            >
              <FileText size={15} />
              <span>RPT006: Bảng Kê Giao & Thu Tiền</span>
            </button>
          </div>
        </div>
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

      {/* 4. Tab Navigation Bar */}
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
          className={`tab-item-btn ${activeTab === 'rpt002' ? 'active' : ''}`}
          onClick={() => setActiveTab('rpt002')}
        >
          <Printer size={16} />
          <span>RPT002 - Phiếu Xuất Kho</span>
        </button>

        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'rpt004' ? 'active' : ''}`}
          onClick={() => {
            setSelectedOrderForRpt004(null);
            setActiveTab('rpt004');
          }}
        >
          <Printer size={16} />
          <span>RPT004 - Phiếu Giao Nhận</span>
        </button>

        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'rpt006' ? 'active' : ''}`}
          onClick={() => setActiveTab('rpt006')}
        >
          <Printer size={16} />
          <span>RPT006 - Bảng Kê Giao Hàng & Thu Tiền</span>
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
              <div className="tab-pane-header-actions">
                <button
                  type="button"
                  className="btn-preview-print"
                  onClick={() => {
                    setSelectedOrderForRpt004(null);
                    setActiveTab('rpt004');
                  }}
                >
                  <Printer size={15} />
                  <span>In tất cả RPT004 cho {orders.length} đơn</span>
                </button>
              </div>
            </div>

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
                      <th style={{ textAlign: 'center', width: 140 }}>In Chứng Từ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord, idx) => {
                      const itemCount = (ord.items || []).length;
                      const orderKg = Number(ord.orderWeightKg || 0);

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
                            <span className={`badge-order-status ${String(ord.status).toLowerCase()}`}>
                              {ord.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-print-single-rpt"
                              onClick={() => handlePrintSingleOrder(ord)}
                              title="In phiếu giao nhận RPT004 riêng cho đơn hàng này"
                            >
                              <Printer size={13} />
                              <span>In RPT004</span>
                            </button>
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
                onClick={() => setActiveTab('rpt002')}
              >
                <Printer size={15} />
                <span>Xem & In Phiếu Xuất Kho (RPT002)</span>
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

        {/* TAB 3: RPT002 - Phiếu Xuất Kho */}
        {activeTab === 'rpt002' && (
          <div className="tab-pane-report-preview">
            <div className="report-action-toolbar no-print">
              <div className="toolbar-info">
                <h4>[RPT002] Phiếu Xuất Kho Kiêm Bảng Kê Bốc Hàng Lên Xe</h4>
                <p>Thủ kho dùng mẫu này để kiểm đếm sản phẩm trong kho, đối soát số lô và bàn giao cho tài xế.</p>
              </div>
              <div className="toolbar-buttons">
                <button type="button" className="btn-print-main" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>In Phiếu Xuất Kho (A4)</span>
                </button>
              </div>
            </div>

            <div className="printable-report-wrapper">
              <RPT002PrintView trips={trip} currentUserName="Thủ kho" />
            </div>
          </div>
        )}

        {/* TAB 4: RPT004 - Phiếu Giao Nhận Thanh Toán */}
        {activeTab === 'rpt004' && (
          <div className="tab-pane-report-preview">
            <div className="report-action-toolbar no-print">
              <div className="toolbar-info">
                <h4>[RPT004] Phiếu Giao Hàng & Biên Bản Thanh Toán</h4>
                <p>
                  Phiếu giao nhận cho từng đơn hàng của chuyến xe, đưa cho đại lý/cửa hàng ký xác nhận và thu tiền.
                </p>
              </div>
              <div className="toolbar-buttons">
                {orders.length > 1 && (
                  <select
                    className="order-filter-dropdown"
                    value={selectedOrderForRpt004 ? selectedOrderForRpt004.id : 'ALL'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'ALL') {
                        setSelectedOrderForRpt004(null);
                      } else {
                        const found = orders.find((o) => String(o.id) === String(val));
                        setSelectedOrderForRpt004(found || null);
                      }
                    }}
                  >
                    <option value="ALL">-- In tất cả {orders.length} đơn hàng --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        Đơn {o.orderCode} - {o.retailer?.name || 'Cửa hàng'}
                      </option>
                    ))}
                  </select>
                )}

                <button type="button" className="btn-print-main" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>
                    In Phiếu Giao Hàng {selectedOrderForRpt004 ? `(Đơn ${selectedOrderForRpt004.orderCode})` : `(Tất cả ${orders.length} đơn)`}
                  </span>
                </button>
              </div>
            </div>

            <div className="printable-report-wrapper">
              <RPT004PrintView
                trip={trip}
                orders={selectedOrderForRpt004 ? [selectedOrderForRpt004] : orders}
              />
            </div>
          </div>
        )}

        {/* TAB 5: RPT006 - Bảng Kê Giao Hàng & Thu Tiền */}
        {activeTab === 'rpt006' && (
          <div className="tab-pane-report-preview">
            <div className="report-action-toolbar no-print">
              <div className="toolbar-info">
                <h4>[RPT006] Bảng Kê Giao Hàng & Thu Tiền Chuyến Xe</h4>
                <p>
                  Bảng kê danh sách cửa hàng và số tiền thu COD thực tế để nhân viên giao hàng làm việc đối soát với kế toán.
                </p>
              </div>
              <div className="toolbar-buttons">
                <button type="button" className="btn-print-main" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>In Bảng Kê Thu Tiền (A4)</span>
                </button>
              </div>
            </div>

            <div className="printable-report-wrapper">
              <RPT006PrintView trip={trip} accountantName="Kế toán công nợ" />
            </div>
          </div>
        )}
      </div>

      {/* Modal Bàn Điều Phối & Bốc Xếp (nếu người dùng bấm mở) */}
      {isDispatchModalOpen && (
        <TripDispatchConsoleModal
          tripId={trip.id}
          isOpen={isDispatchModalOpen}
          onClose={() => setIsDispatchModalOpen(false)}
          onRefreshList={loadData}
        />
      )}
    </div>
  );
}
