import React from 'react';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Store, 
  Package, 
  LogOut, 
  X, 
  PhoneCall, 
  ShieldCheck, 
  Truck,
  Heart,
  ClipboardList,
  Menu,
  Zap,
  Tag,
  ArrowRight
} from 'lucide-react';
import './ShopHeader.css';

const POPULAR_SEARCH_TAGS = [
  'Mì Hảo Hảo',
  'Nước mắm Nam Ngư',
  'Bia Tiger',
  'Dầu ăn Simply',
  'Cà phê G7',
  'Bột ngọt Ajinomoto',
  'Bột giặt Omo'
];

export default function ShopHeader({
  customer,
  cartCount,
  wishlistCount = 0,
  onOpenCart,
  onOpenAuth,
  onLogout,
  onOpenMyOrders,
  onOpenLookup,
  searchTerm,
  onSearchChange,
  onToggleWishlistFilter,
  showWishlistOnly,
  onSelectCategory
}) {
  return (
    <header className="shop-header-wrapper">
      {/* 1. Top Utility Announcement Bar */}
      <div className="shop-top-announcement">
        <div className="shop-container announcement-inner">
          <div className="announcement-left">
            <span className="announcement-badge">
              <ShieldCheck size={13} /> Nhà Phân Phối Tổng Kho FMCG
            </span>
            <span className="announcement-item">
              <Truck size={13} /> Giao xe tải tận nơi trong 24h - 48h
            </span>
            <span className="announcement-item b2b-highlight">
              <Tag size={13} /> Tiệm Tạp Hoá: Chiết khấu sỉ 12%
            </span>
          </div>
          <div className="announcement-right">
            <span className="announcement-hotline">
              <PhoneCall size={12} /> Hotline đặt hàng: <strong>1900 6868</strong>
            </span>
            <a href="/" className="back-to-dms-link" title="Dành cho nhân viên quản trị">
              Vào DMS Quản trị ➔
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Header (Hasaki Green + Shopee Search Bar) */}
      <div className="shop-main-header">
        <div className="shop-container main-header-inner">
          {/* Logo & Brand */}
          <div className="shop-brand-col">
            <a href="/shop" className="shop-brand-link">
              <div className="shop-brand-icon">
                <Package size={24} color="#ffffff" strokeWidth={2.2} />
              </div>
              <div className="shop-brand-info">
                <span className="brand-primary-name">DMS TradeLedger</span>
                <span className="brand-tagline">Tổng Kho Phân Phối FMCG</span>
              </div>
            </a>
          </div>

          {/* Shopee-Style Large Search Bar with Hot Keywords */}
          <div className="shop-search-column">
            <div className="search-input-container">
              <input
                type="text"
                className="shop-search-field"
                placeholder="Tìm kiếm sản phẩm, thương hiệu hoặc mã SKU FMCG..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                autoComplete="off"
              />
              {searchTerm && (
                <button 
                  type="button" 
                  className="search-clear-trigger"
                  onClick={() => onSearchChange('')}
                  aria-label="Xoá tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
              <button 
                type="button" 
                className="search-submit-button"
                aria-label="Tìm kiếm"
              >
                <Search size={18} />
              </button>
            </div>

            {/* Popular Search Keyword Chips underneath */}
            <div className="search-hot-tags">
              {POPULAR_SEARCH_TAGS.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="hot-tag-link"
                  onClick={() => onSearchChange(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="shop-actions-col">
            {/* Quick Order Lookup Button (Hasaki Style) */}
            <button
              type="button"
              className="shop-header-tool-btn lookup-btn"
              onClick={onOpenLookup}
              title="Tra cứu lộ trình đơn hàng R-"
            >
              <div className="tool-icon-disc">
                <ClipboardList size={18} />
              </div>
              <div className="tool-text-cluster">
                <span className="tool-sub">Theo dõi</span>
                <span className="tool-main">Tra Cứu Đơn R-</span>
              </div>
            </button>

            {/* Wishlist Button */}
            <button
              type="button"
              className={`shop-nav-icon-btn ${showWishlistOnly ? 'active' : ''}`}
              onClick={onToggleWishlistFilter}
              title="Danh sách sản phẩm yêu thích"
            >
              <Heart size={20} className={showWishlistOnly ? 'filled-heart' : ''} />
              {wishlistCount > 0 && (
                <span className="nav-badge-pill wishlist-pill-badge">{wishlistCount}</span>
              )}
            </button>

            {/* Customer Account Area */}
            {customer ? (
              <div className="customer-account-cluster">
                <div className="customer-account-badge" onClick={onOpenMyOrders}>
                  <div className="avatar-disc">
                    {customer.accountType === 'STORE' ? (
                      <Store size={16} color="#ffffff" />
                    ) : (
                      <User size={16} color="#ffffff" />
                    )}
                  </div>
                  <div className="customer-meta-lines">
                    <span className="customer-display-title">
                      {customer.storeName || customer.fullName}
                    </span>
                    <span className={`customer-role-tag ${customer.accountType === 'STORE' ? 'tag-store' : 'tag-consumer'}`}>
                      {customer.accountType === 'STORE' ? 'Tiệm Tạp Hoá • Giá Sỉ' : 'Khách Tiêu Dùng'}
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
                <User size={17} />
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
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="cart-counter-bubble">{cartCount}</span>
                )}
              </div>
              <span className="cart-btn-text">Giỏ Hàng</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Secondary Category & Deal Navigation Strip */}
      <nav className="shop-subnav-bar">
        <div className="shop-container subnav-inner">
          <button 
            type="button" 
            className="subnav-category-toggle"
            onClick={() => onSelectCategory?.(null)}
          >
            <Menu size={16} />
            <span>DANH MỤC SẢN PHẨM</span>
          </button>

          <div className="subnav-links-row">
            <button 
              type="button" 
              className="subnav-link-item active" 
              onClick={() => onSelectCategory?.(null)}
            >
              Trang Chủ
            </button>
            <a href="#flash-sale" className="subnav-link-item highlight-red">
              <Zap size={14} />
              <span>Deal Sỉ Hôm Nay</span>
            </a>
            <a href="#dms-truck" className="subnav-link-item">
              <Truck size={14} />
              <span>Tuyến Xe Tải 24h</span>
            </a>
            <button 
              type="button" 
              className="subnav-link-item"
              onClick={onOpenLookup}
            >
              <ClipboardList size={14} />
              <span>Tra Cứu Tiến Độ Đơn R-</span>
            </button>
            {!customer && (
              <button 
                type="button" 
                className="subnav-link-item highlight-orange"
                onClick={onOpenAuth}
              >
                <Store size={14} />
                <span>Đăng Ký Điểm Bán / Tiệm Tạp Hoá</span>
              </button>
            )}
          </div>

          <div className="subnav-extra-badge">
            <span>Cam kết 100% Date mới từ Nhà Máy</span>
          </div>
        </div>
      </nav>
    </header>
  );
}
