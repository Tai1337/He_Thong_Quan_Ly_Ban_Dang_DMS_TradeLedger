import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  X, 
  Package, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Percent,
  Gift,
  CheckCircle2,
  TrendingUp,
  Tag
} from 'lucide-react';
import { evaluateCartPromotions } from '../../../services/api';
import './CartDrawer.css';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  customer,
  onProceedCheckout,
  onRequireAuth
}) {
  const [promoData, setPromoData] = useState({
    appliedPromotions: [],
    upsellSuggestions: [],
    totalDiscount: 0,
    finalTotal: 0,
  });
  const [evaluating, setEvaluating] = useState(false);

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = customer?.accountType === 'STORE' ? item.wholesalePrice : item.basePrice;
    return sum + price * item.quantity;
  }, 0);

  // Gọi API đánh giá khuyến mãi và gợi ý mua thêm
  useEffect(() => {
    if (!isOpen || !cartItems || cartItems.length === 0) {
      setPromoData({
        appliedPromotions: [],
        upsellSuggestions: [],
        totalDiscount: 0,
        finalTotal: totalAmount,
      });
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setEvaluating(true);
        const res = await evaluateCartPromotions({
          items: cartItems.map((it) => ({
            productId: it.id,
            name: it.name,
            quantity: it.quantity,
            price: customer?.accountType === 'STORE' ? it.wholesalePrice : it.basePrice,
          })),
          subtotal: totalAmount,
        });
        if (isMounted) {
          setPromoData(res);
        }
      } catch (err) {
        console.error('Lỗi tính khuyến mãi giỏ hàng:', err);
      } finally {
        if (isMounted) setEvaluating(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, cartItems, customer?.accountType, totalAmount]);

  if (!isOpen) return null;

  const handleCheckoutClick = () => {
    if (!customer) {
      onRequireAuth();
    } else {
      onProceedCheckout(promoData);
    }
  };

  const handleApplyUpsell = (sug) => {
    if (sug.productId) {
      const newQty = sug.targetQuantity || (sug.currentQuantity + (sug.neededQuantity || 1));
      onUpdateQty(sug.productId, newQty);
    }
  };

  const finalTotalAmount = promoData?.finalTotal !== undefined && promoData?.totalDiscount > 0
    ? promoData.finalTotal
    : totalAmount;

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <div className="cart-header-icon-badge">
              <ShoppingCart size={20} color="#059669" />
            </div>
            <div>
              <h3>Giỏ Hàng Của Bạn</h3>
              <p>{cartItems.length} sản phẩm đang chọn</p>
            </div>
          </div>
          <button className="cart-close-btn" onClick={onClose} title="Đóng" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Items List & Promos */}
        <div className="cart-items-scroll">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <div className="empty-cart-circle">
                <Package size={48} color="#94a3b8" />
              </div>
              <h4>Giỏ hàng của bạn đang trống</h4>
              <p>Hãy dạo xem danh mục và chọn các mặt hàng cần nhập nhé!</p>
            </div>
          ) : (
            <>
              {/* PHẦN 1: ĐỀ XUẤT MUA THÊM (UPSELL SUGGESTIONS) */}
              {promoData.upsellSuggestions?.length > 0 && (
                <div className="cart-upsell-container">
                  <div className="upsell-section-header">
                    <Sparkles size={16} className="sparkle-hint-icon" />
                    <span>Gợi Ý Ưu Đãi Thêm Cho Bạn</span>
                  </div>
                  <div className="upsell-list">
                    {promoData.upsellSuggestions.map((sug, idx) => {
                      const progressPct = sug.targetQuantity && sug.currentQuantity
                        ? Math.min(100, Math.round((sug.currentQuantity / sug.targetQuantity) * 100))
                        : 0;

                      return (
                        <div key={sug.promotionId || idx} className="upsell-item-card">
                          <div className="upsell-item-header">
                            <div className="upsell-type-icon">
                              {sug.type === 'BUY_N_GET_M' ? (
                                <Gift size={15} color="#9333ea" />
                              ) : (
                                <Percent size={15} color="#ea580c" />
                              )}
                            </div>
                            <div className="upsell-item-content">
                              <p className="upsell-msg-text">{sug.message}</p>
                              {sug.targetQuantity && (
                                <div className="upsell-progress-wrapper">
                                  <div className="upsell-progress-track">
                                    <div
                                      className="upsell-progress-fill"
                                      style={{ width: `${progressPct}%` }}
                                    ></div>
                                  </div>
                                  <span className="upsell-progress-count">
                                    {sug.currentQuantity}/{sug.targetQuantity}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {sug.productId && (
                            <button
                              type="button"
                              className="btn-quick-add-upsell"
                              onClick={() => handleApplyUpsell(sug)}
                            >
                              <span>+ Thêm {sug.neededQuantity || 1}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PHẦN 2: KHUYẾN MÃI ĐÃ ÁP DỤNG THÀNH CÔNG */}
              {promoData.appliedPromotions?.length > 0 && (
                <div className="cart-applied-promos-container">
                  <div className="applied-promos-header">
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span>Đã Kích Hoạt {promoData.appliedPromotions.length} Khuyến Mãi</span>
                  </div>
                  <div className="applied-promos-list">
                    {promoData.appliedPromotions.map((p, idx) => (
                      <div key={p.promotionId || idx} className="applied-promo-pill">
                        {p.type === 'BUY_N_GET_M' ? (
                          <Gift size={14} color="#15803d" />
                        ) : (
                          <Percent size={14} color="#15803d" />
                        )}
                        <span className="applied-promo-text">{p.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DANH SÁCH SẢN PHẨM TRONG GIỎ */}
              <div className="cart-items-list">
                {cartItems.map((item) => {
                  const itemPrice = customer?.accountType === 'STORE' ? item.wholesalePrice : item.basePrice;
                  const itemSubtotal = itemPrice * item.quantity;

                  return (
                    <div key={item.id} className="cart-item-row">
                      <div className="cart-item-main">
                        <div className="cart-item-thumb">
                          {(item.imageUrl || item.retailImageUrl) ? (
                            <img src={item.imageUrl || item.retailImageUrl} alt={item.name} />
                          ) : (
                            <Package size={22} color="#059669" />
                          )}
                        </div>

                        <div className="cart-item-info">
                          <div className="cart-item-meta-head">
                            <span className="cart-item-sku">{item.sku}</span>
                            <span className="cart-item-unit-tag">{item.unit || 'THÙNG'}</span>
                          </div>
                          <h4 className="cart-item-name">{item.name}</h4>
                          <div className="cart-item-price-unit">
                            <span className="price-tag">
                              {itemPrice.toLocaleString('vi-VN')} ₫
                            </span>
                            <span className="per-unit">/{item.unit || 'thùng'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="cart-item-actions">
                        <div className="cart-qty-ctrl">
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Giảm số lượng"
                          >
                            -
                          </button>
                          <span className="cart-qty-num">{item.quantity}</span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                            aria-label="Tăng số lượng"
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-item-subtotal">
                          {itemSubtotal.toLocaleString('vi-VN')} ₫
                        </div>

                        <button
                          type="button"
                          className="cart-delete-btn"
                          onClick={() => onRemoveItem(item.id)}
                          title="Xoá món này"
                          aria-label="Xoá món này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-card">
              <div className="summary-row">
                <span>Số lượng món:</span>
                <strong>
                  {cartItems.reduce((s, it) => s + it.quantity, 0)} {customer?.accountType === 'STORE' ? 'thùng' : 'đơn vị'}
                </strong>
              </div>

              {customer?.accountType === 'STORE' && (
                <div className="summary-row discount-row">
                  <span>Chính sách áp dụng:</span>
                  <span className="store-badge">
                    <Sparkles size={12} /> Bảng Giá Sỉ (-12%)
                  </span>
                </div>
              )}

              {/* Tạm tính */}
              <div className="summary-row">
                <span>Tổng tiền hàng:</span>
                <span>{totalAmount.toLocaleString('vi-VN')} ₫</span>
              </div>

              {/* Khuyến mãi giảm giá */}
              {promoData.totalDiscount > 0 && (
                <div className="summary-row promo-discount-row">
                  <span>Khuyến mãi giảm trừ:</span>
                  <strong className="promo-discount-val">
                    -{promoData.totalDiscount.toLocaleString('vi-VN')} ₫
                  </strong>
                </div>
              )}

              {/* Quà tặng kèm */}
              {promoData.appliedPromotions?.some((p) => p.type === 'BUY_N_GET_M') && (
                <div className="summary-row promo-gift-row">
                  <span>Quà tặng kèm theo:</span>
                  <span className="promo-gift-badge">
                    <Gift size={12} /> Miễn phí (0 ₫)
                  </span>
                </div>
              )}

              {/* Tổng thanh toán */}
              <div className="summary-row total-row">
                <span>Tổng tiền thanh toán:</span>
                <span className="total-price-text">
                  {finalTotalAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            <button
              type="button"
              className="checkout-proceed-btn"
              onClick={handleCheckoutClick}
            >
              <span>{customer ? 'Tiến Hành Đặt Hàng' : 'Đăng Nhập Để Đặt Hàng'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
