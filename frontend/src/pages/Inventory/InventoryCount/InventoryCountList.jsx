import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Printer,
  Plus,
  Search,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Eye,
  FileDown,
  Trash2,
  Send,
  Boxes,
} from 'lucide-react';
import {
  getInventoryCounts,
  createInventoryCount,
  getWarehouses,
  getWarehouseSkus,
  cancelInventoryCount,
} from '../../../services/api';

// UI & Shared ERP Components
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/dropdown-menu';
import {
  PageHeader,
  FilterToolbar,
  StatusBadge,
  DataTable,
  Pagination,
  ConfirmDialog,
} from '../../../components/shared';

import './InventoryCountList.css';

const InventoryCountList = () => {
  const navigate = useNavigate();

  // Danh sách dữ liệu & Trạng thái tải
  const [counts, setCounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouses, setWarehouses] = useState([]);

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Bộ lọc
  const [activeTab, setActiveTab] = useState('all');
  const [syncTime, setSyncTime] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    warehouseId: '',
    status: '',
    countType: '',
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 10,
  });

  // Modal Tạo phiếu kiểm kê
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    warehouseId: '',
    countType: 'MONTHLY', // 'MONTHLY' hoặc 'BY_SKU'
    notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Nghiệp vụ chọn SKU khi kiểm kê đột xuất (Phương án A)
  const [warehouseSkus, setWarehouseSkus] = useState([]);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [selectedSkuIds, setSelectedSkuIds] = useState([]);

  // Modal xác nhận hủy phiếu
  const [confirmCancelModal, setConfirmCancelModal] = useState({
    open: false,
    countId: null,
    countCode: '',
    loading: false,
  });

  // Tải danh sách kho khi khởi tạo
  useEffect(() => {
    getWarehouses(1)
      .then((data) => setWarehouses(data || []))
      .catch((err) => console.error('Lỗi tải danh sách kho:', err));
  }, []);

  // Format giờ đồng bộ
  const updateSyncTimestamp = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'CH' : 'SA';
    setSyncTime(`${hours}:${minutes} ${ampm}`);
  };

  // Fetch danh sách phiếu kiểm kê
  const fetchCounts = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = { ...filters };

      // Áp dụng bộ lọc tab
      if (activeTab === 'variance') {
        queryParams.hasVariance = 'true';
      } else if (activeTab === 'waiting') {
        queryParams.status = 'WAITING_APPROVAL';
      } else if (activeTab === 'completed') {
        queryParams.status = 'COMPLETED';
      } else if (activeTab === 'cancelled') {
        queryParams.status = 'CANCELLED';
      }

      const res = await getInventoryCounts(queryParams);
      setCounts(res.data || []);
      setTotal(res.total || 0);
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

  // Load danh sách SKU của kho được chọn khi kiểm kê đột xuất
  useEffect(() => {
    if (showCreateModal && createForm.countType === 'BY_SKU' && createForm.warehouseId) {
      setLoadingSkus(true);
      setSelectedSkuIds([]);
      getWarehouseSkus(createForm.warehouseId, 1)
        .then((skus) => {
          setWarehouseSkus(skus || []);
        })
        .catch((err) => {
          console.error('Lỗi tải SKU kho:', err);
          setWarehouseSkus([]);
        })
        .finally(() => setLoadingSkus(false));
    } else {
      setWarehouseSkus([]);
      setSelectedSkuIds([]);
    }
  }, [showCreateModal, createForm.countType, createForm.warehouseId]);

  // Lọc SKU theo thanh tìm kiếm trong modal
  const filteredSkus = useMemo(() => {
    if (!skuSearchQuery.trim()) return warehouseSkus;
    const q = skuSearchQuery.toLowerCase();
    return warehouseSkus.filter(
      (s) =>
        (s.sku && s.sku.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q))
    );
  }, [warehouseSkus, skuSearchQuery]);

  // Xử lý chọn SKU
  const handleToggleSelectAllSkus = () => {
    if (selectedSkuIds.length === filteredSkus.length) {
      setSelectedSkuIds([]);
    } else {
      setSelectedSkuIds(filteredSkus.map((s) => s.id));
    }
  };

  const handleToggleSku = (skuId) => {
    if (selectedSkuIds.includes(skuId)) {
      setSelectedSkuIds(selectedSkuIds.filter((id) => id !== skuId));
    } else {
      setSelectedSkuIds([...selectedSkuIds, skuId]);
    }
  };

  // Submit tạo phiếu mới
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.warehouseId) {
      setCreateError('Vui lòng chọn kho hàng cần kiểm kê!');
      return;
    }

    if (createForm.countType === 'BY_SKU' && selectedSkuIds.length === 0) {
      setCreateError('Vui lòng chọn ít nhất 1 sản phẩm (SKU) để kiểm kê đột xuất!');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        warehouseId: createForm.warehouseId,
        countType: createForm.countType,
        notes: createForm.notes,
        ...(createForm.countType === 'BY_SKU' ? { skuIds: selectedSkuIds } : {}),
      };

      const newCount = await createInventoryCount(payload, 1);
      setShowCreateModal(false);
      setCreateForm({ warehouseId: '', countType: 'MONTHLY', notes: '' });
      setSelectedSkuIds([]);

      // Chuyển hướng ngay sang trang chi tiết đợt kiểm kê
      navigate(`/inventory/counts/${newCount.id}`);
    } catch (err) {
      setCreateError(err.message || 'Không thể tạo phiếu kiểm kê');
    } finally {
      setCreating(false);
    }
  };

  // Xác nhận hủy phiếu
  const handleCancelCount = async () => {
    if (!confirmCancelModal.countId) return;
    setConfirmCancelModal((prev) => ({ ...prev, loading: true }));
    try {
      await cancelInventoryCount(confirmCancelModal.countId, 1);
      setConfirmCancelModal({ open: false, countId: null, countCode: '', loading: false });
      fetchCounts();
    } catch (err) {
      alert(err.message || 'Lỗi khi hủy phiếu kiểm kê');
      setConfirmCancelModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Tính toán KPI
  const waitingApprovalCount = counts.filter((c) => c.status === 'WAITING_APPROVAL' || c.status === 'PENDING_APPROVAL').length;
  const completedCount = counts.filter((c) => c.status === 'COMPLETED').length;
  const varianceCount = counts.filter((c) => c.summary?.hasVariance).length;
  const cancelledCount = counts.filter((c) => c.status === 'CANCELLED' || c.status === 'REJECTED').length;

  // Tabs cho FilterToolbar
  const toolbarTabs = [
    { id: 'all', label: 'Tất cả phiếu', count: total },
    { id: 'variance', label: 'Cần xử lý lệch', count: varianceCount, variant: 'danger' },
    { id: 'waiting', label: 'Chờ cân kho', count: waitingApprovalCount, variant: 'warning' },
    { id: 'completed', label: 'Đã cân kho', count: completedCount, variant: 'success' },
    { id: 'cancelled', label: 'Đã hủy', count: cancelledCount, variant: 'muted' },
  ];

  // Xuất file Excel danh sách các phiếu kiểm kê
  const handleExportList = () => {
    if (counts.length === 0) {
      alert('Không có dữ liệu phiếu kiểm kê để xuất!');
      return;
    }
    const headers = ['Mã phiếu', 'Kho kiểm kê', 'Hình thức', 'Ngày tạo', 'Người lập', 'Số lượng SKU', 'Đối soát', 'Trạng thái'];
    const rows = counts.map((c) => [
      c.countCode,
      c.warehouse?.name || '',
      c.countType === 'MONTHLY' ? 'Định kỳ tháng' : 'Đột xuất SKU',
      new Date(c.createdAt).toLocaleDateString('vi-VN'),
      c.createdBy?.fullName || 'Hệ thống',
      c.summary?.totalSkus || c._count?.items || 0,
      c.summary?.hasVariance ? `Lệch: +${c.summary?.surplusCount || 0} / -${c.summary?.deficitCount || 0}` : 'Đã khớp 100%',
      c.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DanhSachPhieuKiemKe_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Định nghĩa các cột cho DataTable bám sát ảnh thiết kế
  const columns = [
    {
      title: 'MÃ PHIẾU',
      key: 'countCode',
      render: (_, row) => (
        <span
          className="erp-count-code"
          onClick={() => navigate(`/inventory/counts/${row.id}`)}
          title="Bấm để xem chi tiết"
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
          <span className="wh-code">{row.warehouse?.code || 'G-10KF1292'}</span>
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
        const dateStr = dateObj.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeStr = dateObj.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        return (
          <div className="erp-date-cell">
            <span className="date-part">{dateStr}</span>
            <span className="time-part">{timeStr}</span>
          </div>
        );
      },
    },
    {
      title: 'NGƯỜI LẬP',
      key: 'createdBy',
      render: (_, row) => (
        <span className="erp-author-text">
          {row.createdBy?.fullName || 'Hệ thống'}
        </span>
      ),
    },
    {
      title: 'SỐ LƯỢNG SKU',
      key: 'skuCount',
      align: 'center',
      render: (_, row) => (
        <span className="erp-sku-number">
          {row.summary?.totalSkus || row._count?.items || 0}
        </span>
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
        if (row.status === 'COMPLETED') {
          return <StatusBadge variant="success" dot label="Đã cân kho" />;
        }
        if (row.status === 'WAITING_APPROVAL' || row.status === 'PENDING_APPROVAL') {
          return <StatusBadge variant="warning" dot label="Chờ cân kho" />;
        }
        if (row.status === 'IN_PROGRESS') {
          return <StatusBadge variant="primary" dot label="Đang kiểm kê" />;
        }
        if (row.status === 'REJECTED') {
          return <StatusBadge variant="muted" dot label="Từ chối" />;
        }
        if (row.status === 'CANCELLED') {
          return <StatusBadge variant="muted" dot label="Đã hủy" />;
        }
        return <StatusBadge variant="secondary" dot label="Bản nháp" />;
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
            onClick={() => navigate(`/inventory/counts/${row.id}`)}
          >
            Xem chi tiết
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="erp-action-more-btn" title="Thao tác khác">
                ⋮
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/inventory/counts/${row.id}`)}>
                <Eye size={14} style={{ marginRight: 8 }} /> Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.open(
                    `${window.location.origin}/inventory/counts/${row.id}?autoPrint=true`,
                    '_blank'
                  );
                }}
              >
                <Printer size={14} style={{ marginRight: 8 }} /> In biên bản
              </DropdownMenuItem>
              {(row.status === 'DRAFT' || row.status === 'WAITING_APPROVAL') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="danger-item"
                    onClick={() =>
                      setConfirmCancelModal({
                        open: true,
                        countId: row.id,
                        countCode: row.countCode,
                        loading: false,
                      })
                    }
                  >
                    <Trash2 size={14} style={{ marginRight: 8 }} /> Hủy phiếu kiểm kê
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="inventory-count-erp-page">
      {/* 1. Header chuẩn ERP */}
      <PageHeader
        breadcrumb="DMS-NPP TradeLedger / Kho bãi / Kiểm kê kho"
        title="Kiểm Kê Kho Hàng"
        badge="ERP Module"
        description="Quản lý các đợt kiểm kê định kỳ & đột xuất, đối soát số dư tồn và cân kho tự động."
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
            <Button
              variant="default"
              onClick={() => {
                setShowCreateModal(true);
                setCreateError('');
              }}
              className="btn-erp-header-primary"
            >
              <Plus size={16} />
              <span>Mở Phiếu Kiểm Kê Mới</span>
            </Button>
          </>
        }
      />

      {/* 2. Hàng 4 Card KPI (Đúng bố cục 3 dòng chuẩn ảnh mẫu) */}
      <div className="erp-kpi-grid">
        {/* KPI 1: Tổng số phiếu */}
        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Tổng số phiếu</span>
            <span className="erp-kpi-tag-neutral">Tất cả đợt</span>
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{total}</span>
            <span className="erp-kpi-subtext">Toàn hệ thống</span>
          </div>
          <div className="erp-kpi-row-3">
            <span>{warehouses.length > 0 ? `${warehouses.length} kho hàng trực thuộc NPP` : 'Tất cả kho'}</span>
          </div>
        </Card>

        {/* KPI 2: Chờ duyệt cân kho */}
        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Chờ duyệt cân kho</span>
            <span className="erp-kpi-dot dot-warning" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{waitingApprovalCount}</span>
            <span className="erp-kpi-badge badge-warning-soft">
              {waitingApprovalCount} chờ xử lý
            </span>
          </div>
          <div className="erp-kpi-row-3">
            <span>{waitingApprovalCount === 0 ? 'Không có phiếu đọng' : 'Cần kiểm tra trước khi cân kho'}</span>
          </div>
        </Card>

        {/* KPI 3: Đã cân kho hoàn tất */}
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
            <span>Số dư đã khóa sổ kỳ này</span>
          </div>
        </Card>

        {/* KPI 4: Phiếu có chênh lệch */}
        <Card className="erp-kpi-card">
          <div className="erp-kpi-row-1">
            <span className="erp-kpi-label">Phiếu có chênh lệch</span>
            <span className="erp-kpi-dot dot-danger" />
          </div>
          <div className="erp-kpi-row-2">
            <span className="erp-kpi-value">{varianceCount}</span>
            <span className={`erp-kpi-badge ${varianceCount > 0 ? 'badge-danger-soft' : 'badge-neutral-soft'}`}>
              {varianceCount > 0 ? 'Cần xử lý' : 'Đã cân bằng'}
            </span>
          </div>
          <div className="erp-kpi-row-3">
            <span>
              {varianceCount > 0
                ? `Phát hiện chênh lệch - ${varianceCount} phiếu`
                : 'Tồn kho khớp với hệ thống'}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. FilterToolbar: Hàng Tabs + Controls lọc */}
      <FilterToolbar
        tabs={toolbarTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          setFilters((prev) => ({ ...prev, page: 1 }));
        }}
        syncTime={syncTime}
        onRefresh={fetchCounts}
        searchValue={filters.search}
        onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val, page: 1 }))}
        searchPlaceholder="Tìm mã phiếu, mã SKU, người lập..."
        filters={
          <>
            {/* Lọc theo kho */}
            <select
              className="erp-filter-select"
              value={filters.warehouseId}
              onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))}
            >
              <option value="">Tất cả kho hàng</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Lọc theo trạng thái */}
            <select
              className="erp-filter-select"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="WAITING_APPROVAL">Chờ duyệt cân kho</option>
              <option value="COMPLETED">Đã cân kho</option>
              <option value="REJECTED">Từ chối</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            {/* Lọc theo hình thức */}
            <select
              className="erp-filter-select"
              value={filters.countType}
              onChange={(e) => setFilters((prev) => ({ ...prev, countType: e.target.value, page: 1 }))}
            >
              <option value="">Tất cả hình thức</option>
              <option value="MONTHLY">Định kỳ tháng</option>
              <option value="BY_SKU">Đột xuất SKU</option>
            </select>

            {/* Bộ lọc khoảng ngày / tháng */}
            <button
              type="button"
              className="erp-date-filter-btn"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getFullYear(), now.getMonth(), 1)
                  .toISOString()
                  .slice(0, 10);
                const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                  .toISOString()
                  .slice(0, 10);
                setFilters((prev) => ({
                  ...prev,
                  fromDate: prev.fromDate ? '' : from,
                  toDate: prev.toDate ? '' : to,
                  page: 1,
                }));
              }}
              title="Lọc theo tháng hiện tại"
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

      {/* 4. DataTable hiển thị danh sách phiếu kiểm kê */}
      <DataTable
        columns={columns}
        data={counts}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        loading={loading}
        emptyText="Không tìm thấy phiếu kiểm kê nào phù hợp"
      />

      {/* 5. Pagination */}
      {!loading && total > 0 && (
        <Pagination
          page={filters.page}
          pageSize={filters.limit}
          total={total}
          itemLabel="phiếu kiểm kê"
          onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          onPageSizeChange={(sz) => setFilters((prev) => ({ ...prev, limit: sz, page: 1 }))}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}

      {/* 6. Modal Tạo Mới Phiếu Kiểm Kê (Tích hợp chọn SKU theo Phương án A) */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="create-count-dialog-content">
          <DialogHeader>
            <DialogTitle>Mở Phiếu Kiểm Kê Mới</DialogTitle>
            <DialogDescription>
              Khởi tạo đợt kiểm kê kho để đối soát tồn thực tế và tự động tạo bút toán cân kho.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="create-modal-error">
              <AlertTriangle size={16} />
              <span>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="create-count-form">
            {/* Chọn kho hàng */}
            <div className="form-item">
              <label className="form-label">
                Kho hàng cần kiểm kê <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={createForm.warehouseId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, warehouseId: e.target.value })
                }
              >
                <option value="">-- Chọn kho hàng kiểm kê --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn hình thức */}
            <div className="form-item">
              <label className="form-label">Hình thức kiểm kê</label>
              <div className="count-type-selector">
                <label
                  className={`type-radio-card ${
                    createForm.countType === 'MONTHLY' ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="countType"
                    value="MONTHLY"
                    checked={createForm.countType === 'MONTHLY'}
                    onChange={() =>
                      setCreateForm({ ...createForm, countType: 'MONTHLY' })
                    }
                  />
                  <div className="radio-content">
                    <span className="radio-title">Định kỳ tháng (Toàn kho)</span>
                    <span className="radio-desc">
                      Tự động nạp toàn bộ danh mục sản phẩm và lô hàng có trong kho
                    </span>
                  </div>
                </label>

                <label
                  className={`type-radio-card ${
                    createForm.countType === 'BY_SKU' ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="countType"
                    value="BY_SKU"
                    checked={createForm.countType === 'BY_SKU'}
                    onChange={() =>
                      setCreateForm({ ...createForm, countType: 'BY_SKU' })
                    }
                  />
                  <div className="radio-content">
                    <span className="radio-title">Đột xuất theo SKU</span>
                    <span className="radio-desc">
                      Chỉ định danh sách mặt hàng cụ thể cần đối soát
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* BẢNG CHỌN SKU (Phương án A - Khi chọn Đột xuất theo SKU) */}
            {createForm.countType === 'BY_SKU' && (
              <div className="sku-picker-container">
                <div className="sku-picker-header">
                  <div className="picker-title-row">
                    <span className="picker-title">
                      Danh sách sản phẩm trong kho ({warehouseSkus.length})
                    </span>
                    <span className="picker-selected-count">
                      Đã chọn: <strong>{selectedSkuIds.length}</strong> SKU
                    </span>
                  </div>

                  {!createForm.warehouseId ? (
                    <div className="sku-picker-warning">
                      ⚠️ Vui lòng chọn kho hàng trước để tải danh sách sản phẩm.
                    </div>
                  ) : loadingSkus ? (
                    <div className="sku-picker-loading">
                      <div className="sku-spinner" />
                      <span>Đang nạp dữ liệu tồn kho...</span>
                    </div>
                  ) : warehouseSkus.length === 0 ? (
                    <div className="sku-picker-empty">
                      Kho hàng này hiện không có mặt hàng hoặc lô hàng nào có tồn kho.
                    </div>
                  ) : (
                    <>
                      {/* Search và nút chọn tất cả */}
                      <div className="sku-picker-toolbar">
                        <div className="sku-picker-search-wrapper">
                          <Search size={14} className="sku-search-icon" />
                          <input
                            type="text"
                            className="sku-picker-search-input"
                            placeholder="Tìm mã SKU hoặc tên sản phẩm..."
                            value={skuSearchQuery}
                            onChange={(e) => setSkuSearchQuery(e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleToggleSelectAllSkus}
                        >
                          {selectedSkuIds.length === filteredSkus.length
                            ? 'Bỏ chọn tất cả'
                            : 'Chọn tất cả'}
                        </Button>
                      </div>

                      {/* Bảng danh sách SKU thu nhỏ có scroll */}
                      <div className="sku-picker-table-wrapper">
                        <table className="sku-picker-table">
                          <thead>
                            <tr>
                              <th style={{ width: '38px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={
                                    filteredSkus.length > 0 &&
                                    selectedSkuIds.length === filteredSkus.length
                                  }
                                  onChange={handleToggleSelectAllSkus}
                                />
                              </th>
                              <th>MÃ SKU</th>
                              <th>TÊN SẢN PHẨM</th>
                              <th>ĐVT</th>
                              <th style={{ textAlign: 'right' }}>TỒN HỆ THỐNG</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSkus.map((sku) => {
                              const isChecked = selectedSkuIds.includes(sku.id);
                              return (
                                <tr
                                  key={sku.id}
                                  className={isChecked ? 'sku-row-checked' : ''}
                                  onClick={() => handleToggleSku(sku.id)}
                                >
                                  <td
                                    style={{ textAlign: 'center' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleSku(sku.id)}
                                    />
                                  </td>
                                  <td>
                                    <span className="sku-code">{sku.sku}</span>
                                  </td>
                                  <td>
                                    <span className="sku-name">{sku.name}</span>
                                  </td>
                                  <td>
                                    <span className="sku-unit">{sku.unit || 'Cái'}</span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span className="sku-stock">
                                      {sku.totalQuantityOnHand}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Ghi chú */}
            <div className="form-item">
              <label className="form-label">Ghi chú đợt kiểm kê</label>
              <textarea
                rows={2}
                className="form-textarea"
                placeholder="Nhập lý do hoặc mục đích kiểm kho (VD: Đối soát trước nhập hàng tháng 11)..."
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="default"
                loading={creating}
              >
                Tạo Phiếu Kiểm Kê
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Modal xác nhận hủy phiếu */}
      <ConfirmDialog
        open={confirmCancelModal.open}
        onOpenChange={(open) =>
          setConfirmCancelModal((prev) => ({ ...prev, open }))
        }
        title="Xác nhận hủy phiếu kiểm kê"
        description={`Bạn có chắc chắn muốn hủy phiếu kiểm kê ${confirmCancelModal.countCode}? Hành động này sẽ hủy bỏ các kết quả kiểm đếm và không thể khôi phục.`}
        confirmText="Hủy phiếu"
        confirmVariant="destructive"
        loading={confirmCancelModal.loading}
        onConfirm={handleCancelCount}
      />
    </div>
  );
};

export default InventoryCountList;
