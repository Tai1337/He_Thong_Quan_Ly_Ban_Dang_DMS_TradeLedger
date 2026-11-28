import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, PackageCheck } from 'lucide-react';
import { getDeliveryTripsList } from '../../../services/api';
import { Card } from '../../../components/ui/card';
import {
  PageHeader,
  FilterToolbar,
  StatusBadge,
  DataTable,
  Pagination,
} from '../../../components/shared';
import '../../Inventory/InventoryCount/InventoryCountList.css';
import './WarehouseDeliveryList.css';

const WarehouseDeliveryList = ({ user }) => {
  const navigate = useNavigate();
  const distributorId = user?.distributorId || 1;

  const [trips, setTrips] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncTime, setSyncTime] = useState('');

  const [activeTab, setActiveTab] = useState('waiting_ship');
  const [filters, setFilters] = useState({
    search: '',
    status: 'WAITING_SHIP',
    page: 1,
    limit: 10,
  });

  const updateSyncTimestamp = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'CH' : 'SA';
    setSyncTime(`${hours}:${minutes} ${ampm}`);
  };

  const fetchTrips = async () => {
    setLoading(true);
    setError('');
    try {
      const statusParam =
        activeTab === 'waiting_ship'
          ? 'WAITING_SHIP'
          : activeTab === 'shipping'
            ? 'SHIPPING'
            : activeTab === 'completed'
              ? 'COMPLETED'
              : filters.status || undefined;

      const res = await getDeliveryTripsList({
        distributorId,
        status: statusParam,
        search: filters.search || undefined,
        page: filters.page,
        limit: filters.limit,
      });
      setTrips(res?.data || []);
      setTotal(res?.total || 0);
      updateSyncTimestamp();
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách yêu cầu xuất kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [activeTab, filters.page, filters.limit, filters.status]);

  const waitingShipCount = trips.filter((t) => t.status === 'WAITING_SHIP').length;
  const shippingCount = trips.filter((t) => t.status === 'SHIPPING').length;
  const completedCount = trips.filter((t) => t.status === 'COMPLETED').length;

  const toolbarTabs = [
    { id: 'waiting_ship', label: 'Chờ xuất kho', count: activeTab === 'waiting_ship' ? total : waitingShipCount, variant: 'warning' },
    { id: 'shipping', label: 'Đang giao hàng', count: activeTab === 'shipping' ? total : shippingCount, variant: 'primary' },
    { id: 'completed', label: 'Đã hoàn tất', count: activeTab === 'completed' ? total : completedCount, variant: 'success' },
    { id: 'all', label: 'Tất cả chuyến', count: activeTab === 'all' ? total : trips.length },
  ];

  const columns = [
    {
      title: 'MÃ CHUYẾN XE',
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
      title: 'KHO XUẤT HÀNG',
      key: 'warehouse',
      render: (_, row) => (
        <div className="erp-warehouse-cell">
          <span className="wh-name">{row.warehouse?.name || 'Kho chính'}</span>
          <span className="wh-code">{row.warehouse?.code || 'KHO'}</span>
        </div>
      ),
    },
    {
      title: 'TÀI XẾ / BIỂN SỐ',
      key: 'driver',
      render: (_, row) => (
        <div className="erp-warehouse-cell">
          <span className="wh-name">{row.driver?.fullName || 'Chưa phân công'}</span>
          <span className="wh-code">{row.licensePlate || 'Chưa có biển số'}</span>
        </div>
      ),
    },
    {
      title: 'SỐ ĐƠN / THÙNG',
      key: 'packages',
      render: (_, row) => `${row.ordersCount} đơn / ${row.totalPackagesCount} thùng`,
    },
    {
      title: 'TRỌNG LƯỢNG',
      key: 'weight',
      render: (_, row) => `${row.currentWeightKg} / ${row.maxWeightKg} kg`,
    },
    {
      title: 'TRẠNG THÁI',
      key: 'status',
      render: (_, row) => {
        if (row.status === 'WAITING_SHIP') return <StatusBadge variant="warning" dot label="Chờ xuất kho" />;
        if (row.status === 'SHIPPING') return <StatusBadge variant="primary" dot label="Đã xuất — Đang giao" />;
        if (row.status === 'COMPLETED') return <StatusBadge variant="success" dot label="Hoàn tất" />;
        return <StatusBadge variant="neutral" dot label={row.status} />;
      },
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <div className="erp-table-actions">
          <button
            type="button"
            className="erp-action-link"
            onClick={() => navigate(`/warehouse/delivery/${row.id}`)}
          >
            {row.status === 'WAITING_SHIP' ? (
              <>
                <PackageCheck size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                Soạn & Xuất kho
              </>
            ) : (
              <>
                <Eye size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                Xem chi tiết
              </>
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="inventory-count-erp-page">
      <PageHeader
        breadcrumb="DMS-NPP TradeLedger / Thủ kho / Yêu cầu xuất kho"
        title="Yêu Cầu Xuất Kho Theo Chuyến Xe"
        badge="Thủ kho"
        description="Kiểm tra chi tiết đơn hàng, số lô FEFO cần soạn và xác nhận xuất hàng lên xe giao."
      />

      <div className="erp-kpi-grid">
        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Chuyến hiển thị</span>
            <span className="erp-kpi-tag-neutral">Theo bộ lọc</span>
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{total}</span>
            <span className="erp-kpi-subtext">Chuyến xe</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Tổng hợp điều phối từ bộ phận Bán hàng</span>
          </div>
        </Card>

        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Chờ chuẩn bị & xuất</span>
            <span className="erp-kpi-dot dot-warning" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{waitingShipCount}</span>
            <span className="erp-kpi-badge badge-warning-soft">{waitingShipCount} chờ soạn</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Ưu tiên kiểm tra và bốc xếp lên xe</span>
          </div>
        </Card>

        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Đã xuất — Đang giao</span>
            <span className="erp-kpi-dot dot-success" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{shippingCount}</span>
            <span className="erp-kpi-badge badge-neutral-soft">Đang vận chuyển</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Xe đã rời kho NPP</span>
          </div>
        </Card>

        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Đã hoàn tất</span>
            <span className="erp-kpi-dot dot-success" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{completedCount}</span>
            <span className="erp-kpi-badge badge-success-soft">Giao xong</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Đã trừ tồn kho và đối soát</span>
          </div>
        </Card>
      </div>

      {error && (
        <div className="create-modal-error" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      )}

      <FilterToolbar
        tabs={toolbarTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          setFilters((prev) => ({ ...prev, page: 1 }));
        }}
        syncTime={syncTime}
        onRefresh={fetchTrips}
        searchValue={filters.search}
        onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val, page: 1 }))}
        searchPlaceholder="Tìm mã chuyến xe, biển số..."
        onReset={() => {
          setActiveTab('waiting_ship');
          setFilters({ search: '', status: 'WAITING_SHIP', page: 1, limit: 10 });
        }}
      />

      <DataTable
        columns={columns}
        data={trips}
        loading={loading}
        emptyText="Không có chuyến xe nào phù hợp"
      />

      {!loading && total > 0 && (
        <Pagination
          page={filters.page}
          pageSize={filters.limit}
          total={total}
          itemLabel="chuyến xe"
          onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          onPageSizeChange={(sz) => setFilters((prev) => ({ ...prev, limit: sz, page: 1 }))}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
};

export default WarehouseDeliveryList;
