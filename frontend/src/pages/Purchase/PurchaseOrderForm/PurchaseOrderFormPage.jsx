import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  PackagePlus,
  Building2,
  Warehouse as WarehouseIcon,
  Calendar,
  Truck,
  Sparkles,
  Check,
  X,
  RotateCcw,
  ShoppingBag,
  Scale,
} from 'lucide-react';
import { usePurchaseOrderForm } from '../../../hooks/usePurchaseOrderForm';
import { useNotification } from '../../../components/Common/NotificationProvider';
import './PurchaseOrderFormPage.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));

const LOW_STOCK_THRESHOLD = 20;

const PurchaseOrderFormPage = ({ mode = 'create' }) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify, confirm } = useNotification();

  const orderId = mode === 'edit' ? id : null;
  const duplicateFromId = mode === 'create' ? searchParams.get('duplicateFrom') : null;

  const {
    isEditMode,
    editingOrder,
    loadingMaster,
    loadingStock,
    submitting,
    error,
    warehouses,
    suppliers,
    catalogProducts,
    warehouseId,
    setWarehouseId,
    supplierId,
    setSupplierId,
    expectedDate,
    setExpectedDate,
    setExpectedDateOffset,
    notes,
    setNotes,
    items,
    highlightedProductId,
    selectedSupplier,
    selectedWarehouse,
    totals,
    addProductLine,
    addBulkReplenishment,
    updateLineField,
    removeLine,
    submitOrder,
  } = usePurchaseOrderForm({ orderId, duplicateFromId });

  // Quick SKU picker state
  const [searchTerm, setSearchTerm] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [quickQty, setQuickQty] = useState(10);
  const pickerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Replenishment suggestions drawer state
  const [showReplenishment, setShowReplenishment] = useState(false);
  const [selectedSuggestIds, setSelectedSuggestIds] = useState(new Set());
  const [suggestQuantities, setSuggestQuantities] = useState({});

  const isLockedNonDraft = isEditMode && editingOrder && editingOrder.status !== 'DRAFT';

  // F2 shortcut focuses SKU search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsPickerOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close picker dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered products for quick search
  const filteredCatalog = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = q
      ? catalogProducts.filter(
          (p) =>
            p.sku.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(q)),
        )
      : catalogProducts;
    return list.slice(0, 12);
  }, [catalogProducts, searchTerm]);

  // Low stock replenishment candidates
  const lowStockProducts = useMemo(() => {
    return catalogProducts
      .filter((p) => p.available < LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.available - b.available);
  }, [catalogProducts]);

  // Initialize default suggested quantities when opening replenishment panel
  const handleToggleReplenishment = () => {
    const nextOpen = !showReplenishment;
    if (nextOpen) {
      const nextQtyMap = {};
      const nextSelected = new Set();
      lowStockProducts.forEach((p) => {
        const suggested = Math.max(10, 30 - p.available);
        nextQtyMap[p.id] = suggested;
        if (!items.some((i) => String(i.productId) === String(p.id))) {
          nextSelected.add(String(p.id));
        }
      });
      setSuggestQuantities(nextQtyMap);
      setSelectedSuggestIds(nextSelected);
    }
    setShowReplenishment(nextOpen);
  };

  const handleSelectProduct = (product) => {
    const { merged } = addProductLine(product, quickQty);
    if (merged) {
      notify.info(`Đã cộng dồn +${quickQty} ${product.unit} vào [${product.sku}]`);
    } else {
      notify.success(`Đã thêm [${product.sku}] ${product.name}`);
    }
    setSearchTerm('');
    setIsPickerOpen(false);
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && filteredCatalog.length > 0) {
      e.preventDefault();
      handleSelectProduct(filteredCatalog[0]);
    } else if (e.key === 'Escape') {
      setIsPickerOpen(false);
    }
  };

  const handleApplyReplenishment = () => {
    const picked = lowStockProducts
      .filter((p) => selectedSuggestIds.has(String(p.id)))
      .map((p) => ({
        product: p,
        quantity: Number(suggestQuantities[p.id] || 10),
      }));

    if (picked.length === 0) {
      notify.warning('Vui lòng chọn ít nhất 1 SKU để thêm vào đơn');
      return;
    }

    addBulkReplenishment(picked);
    notify.success(`Đã đưa ${picked.length} SKU cần nhập bù vào đơn hàng`);
    setShowReplenishment(false);
  };

  const handleSaveDraft = async () => {
    try {
      const result = await submitOrder({ submitImmediately: false });
      notify.success(
        isEditMode
          ? `Đã cập nhật bản nháp ${result.poCode}`
          : `Đã tạo bản nháp đơn mua ${result.poCode}`,
      );
      navigate(`/purchase/purchase-orders/${result.id}`);
    } catch (err) {
      notify.error(err.message || 'Không thể lưu bản nháp');
    }
  };

  const handleSaveAndSend = async () => {
    if (!supplierId) {
      notify.warning('Vui lòng chọn Nhà cung cấp trước khi gửi đơn đặt hàng');
      return;
    }
    if (items.length === 0) {
      notify.warning('Đơn hàng cần ít nhất 1 mặt hàng trước khi gửi NCC');
      return;
    }

    const ok = await confirm({
      title: 'Xác nhận gửi Đơn đặt hàng cho NCC',
      message: `Hệ thống sẽ phát hành đơn đến "${selectedSupplier?.name || 'Nhà cung cấp'}" với tổng giá trị ${formatCurrency(totals.totalAmount)} đ và tự động tạo Chuyến xe Nhập kho dự kiến ngày ${expectedDate || 'D+3'}.`,
      confirmText: 'Gửi đơn & Lập chuyến nhập',
    });
    if (!ok) return;

    try {
      const result = await submitOrder({ submitImmediately: true });
      const tripInfo = result.deliveryTrip?.tripCode
        ? ` — Chuyến nhập kho: ${result.deliveryTrip.tripCode}`
        : '';
      notify.success(`Đã phát hành đơn ${result.poCode} cho NCC${tripInfo}`);
      navigate(`/purchase/purchase-orders/${result.id}`);
    } catch (err) {
      notify.error(err.message || 'Không thể gửi đơn đặt hàng');
    }
  };

  const handleCancelLeave = async () => {
    if (items.length > 0 && !isLockedNonDraft) {
      const ok = await confirm({
        title: 'Rời khỏi trang lập đơn?',
        message: 'Các thay đổi chưa lưu sẽ bị mất. Bạn có chắc muốn quay về danh sách?',
        confirmText: 'Quay lại danh sách',
        type: 'warning',
      });
      if (!ok) return;
    }
    navigate('/purchase/purchase-orders');
  };

  const getStockBadgeClass = (available) => {
    if (available <= 0) return 'stock-badge-danger';
    if (available < LOW_STOCK_THRESHOLD) return 'stock-badge-warning';
    return 'stock-badge-good';
  };

  if (loadingMaster) {
    return (
      <div className="po-form-page">
        <div className="po-form-loading">Đang khởi tạo không gian lập Đơn đặt hàng mua...</div>
      </div>
    );
  }

  return (
    <div className="po-form-page">
      {/* 1. TOP STICKY ACTION BAR */}
      <header className="po-form-topbar">
        <div className="po-form-topbar-left">
          <button type="button" className="po-back-btn" onClick={handleCancelLeave} title="Quay lại">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="po-form-title-row">
              <h1>
                {isEditMode
                  ? `Chỉnh sửa Đơn mua ${editingOrder?.poCode || ''}`
                  : duplicateFromId
                    ? 'Lập Đơn mua mới (Nhân bản)'
                    : 'Lập Đơn đặt hàng mua (PO)'}
              </h1>
              <span className="po-form-status-pill">
                {editingOrder?.status === 'DRAFT' || !isEditMode ? 'Bản nháp (DRAFT)' : editingOrder?.status}
              </span>
            </div>
            <p className="po-form-subtitle">
              Chọn kho nhận, kiểm tra tồn kho khả dụng, lên danh sách SKU và đồng bộ chuyến xe nhập kho D+3
            </p>
          </div>
        </div>

        <div className="po-form-topbar-actions">
          <button
            type="button"
            className="po-btn-ghost"
            onClick={handleCancelLeave}
            disabled={submitting}
          >
            Hủy bỏ
          </button>

          {!isLockedNonDraft && (
            <>
              <button
                type="button"
                className="po-btn-secondary"
                onClick={handleSaveDraft}
                disabled={submitting || items.length === 0}
              >
                <Save size={16} />
                <span>{submitting ? 'Đang lưu...' : 'Lưu bản nháp'}</span>
              </button>
              <button
                type="button"
                className="po-btn-primary"
                onClick={handleSaveAndSend}
                disabled={submitting || items.length === 0}
              >
                <Send size={16} />
                <span>{submitting ? 'Đang xử lý...' : 'Lưu & Gửi NCC'}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Banners */}
      {error && (
        <div className="po-form-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
          {isLockedNonDraft && (
            <Link to={`/purchase/purchase-orders/${orderId}`} className="po-alert-link">
              Xem chi tiết đơn →
            </Link>
          )}
        </div>
      )}

      {/* 2. WORKSPACE 2 CỘT */}
      <div className="po-form-workspace">
        {/* CỘT TRÁI: CHỌN SẢN PHẨM & BẢNG CHI TIẾT */}
        <div className="po-form-main-col">
          {/* Card Tìm nhanh & Gợi ý nhập bù */}
          {!isLockedNonDraft && (
            <section className="po-card po-picker-card">
              <div className="po-picker-header">
                <div className="po-picker-title">
                  <PackagePlus size={18} color="#2563eb" />
                  <span>Chọn sản phẩm đặt mua</span>
                  <span className="po-shortcut-chip">F2 tìm nhanh</span>
                </div>

                <button
                  type="button"
                  className={`po-replenish-toggle ${showReplenishment ? 'active' : ''}`}
                  onClick={handleToggleReplenishment}
                >
                  <Sparkles size={15} />
                  <span>Gợi ý hàng sắp hết ({lowStockProducts.length})</span>
                </button>
              </div>

              <div className="po-picker-controls" ref={pickerRef}>
                <div className="po-sku-search-wrap">
                  <Search size={16} className="po-sku-search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="po-sku-search-input"
                    placeholder="Gõ Mã SKU, Tên sản phẩm hoặc Ngành hàng rồi nhấn Enter để thêm..."
                    value={searchTerm}
                    onFocus={() => setIsPickerOpen(true)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsPickerOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="po-sku-clear-btn"
                      onClick={() => setSearchTerm('')}
                    >
                      <X size={14} />
                    </button>
                  )}

                  {/* Dropdown kết quả SKU */}
                  {isPickerOpen && (
                    <div className="po-sku-dropdown">
                      {loadingStock ? (
                        <div className="po-sku-dropdown-empty">Đang cập nhật tồn kho...</div>
                      ) : filteredCatalog.length === 0 ? (
                        <div className="po-sku-dropdown-empty">
                          Không tìm thấy sản phẩm khớp với "{searchTerm}"
                        </div>
                      ) : (
                        filteredCatalog.map((prod) => {
                          const alreadyInOrder = items.find(
                            (i) => String(i.productId) === String(prod.id),
                          );
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              className="po-sku-option"
                              onClick={() => handleSelectProduct(prod)}
                            >
                              <div className="po-sku-opt-left">
                                <div className="po-sku-opt-top">
                                  <span className="po-sku-code">{prod.sku}</span>
                                  <span className="po-sku-name">{prod.name}</span>
                                  {alreadyInOrder && (
                                    <span className="po-in-cart-chip">
                                      Đã có: {alreadyInOrder.quantity} {prod.unit}
                                    </span>
                                  )}
                                </div>
                                <div className="po-sku-opt-meta">
                                  <span>ĐVT: {prod.unit}</span>
                                  {prod.retailUnit && (
                                    <span>• 1 {prod.unit} = {prod.conversionRate} {prod.retailUnit}</span>
                                  )}
                                  <span>• Giá chuẩn: {formatCurrency(prod.basePrice)} đ</span>
                                </div>
                              </div>

                              <div className="po-sku-opt-right">
                                <span className={`po-stock-pill ${getStockBadgeClass(prod.available)}`}>
                                  Tồn: {prod.available}
                                </span>
                                <span className="po-add-hint">
                                  <Plus size={14} /> +{quickQty}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <div className="po-default-qty-box" title="Số lượng mặc định mỗi lần thêm SKU">
                  <span>SL thêm:</span>
                  <input
                    type="number"
                    min="1"
                    value={quickQty}
                    onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>

              {/* Drawer Gợi ý hàng sắp hết */}
              {showReplenishment && (
                <div className="po-replenish-drawer">
                  <div className="po-replenish-drawer-head">
                    <div>
                      <strong>Sản phẩm tồn khả dụng thấp (&lt; {LOW_STOCK_THRESHOLD}) tại {selectedWarehouse?.name || 'kho'}</strong>
                      <p>Tích chọn các mã cần đặt thêm và điều chỉnh số lượng đề xuất</p>
                    </div>
                    <div className="po-replenish-actions">
                      <button
                        type="button"
                        className="po-btn-ghost small"
                        onClick={() => setShowReplenishment(false)}
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        className="po-btn-primary small"
                        onClick={handleApplyReplenishment}
                      >
                        <Check size={14} />
                        <span>Đưa {selectedSuggestIds.size} SKU vào đơn</span>
                      </button>
                    </div>
                  </div>

                  {lowStockProducts.length === 0 ? (
                    <div className="po-replenish-empty">
                      Tuyệt vời! Tất cả sản phẩm tại kho này đều đang có tồn khả dụng từ {LOW_STOCK_THRESHOLD} trở lên.
                    </div>
                  ) : (
                    <div className="po-replenish-list">
                      {lowStockProducts.slice(0, 20).map((p) => {
                        const checked = selectedSuggestIds.has(String(p.id));
                        return (
                          <div key={p.id} className={`po-replenish-row ${checked ? 'selected' : ''}`}>
                            <label className="po-replenish-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = new Set(selectedSuggestIds);
                                  if (e.target.checked) next.add(String(p.id));
                                  else next.delete(String(p.id));
                                  setSelectedSuggestIds(next);
                                }}
                              />
                              <div>
                                <span className="po-sku-code">{p.sku}</span> <strong>{p.name}</strong>
                              </div>
                            </label>
                            <div className="po-replenish-right">
                              <span className={`po-stock-pill ${getStockBadgeClass(p.available)}`}>
                                Khả dụng: {p.available} {p.unit}
                              </span>
                              <div className="po-suggest-qty-wrap">
                                <span>Đề xuất đặt:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={suggestQuantities[p.id] ?? 10}
                                  onChange={(e) =>
                                    setSuggestQuantities((prev) => ({
                                      ...prev,
                                      [p.id]: Math.max(1, Number(e.target.value) || 1),
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Card Bảng chi tiết dòng hàng */}
          <section className="po-card po-lines-card">
            <div className="po-lines-header">
              <div className="po-lines-title">
                <ShoppingBag size={18} color="#0f172a" />
                <span>Danh sách mặt hàng đặt mua ({items.length})</span>
              </div>
              {selectedWarehouse && (
                <div className="po-warehouse-stock-hint">
                  <WarehouseIcon size={14} />
                  <span>
                    Đối chiếu tồn kho tại: <strong>{selectedWarehouse.name}</strong>
                  </span>
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="po-lines-empty">
                <PackagePlus size={36} color="#94a3b8" />
                <h3>Chưa có sản phẩm nào trong đơn đặt hàng</h3>
                <p>
                  Sử dụng thanh tìm kiếm SKU phía trên (phím tắt <code>F2</code>) hoặc bấm{' '}
                  <strong>"Gợi ý hàng sắp hết"</strong> để thêm mặt hàng nhanh chóng.
                </p>
              </div>
            ) : (
              <div className="po-lines-table-wrap">
                <table className="po-lines-table">
                  <thead>
                    <tr>
                      <th style={{ width: '44px', textAlign: 'center' }}>STT</th>
                      <th>Sản phẩm & Quy đổi</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Tồn khả dụng</th>
                      <th style={{ width: '145px', textAlign: 'center' }}>SL đặt *</th>
                      <th style={{ width: '155px', textAlign: 'right' }}>Đơn giá nhập (đ)</th>
                      <th style={{ width: '140px', textAlign: 'right' }}>Thành tiền (đ)</th>
                      {!isLockedNonDraft && <th style={{ width: '48px' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((line, index) => {
                      const qty = Math.max(0, Number(line.quantity) || 0);
                      const price = Math.max(0, Number(line.unitPrice) || 0);
                      const lineTotal = qty * price;
                      const retailTotal = qty * (Number(line.conversionRate) || 1);
                      const basePrice = Number(line.basePrice || 0);
                      const priceDeviation =
                        basePrice > 0 ? Math.abs(price - basePrice) / basePrice : 0;
                      const isHighlighted = String(highlightedProductId) === String(line.productId);

                      return (
                        <tr key={line.productId} className={isHighlighted ? 'row-highlighted' : ''}>
                          <td className="col-center text-muted">{index + 1}</td>

                          <td>
                            <div className="line-prod-top">
                              <span className="po-sku-code">{line.sku}</span>
                              <span className="line-prod-name">{line.name}</span>
                            </div>
                            <div className="line-prod-meta">
                              <span>ĐVT: {line.unit}</span>
                              {line.retailUnit && Number(line.conversionRate) > 1 && (
                                <span>
                                  • 1 {line.unit} = {line.conversionRate} {line.retailUnit} (Tổng:{' '}
                                  <strong>{formatCurrency(retailTotal)}</strong> {line.retailUnit})
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="col-center">
                            <span className={`po-stock-pill ${getStockBadgeClass(line.available)}`}>
                              {line.available} {line.unit}
                            </span>
                            {line.reserved > 0 && (
                              <div className="line-reserved-hint">Giữ chỗ: {line.reserved}</div>
                            )}
                          </td>

                          <td>
                            <div className="qty-stepper">
                              {!isLockedNonDraft && (
                                <button
                                  type="button"
                                  className="qty-step-btn"
                                  onClick={() =>
                                    updateLineField(
                                      line.productId,
                                      'quantity',
                                      Math.max(1, qty - 1),
                                    )
                                  }
                                >
                                  <Minus size={13} />
                                </button>
                              )}
                              <input
                                type="number"
                                min="1"
                                disabled={isLockedNonDraft}
                                value={line.quantity}
                                onChange={(e) =>
                                  updateLineField(line.productId, 'quantity', e.target.value)
                                }
                              />
                              {!isLockedNonDraft && (
                                <button
                                  type="button"
                                  className="qty-step-btn"
                                  onClick={() =>
                                    updateLineField(line.productId, 'quantity', qty + 1)
                                  }
                                >
                                  <Plus size={13} />
                                </button>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="price-cell-wrap">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                disabled={isLockedNonDraft}
                                className="po-price-input"
                                value={line.unitPrice}
                                onChange={(e) =>
                                  updateLineField(line.productId, 'unitPrice', e.target.value)
                                }
                              />
                              {priceDeviation > 0.15 && (
                                <div className="price-deviation-warn">
                                  <AlertTriangle size={12} />
                                  <span>Lệch giá chuẩn ({formatCurrency(basePrice)} đ)</span>
                                  {!isLockedNonDraft && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateLineField(line.productId, 'unitPrice', basePrice)
                                      }
                                      title="Khôi phục giá chuẩn"
                                    >
                                      <RotateCcw size={11} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="col-right col-amount">{formatCurrency(lineTotal)} đ</td>

                          {!isLockedNonDraft && (
                            <td className="col-center">
                              <button
                                type="button"
                                className="po-line-remove-btn"
                                onClick={() => removeLine(line.productId)}
                                title="Xóa mặt hàng"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {items.length > 0 && (
              <div className="po-lines-footer">
                <div className="po-lines-stats">
                  <span>
                    <strong>{totals.totalSku}</strong> mã SKU
                  </span>
                  <span>•</span>
                  <span>
                    <strong>{formatCurrency(totals.totalQty)}</strong> đơn vị đặt
                  </span>
                  <span>•</span>
                  <span className="weight-stat">
                    <Scale size={14} /> Ước tính: <strong>{totals.totalWeightKg} kg</strong>
                  </span>
                </div>
                <div className="po-lines-grand-total">
                  <span>Tổng tiền hàng:</span>
                  <strong>{formatCurrency(totals.totalAmount)} VNĐ</strong>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* CỘT PHẢI: STICKY SUMMARY PANEL */}
        <aside className="po-form-side-col">
          {/* Card 1: Nhà cung cấp */}
          <section className="po-card po-side-card">
            <div className="po-side-card-head">
              <Building2 size={17} color="#2563eb" />
              <h3>Nhà cung cấp (NCC)</h3>
            </div>

            <div className="po-field-group">
              <label>
                Chọn Nhà cung cấp <span className="req-star">*</span>
              </label>
              <select
                value={supplierId}
                disabled={isLockedNonDraft}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">-- Chọn Nhà cung cấp --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {selectedSupplier && (
              <div className="po-supplier-preview">
                <div className="sup-row">
                  <span>Mã NCC:</span>
                  <strong>{selectedSupplier.code}</strong>
                </div>
                <div className="sup-row">
                  <span>Điện thoại:</span>
                  <strong>{selectedSupplier.phone || 'Chưa cập nhật'}</strong>
                </div>
                <div className="sup-row">
                  <span>Địa chỉ:</span>
                  <span>{selectedSupplier.address || 'Chưa cập nhật'}</span>
                </div>
              </div>
            )}
          </section>

          {/* Card 2: Kho nhận & Lịch trình D+3 */}
          <section className="po-card po-side-card">
            <div className="po-side-card-head">
              <WarehouseIcon size={17} color="#059669" />
              <h3>Kho nhận & Kế hoạch giao (D+3)</h3>
            </div>

            <div className="po-field-group">
              <label>
                Kho nhập hàng <span className="req-star">*</span>
              </label>
              <select
                value={warehouseId}
                disabled={isLockedNonDraft}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                <option value="">-- Chọn Kho nhập --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="po-field-group">
              <label>
                <Calendar size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                Ngày nhận hàng dự kiến
              </label>
              <input
                type="date"
                value={expectedDate}
                disabled={isLockedNonDraft}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
              {!isLockedNonDraft && (
                <div className="po-date-presets">
                  <button type="button" onClick={() => setExpectedDateOffset(1)}>
                    +1 ngày
                  </button>
                  <button type="button" className="preset-default" onClick={() => setExpectedDateOffset(3)}>
                    D+3 (Chuẩn)
                  </button>
                  <button type="button" onClick={() => setExpectedDateOffset(7)}>
                    +7 ngày
                  </button>
                </div>
              )}
            </div>

            <div className="po-inbound-callout">
              <Truck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Tự động điều phối chuyến nhập kho</strong>
                <p>
                  Khi bấm <em>Lưu & Gửi NCC</em>, hệ thống sẽ lập ngay một chuyến xe{' '}
                  <code>INBOUND</code> (dự kiến về kho ngày{' '}
                  <strong>{expectedDate ? new Date(expectedDate).toLocaleDateString('vi-VN') : 'D+3'}</strong>) để
                  thủ kho tiếp nhận tại phân hệ Nhập kho mua hàng.
                </p>
              </div>
            </div>
          </section>

          {/* Card 3: Tổng hợp & Ghi chú */}
          <section className="po-card po-side-card">
            <div className="po-side-card-head">
              <h3>Tổng hợp chứng từ</h3>
            </div>

            <div className="po-summary-rows">
              <div className="sum-row">
                <span>Số mã sản phẩm</span>
                <strong>{totals.totalSku} SKU</strong>
              </div>
              <div className="sum-row">
                <span>Tổng SL đặt</span>
                <strong>{formatCurrency(totals.totalQty)} đơn vị</strong>
              </div>
              <div className="sum-row">
                <span>Tổng trọng lượng</span>
                <strong>{totals.totalWeightKg} kg</strong>
              </div>
              <div className="sum-row sum-total">
                <span>Tổng giá trị đơn PO</span>
                <strong>{formatCurrency(totals.totalAmount)} đ</strong>
              </div>
            </div>

            <div className="po-field-group" style={{ marginTop: 14 }}>
              <label>Ghi chú đơn hàng</label>
              <textarea
                rows={3}
                disabled={isLockedNonDraft}
                placeholder="VD: Giao hàng trước 10h sáng tại cửa kho A, kèm hóa đơn VAT và chứng từ CO/CQ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default PurchaseOrderFormPage;
