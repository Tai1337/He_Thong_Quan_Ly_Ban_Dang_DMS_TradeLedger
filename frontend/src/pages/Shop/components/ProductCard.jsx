import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Plus, 
  Check, 
  Package, 
  Sparkles,
  TrendingDown,
  Star
} from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({ 
  product, 
  customer, 
  onAddToCart, 
  onOpenDetail,
  isWishlisted,
  onToggleWishlist
}) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isStore = customer?.accountType === 'STORE';
  const displayPrice = isStore ? product.wholesalePrice : product.basePrice;
  const originalPrice = Math.round(displayPrice * 1.15);
  const activeImage = product.imageUrl || product.retailImageUrl;

  // Deterministic sold count based on product.id for authentic FMCG e-commerce feel
  const seed = Math.abs((Number(product.id) || 1) * 73);
  const soldCount = 200 + (seed % 1400);

  // Render SVG package visual badge
  const renderProductGraphic = () => {
    const hues = [
      { bg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', label: 'BEVERAGE' },
      { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', label: 'FOOD' },
      { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', label: 'GROCERY' },
      { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', label: 'PREMIUM' }
    ];
    const theme = hues[seed % hues.length];

    return (
      <div className="product-graphic-canvas">
        <div className="graphic-pkg-box" style={{ background: theme.bg }}>
          <div className="graphic-pkg-top-tape"></div>
          <div className="graphic-pkg-center">
            <Package size={34} color="#ffffff" strokeWidth={1.8} />
            <span className="graphic-pkg-unit">{product.unit || 'THÙNG'}</span>
          </div>
          <div className="graphic-pkg-barcode">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
      </div>
    );
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    setIsAdding(true);
    onAddToCart(product, qty);
    setTimeout(() => {
      setIsAdding(false);
      setQty(1);
    }, 400);
  };

  return (
    <div className={`modern-product-card ${!product.inStock ? 'is-out-of-stock' : ''}`}>
      {/* Media & Badges */}
      <div 
        className="product-card-media" 
        onClick={() => navigate(`/shop/product/${product.id}`)}
      >
        {activeImage && !imgError ? (
          <div className="product-real-image-wrap">
            <img 
              src={activeImage} 
              alt={product.name} 
              className="product-real-img" 
              loading="lazy"
              onError={() => setImgError(true)}
            />
            <span className="product-unit-pill">{product.unit || 'THÙNG'}</span>
          </div>
        ) : (
          renderProductGraphic()
        )}

        {/* Top Badges (Shopee Style Discount Tag) */}
        <div className="media-top-tags">
          {product.inStock ? (
            <span className="stock-tag in-stock">
              <span className="dot"></span> Sẵn kho
            </span>
          ) : (
            <span className="stock-tag out-stock">
              Tạm hết
            </span>
          )}

          {isStore ? (
            <span className="b2b-badge">
              <Sparkles size={11} /> Sỉ -12%
            </span>
          ) : (
            <span className="shopee-discount-badge">
              -15%
            </span>
          )}
        </div>

        {/* Wishlist Heart Button */}
        <button
          type="button"
          className={`card-wishlist-action ${isWishlisted ? 'favorited' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist && onToggleWishlist(product.id);
          }}
          title={isWishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          aria-label="Yêu thích"
        >
          <Heart size={16} className={isWishlisted ? 'heart-fill' : ''} />
        </button>
      </div>

      {/* Product Content Details */}
      <div className="product-card-details">
        {/* Category & SKU */}
        <div className="meta-category-row">
          <span className="cat-chip">{product.categoryName}</span>
          <span className="sku-chip">{product.sku}</span>
        </div>

        {product.groupStdSku && (
          <div className="meta-group-row">
            <span className="group-chip">{product.groupStdSku}</span>
          </div>
        )}

        {/* Title */}
        <h3 
          className="product-main-title" 
          title={product.name}
          onClick={() => navigate(`/shop/product/${product.id}`)}
        >
          {product.name}
        </h3>

        {/* Packaging Specs */}
        <div className="packaging-spec-row">
          <span className="spec-pill">
            Quy cách: <strong>{product.unit || 'THÙNG'}</strong>
          </span>
          {product.conversionRate > 1 && (
            <span className="conversion-text">
              ({product.conversionRate} {product.retailUnit || 'lẻ'})
            </span>
          )}
        </div>

        {/* Hasaki / Shopee Rating & Sold Count */}
        <div className="product-rating-sold-row">
          <div className="star-rating-cluster">
            <Star size={11} fill="#f59e0b" color="#f59e0b" />
            <Star size={11} fill="#f59e0b" color="#f59e0b" />
            <Star size={11} fill="#f59e0b" color="#f59e0b" />
            <Star size={11} fill="#f59e0b" color="#f59e0b" />
            <Star size={11} fill="#f59e0b" color="#f59e0b" />
            <span className="rating-score">5.0</span>
          </div>
          <span className="sold-count-text">
            Đã bán {soldCount} {product.unit || 'thùng'}
          </span>
        </div>

        {/* Pricing Block (Shopee Orange/Red) */}
        <div className="card-pricing-block">
          <div className="active-price-display">
            <span className="price-val">
              {displayPrice.toLocaleString('vi-VN')} đ
            </span>
            <span className="per-unit-label">/{product.unit || 'thùng'}</span>
          </div>

          <div className="strike-price-display">
            <span className="strike-price-text">
              {originalPrice.toLocaleString('vi-VN')} đ
            </span>
            {isStore && (
              <span className="saving-badge">
                <TrendingDown size={11} /> Tiết kiệm 12%
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="card-action-bar">
          <div className="quantity-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={(e) => {
                e.stopPropagation();
                setQty(Math.max(1, qty - 1));
              }}
              disabled={qty <= 1}
              aria-label="Giảm"
            >
              -
            </button>
            <span className="stepper-num">{qty}</span>
            <button
              type="button"
              className="stepper-btn"
              onClick={(e) => {
                e.stopPropagation();
                setQty(qty + 1);
              }}
              aria-label="Tăng"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={`btn-add-to-cart ${isAdding ? 'active-add' : ''}`}
            onClick={handleAdd}
            disabled={!product.inStock}
          >
            {isAdding ? (
              <>
                <Check size={14} /> <span>Đã thêm</span>
              </>
            ) : (
              <>
                <Plus size={14} /> <span>Chọn mua</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
