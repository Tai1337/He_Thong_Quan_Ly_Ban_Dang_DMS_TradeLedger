import { useState, useEffect } from 'react';
import { X, Sparkles, Percent, TrendingDown, Tag, Gift, Calendar, AlertCircle } from 'lucide-react';
import { getProducts, getClearanceCandidates, autoGeneratePromotion } from '../../services/api';
import { useNotification } from '../../components/Common/NotificationProvider';
import './CreatePromotionModal.css';

export default function AutoGeneratePromotionModal({ isOpen, onClose, onSuccess }) {
  const { notify } = useNotification();
  const [autoType, setAutoType] = useState('CLEARANCE_STOCK'); // BULK_QUANTITY | CLEARANCE_STOCK | INVOICE_TOTAL | BUY_N_GET_M
  const [minQuantity, setMinQuantity] = useState(3);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [minOrderAmount, setMinOrderAmount] = useState(500000);
  const [buyQuantity, setBuyQuantity] = useState(5);
  const [freeQuantity, setFreeQuantity] = useState(1);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [freeProductId, setFreeProductId] = useState('');

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );

  const [products, setProducts] = useState([]);
  const [clearanceCandidates, setClearanceCandidates] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    let isMounted = true;

    const load = async () => {
      try {
        const [prodRes, clearanceRes] = await Promise.all([
          getProducts({ limit: 150 }).catch(() => ({ data: [] })),
          getClearanceCandidates().catch(() => []),
        ]);
        if (!isMounted) return;
        const prods = prodRes?.data || prodRes || [];
        setProducts(prods);
        setClearanceCandidates(clearanceRes || []);
        if (prods.length > 0) {
          setFreeProductId((prev) => prev || prods[0].id.toString());
        }
      } catch {
        // ignore background fetch error
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickDuration = (days) => {
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const toggleProductId = (pid) => {
    const idStr = String(pid);
    setSelectedProductIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(endDate) < new Date(startDate)) {
      setError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
      return;
    }

    try {
      setSubmitting(true);
      await autoGeneratePromotion({
        autoType,
        minQuantity: Number(minQuantity),
        discountPercent: Number(discountPercent),
        minOrderAmount: Number(minOrderAmount),
        buyQuantity: Number(buyQuantity),
        freeQuantity: Number(freeQuantity),
        productIds: selectedProductIds.map(Number),
        buyProductId: selectedProductIds[0] ? Number(selectedProductIds[0]) : undefined,
        freeProductId: freeProductId ? Number(freeProductId) : undefined,
        startDate,
        endDate,
      });
      notify.success('Đã tự động sinh và kích hoạt chương trình khuyến mãi!');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể sinh khuyến mãi tự động');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="promo-modal-backdrop" onClick={onClose}>
      <div className="promo-modal-card promo-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="promo-modal-header">
          <h2>
            <Sparkles size={20} color="#1a73e8" />
            Tự Động Sinh Khuyến Mãi Nhanh
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

            <div className="promo-type-selector">
              <button
                type="button"
                className={`promo-type-option ${autoType === 'CLEARANCE_STOCK' ? 'active' : ''}`}
                onClick={() => setAutoType('CLEARANCE_STOCK')}
              >
                <h4><TrendingDown size={15} /> Xả Hàng Tồn Kho Cao</h4>
                <p>Tự động chọn SKU tồn nhiều nhất để giảm % kích cầu.</p>
              </button>

              <button
                type="button"
                className={`promo-type-option ${autoType === 'BULK_QUANTITY' ? 'active' : ''}`}
                onClick={() => setAutoType('BULK_QUANTITY')}
              >
                <h4><Percent size={15} /> Giảm Số Lượng Lớn</h4>
                <p>Mua từ N đơn vị trở lên để nhận % chiết khấu.</p>
              </button>

              <button
                type="button"
                className={`promo-type-option ${autoType === 'INVOICE_TOTAL' ? 'active' : ''}`}
                onClick={() => setAutoType('INVOICE_TOTAL')}
              >
                <h4><Tag size={15} /> Giảm Theo Tổng Đơn</h4>
                <p>Sinh nhanh bậc thang giảm % cho hóa đơn đạt mốc.</p>
              </button>

              <button
                type="button"
                className={`promo-type-option ${autoType === 'BUY_N_GET_M' ? 'active' : ''}`}
                onClick={() => setAutoType('BUY_N_GET_M')}
              >
                <h4><Gift size={15} /> Mua N Tặng M Nhanh</h4>
                <p>Sinh nhanh khuyến mãi tặng quà (FOC 0đ).</p>
              </button>
            </div>

            <div className="rule-config-panel">
              <div className="combo-panel-head">
                <h4><Calendar size={15} color="#1a73e8" /> Thời gian hiệu lực</h4>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[7, 14, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="btn-add-combo-row"
                      onClick={() => handleQuickDuration(d)}
                    >
                      +{d} ngày
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc</label>
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
            </div>

            {autoType === 'CLEARANCE_STOCK' && (
              <div className="rule-config-panel">
                <div className="form-group">
                  <label>Tỷ lệ giảm giá xả kho (%) <span className="req">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    className="form-input"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    Gợi ý SKU tồn kho cao (tự động chọn top 3 nếu không tích chọn):
                  </label>
                  <div className="sku-multi-checklist">
                    {clearanceCandidates.map((c) => {
                      const pid = String(c.product.id);
                      const checked = selectedProductIds.includes(pid);
                      return (
                        <label key={pid} className={`sku-check-row ${checked ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProductId(pid)}
                          />
                          <span className="sku-code-mini">{c.product.sku}</span>
                          <span className="sku-name-mini">{c.product.name}</span>
                          <span className="sku-price-mini">Tồn khả dụng: {c.availableQty}</span>
                        </label>
                      );
                    })}
                    {clearanceCandidates.length === 0 && (
                      <div style={{ padding: 12, fontSize: 12.5, color: '#64748b', textAlign: 'center' }}>
                        Chưa có SKU tồn kho khả dụng &gt; 0
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {autoType === 'BULK_QUANTITY' && (
              <div className="rule-config-panel">
                <div className="form-row">
                  <div className="form-group">
                    <label>SL tối thiểu</label>
                    <input
                      type="number"
                      min="2"
                      className="form-input"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Giảm (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="form-input"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Sản phẩm áp dụng (bỏ trống sẽ lấy 3 SP mặc định):</label>
                  <div className="sku-multi-checklist">
                    {products.slice(0, 40).map((p) => {
                      const pid = String(p.id);
                      const checked = selectedProductIds.includes(pid);
                      return (
                        <label key={pid} className={`sku-check-row ${checked ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProductId(pid)}
                          />
                          <span className="sku-code-mini">{p.sku}</span>
                          <span className="sku-name-mini">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {autoType === 'INVOICE_TOTAL' && (
              <div className="rule-config-panel">
                <div className="form-row">
                  <div className="form-group">
                    <label>Mốc tổng đơn tối thiểu (VNĐ)</label>
                    <input
                      type="number"
                      min="10000"
                      step="50000"
                      className="form-input"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tỷ lệ giảm (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="form-input"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {autoType === 'BUY_N_GET_M' && (
              <div className="rule-config-panel">
                <div className="form-row">
                  <div className="form-group">
                    <label>Số lượng mua (N)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Số lượng tặng (M)</label>
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
                <div className="form-row">
                  <div className="form-group">
                    <label>Sản phẩm mua</label>
                    <select
                      className="form-select"
                      value={selectedProductIds[0] || ''}
                      onChange={(e) => setSelectedProductIds(e.target.value ? [e.target.value] : [])}
                    >
                      <option value="">-- Mặc định SP đầu tiên --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sản phẩm tặng (FOC)</label>
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
                </div>
              </div>
            )}
          </div>

          <div className="promo-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Sinh & Kích hoạt ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
