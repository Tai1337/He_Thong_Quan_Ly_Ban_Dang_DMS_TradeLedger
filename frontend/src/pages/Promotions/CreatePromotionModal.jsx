import { useState, useEffect, useMemo } from 'react';
import { X, Gift, Percent, Package, Tag, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { getProducts, createPromotion, updatePromotion } from '../../services/api';
import { useNotification } from '../../components/Common/NotificationProvider';
import './CreatePromotionModal.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(val) || 0));

export default function CreatePromotionModal({ isOpen, onClose, onSuccess, initialPromo = null }) {
  const { notify } = useNotification();
  const isEditMode = Boolean(initialPromo);

  const [promotionType, setPromotionType] = useState('PERCENTAGE');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );

  // PERCENTAGE
  const [discountPercentItem, setDiscountPercentItem] = useState(10);
  const [minQuantity, setMinQuantity] = useState(1);
  const [maxQuantityPerOrder, setMaxQuantityPerOrder] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [skuSearch, setSkuSearch] = useState('');

  // COMBO
  const [comboPrice, setComboPrice] = useState(500000);
  const [comboItems, setComboItems] = useState([]);

  // BUY_N_GET_M
  const [buyQuantity, setBuyQuantity] = useState(10);
  const [freeQuantity, setFreeQuantity] = useState(1);
  const [buyProductId, setBuyProductId] = useState('');
  const [freeProductId, setFreeProductId] = useState('');

  // INVOICE_DISCOUNT
  const [minOrderAmount, setMinOrderAmount] = useState(5000000);
  const [discountType, setDiscountType] = useState('PERCENT'); // PERCENT | FIXED
  const [discountPercentInvoice, setDiscountPercentInvoice] = useState(2);
  const [discountAmountInvoice, setDiscountAmountInvoice] = useState(100000);

  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const load = async () => {
      try {
        const res = await getProducts({ limit: 250 });
        if (!isMounted) return;
        const list = res.data || res || [];
        setProducts(list);

        if (!initialPromo && list.length > 0) {
          setBuyProductId((prev) => prev || list[0].id.toString());
          setFreeProductId((prev) => prev || list[0].id.toString());
          if (list.length >= 2) {
            setComboItems((prev) =>
              prev.length > 0
                ? prev
                : [
                    { productId: list[0].id.toString(), quantity: 1 },
                    { productId: list[1].id.toString(), quantity: 1 },
                  ],
            );
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh mục sản phẩm:', err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialPromo]);

  // Populate fields when opening in Create or Edit mode
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSkuSearch('');

    if (initialPromo) {
      setPromotionType(initialPromo.promotionType);
      setName(initialPromo.name || '');
      setDescription(initialPromo.description || '');
      setStartDate(String(initialPromo.startDate || '').slice(0, 10));
      setEndDate(String(initialPromo.endDate || '').slice(0, 10));

      if (initialPromo.promotionType === 'PERCENTAGE' && initialPromo.percentageDiscount) {
        const cfg = initialPromo.percentageDiscount;
        setDiscountPercentItem(Number(cfg.discountPercent || 10));
        setMinQuantity(Number(cfg.minQuantity || 1));
        setMaxQuantityPerOrder(cfg.maxQuantityPerOrder ? String(cfg.maxQuantityPerOrder) : '');
        setSelectedProductIds((cfg.products || []).map((p) => String(p.productId)));
      } else if (initialPromo.promotionType === 'COMBO' && initialPromo.combo) {
        setComboPrice(Number(initialPromo.combo.comboPrice || 0));
        setComboItems(
          (initialPromo.combo.items || []).map((it) => ({
            productId: String(it.productId),
            quantity: Number(it.quantity || 1),
          })),
        );
      } else if (initialPromo.promotionType === 'BUY_N_GET_M' && initialPromo.buyNGetM) {
        setBuyQuantity(Number(initialPromo.buyNGetM.buyQuantity || 1));
        setFreeQuantity(Number(initialPromo.buyNGetM.freeQuantity || 1));
        const firstPair = initialPromo.buyNGetM.items?.[0];
        if (firstPair) {
          setBuyProductId(String(firstPair.buyProductId));
          setFreeProductId(String(firstPair.freeProductId));
        }
      } else if (initialPromo.promotionType === 'INVOICE_DISCOUNT' && initialPromo.invoiceDiscount) {
        const cfg = initialPromo.invoiceDiscount;
        setMinOrderAmount(Number(cfg.minOrderAmount || 0));
        if (cfg.discountAmount && Number(cfg.discountAmount) > 0) {
          setDiscountType('FIXED');
          setDiscountAmountInvoice(Number(cfg.discountAmount));
        } else {
          setDiscountType('PERCENT');
          setDiscountPercentInvoice(Number(cfg.discountPercent || 2));
        }
      }
    } else {
      setPromotionType('PERCENTAGE');
      setName('');
      setDescription('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setDiscountPercentItem(10);
      setMinQuantity(1);
      setMaxQuantityPerOrder('');
      setSelectedProductIds([]);
      setBuyQuantity(10);
      setFreeQuantity(1);
      setMinOrderAmount(5000000);
      setDiscountType('PERCENT');
      setDiscountPercentInvoice(2);
      setDiscountAmountInvoice(100000);
    }
  }, [isOpen, initialPromo]);

  const filteredProducts = useMemo(() => {
    const q = skuSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        (p.sku || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q),
    );
  }, [products, skuSearch]);

  const originalComboValue = useMemo(() => {
    return comboItems.reduce((sum, ci) => {
      const prod = products.find((p) => String(p.id) === String(ci.productId));
      return sum + Number(prod?.basePrice || 0) * Math.max(1, Number(ci.quantity) || 1);
    }, 0);
  }, [comboItems, products]);

  if (!isOpen) return null;

  const toggleProductSelect = (pid) => {
    const key = String(pid);
    setSelectedProductIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key],
    );
  };

  const handleAddComboRow = () => {
    const fallbackId = products[0]?.id ? String(products[0].id) : '';
    setComboItems((prev) => [...prev, { productId: fallbackId, quantity: 1 }]);
  };

  const handleUpdateComboRow = (idx, field, val) => {
    setComboItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleRemoveComboRow = (idx) => {
    setComboItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Vui lòng nhập tên chương trình khuyến mãi');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      promotionType,
      startDate,
      endDate,
      status: initialPromo ? initialPromo.status : true,
    };

    if (promotionType === 'PERCENTAGE') {
      if (selectedProductIds.length === 0) {
        setError('Vui lòng chọn ít nhất 1 sản phẩm áp dụng giảm giá %');
        return;
      }
      payload.discountPercent = Number(discountPercentItem);
      payload.minQuantity = Math.max(1, Number(minQuantity || 1));
      payload.maxQuantityPerOrder = maxQuantityPerOrder ? Number(maxQuantityPerOrder) : null;
      payload.productIds = selectedProductIds.map(Number);
    } else if (promotionType === 'COMBO') {
      const validComboItems = comboItems.filter((ci) => ci.productId && Number(ci.quantity) > 0);
      if (validComboItems.length < 2) {
        setError('Gói Combo cần có ít nhất 2 sản phẩm khác nhau');
        return;
      }
      const uniqueComboIds = new Set(validComboItems.map((ci) => String(ci.productId)));
      if (uniqueComboIds.size !== validComboItems.length) {
        setError('Mỗi sản phẩm chỉ nên xuất hiện 1 dòng trong Combo (hãy tăng số lượng thay vì lặp)');
        return;
      }
      payload.comboPrice = Number(comboPrice);
      payload.comboItems = validComboItems.map((ci) => ({
        productId: Number(ci.productId),
        quantity: Number(ci.quantity),
      }));
    } else if (promotionType === 'BUY_N_GET_M') {
      if (!buyProductId || !freeProductId) {
        setError('Vui lòng chọn sản phẩm mua và sản phẩm tặng');
        return;
      }
      payload.buyQuantity = Number(buyQuantity);
      payload.freeQuantity = Number(freeQuantity);
      payload.buyNGetMItems = [
        {
          buyProductId: Number(buyProductId),
          freeProductId: Number(freeProductId),
        },
      ];
    } else if (promotionType === 'INVOICE_DISCOUNT') {
      payload.minOrderAmount = Number(minOrderAmount);
      if (discountType === 'PERCENT') {
        payload.discountPercent = Number(discountPercentInvoice);
        payload.discountAmount = null;
      } else {
        payload.discountAmount = Number(discountAmountInvoice);
        payload.discountPercent = null;
      }
    }

    try {
      setSubmitting(true);
      if (isEditMode) {
        await updatePromotion(initialPromo.id, payload);
        notify.success(`Đã cập nhật chương trình "${name.trim()}"`);
      } else {
        await createPromotion(payload);
        notify.success(`Đã kích hoạt chương trình "${name.trim()}"`);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu chương trình khuyến mãi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="promo-modal-backdrop" onClick={onClose}>
      <div className="promo-modal-card promo-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="promo-modal-header">
          <h2>
            <Gift size={20} color="#2563eb" />
            {isEditMode ? `Chỉnh sửa CTKM: ${initialPromo.name}` : 'Thiết lập Chương trình Khuyến mãi'}
          </h2>
          <button type="button" className="promo-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="promo-modal-body">
            {error && (
              <div className="promo-info-alert" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Chọn 1 trong 4 cơ chế khuyến mãi */}
            <div className="form-group">
              <label>Cơ chế khuyến mãi {isEditMode && <span style={{ color: '#64748b', fontWeight: 400 }}>(Cố định khi sửa)</span>}</label>
              <div className="promo-type-selector promo-type-4">
                <button
                  type="button"
                  disabled={isEditMode}
                  className={`promo-type-option ${promotionType === 'PERCENTAGE' ? 'active' : ''}`}
                  onClick={() => !isEditMode && setPromotionType('PERCENTAGE')}
                >
                  <h4><Tag size={15} /> Giảm % theo SKU</h4>
                  <p>Giảm % trên giá bán theo sản phẩm (kèm SL tối thiểu / xả kho).</p>
                </button>

                <button
                  type="button"
                  disabled={isEditMode}
                  className={`promo-type-option ${promotionType === 'COMBO' ? 'active' : ''}`}
                  onClick={() => !isEditMode && setPromotionType('COMBO')}
                >
                  <h4><Package size={15} /> Gói Combo giá cố định</h4>
                  <p>Mua trọn bộ nhiều SKU với giá gói ưu đãi cố định.</p>
                </button>

                <button
                  type="button"
                  disabled={isEditMode}
                  className={`promo-type-option ${promotionType === 'BUY_N_GET_M' ? 'active' : ''}`}
                  onClick={() => !isEditMode && setPromotionType('BUY_N_GET_M')}
                >
                  <h4><Gift size={15} /> Mua N tặng M (FOC)</h4>
                  <p>Mua đủ SL sản phẩm A, tặng miễn phí sản phẩm B (0đ).</p>
                </button>

                <button
                  type="button"
                  disabled={isEditMode}
                  className={`promo-type-option ${promotionType === 'INVOICE_DISCOUNT' ? 'active' : ''}`}
                  onClick={() => !isEditMode && setPromotionType('INVOICE_DISCOUNT')}
                >
                  <h4><Percent size={15} /> Chiết khấu bậc thang</h4>
                  <p>Giảm % hoặc trừ tiền trực tiếp theo tổng giá trị hóa đơn.</p>
                </button>
              </div>
            </div>

            {/* Thông tin chung */}
            <div className="form-group">
              <label>Tên chương trình <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Mua từ 5 thùng giảm 10% hoặc Mua 10 tặng 1..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ngày bắt đầu <span className="req">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Ngày kết thúc <span className="req">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mô tả thể lệ</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Mô tả điều kiện áp dụng, đối tượng khách hàng..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Panel cấu hình riêng cho từng loại */}
            {promotionType === 'PERCENTAGE' && (
              <div className="rule-config-panel">
                <h4><Tag size={16} color="#2563eb" /> Cấu hình Giảm % theo Sản phẩm</h4>
                <div className="form-row promo-row-3">
                  <div className="form-group">
                    <label>Tỷ lệ giảm (%) <span className="req">*</span></label>
                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.5"
                      className="form-input"
                      value={discountPercentItem}
                      onChange={(e) => setDiscountPercentItem(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>SL mua tối thiểu</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Giới hạn SL tối đa/đơn</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Không giới hạn"
                      className="form-input"
                      value={maxQuantityPerOrder}
                      onChange={(e) => setMaxQuantityPerOrder(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 10 }}>
                  <label>
                    Chọn sản phẩm áp dụng ({selectedProductIds.length} đã chọn) <span className="req">*</span>
                  </label>
                  <div className="sku-picker-search-bar">
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Tìm mã SKU hoặc tên sản phẩm..."
                      value={skuSearch}
                      onChange={(e) => setSkuSearch(e.target.value)}
                    />
                  </div>
                  <div className="sku-multi-checklist">
                    {filteredProducts.map((p) => {
                      const checked = selectedProductIds.includes(String(p.id));
                      return (
                        <label key={p.id} className={`sku-check-row ${checked ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProductSelect(p.id)}
                          />
                          <span className="sku-code-mini">{p.sku}</span>
                          <span className="sku-name-mini">{p.name}</span>
                          <span className="sku-price-mini">{formatCurrency(p.basePrice)} đ</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {promotionType === 'COMBO' && (
              <div className="rule-config-panel">
                <div className="combo-panel-head">
                  <h4><Package size={16} color="#d97706" /> Cấu hình Gói Combo Giá Cố Định</h4>
                  <button type="button" className="btn-add-combo-row" onClick={handleAddComboRow}>
                    <Plus size={14} /> Thêm sản phẩm vào Combo
                  </button>
                </div>

                <div className="combo-rows-list">
                  {comboItems.map((ci, idx) => (
                    <div key={idx} className="combo-row-item">
                      <select
                        className="form-select"
                        value={ci.productId}
                        onChange={(e) => handleUpdateComboRow(idx, 'productId', e.target.value)}
                      >
                        <option value="">-- Chọn SKU --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} ({formatCurrency(p.basePrice)} đ)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        className="form-input combo-qty-input"
                        value={ci.quantity}
                        onChange={(e) => handleUpdateComboRow(idx, 'quantity', e.target.value)}
                        title="Số lượng trong 1 bộ combo"
                      />
                      <button
                        type="button"
                        className="combo-del-btn"
                        disabled={comboItems.length <= 2}
                        onClick={() => handleRemoveComboRow(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="form-row" style={{ marginTop: 12, alignItems: 'end' }}>
                  <div className="form-group">
                    <label>Giá bán trọn gói Combo (VNĐ) <span className="req">*</span></label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      className="form-input"
                      value={comboPrice}
                      onChange={(e) => setComboPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="combo-saving-preview">
                    <div>Giá gốc cộng gộp: <strong>{formatCurrency(originalComboValue)} đ</strong></div>
                    <div style={{ color: originalComboValue > Number(comboPrice) ? '#059669' : '#dc2626', fontWeight: 700 }}>
                      {originalComboValue > Number(comboPrice)
                        ? `Tiết kiệm: ${formatCurrency(originalComboValue - Number(comboPrice))} đ / bộ`
                        : 'Lưu ý: Giá Combo nên thấp hơn tổng giá gốc'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {promotionType === 'BUY_N_GET_M' && (
              <div className="rule-config-panel">
                <h4><Gift size={16} color="#059669" /> Cấu hình Mua N tặng M</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sản phẩm mua <span className="req">*</span></label>
                    <select
                      className="form-select"
                      value={buyProductId}
                      onChange={(e) => setBuyProductId(e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Số lượng mua tối thiểu (N) <span className="req">*</span></label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Sản phẩm tặng thưởng <span className="req">*</span></label>
                    <select
                      className="form-select"
                      value={freeProductId}
                      onChange={(e) => setFreeProductId(e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Số lượng tặng (M) <span className="req">*</span></label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={freeQuantity}
                      onChange={(e) => setFreeQuantity(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {promotionType === 'INVOICE_DISCOUNT' && (
              <div className="rule-config-panel">
                <h4><Percent size={16} color="#7c3aed" /> Cấu hình Chiết khấu bậc thang</h4>
                <div className="form-group">
                  <label>Mốc tổng tiền tối thiểu của đơn hàng (VNĐ) <span className="req">*</span></label>
                  <input
                    type="number"
                    step="100000"
                    min="0"
                    className="form-input"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Hình thức giảm giá</label>
                    <select
                      className="form-select"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                    >
                      <option value="PERCENT">Giảm theo tỷ lệ % tổng đơn</option>
                      <option value="FIXED">Giảm số tiền cố định (VNĐ)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      {discountType === 'PERCENT' ? 'Tỷ lệ chiết khấu (%)' : 'Số tiền giảm (VNĐ)'}{' '}
                      <span className="req">*</span>
                    </label>
                    {discountType === 'PERCENT' ? (
                      <input
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.1"
                        className="form-input"
                        value={discountPercentInvoice}
                        onChange={(e) => setDiscountPercentInvoice(e.target.value)}
                        required
                      />
                    ) : (
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        className="form-input"
                        value={discountAmountInvoice}
                        onChange={(e) => setDiscountAmountInvoice(e.target.value)}
                        required
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="promo-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Kích hoạt chương trình'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
