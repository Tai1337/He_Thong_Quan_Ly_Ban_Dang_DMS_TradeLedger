import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShoppingCart, CheckCircle2, Gift, Sparkles } from 'lucide-react';
import { 
  getRetailers, 
  getWarehouses, 
  getProducts, 
  createSalesOrder,
  evaluateOrderPromotions 
} from '../../../services/api';
import './CreateSalesOrderModal.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const CreateSalesOrderModal = ({ isOpen, onClose, onOrderCreated }) => {
  const [retailers, setRetailers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Form State
  const [retailerId, setRetailerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [orderType, setOrderType] = useState('LATER');
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  // Line Items
  const [items, setItems] = useState([
    { productId: '', sku: '', name: '', unit: '', quantity: 1, unitPrice: 0, isPromotion: false }
  ]);

  // Promotion calculation state
  const [promoData, setPromoData] = useState({
    subtotal: 0,
    freeItems: [],
    invoiceDiscount: null,
    appliedPromotions: [],
    upsellHints: [],
    totalDiscountAmount: 0,
    finalAmount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError('');
      // Reset khi mở lại modal
      setItems([{ productId: '', sku: '', name: '', unit: '', quantity: 1, unitPrice: 0, isPromotion: false }]);
      setPromoData({ subtotal: 0, freeItems: [], invoiceDiscount: null, appliedPromotions: [], upsellHints: [], totalDiscountAmount: 0, finalAmount: 0 });
      setNotes('');
      Promise.all([
        getRetailers({ distributorId: 1 }),
        getWarehouses(1),
        getProducts({ limit: 500 })
      ]).then(([retRes, whRes, prodRes]) => {
        setRetailers(retRes || []);
        setWarehouses(whRes || []);
        const prodList = Array.isArray(prodRes) ? prodRes : (prodRes?.data || []);
        setProducts(prodList);
        if (whRes && whRes.length > 0) setWarehouseId(whRes[0].id);
        if (retRes && retRes.length > 0) setRetailerId(retRes[0].id);
      }).catch(err => {
        setError(err.message || 'Lỗi tải danh mục');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  // Auto calculate trade promotions when items change
  useEffect(() => {
    const validPaidItems = items
      .filter((it) => it.productId && Number(it.quantity) > 0 && !it.isPromotion)
      .map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      }));

    if (validPaidItems.length === 0) {
      setPromoData({
        subtotal: 0,
        freeItems: [],
        invoiceDiscount: null,
        appliedPromotions: [],
        upsellHints: [],
        totalDiscountAmount: 0,
        finalAmount: 0,
      });
      return;
    }

    const timer = setTimeout(() => {
      evaluateOrderPromotions({ items: validPaidItems })
        .then((res) => {
          console.log('[Khuyến mãi] Kết quả evaluate:', res);
          setPromoData(res);
        })
        .catch((err) => {
          console.error('[Khuyến mãi] Lỗi tính toán khuyến mãi:', err);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [items]);

  // Thêm dòng sản phẩm
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { productId: '', sku: '', name: '', unit: '', quantity: 1, unitPrice: 0, isPromotion: false }
    ]);
  };

  // Xoá dòng sản phẩm
  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert('Đơn hàng phải có ít nhất 1 sản phẩm');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Thay đổi sản phẩm trong dòng
  const handleProductChange = (index, prodId) => {
    const p = products.find(prod => String(prod.id) === String(prodId));
    setItems(prev => {
      const copy = [...prev];
      if (p) {
        copy[index] = {
          ...copy[index],
          productId: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit || 'THÙNG',
          unitPrice: p.basePrice || 0
        };
      } else {
        copy[index] = {
          ...copy[index],
          productId: '',
          sku: '',
          name: '',
          unit: '',
          unitPrice: 0
        };
      }
      return copy;
    });
  };

  // Thay đổi số lượng hoặc giá
  const handleItemFieldChange = (index, field, val) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Submit đơn hàng
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!retailerId) {
      setError('Vui lòng chọn khách hàng / đại lý');
      return;
    }
    if (!warehouseId) {
      setError('Vui lòng chọn kho xuất hàng');
      return;
    }

    const validUserItems = items
      .filter((it) => it.productId && Number(it.quantity) > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitPrice: it.isPromotion ? 0 : Number(it.unitPrice),
        isPromotion: Boolean(it.isPromotion),
      }));

    if (validUserItems.length === 0) {
      setError('Vui lòng chọn ít nhất 1 sản phẩm và nhập số lượng hợp lệ');
      return;
    }

    // Phân bổ chiết khấu bậc thang (Invoice Tier Discount) vào các dòng hàng bán
    const totalDiscount = Number(promoData.invoiceDiscount?.discountAmount) || 0;
    const invoicePromoId = promoData.invoiceDiscount?.promotionId || null;

    let distributedDiscountSum = 0;
    const validUserItemsWithDiscount = validUserItems.map((it, idx) => {
      const lineTotal = Number(it.quantity) * Number(it.unitPrice);
      let itemDiscount = 0;
      if (totalDiscount > 0 && currentSubtotal > 0) {
        if (idx === validUserItems.length - 1) {
          // Dòng cuối nhận phần dư để tròn số tiền
          itemDiscount = Math.max(0, totalDiscount - distributedDiscountSum);
        } else {
          itemDiscount = Math.round((lineTotal / currentSubtotal) * totalDiscount);
          distributedDiscountSum += itemDiscount;
        }
      }
      return {
        ...it,
        discountAmount: itemDiscount,
        appliedPromotionId: itemDiscount > 0 ? invoicePromoId : null,
      };
    });

    // Auto-attach calculated Free Items (FOC) from Trade Promotion
    const promoGifts = (promoData.freeItems || []).map((gift) => ({
      productId: gift.productId,
      quantity: Number(gift.quantity),
      unitPrice: 0,
      isPromotion: true,
      appliedPromotionId: gift.appliedPromotionId,
      discountAmount: 0,
    }));

    const finalOrderItems = [...validUserItemsWithDiscount, ...promoGifts];

    setSubmitting(true);
    try {
      const payload = {
        distributorId: 1,
        retailerId,
        warehouseId,
        orderType,
        expectedDate,
        notes: notes ? `${notes} (Khuyến mãi áp dụng: ${promoData.appliedPromotions?.map(p => p.name).join(', ') || 'Không'})` : (promoData.appliedPromotions?.length > 0 ? `Khuyến mãi: ${promoData.appliedPromotions.map(p => p.name).join(', ')}` : ''),
        items: finalOrderItems,
      };

      const res = await createSalesOrder(payload);
      if (onOrderCreated) {
        onOrderCreated(res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentSubtotal = items.reduce((sum, it) => {
    if (!it.productId || it.isPromotion) return sum;
    return sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
  }, 0);

  const displayPayable = promoData.finalAmount > 0 || promoData.subtotal > 0
    ? promoData.finalAmount
    : currentSubtotal;

  return (
    <div className="modal-overlay">
      <div className="create-order-modal-container">
        {/* Header */}
        <div className="create-order-header">
          <div>
            <h3>Tạo Đơn Đặt Hàng Bán (Biểu mẫu BH_BM1)</h3>
            <p className="create-order-sub">Tự động áp dụng cơ chế Khuyến mãi FMCG: Hàng tặng FOC (0đ) & Chiết khấu bậc thang</p>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="create-order-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-order-form">
          {/* General Information Grid */}
          <div className="create-order-grid">
            <div className="form-group">
              <label>Khách hàng / Đại lý <span style={{ color: 'red' }}>*</span></label>
              <select 
                className="modal-select"
                value={retailerId}
                onChange={(e) => setRetailerId(e.target.value)}
                required
              >
                <option value="">-- Chọn khách hàng / đại lý --</option>
                {retailers.map(r => (
                  <option key={r.id} value={r.id}>
                    [{r.code}] {r.name} - {r.address}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Kho xuất hàng <span style={{ color: 'red' }}>*</span></label>
              <select 
                className="modal-select"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">-- Chọn kho xuất --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    [{w.code}] {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Loại đơn hàng</label>
              <select 
                className="modal-select"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="LATER">Giao sau (LATER)</option>
                <option value="IMMEDIATE">Giao ngay (IMMEDIATE)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Ngày giao dự kiến</label>
              <input 
                type="date"
                className="modal-input"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '10px' }}>
            <label>Ghi chú đơn hàng</label>
            <input 
              type="text"
              className="modal-input"
              placeholder="Ghi chú giao hàng, yêu cầu đóng gói..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Applied Promotions Panel - hiện khi có khuyến mãi */}
          {promoData.appliedPromotions?.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '1.5px solid #86efac',
              borderRadius: 10,
              padding: '10px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Gift size={14} /> Khuyến mãi đang được áp dụng
              </div>
              {promoData.appliedPromotions.map((p, idx) => (
                <div key={idx} style={{ fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#16a34a' }}>✓</span>
                  <strong>{p.name}</strong>
                  <span style={{ color: '#4ade80' }}>·</span>
                  <span>{p.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Upsell Hints */}
          {promoData.upsellHints?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {promoData.upsellHints.map((hint, idx) => (
                <div key={idx} className="upsell-alert-box">
                  <Sparkles size={16} color="#d97706" style={{ flexShrink: 0 }} />
                  <span><strong>Gợi ý Trade Marketing:</strong> {hint}</span>
                </div>
              ))}
            </div>
          )}

          {/* Line items table */}
          <div className="create-items-section">
            <div className="items-header-bar">
              <h4>Danh mục sản phẩm đặt hàng</h4>
              <button 
                type="button" 
                className="btn-add-item" 
                onClick={handleAddItem}
              >
                <Plus size={14} /> Thêm sản phẩm
              </button>
            </div>

            <div className="create-table-wrap">
              <table className="create-order-table">
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>Sản phẩm <span style={{ color: 'red' }}>*</span></th>
                    <th style={{ width: '12%' }}>ĐVT</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Số lượng <span style={{ color: 'red' }}>*</span></th>
                    <th style={{ width: '18%', textAlign: 'right' }}>Đơn giá (VNĐ)</th>
                    <th style={{ width: '17%', textAlign: 'right' }}>Thành tiền (VNĐ)</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Loại</th>
                    <th style={{ width: '5%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {/* User items */}
                  {items.map((row, idx) => {
                    const lineTotal = row.isPromotion ? 0 : (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
                    return (
                      <tr key={idx}>
                        <td>
                          <select 
                            className="item-select"
                            value={row.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            required
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="item-readonly-input" 
                            value={row.unit} 
                            readOnly 
                            placeholder="ĐVT"
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="item-qty-input" 
                            min="1" 
                            value={row.quantity}
                            onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input 
                            type="number" 
                            className="item-qty-input" 
                            value={row.unitPrice}
                            onChange={(e) => handleItemFieldChange(idx, 'unitPrice', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(lineTotal)} đ
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>Hàng bán</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn-del-item" 
                            onClick={() => handleRemoveItem(idx)}
                            title="Xoá dòng"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Auto-applied Free Promotion Items (FOC) */}
                  {promoData.freeItems?.map((gift, gIdx) => (
                    <tr key={`gift-${gIdx}`} className="promo-gift-row">
                      <td>
                        <div style={{ fontWeight: 600, color: '#15803d' }}>
                          [{gift.productSku}] {gift.productName}
                        </div>
                        <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                          {gift.promotionName}
                        </div>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="item-readonly-input" 
                          value={gift.unit} 
                          readOnly 
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                        +{gift.quantity}
                      </td>
                      <td style={{ textAlign: 'right', color: '#15803d' }}>
                        0 đ
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                        0 đ
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="promo-gift-badge">
                          <Gift size={11} /> Tặng 0đ (FOC)
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span title="Tự động thêm bởi khuyến mãi" style={{ cursor: 'help' }}>✨</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer & Total */}
          <div className="create-order-footer">
            <div className="create-order-summary">
              <div className="summary-row">
                <span>Tiền hàng:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(currentSubtotal)} đ</span>
              </div>
              {promoData.freeItems?.length > 0 && (
                <div className="summary-row" style={{ color: '#15803d' }}>
                  <span>🎁 Hàng tặng (FOC):</span>
                  <span style={{ fontWeight: 700 }}>
                    {promoData.freeItems.reduce((acc, g) => acc + Number(g.quantity), 0)} sản phẩm (0 đ)
                  </span>
                </div>
              )}
              {promoData.invoiceDiscount && (
                <div className="summary-row summary-discount">
                  <span>
                    Chiết khấu {promoData.invoiceDiscount.discountPercent ? `${promoData.invoiceDiscount.discountPercent}%` : 'tiền mặt'}:
                  </span>
                  <span style={{ fontWeight: 700 }}>- {formatCurrency(promoData.invoiceDiscount.discountAmount)} đ</span>
                </div>
              )}
              <div className="summary-row" style={{ marginTop: 2, borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
                <span className="summary-label" style={{ fontWeight: 700, color: '#0f172a' }}>Tổng thanh toán:</span>
                <span className="summary-val final-val">{formatCurrency(displayPayable)} đ</span>
              </div>
            </div>

            <div className="create-order-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                Huỷ bỏ
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || loading}>
                <CheckCircle2 size={16} /> {submitting ? 'Đang lưu...' : 'Lưu Đơn Hàng (BH_BM1)'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSalesOrderModal;
