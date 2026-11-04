import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  ArrowRight, 
  Check, 
  CheckCircle2,
  ChevronDown,
  Loader2,
  TrendingDown,
  TrendingUp,
  PackageCheck
} from 'lucide-react';
import { getShopProducts, getShopCategories } from '../../services/api';
import ShopHeader from './components/ShopHeader';
import HeroBannerSection from './components/HeroBannerSection';
import CategoryGridSection from './components/CategoryGridSection';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';
import MyOrdersModal from './components/MyOrdersModal';
import QuickOrderLookupModal from './components/QuickOrderLookupModal';
import ShopFooter from './components/ShopFooter';
import './ShopHome.css';

export default function ShopHome() {
  // Customer state from localStorage
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('portal_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Cart state from localStorage
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('portal_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wishlist state from localStorage
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('portal_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Catalog & Filter states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catalogTab, setCatalogTab] = useState('all'); // 'all' | 'best_seller' | 'price_asc' | 'price_desc' | 'in_stock'
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  // Keyset Pagination states
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modals visibility
  const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('portal_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Sync wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('portal_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load categories
  useEffect(() => {
    getShopCategories()
      .then(res => setCategories(res.data || []))
      .catch(err => console.error('Lỗi tải danh mục:', err));
  }, []);

  // Load initial products from API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setNextCursor(null);
    setHasMore(false);

    getShopProducts({
      categoryId: selectedCategory,
      search: debouncedSearch,
      accountType: customer?.accountType || 'CONSUMER',
      limit: 16
    })
      .then(res => {
        if (isMounted) {
          setProducts(res.data || []);
          setNextCursor(res.nextCursor || null);
          setHasMore(Boolean(res.hasMore));
          setTotalCount(res.totalCount || 0);
        }
      })
      .catch(err => console.error('Lỗi tải sản phẩm:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedCategory, debouncedSearch, customer?.accountType]);

  // Load more products using Keyset cursor
  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const res = await getShopProducts({
        categoryId: selectedCategory,
        search: debouncedSearch,
        accountType: customer?.accountType || 'CONSUMER',
        cursor: nextCursor,
        limit: 16
      });

      if (res.data && res.data.length > 0) {
        setProducts(prev => [...prev, ...res.data]);
      }
      setNextCursor(res.nextCursor || null);
      setHasMore(Boolean(res.hasMore));
      if (res.totalCount) setTotalCount(res.totalCount);
    } catch (err) {
      console.error('Lỗi tải thêm sản phẩm:', err);
      triggerToast('Không thể tải thêm sản phẩm lúc này');
    } finally {
      setLoadingMore(false);
    }
  };

  // Show quick toast notification
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Toggle wishlist
  const handleToggleWishlist = (productId) => {
    setWishlist(prev => {
      const isExist = prev.includes(productId);
      if (isExist) {
        triggerToast('Đã xoá khỏi danh sách yêu thích');
        return prev.filter(id => id !== productId);
      } else {
        triggerToast('Đã thêm vào danh sách yêu thích');
        return [...prev, productId];
      }
    });
  };

  // Add to cart handler
  const handleAddToCart = (product, quantity) => {
    setCartItems(prev => {
      const idx = prev.findIndex(it => it.id === product.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + quantity
        };
        return updated;
      } else {
        return [...prev, { ...product, quantity }];
      }
    });

    triggerToast(`Đã thêm ${quantity} ${product.unit || 'thùng'} ${product.name} vào giỏ`);
  };

  // Update quantity in cart
  const handleUpdateQty = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(it => it.id === productId ? { ...it, quantity: newQty } : it)
    );
  };

  // Remove from cart
  const handleRemoveItem = (productId) => {
    setCartItems(prev => prev.filter(it => it.id !== productId));
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('portal_customer');
    setCustomer(null);
    triggerToast('Đã đăng xuất tài khoản');
  };

  // Auth success
  const handleAuthSuccess = (loggedCustomer) => {
    setCustomer(loggedCustomer);
    triggerToast(`Xin chào ${loggedCustomer.storeName || loggedCustomer.fullName}!`);
  };

  // Order success handler
  const handleOrderSuccess = (order) => {
    setCartItems([]);
    triggerToast(`Đặt đơn thành công! Mã đơn: ${order.orderCode}`);
  };

  // Filtered & Sorted products pipeline
  const displayedProducts = useMemo(() => {
    let list = [...products];

    // Wishlist filter
    if (showWishlistOnly) {
      list = list.filter(p => wishlist.includes(p.id));
    }

    // Catalog Tabs
    if (catalogTab === 'in_stock') {
      list = list.filter(p => p.inStock);
    } else if (catalogTab === 'price_asc') {
      list.sort((a, b) => a.activePrice - b.activePrice);
    } else if (catalogTab === 'price_desc') {
      list.sort((a, b) => b.activePrice - a.activePrice);
    } else if (catalogTab === 'best_seller') {
      list.sort((a, b) => Number(b.id) - Number(a.id));
    }

    return list;
  }, [products, showWishlistOnly, wishlist, catalogTab]);

  const totalCartCount = cartItems.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="shop-app-root">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="shop-toast-notification">
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Header (Clean & Single-bar) */}
      <ShopHeader
        customer={customer}
        cartCount={totalCartCount}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleWishlistFilter={() => {
          setShowWishlistOnly(!showWishlistOnly);
          setSelectedCategory(null);
        }}
        showWishlistOnly={showWishlistOnly}
      />

      {/* 2. Compact Welcome Banner */}
      <HeroBannerSection
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
        customer={customer}
      />

      {/* 3. Sleek Category Pills Bar */}
      <CategoryGridSection
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setShowWishlistOnly(false);
        }}
      />

      {/* 4. Main Catalog Section */}
      <main className="shop-main-layout" id="main-catalog">
        <div className="shop-container">
          {/* Section Heading & Filter Tabs */}
          <div className="catalog-header-bar">
            <div className="catalog-title-group">
              <h2 className="catalog-title-main">
                {showWishlistOnly
                  ? 'Sản Phẩm Trong Danh Sách Yêu Thích'
                  : selectedCategory
                    ? `Ngành hàng: ${categories.find(c => c.id === selectedCategory)?.name || ''}`
                    : 'Tất Cả Sản Phẩm Phân Phối'}
                {debouncedSearch && ` — Tìm kiếm "${debouncedSearch}"`}
              </h2>
              <span className="catalog-count-subtitle">
                Hiển thị <strong>{displayedProducts.length}</strong> {totalCount ? `trong tổng số ${totalCount} sản phẩm` : 'sản phẩm'}
              </span>
            </div>

            {/* Clean Filter Tabs */}
            <div className="catalog-tabs-track">
              <button
                type="button"
                className={`catalog-tab-btn ${catalogTab === 'all' && !showWishlistOnly ? 'active' : ''}`}
                onClick={() => { setCatalogTab('all'); setShowWishlistOnly(false); }}
              >
                Tất Cả
              </button>

              <button
                type="button"
                className={`catalog-tab-btn ${catalogTab === 'best_seller' && !showWishlistOnly ? 'active' : ''}`}
                onClick={() => { setCatalogTab('best_seller'); setShowWishlistOnly(false); }}
              >
                <PackageCheck size={14} />
                <span>Bán Chạy</span>
              </button>

              <button
                type="button"
                className={`catalog-tab-btn ${catalogTab === 'price_asc' && !showWishlistOnly ? 'active' : ''}`}
                onClick={() => { setCatalogTab('price_asc'); setShowWishlistOnly(false); }}
              >
                <TrendingDown size={14} />
                <span>Giá Tăng Dần</span>
              </button>

              <button
                type="button"
                className={`catalog-tab-btn ${catalogTab === 'price_desc' && !showWishlistOnly ? 'active' : ''}`}
                onClick={() => { setCatalogTab('price_desc'); setShowWishlistOnly(false); }}
              >
                <TrendingUp size={14} />
                <span>Giá Giảm Dần</span>
              </button>

              <button
                type="button"
                className={`catalog-tab-btn ${catalogTab === 'in_stock' && !showWishlistOnly ? 'active' : ''}`}
                onClick={() => { setCatalogTab('in_stock'); setShowWishlistOnly(false); }}
              >
                <Check size={14} />
                <span>Chỉ Hàng Sẵn Kho</span>
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="products-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="product-skeleton-card">
                  <div className="skeleton-thumb"></div>
                  <div className="skeleton-line full"></div>
                  <div className="skeleton-line half"></div>
                  <div className="skeleton-btn"></div>
                </div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="catalog-empty-state">
              <div className="empty-search-disc">
                <Search size={32} color="#94a3b8" />
              </div>
              <h3>Không tìm thấy sản phẩm phù hợp</h3>
              <p>Thử điều chỉnh lại từ khoá tìm kiếm hoặc chọn ngành hàng khác.</p>
              <button
                type="button"
                className="reset-filter-btn"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchTerm('');
                  setShowWishlistOnly(false);
                  setCatalogTab('all');
                }}
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {displayedProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    customer={customer}
                    onAddToCart={handleAddToCart}
                    onOpenDetail={(p) => setSelectedProductForDetail(p)}
                    isWishlisted={wishlist.includes(product.id)}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>

              {/* Load more button */}
              {!showWishlistOnly && (
                <div className="catalog-pagination-section">
                  {hasMore ? (
                    <button
                      type="button"
                      className="load-more-btn"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 size={16} className="spin-icon" />
                          <span>Đang tải thêm...</span>
                        </>
                      ) : (
                        <>
                          <span>Tải thêm sản phẩm</span>
                          <ChevronDown size={16} />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="pagination-end-tag">
                      <CheckCircle2 size={15} color="#059669" />
                      <span>Đã hiển thị toàn bộ <strong>{totalCount}</strong> sản phẩm</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 5. Clean B2B Footer */}
      <ShopFooter />

      {/* Floating Cart Pill (for Mobile or Quick Action) */}
      {totalCartCount > 0 && (
        <button
          type="button"
          className="floating-cart-pill"
          onClick={() => setIsCartOpen(true)}
          title="Xem giỏ hàng"
          aria-label="Xem giỏ hàng"
        >
          <div className="pill-cart-icon">
            <ShoppingCart size={17} />
          </div>
          <span className="floating-cart-text">
            {totalCartCount} sản phẩm
          </span>
          <ArrowRight size={14} />
        </button>
      )}

      {/* Modals */}
      <ProductDetailModal
        product={selectedProductForDetail}
        customer={customer}
        isOpen={Boolean(selectedProductForDetail)}
        onClose={() => setSelectedProductForDetail(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={() => setIsCheckoutOpen(true)}
        isWishlisted={selectedProductForDetail ? wishlist.includes(selectedProductForDetail.id) : false}
        onToggleWishlist={handleToggleWishlist}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        customer={customer}
        onProceedCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        onRequireAuth={() => {
          setIsCartOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        customer={customer}
        cartItems={cartItems}
        onOrderSuccess={handleOrderSuccess}
      />

      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        customer={customer}
      />

      <QuickOrderLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
      />
    </div>
  );
}
