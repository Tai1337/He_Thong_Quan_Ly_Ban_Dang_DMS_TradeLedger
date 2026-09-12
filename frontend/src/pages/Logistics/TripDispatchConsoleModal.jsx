import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Truck, 
  Scale, 
  Package, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw, 
  Trash2, 
  Printer, 
  MapPin, 
  Phone, 
  Calendar,
  Send,
  CheckCheck
} from 'lucide-react';
import { 
  getDeliveryTripDetail, 
  getDispatchableOrders, 
  dispatchOrdersToTrip, 
  removeOrderFromTrip, 
  updateDeliveryTripStatus, 
  getTripCargoManifest 
} from '../../services/api';
import ConfirmDeliveryModal from './ConfirmDeliveryModal';
import TripClosingModal from './TripClosingModal';
import './TripDispatchConsoleModal.css';

export default function TripDispatchConsoleModal({ tripId, isOpen, onClose, onRefreshList }) {
  const [trip, setTrip] = useState(null);
  const [dispatchableOrders, setDispatchableOrders] = useState([]);
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch', 'manifest', 'stops'
  
  // Selected order IDs in the left queue
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // State xác nhận giao hàng cho từng đơn
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);

  // State mở modal bàn giao & đóng chuyến xe
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  // Load data for the modal
  const loadTripData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError('');
    try {
      const tripData = await getDeliveryTripDetail(tripId, 1);
      setTrip(tripData);

      // Load dispatchable orders for this warehouse
      if (tripData?.warehouse?.id) {
        const queueOrders = await getDispatchableOrders(tripData.warehouse.id, 1);
        setDispatchableOrders(queueOrders);
      }

      // Preload manifest
      const manifestData = await getTripCargoManifest(tripId, 1);
      setManifest(manifestData);

      setSelectedOrderIds([]);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải dữ liệu chuyến xe');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (isOpen && tripId) {
      loadTripData();
    }
  }, [isOpen, tripId, loadTripData]);

  if (!isOpen || !tripId) return null;

  // Calculate projected weight when user selects orders in the queue
  const selectedOrdersWeight = dispatchableOrders
    .filter(o => selectedOrderIds.includes(o.id))
    .reduce((acc, o) => acc + (Number(o.orderWeightKg) || 0), 0);

  const currentWeight = Number(trip?.currentWeightKg) || 0;
  const maxWeight = Number(trip?.maxWeightKg) || 1500;
  const projectedWeight = Math.round((currentWeight + selectedOrdersWeight) * 10) / 10;
  const projectedLoadPercent = maxWeight > 0 ? Math.round((projectedWeight / maxWeight) * 100) : 0;
  const isProjectedOverweight = projectedWeight > maxWeight;

  // Toggle select an order
  const handleToggleOrder = (orderId) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Dispatch selected orders onto trip
  const handleDispatchSelected = async () => {
    if (selectedOrderIds.length === 0) return;
    setActionLoading(true);
    setError('');
    try {
      await dispatchOrdersToTrip(tripId, selectedOrderIds, 1);
      await loadTripData();
      onRefreshList && onRefreshList();
    } catch (err) {
      setError(err.message || 'Lỗi khi xếp đơn lên xe');
    } finally {
      setActionLoading(false);
    }
  };

  // Remove an order from trip
  const handleRemoveOrder = async (orderId, orderCode) => {
    if (!window.confirm(`Bạn có chắc muốn gỡ đơn [${orderCode}] khỏi chuyến xe này?`)) return;
    setActionLoading(true);
    setError('');
    try {
      await removeOrderFromTrip(tripId, orderId, 'Gỡ điều chuyển');
      await loadTripData();
      onRefreshList && onRefreshList();
    } catch (err) {
      setError(err.message || 'Lỗi khi gỡ đơn hàng');
    } finally {
      setActionLoading(false);
    }
  };

  // Change Trip status
  const handleStatusChange = async (toStatus) => {
    let confirmMsg = `Xác nhận chuyển trạng thái chuyến xe sang "${toStatus}"?`;
    if (toStatus === 'WAITING_SHIP') {
      confirmMsg = `Xác nhận chuyến xe [${trip.licensePlate || trip.tripCode}] đã hoàn tất chuẩn bị và sẵn sàng xuất bến?`;
    } else if (toStatus === 'SHIPPING') {
      confirmMsg = `Xác nhận xuất bến chuyến xe [${trip.licensePlate || trip.tripCode}]? Tất cả đơn hàng sẽ chuyển sang trạng thái "Đang giao" (SHIPPED).`;
    } else if (toStatus === 'COMPLETED') {
      confirmMsg = `Xác nhận hoàn tất chuyến xe? Các đơn hàng còn lại sẽ được xác nhận giao hoàn tất.`;
    }

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setError('');
    try {
      await updateDeliveryTripStatus(tripId, toStatus);
      await loadTripData();
      onRefreshList && onRefreshList();
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setActionLoading(false);
    }
  };

  const getGaugeColorClass = (percent) => {
    if (percent > 100) return 'danger';
    if (percent >= 85) return 'warning';
    return 'normal';
  };

  return (
    <div className="dispatch-modal-backdrop" onClick={onClose}>
      <div className="dispatch-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* 1. Header */}
        <div className="dispatch-modal-header">
          <div className="dispatch-header-title-group">
            <div className="dispatch-truck-icon-wrap">
              <Truck size={22} />
            </div>
            <div className="dispatch-header-info">
              <h2>Chuyến Xe: {trip?.tripCode} — Biển Số: {trip?.licensePlate || 'Chưa có'}</h2>
              <div className="dispatch-header-meta">
                <span>Kho xuất: <strong>{trip?.warehouse?.name || 'Mặc định'}</strong></span>
                <span>Tài xế: <strong>{trip?.driver?.fullName || 'Chưa phân công'}</strong></span>
                <span>Trạng thái: <strong style={{ color: '#2563eb' }}>{trip?.status}</strong></span>
              </div>
            </div>
          </div>

          <button type="button" className="btn-close-trip-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 2. Visual Weight Gauge Bar */}
        <div className="dispatch-gauge-card">
          <div className="gauge-top-row">
            <div className="gauge-label-group">
              <Scale size={18} color="#2563eb" />
              <span>Thước Đo Tải Trọng Xe Tải:</span>
            </div>
            <div className="gauge-values">
              <strong>{projectedWeight.toLocaleString('vi-VN')} kg</strong> / {maxWeight.toLocaleString('vi-VN')} kg ({projectedLoadPercent}%)
            </div>
          </div>

          <div className="gauge-track">
            <div 
              className={`gauge-fill ${getGaugeColorClass(projectedLoadPercent)}`}
              style={{ width: `${Math.min(100, projectedLoadPercent)}%` }}
            />
          </div>

          <div className="gauge-note-row">
            <span>
              Tải trọng còn trống: <strong>{Math.max(0, maxWeight - projectedWeight).toLocaleString('vi-VN')} kg</strong>
              {selectedOrderIds.length > 0 && (
                <em style={{ marginLeft: 8, color: '#2563eb' }}>
                  (Đang chọn thêm {selectedOrderIds.length} đơn: +{selectedOrdersWeight} kg)
                </em>
              )}
            </span>

            {isProjectedOverweight && (
              <span className="overweight-alert-chip">
                <AlertTriangle size={14} /> Cảnh báo: Vượt tải trọng xe ({projectedWeight - maxWeight} kg)!
              </span>
            )}
          </div>
        </div>

        {/* 3. Tabs Navigation */}
        <div className="dispatch-tabs-bar">
          <button 
            type="button" 
            className={`dispatch-tab-btn ${activeTab === 'dispatch' ? 'active' : ''}`}
            onClick={() => setActiveTab('dispatch')}
          >
            <Layers size={16} />
            <span>Bốc Xếp Đơn Hàng</span>
            <span className="dispatch-tab-badge">{trip?.orders?.length || 0}</span>
          </button>

          <button 
            type="button" 
            className={`dispatch-tab-btn ${activeTab === 'manifest' ? 'active' : ''}`}
            onClick={() => setActiveTab('manifest')}
          >
            <Package size={16} />
            <span>Bảng Kê Hàng Hóa & Số Lô</span>
            <span className="dispatch-tab-badge">{manifest?.cargoByLot?.length || 0}</span>
          </button>

          <button 
            type="button" 
            className={`dispatch-tab-btn ${activeTab === 'stops' ? 'active' : ''}`}
            onClick={() => setActiveTab('stops')}
          >
            <MapPin size={16} />
            <span>Điểm Giao Hàng</span>
            <span className="dispatch-tab-badge">{manifest?.retailerStops?.length || 0}</span>
          </button>
        </div>

        {/* 4. Modal Body Content */}
        <div className="dispatch-modal-content">
          {error && <div className="trip-error-alert" style={{ marginBottom: 16 }}>{error}</div>}

          {/* TAB 1: BỐC XẾP ĐƠN HÀNG */}
          {activeTab === 'dispatch' && (
            <div className="dispatch-two-cols">
              {/* Cột trái: Hàng đợi đơn ALLOCATED chờ xếp xe */}
              <div className="dispatch-col-card">
                <div className="dispatch-col-header">
                  <h4>
                    <Package size={16} color="#2563eb" />
                    <span>Hàng Đợi Đơn Chờ Xếp ({dispatchableOrders.length})</span>
                  </h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Đã chọn: {selectedOrderIds.length}</span>
                </div>

                <div className="dispatch-col-body">
                  {dispatchableOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px' }}>
                      Không có đơn hàng nào ở trạng thái "Chờ giao" (ALLOCATED) cần xếp xe.
                    </div>
                  ) : (
                    dispatchableOrders.map(order => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <div 
                          key={order.id} 
                          className={`order-dispatch-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleOrder(order.id)}
                        >
                          <div className="order-card-top">
                            <label className="order-code-chk" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => handleToggleOrder(order.id)}
                              />
                              <span>{order.orderCode}</span>
                            </label>
                            <span className="order-weight-pill">{order.orderWeightKg} kg</span>
                          </div>

                          <div className="order-card-retailer">
                            <strong>{order.retailer?.name}</strong> • {order.totalPackages} thùng
                          </div>

                          {order.lotNumbers && order.lotNumbers.length > 0 && (
                            <div className="order-card-lots">
                              <span>Số lô:</span>
                              {order.lotNumbers.map(lot => (
                                <span key={lot} className="lot-chip">{lot}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="dispatch-action-row">
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    +{selectedOrdersWeight} kg nếu đưa vào xe
                  </span>
                  <button 
                    type="button" 
                    className="btn-dispatch-confirm"
                    disabled={selectedOrderIds.length === 0 || actionLoading || isProjectedOverweight}
                    onClick={handleDispatchSelected}
                  >
                    <span>Xếp Vào Xe ({selectedOrderIds.length})</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Cột phải: Danh sách đơn ĐÃ LÊN XE */}
              <div className="dispatch-col-card">
                <div className="dispatch-col-header">
                  <h4>
                    <Truck size={16} color="#059669" />
                    <span>Đơn Hàng Đã Xếp Lên Xe ({trip?.orders?.length || 0})</span>
                  </h4>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                    {trip?.currentWeightKg} kg
                  </span>
                </div>

                <div className="dispatch-col-body">
                  {!trip?.orders || trip.orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '13px' }}>
                      Chưa có đơn hàng nào trên chuyến xe này. Hãy chọn đơn từ hàng đợi bên trái để bốc xếp.
                    </div>
                  ) : (
                    trip.orders.map(order => {
                      const isShipped = order.status === 'SHIPPED';
                      const isDelivered = order.status === 'DELIVERED';
                      const isFailed = order.status === 'DELIVERY_FAILED';

                      return (
                        <div key={order.id} className="loaded-order-card">
                          <div className="loaded-order-top">
                            <div>
                              <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{order.orderCode}</strong>
                              <span 
                                style={{ 
                                  marginLeft: 8, 
                                  fontSize: '11px', 
                                  padding: '2px 7px', 
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  background: isDelivered ? '#ecfdf5' : isFailed ? '#fef2f2' : isShipped ? '#fffbeb' : '#eff6ff',
                                  color: isDelivered ? '#059669' : isFailed ? '#dc2626' : isShipped ? '#d97706' : '#2563eb'
                                }}
                              >
                                {isDelivered ? 'Đã Giao' : isFailed ? 'Giao Thất Bại' : isShipped ? 'Đang Giao' : order.status}
                              </span>
                            </div>
                            
                            {/* Chặn xóa đơn khi xe đang SHIPPING hoặc COMPLETED */}
                            {trip.status !== 'SHIPPING' && trip.status !== 'COMPLETED' && order.status === 'ALLOCATED' && (
                              <button 
                                type="button" 
                                className="btn-remove-order"
                                title="Gỡ khỏi chuyến xe"
                                onClick={() => handleRemoveOrder(order.id, order.orderCode)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                            {/* Khi xe đang giao (SHIPPING): Nút xác nhận giao hàng cho đơn */}
                            {trip.status === 'SHIPPING' && isShipped && (
                              <button
                                type="button"
                                className="btn-confirm-order-delivery"
                                onClick={() => setSelectedOrderForDelivery(order)}
                              >
                                <CheckCircle2 size={13} />
                                <span>Xác Nhận Giao</span>
                              </button>
                            )}
                          </div>

                          <div style={{ fontSize: '12.5px', color: '#475569' }}>
                            Khách: <strong>{order.retailer?.name}</strong> • {order.retailer?.address}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                            <span>Trọng lượng: <strong style={{ color: '#0f172a' }}>{order.orderWeightKg} kg</strong></span>
                            <span>Số mặt hàng: {order.items?.length || 0}</span>
                          </div>

                          {/* Hiển thị ghi chú đơn rớt hoặc giao thất bại */}
                          {order.deliveryNotes && (
                            <div className="order-delivery-notes-tag">
                              <em>{order.deliveryNotes}</em>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BẢNG KÊ HÀNG HÓA & SỐ LÔ (LOT MANIFEST) */}
          {activeTab === 'manifest' && (
            <div className="manifest-container">
              <div className="manifest-header-bar">
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
                    Phiếu Bốc Dỡ & Bảng Kê Hàng Hóa Theo Số Lô (Lot Manifest)
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    Tổng hợp toàn bộ hàng hóa đã xếp lên xe {trip?.licensePlate} ({trip?.tripCode}). Thủ kho dùng phiếu này để lấy hàng từ các dãy kệ kho.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn-trip-cancel" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>In Bảng Kê</span>
                </button>
              </div>

              {!manifest?.cargoByLot || manifest.cargoByLot.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Chưa có hàng hóa nào trên chuyến xe này.
                </div>
              ) : (
                <table className="manifest-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Mã SKU</th>
                      <th>Tên Sản Phẩm</th>
                      <th>Số Lô (Lot Number)</th>
                      <th>Hạn Dùng (HSD)</th>
                      <th>Vị Trí Kệ Kho</th>
                      <th>Số Lượng</th>
                      <th>Trọng Lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifest.cargoByLot.map((item, idx) => (
                      <tr key={`${item.productId}-${item.lotNumber}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td><code>{item.productSku}</code></td>
                        <td><strong>{item.productName}</strong></td>
                        <td><span className="lot-chip">{item.lotNumber}</span></td>
                        <td>{item.expiryDate}</td>
                        <td><span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{item.locationCode}</span></td>
                        <td><strong>{item.totalQuantity}</strong> {item.unit}</td>
                        <td>{item.totalWeightKg} kg</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan="6" style={{ textAlign: 'right' }}>TỔNG CỘNG HÀNG TRÊN XE:</td>
                      <td>{manifest.totalPackages} Thùng</td>
                      <td>{manifest.totalTripWeightKg} kg</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: ĐIỂM DỪNG & GIAO HÀNG */}
          {activeTab === 'stops' && (
            <div className="manifest-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Lộ Trình Các Điểm Giao Hàng</h3>
                {trip?.status === 'SHIPPING' && (
                  <span style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 600 }}>
                    Tiến độ: {(trip?.orders || []).filter(o => o.status === 'DELIVERED' || o.status === 'DELIVERY_FAILED').length} / {(trip?.orders || []).length} điểm đã hoàn thành
                  </span>
                )}
              </div>

              {!manifest?.retailerStops || manifest.retailerStops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Chưa có lộ trình giao hàng nào.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {manifest.retailerStops.map((stop, index) => {
                    const matchingOrder = (trip?.orders || []).find(o => o.orderCode === stop.orderCode);
                    const isShipped = stop.status === 'SHIPPED';
                    const isDelivered = stop.status === 'DELIVERED';
                    const isFailed = stop.status === 'DELIVERY_FAILED';

                    return (
                      <div 
                        key={stop.orderCode} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '14px 16px',
                          background: isDelivered ? '#f0fdf4' : isFailed ? '#fef2f2' : '#f8fafc',
                          border: isDelivered ? '1px solid #bbf7d0' : isFailed ? '1px solid #fecaca' : '1px solid #e2e8f0',
                          borderRadius: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: '50%', 
                            background: isDelivered ? '#10b981' : isFailed ? '#ef4444' : '#2563eb', 
                            color: '#fff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px'
                          }}>
                            {stop.stopNumber}
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '14.5px', color: '#0f172a' }}>{stop.retailerName}</h4>
                            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: 3 }}>
                              <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                              {stop.address || 'Chưa cập nhật địa chỉ'}
                              {stop.phone && (
                                <span style={{ marginLeft: 12 }}>
                                  <Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                  {stop.phone}
                                </span>
                              )}
                            </div>
                            {stop.deliveryNotes && (
                              <div style={{ fontSize: '12px', color: isFailed ? '#b91c1c' : '#047857', marginTop: 4, fontWeight: 500 }}>
                                <em>Ghi chú giao: {stop.deliveryNotes}</em>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Đơn hàng: <strong>{stop.orderCode}</strong></div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{stop.orderWeightKg} kg</div>
                          </div>

                          {/* Trạng thái / Nút xác nhận giao tại điểm */}
                          {trip?.status === 'SHIPPING' && isShipped && matchingOrder && (
                            <button
                              type="button"
                              className="btn-confirm-order-delivery"
                              onClick={() => setSelectedOrderForDelivery(matchingOrder)}
                            >
                              <CheckCircle2 size={14} />
                              <span>Xác Nhận Giao Điểm Này</span>
                            </button>
                          )}

                          {isDelivered && (
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 6, fontSize: '12px', fontWeight: 700 }}>
                              ✓ Đã Giao Hàng
                            </span>
                          )}

                          {isFailed && (
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: 6, fontSize: '12px', fontWeight: 700 }}>
                              ✕ Giao Thất Bại
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Footer Controls & State Progression */}
        <div className="dispatch-modal-footer">
          <div className="footer-status-pill">
            Trạng thái hiện tại: <strong>{trip?.status}</strong>
            {trip?.status === 'SHIPPING' && (
              <span style={{ marginLeft: 8, color: '#2563eb' }}>
                (Đã giao: {(trip?.orders || []).filter(o => o.status === 'DELIVERED' || o.status === 'DELIVERY_FAILED').length} / {(trip?.orders || []).length} đơn)
              </span>
            )}
          </div>

          <div className="footer-btn-group">
            {/* WAITING_CONFIRM -> WAITING_SHIP */}
            {trip?.status === 'WAITING_CONFIRM' && (
              <button 
                type="button" 
                className="btn-trip-ship"
                disabled={actionLoading || !trip?.orders || trip.orders.length === 0}
                onClick={() => handleStatusChange('WAITING_SHIP')}
              >
                <CheckCircle2 size={15} />
                <span>Xác Nhận Xe (Sẵn Sàng Bốc)</span>
              </button>
            )}

            {/* WAITING_SHIP -> SHIPPING */}
            {trip?.status === 'WAITING_SHIP' && (
              <button 
                type="button" 
                className="btn-trip-ship"
                disabled={actionLoading || !trip?.orders || trip.orders.length === 0}
                onClick={() => handleStatusChange('SHIPPING')}
              >
                <Send size={15} />
                <span>Xuất Bến (Bắt Đầu Giao)</span>
              </button>
            )}

            {/* SHIPPING -> COMPLETED */}
            {trip?.status === 'SHIPPING' && (
              <button 
                type="button" 
                className="btn-trip-complete"
                disabled={actionLoading}
                onClick={() => handleStatusChange('COMPLETED')}
              >
                <CheckCheck size={16} />
                <span>Hoàn Tất Chuyến Xe</span>
              </button>
            )}

            {/* COMPLETED -> Mở modal Bàn giao hàng rớt & Đóng chuyến (CLOSED) */}
            {trip?.status === 'COMPLETED' && (
              <button 
                type="button" 
                className="btn-trip-close-final"
                onClick={() => setIsClosingModalOpen(true)}
              >
                <Lock size={15} />
                <span>Hạ Tải Hàng Rớt & Đóng Chuyến (CLOSED)</span>
              </button>
            )}

            {/* Đã CLOSED -> Xem lại biên bản đóng chuyến */}
            {trip?.status === 'CLOSED' && (
              <button 
                type="button" 
                className="btn-trip-view-closing"
                onClick={() => setIsClosingModalOpen(true)}
              >
                <FileText size={15} />
                <span>Xem Biên Bản Nghiệm Thu Đóng Chuyến</span>
              </button>
            )}

            {trip?.status !== 'COMPLETED' && trip?.status !== 'SHIPPING' && trip?.status !== 'CLOSED' && (
              <button 
                type="button" 
                className="btn-trip-cancel-run"
                disabled={actionLoading}
                onClick={() => handleStatusChange('CANCELLED')}
              >
                Hủy Chuyến Xe
              </button>
            )}

            <button type="button" className="btn-trip-cancel" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>

        {/* Modal Xác Nhận Giao Hàng Tại Từng Điểm Bán */}
        {selectedOrderForDelivery && (
          <ConfirmDeliveryModal
            isOpen={Boolean(selectedOrderForDelivery)}
            tripId={tripId}
            order={selectedOrderForDelivery}
            onClose={() => setSelectedOrderForDelivery(null)}
            onDeliveryConfirmed={async () => {
              await loadTripData();
              onRefreshList && onRefreshList();
            }}
          />
        )}

        {/* Modal Hạ Tải Hàng Rớt & Quyết Toán COD Đóng Chuyến Xe */}
        {isClosingModalOpen && (
          <TripClosingModal
            isOpen={isClosingModalOpen}
            tripId={tripId}
            onClose={() => setIsClosingModalOpen(false)}
            onTripClosed={async () => {
              await loadTripData();
              onRefreshList && onRefreshList();
            }}
          />
        )}
      </div>
    </div>
  );
}
