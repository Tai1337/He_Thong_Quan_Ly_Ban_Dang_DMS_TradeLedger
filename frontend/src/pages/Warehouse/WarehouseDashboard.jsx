import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Truck, Bell, ArrowRight } from 'lucide-react';
import {
  getInventoryCounts,
  getDeliveryTripsList,
  getNotifications,
  markNotificationRead,
} from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { PageHeader, StatusBadge, DataTable } from '../../components/shared';
import '../Inventory/InventoryCount/InventoryCountList.css';
import './WarehouseDashboard.css';

const WarehouseDashboard = ({ user }) => {
  const navigate = useNavigate();
  const distributorId = user?.distributorId || 1;

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState([]);
  const [trips, setTrips] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [countsRes, tripsRes, notifRes] = await Promise.all([
        getInventoryCounts({ distributorId, limit: 50 }),
        getDeliveryTripsList({ distributorId, status: 'WAITING_SHIP', limit: 10 }),
        getNotifications({ limit: 6 }),
      ]);
      setCounts(countsRes?.data || []);
      setTrips(tripsRes?.data || []);
      setNotifications(notifRes?.data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu bảng điều khiển Thủ kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const rejectedCounts = counts.filter((c) => c.status === 'REJECTED');
  const draftCounts = counts.filter((c) => c.status === 'DRAFT');
  const waitingCounts = counts.filter((c) => c.status === 'WAITING_APPROVAL');
  const pendingWorkCounts = [...rejectedCounts, ...draftCounts].slice(0, 5);

  const handleOpenNotification = async (notif) => {
    try {
      if (!notif.isRead) {
        await markNotificationRead(notif.id);
      }
    } catch {
      // ignore error when navigating
    }
    if (notif.navigateTo) {
      navigate(notif.navigateTo);
    }
  };

  const stocktakeColumns = [
    {
      title: 'MÃ PHIẾU',
      key: 'countCode',
      render: (_, row) => (
        <span
          className="erp-count-code"
          onClick={() => navigate(`/warehouse/stocktake/${row.id}`)}
        >
          {row.countCode}
        </span>
      ),
    },
    {
      title: 'KHO KIỂM KÊ',
      key: 'warehouse',
      render: (_, row) => row.warehouse?.name || 'Kho chính',
    },
    {
      title: 'TRẠNG THÁI',
      key: 'status',
      render: (_, row) =>
        row.status === 'REJECTED' ? (
          <StatusBadge variant="danger" dot label="Bị từ chối" />
        ) : (
          <StatusBadge variant="primary" dot label="Chờ kiểm đếm" />
        ),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          className="erp-action-link"
          onClick={() => navigate(`/warehouse/stocktake/${row.id}`)}
        >
          Kiểm kê
        </button>
      ),
    },
  ];

  const tripColumns = [
    {
      title: 'MÃ CHUYẾN',
      key: 'tripCode',
      render: (_, row) => (
        <span
          className="erp-count-code"
          onClick={() => navigate(`/warehouse/delivery/${row.id}`)}
        >
          {row.tripCode}
        </span>
      ),
    },
    {
      title: 'XE / ĐƠN HÀNG',
      key: 'info',
      render: (_, row) => `${row.licensePlate || '-'} • ${row.ordersCount} đơn (${row.totalPackagesCount} thùng)`,
    },
    {
      title: 'TRẠNG THÁI',
      key: 'status',
      render: () => <StatusBadge variant="warning" dot label="Chờ xuất kho" />,
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          className="erp-action-link"
          onClick={() => navigate(`/warehouse/delivery/${row.id}`)}
        >
          Soạn hàng
        </button>
      ),
    },
  ];

  return (
    <div className="inventory-count-erp-page">
      <PageHeader
        breadcrumb="DMS-NPP TradeLedger / Thủ kho / Bảng điều khiển"
        title="Không Gian Làm Việc Thủ Kho"
        badge="Thủ kho"
        description={`Xin chào ${user?.fullName || user?.username || 'Thủ kho'} — theo dõi phiếu kiểm kê và yêu cầu xuất kho cần xử lý.`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate('/warehouse/delivery')}
              className="btn-erp-header-action"
            >
              <Truck size={16} />
              <span>Yêu cầu xuất kho</span>
            </Button>
            <Button
              variant="default"
              onClick={() => navigate('/warehouse/stocktake')}
              className="btn-erp-header-primary"
            >
              <ClipboardCheck size={16} />
              <span>Phiếu kiểm kê</span>
            </Button>
          </>
        }
      />

      {error && (
        <div className="create-modal-error" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      )}

      <div className="erp-kpi-grid">
        <Card className="erp-kpi-card wh-clickable-card" onClick={() => navigate('/warehouse/stocktake?status=REJECTED')}>
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Phiếu bị từ chối</span>
            <span className="erp-kpi-dot dot-danger" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{rejectedCounts.length}</span>
            <span className={`erp-kpi-badge ${rejectedCounts.length > 0 ? 'badge-danger-soft' : 'badge-neutral-soft'}`}>
              {rejectedCounts.length > 0 ? 'Cần sửa ngay' : 'Không có'}
            </span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Kiểm tra lại theo lý do Admin phản hồi</span>
          </div>
        </Card>

        <Card className="erp-kpi-card wh-clickable-card" onClick={() => navigate('/warehouse/stocktake?status=DRAFT')}>
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Phiếu chờ kiểm đếm</span>
            <span className="erp-kpi-tag-neutral">Nhiệm vụ mới</span>
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{draftCounts.length}</span>
            <span className="erp-kpi-subtext">Phiếu được giao</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Nhập số lượng thực tế và gửi Admin</span>
          </div>
        </Card>

        <Card className="erp-kpi-card wh-clickable-card" onClick={() => navigate('/warehouse/stocktake?status=WAITING_APPROVAL')}>
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Đang chờ Admin duyệt</span>
            <span className="erp-kpi-dot dot-warning" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{waitingCounts.length}</span>
            <span className="erp-kpi-badge badge-warning-soft">{waitingCounts.length} chờ duyệt</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Đã hoàn tất kiểm đếm thực tế</span>
          </div>
        </Card>

        <Card className="erp-kpi-card wh-clickable-card" onClick={() => navigate('/warehouse/delivery')}>
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Chuyến xe chờ xuất kho</span>
            <span className="erp-kpi-dot dot-success" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{trips.length}</span>
            <span className="erp-kpi-badge badge-success-soft">Sẵn sàng bốc hàng</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Chuẩn bị hàng theo lô FEFO lên xe</span>
          </div>
        </Card>
      </div>

      <div className="wh-erp-two-col">
        <Card className="wh-erp-section-card">
          <div className="wh-erp-section-head">
            <h3>Phiếu kiểm kê cần xử lý</h3>
            <button type="button" className="erp-action-link" onClick={() => navigate('/warehouse/stocktake')}>
              Xem tất cả <ArrowRight size={13} style={{ display: 'inline' }} />
            </button>
          </div>
          <DataTable
            columns={stocktakeColumns}
            data={pendingWorkCounts}
            loading={loading}
            emptyText="Không có phiếu kiểm kê nào cần thực hiện ngay"
          />
        </Card>

        <Card className="wh-erp-section-card">
          <div className="wh-erp-section-head">
            <h3>Chuyến xe chờ xuất kho</h3>
            <button type="button" className="erp-action-link" onClick={() => navigate('/warehouse/delivery')}>
              Xem tất cả <ArrowRight size={13} style={{ display: 'inline' }} />
            </button>
          </div>
          <DataTable
            columns={tripColumns}
            data={trips.slice(0, 5)}
            loading={loading}
            emptyText="Hiện chưa có chuyến xe nào chờ xuất hàng"
          />
        </Card>
      </div>

      <Card className="wh-erp-section-card" style={{ marginTop: 16 }}>
        <div className="wh-erp-section-head">
          <h3>
            <Bell size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
            Thông báo gần đây
          </h3>
          <button type="button" className="erp-action-link" onClick={() => navigate('/warehouse/notifications')}>
            Tất cả thông báo <ArrowRight size={13} style={{ display: 'inline' }} />
          </button>
        </div>
        {notifications.length === 0 ? (
          <div className="wh-empty">Chưa có thông báo nào.</div>
        ) : (
          <div className="wh-list">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`wh-list-item ${!n.isRead ? 'unread' : ''}`}
                onClick={() => handleOpenNotification(n)}
              >
                <div>
                  <div className="wh-item-title">
                    {!n.isRead && <span className="wh-unread-dot" />}
                    <strong>{n.title}</strong>
                  </div>
                  <div className="wh-item-sub">{n.body}</div>
                </div>
                <span className="wh-time">{new Date(n.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default WarehouseDashboard;
