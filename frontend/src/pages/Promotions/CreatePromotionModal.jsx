import { useState, useEffect } from 'react';
import { X, Gift, Percent, Plus, AlertCircle } from 'lucide-react';
import { getProducts, createPromotion } from '../../services/api';
import './CreatePromotionModal.css';

export default function CreatePromotionModal({ isOpen, onClose, onSuccess }) {
  const [promotionType, setPromotionType] = useState('BUY_N_GET_M');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Buy N Get M
  const [buyQuantity, setBuyQuantity] = useState(10);
  const [freeQuantity, setFreeQuantity] = useState(1);
  const [buyProductId, setBuyProductId] = useState('');
  const [freeProductId, setFreeProductId] = useState('');

  // Invoice Discount
  const [minOrderAmount, setMinOrderAmount] = useState(5000000);
  const [discountType, setDiscountType] = useState('PERCENT'); // PERCENT or FIXED
  const [discountPercent, setDiscountPercent] = useState(2);
  const [discountAmount, setDiscountAmount] = useState(100000);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts({ limit: 200 });
      const list = res.data || res || [];
      setProducts(list);
      if (list.length > 0) {
        setBuyProductId(list[0].id.toString());
        setFreeProductId(list[0].id.toString());
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        promotionType,
        startDate,
        endDate,
        status: true,
      };

      if (promotionType === 'BUY_N_GET_M') {
        if (!buyProductId || !freeProductId) {
          setError('Vui lòng chọn sản phẩm mua và sản phẩm tặng');
          setSubmitting(false);
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
          payload.discountPercent = Number(discountPercent);
          payload.discountAmount = null;
        } else {
          payload.discountAmount = Number(discountAmount);
          payload.discountPercent = null;
        }
      }

      await createPromotion(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo khuyến mãi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="promo-modal-backdrop" onClick={onClose}>
      <div className="promo-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="promo-modal-header">
          <h2>
            <Gift size={20} color="#2563eb" />
            Tạo chương trình khuyến mãi mới
          </h2>
          <button className="promo-modal-close" onClick={onClose}>
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

            {/* Chọn cơ chế khuyến mãi */}
            <div className="form-group">
              <label>Cơ chế áp dụng <span className="req">*</span></label>
              <div className="promo-type-selector">
                <div
                  className={`promo-type-option ${promotionType === 'BUY_N_GET_M' ? 'active' : ''}`}
                  onClick={() => setPromotionType('BUY_N_GET_M')}
                >
                  <h4><Gift size={16} /> Mua N tặng M (FOC)</h4>
                  <p>Mua SL sản phẩm đạt mốc, tặng kèm sản phẩm miễn phí (đơn giá 0đ).</p>
                </div>

                <div
                  className={`promo-type-option ${promotionType === 'INVOICE_DISCOUNT' ? 'active' : ''}`}
                  onClick={() => setPromotionType('INVOICE_DISCOUNT')}
                >
                  <h4><Percent size={16} /> Chiết khấu bậc thang</h4>
                  <p>Giảm % hoặc trừ tiền trực tiếp trên tổng giá trị đơn hàng.</p>
                </div>
              </div>
            </div>

            {/* Thông tin chung */}
            <div className="form-group">
              <label>Tên chương trình <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Mua 10 tặng 1 nhân dịp khai trương..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Ghi chú / Thể lệ chương trình</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Mô tả đối tượng thụ hưởng, quy định xuất kho..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Cấu hình chi tiết theo loại */}
            {promotionType === 'BUY_N_GET_M' ? (
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
                          {p.sku} - {p.name}
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
                          {p.sku} - {p.name}
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
            ) : (
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
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        required
                      />
                    ) : (
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        className="form-input"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
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
              {submitting ? 'Đang lưu...' : 'Kích hoạt chương trình'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

