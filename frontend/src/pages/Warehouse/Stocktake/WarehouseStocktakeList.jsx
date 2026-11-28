import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, FileSpreadsheet, Eye } from 'lucide-react';
import { getInventoryCounts, getWarehouses } from '../../../services/api';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import {
  PageHeader,
  FilterToolbar,
  StatusBadge,
  DataTable,
  Pagination,
} from '../../../components/shared';
import '../../Inventory/InventoryCount/InventoryCountList.css';
import './WarehouseStocktakeList.css';

const WarehouseStocktakeList = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const distributorId = user?.distributorId || 1;

  const [counts, setCounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncTime, setSyncTime] = useState('');

  const initialStatus = searchParams.get('status') || '';
  const [activeTab, setActiveTab] = useState(
    initialStatus === 'REJECTED'
      ? 'rejected'
      : initialStatus === 'DRAFT'
        ? 'draft'
        : initialStatus === 'WAITING_APPROVAL'
          ? 'waiting'
          : initialStatus === 'COMPLETED'
            ? 'completed'
            : 'all',
  );

  const [filters, setFilters] = useState({
    search: '',
    warehouseId: '',
    status: initialStatus,
    countType: '',
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    getWarehouses(distributorId)
      .then((data) => setWarehouses(data || []))
      .catch(() => {});
  }, [distributorId]);

  const updateSyncTimestamp = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'CH' : 'SA';
    setSyncTime(`${hours}:${minutes} ${ampm}`);
  };

  const fetchCounts = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = { ...filters, distributorId };
      if (activeTab === 'rejected') queryParams.status = 'REJECTED';
      else if (activeTab === 'draft') queryParams.status = 'DRAFT';
      else if (activeTab === 'waiting') queryParams.status = 'WAITING_APPROVAL';
      else if (activeTab === 'completed') queryParams.status = 'COMPLETED';

      const res = await getInventoryCounts(queryParams);
      setCounts(res?.data || []);
      setTotal(res?.total || 0);
      updateSyncTimestamp();
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách phiếu kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [
    filters.page,
    filters.limit,
    filters.warehouseId,
    filters.status,
    filters.countType,
    filters.fromDate,
    filters.toDate,
    activeTab,
  ]);

  const rejectedCount = counts.filter((c) => c.status === 'REJECTED').length;
  const draftCount = counts.filter((c) => c.status === 'DRAFT').length;
  const waitingCount = counts.filter((c) => c.status === 'WAITING_APPROVAL').length;
  const completedCount = counts.filter((c) => c.status === 'COMPLETED').length;
  const todoCount = rejectedCount + draftCount;

  const toolbarTabs = [
    { id: 'all', label: 'Tất cả phiếu', count: total },
    { id: 'rejected', label: 'Bị từ chối', count: rejectedCount, variant: 'danger' },
    { id: 'draft', label: 'Chờ kiểm đếm', count: draftCount, variant: 'primary' },
    { id: 'waiting', label: 'Chờ duyệt', count: waitingCount, variant: 'warning' },
    { id: 'completed', label: 'Đã cân kho', count: completedCount, variant: 'success' },
  ];

  const handleExportList = () => {
    if (counts.length === 0) return;
    const headers = ['Mã phiếu', 'Kho kiểm kê', 'Hình thức', 'Ngày tạo', 'Người lập', 'Số lượng SKU', 'Trạng thái'];
    const rows = counts.map((c) => [
      c.countCode,
      c.warehouse?.name || '',
      c.countType === 'MONTHLY' ? 'Định kỳ tháng' : 'Đột xuất SKU',
      new Date(c.createdAt).toLocaleDateString('vi-VN'),
      c.createdBy?.fullName || 'Hệ thống',
      c.summary?.totalSkus || c._count?.items || 0,
      c.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `PhieuKiemKe_ThuKho_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
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
      render: (_, row) => (
        <div className="erp-warehouse-cell">
          <span className="wh-name">{row.warehouse?.name || 'Kho NPP mặc định'}</span>
          <span className="wh-code">{row.warehouse?.code || 'KHO'}</span>
        </div>
      ),
    },
    {
      title: 'HÌNH THỨC',
      key: 'countType',
      render: (_, row) => (
        <StatusBadge
          variant="neutral"
          dot={false}
          label={row.countType === 'MONTHLY' ? 'Định kỳ tháng' : 'Đột xuất SKU'}
        />
      ),
    },
    {
      title: 'NGÀY TẠO',
      key: 'createdAt',
      render: (_, row) => {
        const dateObj = new Date(row.createdAt);
        return (
          <div className="erp-date-cell">
            <span className="date-part">{dateObj.toLocaleDateString('vi-VN')}</span>
            <span className="time-part">
              {dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
        );
      },
    },
    {
      title: 'NGƯỜI LẬP',
      key: 'createdBy',
      render: (_, row) => (
        <span className="erp-author-text">{row.createdBy?.fullName || 'Quản trị viên'}</span>
      ),
    },
    {
      title: 'SỐ LƯỢNG SKU',
      key: 'skuCount',
      align: 'center',
      render: (_, row) => (
        <span className="erp-sku-number">{row.summary?.totalSkus || row._count?.items || 0}</span>
      ),
    },
    {
      title: 'KẾT QUẢ ĐỐI SOÁT',
      key: 'auditResult',
      render: (_, row) => {
        const summary = row.summary || {};
        if (row.status === 'DRAFT' && !summary.hasVariance && (!summary.totalSkus || summary.uncountedCount > 0)) {
          return <StatusBadge variant="secondary" dot={false} label="Chưa kiểm đếm" />;
        }
        if (summary.hasVariance) {
          return (
            <StatusBadge
              variant="danger"
              dot
              label={`Lệch: +${summary.surplusCount || 0} / -${summary.deficitCount || 0}`}
            />
          );
        }
        return <StatusBadge variant="success" dot label="Đã khớp 100%" />;
      },
    },
    {
      title: 'TRẠNG THÁI',
      key: 'status',
      render: (_, row) => {
        if (row.status === 'COMPLETED') return <StatusBadge variant="success" dot label="Đã cân kho" />;
        if (row.status === 'WAITING_APPROVAL') return <StatusBadge variant="warning" dot label="Chờ Admin duyệt" />;
        if (row.status === 'REJECTED') return <StatusBadge variant="danger" dot label="Bị từ chối" />;
        if (row.status === 'CANCELLED') return <StatusBadge variant="muted" dot label="Đã hủy" />;
        return <StatusBadge variant="primary" dot label="Chờ kiểm đếm" />;
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
            onClick={() => navigate(`/warehouse/stocktake/${row.id}`)}
          >
            <Eye size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
            {row.status === 'DRAFT' || row.status === 'REJECTED' ? 'Thực hiện kiểm kê' : 'Xem chi tiết'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="inventory-count-erp-page">
      <PageHeader
        breadcrumb="DMS-NPP TradeLedger / Thủ kho / Phiếu kiểm kê"
        title="Phiếu Kiểm Kê Kho Hàng"
        badge="Thủ kho"
        description="Thực hiện kiểm đếm số lượng thực tế, giải trình chênh lệch và gửi kết quả để Admin phê duyệt."
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportList}
              className="btn-erp-header-action"
            >
              <FileSpreadsheet size={16} />
              <span>Xuất Excel</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              className="btn-erp-header-icon"
              title="In trang"
            >
              <Printer size={16} />
            </Button>
          </>
        }
      />

      <div className="erp-kpi-grid">
        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Tổng số phiếu</span>
            <span className="erp-kpi-tag-neutral">Được giao</span>
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{total}</span>
            <span className="erp-kpi-subtext">Toàn bộ kho</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>{warehouses.length > 0 ? `${warehouses.length} kho hàng trực thuộc NPP` : 'Kho hàng NPP'}</span>
          </div>
        </Card>

        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Cần kiểm đếm / sửa lại</span>
            <span className="erp-kpi-dot dot-danger" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{todoCount}</span>
            <span className={`erp-kpi-badge ${todoCount > 0 ? 'badge-danger-soft' : 'badge-neutral-soft'}`}>
              {rejectedCount > 0 ? `${rejectedCount} bị từ chối` : `${draftCount} phiếu mới`}
            </span>
          </div>
          <div className="erp-kpi-row-3">
            <span>{todoCount === 0 ? 'Đã hoàn tất kiểm đếm' : 'Ưu tiên xử lý các phiếu bị từ chối'}</span>
          </div>
        </Card>

        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Chờ Admin duyệt</span>
            <span className="erp-kpi-dot dot-warning" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{waitingCount}</span>
            <span className="erp-kpi-badge badge-warning-soft">{waitingCount} chờ duyệt</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Đã khóa số liệu, chờ phản hồi Admin</span>
          </div>
        </Card>

        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Đã cân kho hoàn tất</span>
            <span className="erp-kpi-dot dot-success" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{completedCount}</span>
            <span className="erp-kpi-badge badge-success-soft">Đã cập nhật thẻ kho</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>Số dư đã chốt với hệ thống</span>
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
          setFilters((prev) => ({ ...prev, status: '', page: 1 }));
        }}
        syncTime={syncTime}
        onRefresh={fetchCounts}
        searchValue={filters.search}
        onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val, page: 1 }))}
        searchPlaceholder="Tìm mã phiếu, mã SKU, người lập..."
        filters={
          <>
            <select
              className="erp-filter-select"
              value={filters.warehouseId}
              onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))}
            >
              <option value="">Tất cả kho hàng</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <select
              className="erp-filter-select"
              value={filters.status}
              onChange={(e) => {
                setActiveTab('all');
                setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }));
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="REJECTED">Bị từ chối</option>
              <option value="DRAFT">Chờ kiểm đếm</option>
              <option value="WAITING_APPROVAL">Chờ duyệt</option>
              <option value="COMPLETED">Đã cân kho</option>
            </select>

            <select
              className="erp-filter-select"
              value={filters.countType}
              onChange={(e) => setFilters((prev) => ({ ...prev, countType: e.target.value, page: 1 }))}
            >
              <option value="">Tất cả hình thức</option>
              <option value="MONTHLY">Định kỳ tháng</option>
              <option value="BY_SKU">Đột xuất SKU</option>
            </select>

            <button
              type="button"
              className="erp-date-filter-btn"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                setFilters((prev) => ({
                  ...prev,
                  fromDate: prev.fromDate ? '' : from,
                  toDate: prev.toDate ? '' : to,
                  page: 1,
                }));
              }}
            >
              📅 {filters.fromDate ? 'Đang lọc tháng' : 'Tháng này'}
            </button>
          </>
        }
        onReset={() => {
          setActiveTab('all');
          setFilters({
            search: '',
            warehouseId: '',
            status: '',
            countType: '',
            fromDate: '',
            toDate: '',
            page: 1,
            limit: 10,
          });
        }}
      />

      <DataTable
        columns={columns}
        data={counts}
        loading={loading}
        emptyText="Không tìm thấy phiếu kiểm kê nào phù hợp"
      />

      {!loading && total > 0 && (
        <Pagination
          page={filters.page}
          pageSize={filters.limit}
          total={total}
          itemLabel="phiếu kiểm kê"
          onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          onPageSizeChange={(sz) => setFilters((prev) => ({ ...prev, limit: sz, page: 1 }))}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
};

export default WarehouseStocktakeList;
