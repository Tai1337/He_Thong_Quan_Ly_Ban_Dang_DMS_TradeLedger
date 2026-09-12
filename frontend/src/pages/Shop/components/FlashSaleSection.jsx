import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  ChevronRight, 
  Clock, 
  ShoppingCart, 
  Flame,
  Check,
  Package
} from 'lucide-react';
import './FlashSaleSection.css';

export default function FlashSaleSection({ 
  products = [], 
  onAddToCart, 
  onOpenDetail,
  customer 
}) {
  const navigate = useNavigate();
  // Countdown timer state (hours, minutes, seconds)
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 4, minutes: 30, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pick top 6 products with high availability or mock flash deals
  const flashProducts = products.slice(0, 6);

  if (flashProducts.length === 0) return null;

  return (
    <section className="flash-sale-section">
      <div className="shop-container">
        <div className="flash-sale-card-box">
          {/* Header */}
          <div className="flash-sale-header">
            <div className="flash-header-left">
              <div className="flash-title-cluster">
                <div className="flash-bolt-icon">
                  <Zap size={22} fill="#ef4444" color="#ef4444" />
                </div>
                <h3 className="flash-main-title">FLASH SALE GIÁ SỈ TỔNG KHO</h3>
              </div>

              {/* Countdown timer */}
              <div className="flash-countdown-cluster">
                <Clock size={15} color="#dc2626" />
                <span className="countdown-label">Kết thúc sau:</span>
                <div className="countdown-digits">
                  <span className="digit-box">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="digit-colon">:</span>
                  <span className="digit-box">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="digit-colon">:</span>
                  <span className="digit-box">{String(timeLeft.seconds).padStart(2, '0')}</span>
                </div>
              </div>
            </div>

            <div className="flash-header-right">
              <span className="flash-sub-note">Áp dụng cho mọi tiệm tạp hoá & đại lý</span>
            </div>
          </div>

          {/* Flash products row */}
          {/* Products Horizontal Slider Track */}
          <div className="flash-products-track">
            {flashProducts.map((p, idx) => (
              <FlashCard 
                key={p.id} 
                product={p} 
                idx={idx} 
                customer={customer} 
                onAddToCart={onAddToCart} 
                navigate={navigate} 
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FlashCard({ product, customer, idx, onAddToCart, navigate }) {
  const [imgError, setImgError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const soldPercent = Math.min(95, 60 + (idx * 7) % 35);
  const isWholesale = customer?.accountType === 'STORE';
  const displayPrice = isWholesale ? product.wholesalePrice : product.basePrice;
  const originalPrice = Math.round(displayPrice * 1.15);
  const activeImg = product.imageUrl || product.retailImageUrl;

  const handleAdd = (e) => {
    e.stopPropagation();
    setIsAdding(true);
    onAddToCart && onAddToCart(product, 1);
    setTimeout(() => setIsAdding(false), 400);
  };

  return (
    <div 
      className="flash-product-card"
      onClick={() => navigate(`/shop/product/${product.id}`)}
    >
      {/* Discount ribbon */}
      <div className="flash-discount-tag">
        <span>-15%</span>
        <small>GIÁ SỈ</small>
      </div>

      {/* Packaging Visual Frame */}
      <div className="flash-thumb-frame">
        {activeImg && !imgError ? (
          <img 
            src={activeImg} 
            alt={product.name} 
            className="flash-real-img" 
            loading="lazy" 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flash-package-graphic">
            <Package size={44} strokeWidth={1.5} color="#059669" />
          </div>
        )}
        {product.lotNumber && (
          <span className="flash-lot-tag">Lô: {product.lotNumber}</span>
        )}
      </div>

      {/* Info */}
      <div className="flash-card-info">
        <h4 className="flash-card-name" title={product.name}>{product.name}</h4>

        <div className="flash-price-row">
          <span className="flash-price-active">
            {displayPrice.toLocaleString('vi-VN')} đ
          </span>
          <span className="flash-price-old">
            {originalPrice.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="flash-unit-note">
          Đơn vị: <strong>{product.unit || 'Thùng'}</strong> (x{product.conversionRate || 1} {product.retailUnit || 'chai/gói'})
        </div>

        {/* Hasaki / Shopee Style Urgency Progress Bar */}
        <div className="flash-sold-progress">
          <div className="sold-progress-track">
            <div 
              className="sold-progress-fill" 
              style={{ width: `${soldPercent}%` }}
            />
          </div>
          <div className="sold-progress-text">
            <Flame size={12} color="#dc2626" />
            <span>Đã bán {soldPercent}%</span>
          </div>
        </div>

        <button 
          type="button" 
          className="flash-add-btn"
          onClick={handleAdd}
          disabled={!product.inStock}
        >
          <ShoppingCart size={14} />
          <span>{isAdding ? 'Đã thêm' : 'Thêm Giỏ Hàng'}</span>
        </button>
      </div>
    </div>
  );
}
