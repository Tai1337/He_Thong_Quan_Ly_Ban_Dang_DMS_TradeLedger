import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Plus, 
  Check, 
  Package, 
  Sparkles,
  Tag
} from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({ 
  product, 
  customer, 
  onAddToCart, 
  isWishlisted,
  onToggleWishlist
}) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isStore = customer?.accountType === 'STORE';
  const displayPrice = isStore ? product.wholesalePrice : product.basePrice;
  const activeImage = product.imageUrl || product.retailImageUrl;

  const handleAdd = (e) => {
    e.stopPropagation();
    setIsAdding(true);
    onAddToCart(product, qty);
    setTimeout(() => {
      setIsAdding(false);
      setQty(1);
    }, 400);
  };

  const renderProductGraphic = () => {
    return (
      <div className="product-graphic-canvas">
        <div className="graphic-pkg-box">
          <Package size={32} color="#059669" strokeWidth={1.8} />
          <span className="graphic-pkg-unit">{product.unit || 'THÙNG'}</span>
        </div>
      </div>
    );
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

        {/* Top Badges */}
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

          {product.isSample ? (
            <span className="sample-badge">
              <Sparkles size={11} /> Hàng Dùng Thử
            </span>
          ) : isStore ? (
            <span className="b2b-badge">
              <Tag size={11} /> Giá Sỉ B2B
            </span>
          ) : null}
        </div>

        {/* Wishlist Action */}
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
          <span className="spec-label">Quy cách:</span>
          <strong className="spec-value">{product.unit || 'THÙNG'}</strong>
          {product.conversionRate > 1 && (
            <span className="conversion-text">
              ({product.conversionRate} {product.retailUnit || 'lẻ'})
            </span>
          )}
        </div>

        {/* Pricing Block */}
        <div className="card-pricing-block">
          <div className="active-price-display">
            <span className="price-val">
              {displayPrice.toLocaleString('vi-VN')} đ
            </span>
            <span className="per-unit-label">/{product.unit || 'thùng'}</span>
          </div>
          {isStore && (
            <div className="b2b-saving-tag">
              Áp dụng chiết khấu đại lý
            </div>
          )}
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

          {isStore && product.isSample ? (
            <button
              type="button"
              className="btn-add-to-cart sample-disabled"
              disabled
              title="Sản phẩm thử nghiệm thị trường"
            >
              <span>Thử nghiệm</span>
            </button>
          ) : (
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
                  <Plus size={14} /> <span>{product.isSample ? 'Thử mẫu' : 'Chọn mua'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
