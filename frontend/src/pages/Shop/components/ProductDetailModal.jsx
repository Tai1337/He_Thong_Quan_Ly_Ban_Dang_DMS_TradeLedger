import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  ShoppingCart, 
  Zap, 
  Package, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Layers,
  Check
} from 'lucide-react';
import './ProductDetailModal.css';

export default function ProductDetailModal({
  product,
  customer,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist
}) {
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen || !product) return null;

  const isStore = customer?.accountType === 'STORE';
  const displayPrice = isStore ? product.wholesalePrice : product.basePrice;

  const handleAdd = () => {
    setIsAdding(true);
    onAddToCart(product, qty);
    setTimeout(() => {
      setIsAdding(false);
    }, 400);
  };

  const handleBuy = () => {
    onAddToCart(product, qty);
    onBuyNow();
    onClose();
  };

  return (
    <div className="portal-modal-overlay" onClick={onClose}>
      <div className="product-detail-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="detail-close-btn" onClick={onClose} title="Đóng" aria-label="Đóng">
          <X size={18} />
        </button>

        <div className="detail-layout-grid">
          {/* Left: Product Media */}
          <div className="detail-media-pane">
            <div className="detail-graphic-showcase">
              <div className="detail-box-illustration">
                <Package size={64} color="#ffffff" strokeWidth={1.8} />
                <span className="illustration-unit">{product.unit || 'THÙNG'}</span>
              </div>
            </div>
            
            <div className="detail-media-badges">
              {product.inStock ? (
                <span className="stock-pill in-stock">
                  <Check size={13} /> Còn {product.availableQty} {product.unit} trong kho
                </span>
              ) : (
                <span className="stock-pill out-stock">Tạm hết hàng</span>
              )}

              {isStore && (
                <span className="wholesale-badge">
                  <Sparkles size={13} /> Áp dụng Giá Sỉ B2B (-12%)
                </span>
              )}
            </div>

            <button
              type="button"
              className={`wishlist-toggle-btn ${isWishlisted ? 'active' : ''}`}
              onClick={() => onToggleWishlist(product.id)}
            >
              <Heart size={15} className={isWishlisted ? 'heart-fill' : ''} />
              <span>{isWishlisted ? 'Đã lưu yêu thích' : 'Thêm vào yêu thích'}</span>
            </button>
          </div>

          {/* Right: Product Info & Specs */}
          <div className="detail-info-pane">
            <div className="detail-category-meta">
              <span className="detail-cat-pill">{product.categoryName}</span>
              <span className="detail-sku-text">Mã SKU: <strong>{product.sku}</strong></span>
            </div>

            <h2 className="detail-product-name">{product.name}</h2>

            {/* Price Box */}
            <div className="detail-price-box">
              <div className="detail-price-main">
                <span className="detail-currency-sign">₫</span>
                <span className="detail-price-num">{displayPrice.toLocaleString('vi-VN')}</span>
                <span className="detail-price-unit">/{product.unit || 'thùng'}</span>
              </div>

              {isStore && product.basePrice > product.wholesalePrice && (
                <div className="detail-price-strike-row">
                  <span className="strike-label">Giá niêm yết lẻ:</span>
                  <span className="strike-val">{product.basePrice.toLocaleString('vi-VN')} ₫</span>
                  <span className="discount-pill">Chiết khấu sỉ 12%</span>
                </div>
              )}
            </div>

            {/* FMCG Packaging Specs */}
            <div className="detail-specs-card">
              <h4 className="specs-card-title">
                <Layers size={14} /> Quy cách & Thông số phân phối (FMCG)
              </h4>
              
              <div className="specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Đơn vị phân phối chuẩn:</span>
                  <strong className="spec-val">{product.unit || 'THÙNG'}</strong>
                </div>

                <div className="spec-item">
                  <span className="spec-label">Đơn vị bán lẻ tiêu chuẩn:</span>
                  <strong className="spec-val">{product.retailUnit || 'Chai/Gói/Lon'}</strong>
                </div>

                <div className="spec-item">
                  <span className="spec-label">Tỷ lệ đóng gói quy đổi:</span>
                  <strong className="spec-val">
                    1 {product.unit || 'thùng'} = {product.conversionRate} {product.retailUnit || 'đơn vị lẻ'}
                  </strong>
                </div>

                <div className="spec-item">
                  <span className="spec-label">Hạn sử dụng lô kho:</span>
                  <strong className="spec-val expiry-val">
                    <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                    {product.expiryDate 
                      ? `${new Date(product.expiryDate).toLocaleDateString('vi-VN')} (Lô: ${product.lotNumber || 'CHUẨN'})` 
                      : 'Lô hàng mới xuất kho (>12 tháng)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="detail-actions-section">
              <div className="detail-qty-picker">
                <span className="qty-picker-label">Số lượng đặt:</span>
                <div className="detail-qty-control">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                  >
                    -
                  </button>
                  <span className="qty-val">{qty}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQty(qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="detail-btn-row">
                <button
                  type="button"
                  className={`detail-add-btn ${isAdding ? 'adding' : ''}`}
                  onClick={handleAdd}
                  disabled={!product.inStock}
                >
                  <ShoppingCart size={16} />
                  <span>{isAdding ? 'Đã thêm vào giỏ' : 'Thêm Vào Giỏ'}</span>
                </button>

                <button
                  type="button"
                  className="detail-buy-btn"
                  onClick={handleBuy}
                  disabled={!product.inStock}
                >
                  <Zap size={16} />
                  <span>Mua Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
