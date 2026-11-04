import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Store, 
  Package, 
  LogOut, 
  X, 
  Heart, 
  ClipboardList,
  ExternalLink
} from 'lucide-react';
import './ShopHeader.css';

export default function ShopHeader({
  customer,
  cartCount,
  wishlistCount = 0,
  onOpenCart,
  onOpenAuth,
  onLogout,
  onOpenMyOrders,
  onOpenLookup,
  searchTerm = '',
  onSearchChange,
  onToggleWishlistFilter,
  showWishlistOnly = false
}) {
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!onSearchChange) {
      navigate(`/shop?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <header className="shop-header-wrapper">
      <div className="shop-main-header">
        <div className="shop-container main-header-inner">
          {/* Logo & Brand */}
          <div className="shop-brand-col">
            <a href="/shop" className="shop-brand-link">
              <div className="shop-brand-icon">
                <Package size={22} color="#ffffff" strokeWidth={2.2} />
              </div>
              <div className="shop-brand-info">
                <span className="brand-primary-name">DMS TradeLedger</span>
                <span className="brand-tagline">Cổng Đặt Hàng Phân Phối</span>
              </div>
            </a>
          </div>

          {/* Clean Search Bar */}
          <div className="shop-search-column">
            <form className="search-input-container" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className="shop-search-field"
                placeholder="Tìm kiếm theo tên sản phẩm, thương hiệu hoặc mã SKU..."
                value={searchTerm}
                onChange={(e) => onSearchChange ? onSearchChange(e.target.value) : null}
                autoComplete="off"
              />
              {searchTerm && (
                <button 
                  type="button" 
                  className="search-clear-trigger"
                  onClick={() => onSearchChange ? onSearchChange('') : null}
                  aria-label="Xoá tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}
              <button 
                type="submit" 
                className="search-submit-button"
                aria-label="Tìm kiếm"
              >
                <Search size={17} />
              </button>
            </form>
          </div>

          {/* Action Tools */}
          <div className="shop-actions-col">
            {/* Quick Order Lookup Button */}
            <button
              type="button"
              className="shop-header-tool-btn lookup-btn"
              onClick={onOpenLookup}
              title="Tra cứu lộ trình đơn hàng R-"
            >
              <ClipboardList size={18} />
              <span className="tool-text-label">Tra Cứu Đơn</span>
            </button>

            {/* Wishlist Button (if supported) */}
            {onToggleWishlistFilter && (
              <button
                type="button"
                className={`shop-nav-icon-btn ${showWishlistOnly ? 'active' : ''}`}
                onClick={onToggleWishlistFilter}
                title="Sản phẩm yêu thích"
              >
                <Heart size={19} className={showWishlistOnly ? 'filled-heart' : ''} />
                {wishlistCount > 0 && (
                  <span className="nav-badge-pill">{wishlistCount}</span>
                )}
              </button>
            )}

            {/* Customer Account Area */}
            {customer ? (
              <div className="customer-account-cluster">
                <div 
                  className="customer-account-badge" 
                  onClick={onOpenMyOrders} 
                  title="Xem đơn hàng của tôi"
                >
                  <div className="avatar-disc">
                    {customer.accountType === 'STORE' ? (
                      <Store size={15} color="#ffffff" />
                    ) : (
                      <User size={15} color="#ffffff" />
                    )}
                  </div>
                  <div className="customer-meta-lines">
                    <span className="customer-display-title">
                      {customer.storeName || customer.fullName}
                    </span>
                    <span className="customer-role-tag">
                      {customer.accountType === 'STORE' ? 'Đại Lý • Giá Sỉ' : 'Khách Tiêu Dùng'}
                    </span>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="account-btn logout-trigger-btn"
                  onClick={onLogout}
                  title="Đăng xuất"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="portal-login-cta-btn" 
                onClick={onOpenAuth}
              >
                <User size={16} />
                <span>Đăng Nhập / Đăng Ký Sỉ</span>
              </button>
            )}

            {/* Shopping Cart Button */}
            <button 
              type="button" 
              className="shop-cart-cta-button" 
              onClick={onOpenCart}
              title="Mở giỏ hàng"
            >
              <div className="cart-icon-wrap">
                <ShoppingCart size={19} />
                {cartCount > 0 && (
                  <span className="cart-counter-bubble">{cartCount}</span>
                )}
              </div>
              <span className="cart-btn-text">Giỏ Hàng</span>
            </button>

            {/* Back to DMS Management System */}
            <a 
              href="/" 
              className="back-to-dms-btn" 
              title="Về giao diện DMS Quản trị"
            >
              <ExternalLink size={14} />
              <span>DMS Quản trị</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
