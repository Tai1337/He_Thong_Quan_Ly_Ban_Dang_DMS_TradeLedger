import React, { useState, useEffect } from 'react';
import {
  Tag,
  Sparkles,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Package,
  Percent,
  Gift,
  Clock,
  X,
  TrendingDown,
  Layers
} from 'lucide-react';
import {
  getPromotions,
  autoGeneratePromotion,
  getClearanceCandidates,
  updatePromotion,
  deletePromotion,
  getProducts
} from '../../../services/api';
import { useNotification } from '../../../components/Common/NotificationProvider';
import './PromotionList.css';

export default function PromotionList() {
  const { confirm } = useNotification();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    promotionType: '',
    status: '',
  });

  // Modal Auto-Generate
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [autoType, setAutoType] = useState('BULK_QUANTITY'); // BULK_QUANTITY | CLEARANCE_STOCK | INVOICE_TOTAL | BUY_N_GET_M
  const [autoMinQuantity, setAutoMinQuantity] = useState(3);
  const [autoDiscountPercent, setAutoDiscountPercent] = useState(10);
  const [autoMinOrderAmount, setAutoMinOrderAmount] = useState(500000);
  const [autoBuyQuantity, setAutoBuyQuantity] = useState(3);
  const [autoFreeQuantity, setAutoFreeQuantity] = useState(1);
  const [autoSelectedProductIds, setAutoSelectedProductIds] = useState([]);
  const [autoFreeProductId, setAutoFreeProductId] = useState('');

  // Validity Period Picker
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultEndStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [autoStartDate, setAutoStartDate] = useState(todayStr);
  const [autoEndDate, setAutoEndDate] = useState(defaultEndStr);

  const handleQuickDuration = (days) => {
    const start = autoStartDate ? new Date(autoStartDate) : new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setAutoEndDate(end.toISOString().split('T')[0]);
  };

  // Data helpers for modal
  const [availableProducts, setAvailableProducts] = useState([]);
  const [clearanceCandidates, setClearanceCandidates] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPromotions();
    loadInitialData();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPromotions(filters);
      setPromotions(data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [prodRes, clearanceRes] = await Promise.all([
        getProducts({ limit: 100 }).catch(() => ({ data: [] })),
        getClearanceCandidates().catch(() => []),
      ]);
      setAvailableProducts(prodRes?.data || prodRes || []);
      setClearanceCandidates(clearanceRes || []);
    } catch {
      // Ignore background load error
    }
  };

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchPromotions();
  };

  const handleToggleStatus = async (promo) => {
    try {
      await updatePromotion(promo.id, { status: !promo.status });
      setSuccessMessage(`Đã ${promo.status ? 'tạm ngưng' : 'kích hoạt lại'} khuyến mãi "${promo.name}"`);
      fetchPromotions();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDelete = async (promo) => {
    const ok = await confirm({
      title: 'Xóa chương trình khuyến mãi',
      message: `Bạn có chắc chắn muốn xóa khuyến mãi "${promo.name}"?`,
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await deletePromotion(promo.id);
      setSuccessMessage(`Đã xóa khuyến mãi thành công!`);
      fetchPromotions();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Lỗi khi xóa khuyến mãi');
    }
  };

  const handleAutoGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setError('');

      const payload = {
        autoType,
        minQuantity: autoMinQuantity,
        discountPercent: autoDiscountPercent,
        minOrderAmount: autoMinOrderAmount,
        buyQuantity: autoBuyQuantity,
        freeQuantity: autoFreeQuantity,
        productIds: autoSelectedProductIds,
        buyProductId: autoSelectedProductIds[0] || undefined,
        freeProductId: autoFreeProductId || autoSelectedProductIds[0] || undefined,
        startDate: autoStartDate,
        endDate: autoEndDate,
      };

      await autoGeneratePromotion(payload);
      setSuccessMessage('🎉 Đã tự động sinh và áp dụng khuyến mãi mới thành công!');
      setIsAutoModalOpen(false);
      fetchPromotions();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Lỗi khi sinh khuyến mãi tự động');
    } finally {
      setGenerating(false);
    }
  };

  // KPI calculations
  const totalCount = promotions.length;
  const activeCount = promotions.filter((p) => {
    const isNotExpired = new Date(p.endDate) >= new Date();
    return p.status && isNotExpired;
  }).length;
  const expiredCount = promotions.filter((p) => {
    const isExpired = new Date(p.endDate) < new Date();
    return !p.status || isExpired;
  }).length;
  const percentageCount = promotions.filter((p) => p.promotionType === 'PERCENTAGE').length;

  return (
    <div className="promo-list-page">
      {/* Top Header */}
      <div className="promo-header-section">
        <div className="promo-header-left">
          <div className="promo-header-badge">
            <Tag size={16} /> Quản lý chính sách ưu đãi
          </div>
          <h1 className="promo-header-title">Chương Trình Khuyến Mãi</h1>
          <p className="promo-header-desc">
            Thiết lập khuyến mãi bán buôn, chiết khấu số lượng lớn, xả kho dồi dào và kích cầu giỏ hàng.
          </p>
        </div>

        <div className="promo-header-actions">
          <button
            type="button"
            className="promo-btn-auto-trigger"
            onClick={() => setIsAutoModalOpen(true)}
          >
            <Sparkles size={18} className="sparkle-icon" />
            <span>Tự Động Sinh Khuyến Mãi</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="promo-alert success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="promo-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="promo-kpi-grid">
        <div className="promo-kpi-card">
          <div className="promo-kpi-icon blue">
            <Tag size={22} />
          </div>
          <div className="promo-kpi-info">
            <span className="promo-kpi-label">Tổng Chương Trình</span>
            <span className="promo-kpi-val">{totalCount}</span>
          </div>
        </div>

        <div className="promo-kpi-card">
          <div className="promo-kpi-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="promo-kpi-info">
            <span className="promo-kpi-label">Đang Hiệu Lực</span>
            <span className="promo-kpi-val">{activeCount}</span>
          </div>
        </div>

        <div className="promo-kpi-card">
          <div className="promo-kpi-icon amber">
            <Clock size={22} />
          </div>
          <div className="promo-kpi-info">
            <span className="promo-kpi-label">Đã Hết Hạn / Tắt</span>
            <span className="promo-kpi-val">{expiredCount}</span>
          </div>
        </div>

        <div className="promo-kpi-card">
          <div className="promo-kpi-icon purple">
            <Percent size={22} />
          </div>
          <div className="promo-kpi-info">
            <span className="promo-kpi-label">Chiết Khấu % / Số Lượng</span>
            <span className="promo-kpi-val">{percentageCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="promo-filter-toolbar">
        <form onSubmit={handleApplyFilter} className="promo-search-form">
          <div className="promo-search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên chương trình..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <button type="submit" className="promo-btn-search">Tìm</button>
        </form>

        <div className="promo-filter-group">
          {/* Lọc loại KM */}
          <div className="promo-select-wrapper">
            <Filter size={15} className="select-icon" />
            <select
              value={filters.promotionType}
              onChange={(e) => {
                handleFilterChange('promotionType', e.target.value);
              }}
            >
              <option value="">Tất cả hình thức</option>
              <option value="PERCENTAGE">Giảm giá % (Số lượng / Xả kho)</option>
              <option value="BUY_N_GET_M">Mua N tặng M</option>
              <option value="INVOICE_DISCOUNT">Giảm tổng hóa đơn</option>
              <option value="COMBO">Gói Combo giá rẻ</option>
            </select>
          </div>

          {/* Lọc trạng thái */}
          <div className="promo-select-wrapper">
            <Layers size={15} className="select-icon" />
            <select
              value={filters.status}
              onChange={(e) => {
                handleFilterChange('status', e.target.value);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang kích hoạt</option>
              <option value="false">Tạm ngưng / Hết hạn</option>
            </select>
          </div>

          <button
            type="button"
            className="promo-btn-refresh"
            onClick={fetchPromotions}
            title="Làm mới danh sách"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Table List */}
      <div className="promo-table-wrapper">
        {loading ? (
          <div className="promo-loading-state">
            <div className="promo-spinner"></div>
            <p>Đang tải danh sách khuyến mãi...</p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="promo-empty-state">
            <Gift size={48} color="#94a3b8" />
            <h4>Chưa có chương trình khuyến mãi nào</h4>
            <p>Bấm vào nút "Tự Động Sinh Khuyến Mãi" ở trên để tạo nhanh chương trình ưu đãi đầu tiên!</p>
          </div>
        ) : (
          <table className="promo-table">
            <thead>
              <tr>
                <th>Tên chương trình</th>
                <th>Hình thức</th>
                <th>Điều kiện & Quyền lợi</th>
                <th>Thời gian hiệu lực</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo) => {
                const isExpired = new Date(promo.endDate) < new Date();
                const isActive = promo.status && !isExpired;

                return (
                  <tr key={promo.id}>
                    <td>
                      <div className="promo-name-cell">
                        <span className="promo-name-text">{promo.name}</span>
                        {promo.description && (
                          <span className="promo-desc-text">{promo.description}</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {promo.promotionType === 'PERCENTAGE' && (
                        <span className="promo-badge badge-blue">
                          <Percent size={12} /> Giảm Chiết Khấu %
                        </span>
                      )}
                      {promo.promotionType === 'BUY_N_GET_M' && (
                        <span className="promo-badge badge-purple">
                          <Gift size={12} /> Mua N Tặng M
                        </span>
                      )}
                      {promo.promotionType === 'INVOICE_DISCOUNT' && (
                        <span className="promo-badge badge-green">
                          <Tag size={12} /> Giảm Tổng Đơn
                        </span>
                      )}
                      {promo.promotionType === 'COMBO' && (
                        <span className="promo-badge badge-amber">
                          <Package size={12} /> Combo Giá Cố Định
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="promo-details-cell">
                        {promo.promotionType === 'PERCENTAGE' && promo.percentageDiscount && (
                          <div>
                            <span className="promo-highlight">
                              Giảm {Number(promo.percentageDiscount.discountPercent)}%
                            </span>
                            {promo.percentageDiscount.minQuantity > 1 && (
                              <span className="promo-sub-detail">
                                (khi mua từ {Number(promo.percentageDiscount.minQuantity)} sản phẩm)
                              </span>
                            )}
                            {promo.percentageDiscount.products?.length > 0 && (
                              <div className="promo-target-prods">
                                Áp dụng: {promo.percentageDiscount.products.map((p) => p.product?.name).slice(0, 2).join(', ')}
                                {promo.percentageDiscount.products.length > 2 && ' ...'}
                              </div>
                            )}
                          </div>
                        )}

                        {promo.promotionType === 'BUY_N_GET_M' && promo.buyNGetM && (
                          <div>
                            <span className="promo-highlight">
                              Mua {promo.buyNGetM.buyQuantity} tặng {promo.buyNGetM.freeQuantity}
                            </span>
                            {promo.buyNGetM.items?.length > 0 && (
                              <div className="promo-target-prods">
                                Quà: {promo.buyNGetM.items.map((it) => it.freeProduct?.name).join(', ')}
                              </div>
                            )}
                          </div>
                        )}

                        {promo.promotionType === 'INVOICE_DISCOUNT' && promo.invoiceDiscount && (
                          <div>
                            <span className="promo-highlight">
                              Đơn từ {Number(promo.invoiceDiscount.minOrderAmount).toLocaleString('vi-VN')} ₫
                            </span>
                            <span className="promo-sub-detail">
                              → Giảm {promo.invoiceDiscount.discountPercent ? `${Number(promo.invoiceDiscount.discountPercent)}%` : `${Number(promo.invoiceDiscount.discountAmount).toLocaleString('vi-VN')} ₫`}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="promo-date-cell">
                        <span>{new Date(promo.startDate).toLocaleDateString('vi-VN')}</span>
                        <span className="date-arrow">→</span>
                        <span>{new Date(promo.endDate).toLocaleDateString('vi-VN')}</span>
                        {isExpired && <span className="expired-label">Hết hạn</span>}
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={`promo-status-pill ${isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(promo)}
                        title="Bấm để bật/tắt"
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 size={13} /> Đang chạy
                          </>
                        ) : (
                          <>
                            <XCircle size={13} /> Tạm dừng
                          </>
                        )}
                      </button>
                    </td>

                    <td className="text-right">
                      <button
                        type="button"
                        className="promo-btn-delete"
                        onClick={() => handleDelete(promo)}
                        title="Xóa khuyến mãi"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: TỰ ĐỘNG SINH KHUYẾN MÃI */}
      {isAutoModalOpen && (
        <div className="promo-modal-backdrop" onClick={() => setIsAutoModalOpen(false)}>
          <div className="promo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="promo-modal-header">
              <div className="modal-title-row">
                <div className="modal-icon-sparkle">
                  <Sparkles size={20} color="#1a73e8" />
                </div>
                <div>
                  <h3 className="modal-title">Tự Động Sinh Khuyến Mãi Nhanh</h3>
                  <p className="modal-sub">
                    Chỉ cần chọn hình thức và sản phẩm, hệ thống sẽ tự tính toán mức chiết khấu và thiết lập chương trình.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="promo-modal-close"
                onClick={() => setIsAutoModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAutoGenerateSubmit} className="promo-modal-body">
              {/* Type Selection */}
              <div className="auto-type-selector-grid">
                <label
                  className={`auto-type-option ${autoType === 'BULK_QUANTITY' ? 'selected' : ''}`}
                  onClick={() => setAutoType('BULK_QUANTITY')}
                >
                  <input
                    type="radio"
                    name="autoType"
                    checked={autoType === 'BULK_QUANTITY'}
                    onChange={() => setAutoType('BULK_QUANTITY')}
                  />
                  <div className="type-icon-box blue">
                    <Percent size={20} />
                  </div>
                  <div className="type-meta">
                    <strong>Giảm Số Lượng Lớn</strong>
                    <span>Mua từ 3, 5,... món để nhận chiết khấu</span>
                  </div>
                </label>

                <label
                  className={`auto-type-option ${autoType === 'CLEARANCE_STOCK' ? 'selected' : ''}`}
                  onClick={() => setAutoType('CLEARANCE_STOCK')}
                >
                  <input
                    type="radio"
                    name="autoType"
                    checked={autoType === 'CLEARANCE_STOCK'}
                    onChange={() => setAutoType('CLEARANCE_STOCK')}
                  />
                  <div className="type-icon-box amber">
                    <TrendingDown size={20} />
                  </div>
                  <div className="type-meta">
                    <strong>Xả Hàng Tồn Kho Cao</strong>
                    <span>Tự động quét SKU tồn lớn để giảm sâu</span>
                  </div>
                </label>

                <label
                  className={`auto-type-option ${autoType === 'INVOICE_TOTAL' ? 'selected' : ''}`}
                  onClick={() => setAutoType('INVOICE_TOTAL')}
                >
                  <input
                    type="radio"
                    name="autoType"
                    checked={autoType === 'INVOICE_TOTAL'}
                    onChange={() => setAutoType('INVOICE_TOTAL')}
                  />
                  <div className="type-icon-box green">
                    <Tag size={20} />
                  </div>
                  <div className="type-meta">
                    <strong>Giảm Theo Tổng Đơn</strong>
                    <span>Đạt mốc hóa đơn được trừ % tiền</span>
                  </div>
                </label>

                <label
                  className={`auto-type-option ${autoType === 'BUY_N_GET_M' ? 'selected' : ''}`}
                  onClick={() => setAutoType('BUY_N_GET_M')}
                >
                  <input
                    type="radio"
                    name="autoType"
                    checked={autoType === 'BUY_N_GET_M'}
                    onChange={() => setAutoType('BUY_N_GET_M')}
                  />
                  <div className="type-icon-box purple">
                    <Gift size={20} />
                  </div>
                  <div className="type-meta">
                    <strong>Mua N Tặng M</strong>
                    <span>Mua N sản phẩm tặng kèm quà tặng</span>
                  </div>
                </label>
              </div>

              {/* Validity Date Range Picker */}
              <div className="promo-date-picker-box">
                <div className="date-picker-header">
                  <div className="date-picker-title-group">
                    <Calendar size={16} color="#1a73e8" />
                    <span className="date-picker-title">Thời Gian Hiệu Lực Áp Dụng</span>
                  </div>
                  <div className="quick-duration-pills">
                    <button type="button" onClick={() => handleQuickDuration(7)}>7 ngày</button>
                    <button type="button" onClick={() => handleQuickDuration(14)}>14 ngày</button>
                    <button type="button" onClick={() => handleQuickDuration(30)}>1 tháng</button>
                    <button type="button" onClick={() => handleQuickDuration(90)}>3 tháng</button>
                  </div>
                </div>

                <div className="date-picker-inputs-row">
                  <div className="config-field">
                    <label>Ngày bắt đầu áp dụng:</label>
                    <input
                      type="date"
                      value={autoStartDate}
                      onChange={(e) => setAutoStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="config-field">
                    <label>Ngày kết thúc (Hết hạn):</label>
                    <input
                      type="date"
                      value={autoEndDate}
                      min={autoStartDate}
                      onChange={(e) => setAutoEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Settings Based on Type */}
              <div className="auto-config-box">
                {autoType === 'BULK_QUANTITY' && (
                  <div className="config-fields-row">
                    <div className="config-field">
                      <label>Mua từ số lượng tối thiểu:</label>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={autoMinQuantity}
                        onChange={(e) => setAutoMinQuantity(Number(e.target.value))}
                        required
                      />
                      <span className="field-hint">Ví dụ: Mua từ 3 thùng trở lên</span>
                    </div>

                    <div className="config-field">
                      <label>Phần trăm giảm giá (%):</label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={autoDiscountPercent}
                        onChange={(e) => setAutoDiscountPercent(Number(e.target.value))}
                        required
                      />
                      <span className="field-hint">Mức chiết khấu được hưởng</span>
                    </div>

                    <div className="config-field full-width">
                      <label>Chọn sản phẩm áp dụng (Tùy chọn):</label>
                      <select
                        multiple
                        className="multi-prod-select"
                        value={autoSelectedProductIds}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
                          setAutoSelectedProductIds(values);
                        }}
                      >
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                      <span className="field-hint">
                        Giữ Ctrl (hoặc Cmd) để chọn nhiều sản phẩm. Nếu để trống, hệ thống sẽ chọn các mặt hàng bán chạy.
                      </span>
                    </div>
                  </div>
                )}

                {autoType === 'CLEARANCE_STOCK' && (
                  <div className="config-fields-row">
                    <div className="config-field">
                      <label>Mức giảm xả kho (%):</label>
                      <input
                        type="number"
                        min="5"
                        max="80"
                        value={autoDiscountPercent}
                        onChange={(e) => setAutoDiscountPercent(Number(e.target.value))}
                        required
                      />
                      <span className="field-hint">Gợi ý: 15% - 25% để kích cầu nhanh</span>
                    </div>

                    <div className="config-field full-width">
                      <label>Sản phẩm tồn kho dồi dào phát hiện tự động:</label>
                      {clearanceCandidates.length > 0 ? (
                        <div className="clearance-candidate-list">
                          {clearanceCandidates.map((cand) => (
                            <div key={cand.product.id} className="candidate-badge">
                              <strong>{cand.product.name}</strong>
                              <span>Tồn khả dụng: {cand.availableQty} {cand.product.unit || 'thùng'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-candidate-hint">
                          Hệ thống sẽ tự động quét các SKU có tồn kho khả dụng cao nhất tại kho để tạo ưu đãi.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {autoType === 'INVOICE_TOTAL' && (
                  <div className="config-fields-row">
                    <div className="config-field">
                      <label>Mốc tổng giá trị đơn hàng (₫):</label>
                      <input
                        type="number"
                        step="50000"
                        min="100000"
                        value={autoMinOrderAmount}
                        onChange={(e) => setAutoMinOrderAmount(Number(e.target.value))}
                        required
                      />
                      <span className="field-hint">VD: Đơn từ 500.000 ₫ hoặc 1.000.000 ₫</span>
                    </div>

                    <div className="config-field">
                      <label>Phần trăm giảm (% toàn đơn):</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={autoDiscountPercent}
                        onChange={(e) => setAutoDiscountPercent(Number(e.target.value))}
                        required
                      />
                      <span className="field-hint">VD: Giảm 5% hoặc 10%</span>
                    </div>
                  </div>
                )}

                {autoType === 'BUY_N_GET_M' && (
                  <div className="config-fields-row">
                    <div className="config-field">
                      <label>Số lượng mua (N):</label>
                      <input
                        type="number"
                        min="1"
                        value={autoBuyQuantity}
                        onChange={(e) => setAutoBuyQuantity(Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="config-field">
                      <label>Số lượng tặng (M):</label>
                      <input
                        type="number"
                        min="1"
                        value={autoFreeQuantity}
                        onChange={(e) => setAutoFreeQuantity(Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="config-field full-width">
                      <label>Chọn sản phẩm mua:</label>
                      <select
                        value={autoSelectedProductIds[0] || ''}
                        onChange={(e) => setAutoSelectedProductIds([e.target.value])}
                        required
                      >
                        <option value="">-- Chọn sản phẩm chính --</option>
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="config-field full-width">
                      <label>Chọn sản phẩm quà tặng (Quà miễn phí):</label>
                      <select
                        value={autoFreeProductId}
                        onChange={(e) => setAutoFreeProductId(e.target.value)}
                      >
                        <option value="">(Tặng cùng loại sản phẩm đã mua)</option>
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="promo-modal-footer">
                <button
                  type="button"
                  className="promo-btn-cancel"
                  onClick={() => setIsAutoModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="promo-btn-submit"
                  disabled={generating}
                >
                  <Sparkles size={16} />
                  <span>{generating ? 'Đang Thiết Lập...' : 'Tạo Khuyến Mãi Ngay'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

