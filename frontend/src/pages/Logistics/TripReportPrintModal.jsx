import { useState, useEffect } from 'react';
import { X, Printer, FileText, AlertTriangle, Truck } from 'lucide-react';
import { getDeliveryTripDetail } from '../../services/api';
import RPT002PrintView from './Reports/RPT002PrintView';
import RPT004PrintView from './Reports/RPT004PrintView';
import RPT006PrintView from './Reports/RPT006PrintView';
import './BatchPrintRPT002Modal.css';

const REPORT_META = {
  rpt002: {
    code: 'RPT002',
    title: 'Phiếu Xuất Kho Kiêm Bảng Kê Bốc Hàng Lên Xe',
    desc: 'Thủ kho đối soát số lô, hạn sử dụng và bàn giao hàng cho tài xế.'
  },
  rpt004: {
    code: 'RPT004',
    title: 'Phiếu Giao Hàng Kiêm Biên Bản Thanh Toán',
    desc: 'Phiếu giao nhận cho cửa hàng ký xác nhận và thu tiền COD.'
  },
  rpt006: {
    code: 'RPT006',
    title: 'Bảng Kê Giao Hàng & Thu Tiền Chuyến Xe',
    desc: 'Bảng kê danh sách cửa hàng và số tiền thu COD đối soát với kế toán.'
  }
};

export default function TripReportPrintModal({
  isOpen,
  onClose,
  reportType = 'rpt002',
  trip: initialTrip = null,
  tripId = null,
  initialOrder = null
}) {
  const [trip, setTrip] = useState(initialTrip);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(
    initialOrder?.id ? String(initialOrder.id) : 'ALL'
  );

  useEffect(() => {
    setSelectedOrderId(initialOrder?.id ? String(initialOrder.id) : 'ALL');
  }, [initialOrder, isOpen, reportType]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialTrip) {
      setTrip(initialTrip);
      setError('');
      return;
    }

    if (!tripId) return;

    let mounted = true;
    setLoading(true);
    setError('');

    getDeliveryTripDetail(tripId, 1)
      .then((data) => {
        if (mounted) setTrip(data);
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setError(err.message || 'Không thể tải dữ liệu chứng từ chuyến xe');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, initialTrip, tripId]);

  if (!isOpen) return null;

  const meta = REPORT_META[reportType] || REPORT_META.rpt002;
  const orders = trip?.orders || trip?.salesOrders || [];
  const selectedOrder =
    selectedOrderId === 'ALL'
      ? null
      : orders.find((o) => String(o.id) === String(selectedOrderId)) || initialOrder || null;

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="batch-modal-overlay" onClick={onClose}>
      <div className="batch-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="batch-modal-header no-print">
          <div className="batch-modal-title">
            <div className="batch-icon-wrapper">
              {reportType === 'rpt006' ? (
                <Truck size={20} color="#2563eb" />
              ) : (
                <FileText size={20} color="#2563eb" />
              )}
            </div>
            <div>
              <h3>
                [{meta.code}] {meta.title}
              </h3>
              <p>
                {trip?.tripCode ? `Chuyến xe: ${trip.tripCode} • ` : ''}
                {meta.desc}
              </p>
            </div>
          </div>

          <div className="batch-modal-actions">
            {reportType === 'rpt004' && orders.length > 1 && (
              <select
                className="order-filter-dropdown"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
              >
                <option value="ALL">-- Tất cả {orders.length} đơn hàng --</option>
                {orders.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    Đơn {o.orderCode} - {o.retailer?.name || 'Cửa hàng'}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btn-batch-print"
              onClick={handlePrint}
              disabled={loading || !trip}
            >
              <Printer size={16} />
              <span>
                In Khổ A4
                {reportType === 'rpt004' && selectedOrder
                  ? ` (${selectedOrder.orderCode})`
                  : ''}
              </span>
            </button>

            <button
              type="button"
              className="btn-batch-close"
              onClick={onClose}
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="batch-modal-body">
          {loading ? (
            <div className="batch-loading-state no-print">
              <div className="batch-spinner"></div>
              <p>Đang tải biểu mẫu in {meta.code}...</p>
            </div>
          ) : error || !trip ? (
            <div className="batch-error-state no-print">
              <AlertTriangle size={32} color="#dc2626" />
              <p>{error || 'Không có dữ liệu chuyến xe để in.'}</p>
            </div>
          ) : (
            <div className="batch-print-content">
              {reportType === 'rpt002' && (
                <RPT002PrintView trips={trip} currentUserName="Thủ kho" />
              )}
              {reportType === 'rpt004' && (
                <RPT004PrintView
                  trip={trip}
                  orders={selectedOrder ? [selectedOrder] : orders}
                />
              )}
              {reportType === 'rpt006' && (
                <RPT006PrintView trip={trip} accountantName="Kế toán công nợ" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
