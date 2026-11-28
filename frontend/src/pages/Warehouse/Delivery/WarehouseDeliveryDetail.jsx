import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  PackageCheck,
  CheckCircle2,
  MapPin,
  Box,
} from 'lucide-react';
import {
  getDeliveryTripDetail,
  updateDeliveryTripStatus,
} from '../../../services/api';
import { useNotification } from '../../../components/Common/NotificationProvider';
import './WarehouseDeliveryDetail.css';

const WarehouseDeliveryDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, confirm } = useNotification();

  const distributorId = user?.distributorId || 1;
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDeliveryTripDetail(id, distributorId);
      setTrip(data);
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin chuyến xe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleConfirmExport = async () => {
    const ok = await confirm({
      title: 'Xác nhận hoàn tất chuẩn bị & xuất kho',
      message: `Xác nhận đã kiểm tra đủ hàng hóa và bốc xếp lên xe ${trip.tripCode}? Chuyến xe sẽ chuyển sang trạng thái Đang giao (SHIPPING).`,
      confirmText: 'Xác nhận xuất kho',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await updateDeliveryTripStatus(
        id,
        'SHIPPING',
        'Thủ kho xác nhận đã chuẩn bị đủ hàng và xuất kho lên xe',
      );
      notify.success('Đã xác nhận xuất kho thành công!');
      fetchDetail();
    } catch (err) {
      notify.error(err.message || 'Lỗi khi xác nhận xuất kho');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="wh-detail-loading">Đang tải chi tiết yêu cầu xuất kho...</div>;
  }

  if (error || !trip) {
    return (
      <div className="wh-detail-error">
        <p>{error || 'Không tìm thấy chuyến xe'}</p>
        <button onClick={() => navigate('/warehouse/delivery')}>Quay lại</button>
      </div>
    );
  }

  const isWaitingShip = trip.status === 'WAITING_SHIP';

  return (
    <div className="wh-delivery-detail-page">
      <div className="wh-detail-topbar">
        <button
          type="button"
          className="wh-btn-back"
          onClick={() => navigate('/warehouse/delivery')}
        >
          <ArrowLeft size={16} />
          <span>Danh sách xuất kho</span>
        </button>

        {isWaitingShip && (
          <button
            type="button"
            className="wh-btn-export-confirm"
            onClick={handleConfirmExport}
            disabled={submitting}
          >
            <PackageCheck size={17} />
            <span>{submitting ? 'Đang xử lý...' : 'Xác nhận đã soạn & Xuất kho'}</span>
          </button>
        )}
      </div>

      {trip.status === 'SHIPPING' && (
        <div className="wh-completed-alert">
          <CheckCircle2 size={18} />
          <span>Chuyến xe đã xuất kho và đang trên đường giao hàng.</span>
        </div>
      )}

      <div className="wh-meta-card">
        <div className="wh-meta-title">
          <Truck size={20} color="#0b3d70" />
          <h2>{trip.tripCode}</h2>
          <span className="wh-trip-status-pill">{trip.status}</span>
        </div>

        <div className="wh-meta-grid">
          <div>
            <span>Kho xuất:</span>{' '}
            <strong>{trip.warehouse?.name || 'Kho chính'}</strong>
          </div>
          <div>
            <span>Tài xế:</span>{' '}
            <strong>
              {trip.driver?.fullName || 'Chưa gán'} ({trip.licensePlate || '-'})
            </strong>
          </div>
          <div>
            <span>Tổng đơn hàng:</span>{' '}
            <strong>{trip.summary?.totalOrders ?? 0} đơn</strong>
          </div>
          <div>
            <span>Tổng số thùng / Trọng lượng:</span>{' '}
            <strong>
              {trip.summary?.totalPackages ?? 0} thùng ({trip.summary?.currentWeightKg ?? 0} kg)
            </strong>
          </div>
        </div>
      </div>

      <div className="wh-orders-section">
        <h3>
          <Box size={18} />
          Chi tiết hàng hóa cần chuẩn bị theo từng đơn hàng ({trip.orders?.length || 0} đơn)
        </h3>

        {(trip.orders || []).map((order, idx) => (
          <div key={order.id} className="wh-order-card">
            <div className="wh-order-header">
              <div>
                <strong>
                  #{idx + 1} — Đơn hàng {order.orderCode}
                </strong>
                <div className="wh-retailer-line">
                  <MapPin size={13} />
                  <span>
                    {order.retailer?.name || 'Khách hàng'} — {order.retailer?.address || ''}
                  </span>
                </div>
              </div>
              <div className="wh-order-summary">
                <span>{order.totalOrderedQty} thùng</span>
                <span>•</span>
                <span>{order.orderWeightKg} kg</span>
              </div>
            </div>

            <table className="wh-order-items-table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên sản phẩm</th>
                  <th style={{ textAlign: 'right' }}>Số lượng xuất</th>
                  <th>Lô hàng phân bổ (FEFO)</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code>{item.productSku}</code>
                    </td>
                    <td>
                      {item.productName} <small>({item.unit})</small>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {item.quantity}
                    </td>
                    <td>
                      {item.allocations && item.allocations.length > 0 ? (
                        <div className="wh-lot-pills">
                          {item.allocations.map((a) => (
                            <span key={a.id} className="wh-lot-pill">
                              Lô {a.lotNumber}: <strong>{a.quantityAllocated}</strong>
                              {a.locationCode ? ` (${a.locationCode})` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Chưa phân bổ lô</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WarehouseDeliveryDetail;

