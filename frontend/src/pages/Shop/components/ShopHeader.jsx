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
  ExternalLink,
  PhoneCall,
  Truck,
  Sparkles,
} from 'lucide-react';
import './ShopHeader.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));

export default function ShopHeader({
  customer,
  cartCount = 0,
  cartSubtotal = 0,
  wishlistCount = 0,
  onOpenCart,
  onOpenAuth,
  onLogout,
  onOpenMyOrders,
  onOpenLookup,
  searchTerm = '',
  onSearchChange,
  onToggleWishlistFilter,
  showWishlistOnly = false,
}) {
  const navigate = useNavigate();
  const isStore = customer?.accountType === 'STORE';

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!onSearchChange) {
      navigate(`/shop?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <header className="shop-header-wrapper">
      {/* Top Utility Bar */}
      <div className="shop-top-utility">
        <div className="shop-container utility-inner">
          <div className="utility-left">
            <span className="utility-item">
              <Truck size={13} />
              <span>Giao xe tải tận cửa 24h – 48h</span>
            </span>
            <span className="utility-divider">•</span>
            <span className="utility-item">
              <PhoneCall size={13} />
              <span>Hotline đặt sỉ: <strong>1900 6868</strong></span>
            </span>
          </div>

          <div className="utility-right">
            {isStore ? (
              <span className="utility-mode-pill store">
                <Sparkles size={12} /> Bảng Giá Sỉ Đại Lý (-12%)
              </span>
            ) : (
              <span className="utility-mode-pill retail">
                Khách lẻ • Đăng nhập Sỉ để nhận chiết khấu
              </span>
            )}
            <a
              href="/"
              className="utility-admin-link"
              title="Về giao diện DMS Quản trị"
            >
              <ExternalLink size={12} />
              <span>DMS Quản trị</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="shop-main-header">
        <div className="shop-container main-header-inner">
          {/* Logo & Brand */}
          <div className="shop-brand-col">
            <a href="/shop" className="shop-brand-link">
              <div className="shop-brand-icon">
                <Package size={21} color="#ffffff" strokeWidth={2.2} />
              </div>
              <div className="shop-brand-info">
                <span className="brand-primary-name">DMS TradeLedger</span>
                <span className="brand-tagline">B2B & Retail FMCG Storefront</span>
              </div>
            </a>
          </div>

          {/* Search Bar */}
          <div className="shop-search-column">
            <form className="search-input-container" onSubmit={handleSearchSubmit}>
              <Search size={16} className="search-leading-icon" />
              <input
                type="text"
                className="shop-search-field"
                placeholder="Tìm tên sản phẩm, thương hiệu hoặc mã SKU..."
                value={searchTerm}
                onChange={(e) => (onSearchChange ? onSearchChange(e.target.value) : null)}
                autoComplete="off"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear-trigger"
                  onClick={() => (onSearchChange ? onSearchChange('') : null)}
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
                Tìm
              </button>
            </form>
          </div>

          {/* Action Tools */}
          <div className="shop-actions-col">
            <button
              type="button"
              className="shop-header-tool-btn"
              onClick={onOpenLookup}
              title="Tra cứu lộ trình đơn hàng R-"
            >
              <ClipboardList size={17} />
              <span className="tool-text-label">Tra cứu đơn</span>
            </button>

            {onToggleWishlistFilter && (
              <button
                type="button"
                className={`shop-nav-icon-btn ${showWishlistOnly ? 'active' : ''}`}
                onClick={onToggleWishlistFilter}
                title="Sản phẩm yêu thích"
              >
                <Heart size={18} className={showWishlistOnly ? 'filled-heart' : ''} />
                {wishlistCount > 0 && (
                  <span className="nav-badge-pill">{wishlistCount}</span>
                )}
              </button>
            )}

            {customer ? (
              <div className="customer-account-cluster">
                <button
                  type="button"
                  className="customer-account-badge"
                  onClick={onOpenMyOrders}
                  title="Xem đơn hàng của tôi"
                >
                  <div className={`avatar-disc ${isStore ? 'store' : ''}`}>
                    {isStore ? <Store size={14} /> : <User size={14} />}
                  </div>
                  <div className="customer-meta-lines">
                    <span className="customer-display-title">
                      {customer.storeName || customer.fullName}
                    </span>
                    <span className="customer-role-tag">
                      {isStore ? 'Đại Lý • Giá Sỉ' : 'Khách Lẻ'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="logout-trigger-btn"
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
                <User size={15} />
                <span>Đăng nhập Sỉ</span>
              </button>
            )}

            <button
              type="button"
              className="shop-cart-cta-button"
              onClick={onOpenCart}
              title="Mở giỏ hàng"
            >
              <div className="cart-icon-wrap">
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="cart-counter-bubble">{cartCount}</span>
                )}
              </div>
              <div className="cart-btn-meta">
                <span className="cart-btn-text">Giỏ hàng</span>
                {cartSubtotal > 0 && (
                  <span className="cart-btn-sub">{formatCurrency(cartSubtotal)} ₫</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
