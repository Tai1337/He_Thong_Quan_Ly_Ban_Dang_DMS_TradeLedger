import React from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  X, 
  Package, 
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
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
  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = customer?.accountType === 'STORE' ? item.wholesalePrice : item.basePrice;
    return sum + price * item.quantity;
  }, 0);

  const handleCheckoutClick = () => {
    if (!customer) {
      onRequireAuth();
    } else {
      onProceedCheckout();
    }
  };

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

        {/* Items List */}
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
            <div className="cart-items-list">
              {cartItems.map((item) => {
                const itemPrice = customer?.accountType === 'STORE' ? item.wholesalePrice : item.basePrice;
                const itemSubtotal = itemPrice * item.quantity;

                return (
                  <div key={item.id} className="cart-item-row">
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
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-card">
              <div className="summary-row">
                <span>Số lượng món:</span>
                <strong>{cartItems.reduce((s, it) => s + it.quantity, 0)} {customer?.accountType === 'STORE' ? 'thùng' : 'đơn vị'}</strong>
              </div>

              {customer?.accountType === 'STORE' && (
                <div className="summary-row discount-row">
                  <span>Chính sách áp dụng:</span>
                  <span className="store-badge">
                    <Sparkles size={12} /> Bảng Giá Sỉ (-12%)
                  </span>
                </div>
              )}

              <div className="summary-row total-row">
                <span>Tổng tiền tạm tính:</span>
                <span className="total-price-text">
                  {totalAmount.toLocaleString('vi-VN')} ₫
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
