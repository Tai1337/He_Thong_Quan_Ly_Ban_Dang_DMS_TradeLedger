import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Package, 
  ShieldCheck, 
  Truck, 
  Clock, 
  CheckCircle2, 
  ShoppingCart, 
  ArrowRight, 
  Heart, 
  Sparkles, 
  TrendingDown, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Star, 
  Layers, 
  Calendar, 
  Box, 
  Check, 
  Plus, 
  Minus,
  Store,
  Tag
} from 'lucide-react';
import { getShopProductDetail, getShopCategories } from '../../services/api';
import ShopHeader from './components/ShopHeader';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';
import MyOrdersModal from './components/MyOrdersModal';
import QuickOrderLookupModal from './components/QuickOrderLookupModal';
import ShopFooter from './components/ShopFooter';
import './ShopProductDetail.css';

export default function ShopProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  // Product detail states
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Buying Modes: 'CASE' (Mua chẵn thùng) | 'RETAIL' (Mua lẻ chai/gói) | 'COMBO' (Chẵn + Lẻ)
  const [buyMode, setBuyMode] = useState('CASE');
  const [caseQty, setCaseQty] = useState(1);
  const [retailQty, setRetailQty] = useState(1);

  // Modals visibility
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

  // Fetch product detail by ID
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    getShopProductDetail(id, { accountType: customer?.accountType || 'CONSUMER' })
      .then(res => {
        if (isMounted) {
          setProduct(res.data);
          setCaseQty(1);
          setRetailQty(1);
        }
      })
      .catch(err => {
        if (isMounted) setError(err.message || 'Không tìm thấy sản phẩm');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id, customer?.accountType]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    setWishlist(prev => {
      const isExist = prev.includes(product.id);
      if (isExist) {
        triggerToast('Đã xoá khỏi danh sách yêu thích');
        return prev.filter(pId => pId !== product.id);
      } else {
        triggerToast('Đã thêm vào danh sách yêu thích');
        return [...prev, product.id];
      }
    });
  };

  // Calculations for purchase
  const isStore = customer?.accountType === 'STORE';
  const unitPriceCase = product ? (isStore ? product.wholesalePrice : product.basePrice) : 0;
  const unitPriceRetail = product ? product.retailUnitPrice : 0;
  const conversionRate = product?.conversionRate || 24;

  // Compute total amount based on selected mode
  const orderCalculation = useMemo(() => {
    if (!product) return { totalAmount: 0, totalCasesEq: 0, totalRetailEq: 0, summaryText: '' };

    if (buyMode === 'CASE') {
      const totalAmount = caseQty * unitPriceCase;
      const totalRetailEq = caseQty * conversionRate;
      return {
        totalAmount,
        totalCasesEq: caseQty,
        totalRetailEq,
        summaryText: `${caseQty} ${product.unit || 'thùng'} (${totalRetailEq} ${product.retailUnit || 'lẻ'})`
      };
    } else if (buyMode === 'RETAIL') {
      const totalAmount = retailQty * unitPriceRetail;
      const totalCasesEq = Number((retailQty / conversionRate).toFixed(2));
      return {
        totalAmount,
        totalCasesEq,
        totalRetailEq: retailQty,
        summaryText: `${retailQty} ${product.retailUnit || 'lẻ'} (~${totalCasesEq} ${product.unit || 'thùng'})`
      };
    } else {
      // COMBO
      const totalAmount = (caseQty * unitPriceCase) + (retailQty * unitPriceRetail);
      const totalRetailEq = (caseQty * conversionRate) + retailQty;
      const totalCasesEq = Number((totalRetailEq / conversionRate).toFixed(2));
      return {
        totalAmount,
        totalCasesEq,
        totalRetailEq,
        summaryText: `${caseQty} ${product.unit || 'thùng'} + ${retailQty} ${product.retailUnit || 'lẻ'} (Quy đổi: ${totalRetailEq} ${product.retailUnit || 'lẻ'})`
      };
    }
  }, [product, buyMode, caseQty, retailQty, unitPriceCase, unitPriceRetail, conversionRate]);

  // Add to cart handler
  const handleAddToCart = () => {
    if (!product) return;

    // We store the equivalent case quantity or custom unit
    let cartQuantity = 1;
    let customUnit = product.unit;
    let customPrice = unitPriceCase;

    if (buyMode === 'CASE') {
      cartQuantity = caseQty;
      customUnit = product.unit;
      customPrice = unitPriceCase;
    } else if (buyMode === 'RETAIL') {
      cartQuantity = orderCalculation.totalCasesEq;
      customUnit = `${retailQty} ${product.retailUnit}`;
      customPrice = unitPriceRetail;
    } else {
      cartQuantity = orderCalculation.totalCasesEq;
      customUnit = `${caseQty} ${product.unit} + ${retailQty} ${product.retailUnit}`;
      customPrice = Math.round(orderCalculation.totalAmount / (cartQuantity || 1));
    }

    setCartItems(prev => {
      const idx = prev.findIndex(it => it.id === product.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + cartQuantity
        };
        return updated;
      } else {
        return [...prev, { 
          ...product, 
          quantity: cartQuantity,
          unitPrice: customPrice,
          displayUnit: customUnit
        }];
      }
    });

    triggerToast(`Đã thêm ${orderCalculation.summaryText} vào giỏ hàng!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setIsCheckoutOpen(true);
  };

  const handleUpdateQty = (productId, newQty) => {
    if (newQty <= 0) {
      setCartItems(prev => prev.filter(it => it.id !== productId));
      return;
    }
    setCartItems(prev =>
      prev.map(it => it.id === productId ? { ...it, quantity: newQty } : it)
    );
  };

  const handleRemoveItem = (productId) => {
    setCartItems(prev => prev.filter(it => it.id !== productId));
  };

  const totalCartCount = cartItems.reduce((s, it) => s + (Number(it.quantity) || 1), 0);

  if (loading) {
    return (
      <div className="shop-app-root">
        <ShopHeader
          customer={customer}
          cartCount={totalCartCount}
          wishlistCount={wishlist.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={() => { setCustomer(null); localStorage.removeItem('portal_customer'); }}
          onOpenMyOrders={() => setIsMyOrdersOpen(true)}
          onOpenLookup={() => setIsLookupOpen(true)}
        />
        <div className="detail-loading-state">
          <Loader2 size={36} className="spin-icon" color="#059669" />
          <p>Đang tải thông tin chi tiết & quy cách sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="shop-app-root">
        <ShopHeader
          customer={customer}
          cartCount={totalCartCount}
          wishlistCount={wishlist.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={() => { setCustomer(null); localStorage.removeItem('portal_customer'); }}
          onOpenMyOrders={() => setIsMyOrdersOpen(true)}
          onOpenLookup={() => setIsLookupOpen(true)}
        />
        <div className="detail-error-state">
          <AlertCircle size={44} color="#dc2626" />
          <h2>Không tìm thấy sản phẩm</h2>
          <p>{error || 'Sản phẩm này hiện không có trong hệ thống hoặc đã ngừng kinh doanh.'}</p>
          <button type="button" className="back-to-shop-btn" onClick={() => navigate('/shop')}>
            Quay lại trang danh mục sản phẩm
          </button>
        </div>
      </div>
    );
  }

  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="shop-app-root">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="shop-toast-notification">
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <ShopHeader
        customer={customer}
        cartCount={totalCartCount}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => { setCustomer(null); localStorage.removeItem('portal_customer'); }}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      {/* Breadcrumb Navigation */}
      <div className="shop-detail-breadcrumb">
        <div className="shop-container breadcrumb-inner">
          <Link to="/shop" className="crumb-link">Trang chủ Bán Hàng</Link>
          <ChevronRight size={14} className="crumb-separator" />
          <span className="crumb-link">{product.categoryName}</span>
          <ChevronRight size={14} className="crumb-separator" />
          <span className="crumb-current">{product.name}</span>
        </div>
      </div>

      {/* Main Detail Content */}
      <main className="shop-detail-main">
        <div className="shop-container detail-layout-grid">
          {/* Left Column: 3D Packaging Visual & Warehouse Lot Tags */}
          <div className="detail-visual-column">
            <div className="detail-canvas-box">
              {/* Top Badges */}
              <div className="detail-canvas-badges">
                {product.inStock ? (
                  <span className="detail-stock-tag in-stock">
                    <span className="dot"></span> Sẵn sàng xuất kho
                  </span>
                ) : (
                  <span className="detail-stock-tag out-stock">
                    Tạm hết hàng
                  </span>
                )}
                <span className="detail-brand-cert">
                  <ShieldCheck size={12} /> Hàng Chính Hãng
                </span>
              </div>

              {/* 3D Package Illustration */}
              <div className="detail-fmcg-graphic-box">
                <div className="detail-graphic-tape"></div>
                <Package size={80} color="#ffffff" strokeWidth={1.5} />
                <span className="detail-graphic-label">{product.unit || 'THÙNG'}</span>
                <div className="detail-graphic-barcode">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
              </div>

              {/* Expiry and Lot Details Card */}
              <div className="detail-lot-info-strip">
                <div className="lot-row">
                  <div className="lot-item">
                    <small>Số lô nhà máy</small>
                    <strong>{product.lotNumber || 'L2026-FMCG-STD'}</strong>
                  </div>
                  <div className="lot-divider"></div>
                  <div className="lot-item">
                    <small>Hạn sử dụng (HSD)</small>
                    <strong className="hsd-highlight">
                      {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('vi-VN') : 'Đang cập nhật'}
                    </strong>
                  </div>
                </div>
                <span className="lot-guarantee-tag">
                  <Clock size={12} /> Cam kết Date mới nhất từ Nhà Phân Phối
                </span>
              </div>
            </div>

            {/* Quick Guarantees */}
            <div className="detail-guarantees-grid">
              <div className="guarantee-cell">
                <Truck size={20} color="#0284c7" />
                <div>
                  <strong>Giao xe tải 24h</strong>
                  <small>Freeship theo tuyến DMS</small>
                </div>
              </div>

              <div className="guarantee-cell">
                <ShieldCheck size={20} color="#059669" />
                <div>
                  <strong>Đổi trả 7 ngày</strong>
                  <small>Nếu bao bì móp méo</small>
                </div>
              </div>

              <div className="guarantee-cell">
                <CheckCircle2 size={20} color="#ea580c" />
                <div>
                  <strong>Kiểm hàng trước</strong>
                  <small>Đúng quy cách mới nhận</small>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Dual Buying Modes (Chẵn & Lẻ) */}
          <div className="detail-info-column">
            <div className="detail-header-group">
              <div className="detail-meta-tags">
                <span className="detail-cat-badge">{product.categoryName}</span>
                <span className="detail-sku-badge">SKU: {product.sku}</span>
              </div>
              <h1 className="detail-product-title">{product.name}</h1>

              {/* Star Rating & Sold Stats */}
              <div className="detail-stats-row">
                <div className="detail-stars">
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <span className="rating-num">5.0</span>
                </div>
                <span className="stat-separator">•</span>
                <span className="detail-sold-text">Đã bán hơn 1,250 {product.unit || 'thùng'}</span>
                <span className="stat-separator">•</span>
                <span className="detail-avail-text">
                  Tồn kho: <strong>{product.availableCases} thùng</strong> {product.availableRetailUnits > 0 ? `+ ${product.availableRetailUnits} lẻ` : ''}
                </span>
              </div>
            </div>

            {/* Smart Pricing Box */}
            <div className="detail-pricing-container">
              <div className="pricing-primary-row">
                <div className="price-item-block">
                  <small>Giá mua chẵn (nguyên {product.unit || 'thùng'}):</small>
                  <div className="price-number-cluster">
                    <span className="price-currency">₫</span>
                    <span className="price-big">{unitPriceCase.toLocaleString('vi-VN')}</span>
                    <span className="price-unit">/{product.unit || 'thùng'}</span>
                  </div>
                </div>

                <div className="price-item-block retail-col">
                  <small>Giá mua lẻ (tính theo {product.retailUnit || 'chai/gói'}):</small>
                  <div className="price-number-cluster retail-theme">
                    <span className="price-currency">₫</span>
                    <span className="price-mid">{unitPriceRetail.toLocaleString('vi-VN')}</span>
                    <span className="price-unit">/{product.retailUnit || 'lẻ'}</span>
                  </div>
                </div>
              </div>

              {/* B2B wholesale incentive alert */}
              {isStore ? (
                <div className="b2b-tier-alert is-store">
                  <Sparkles size={15} color="#d97706" />
                  <span>
                    Tài khoản <strong>{customer.storeName || customer.fullName}</strong> đang được áp dụng <strong>Chiết khấu sỉ 12%</strong> từ Tổng Kho!
                  </span>
                </div>
              ) : (
                <div className="b2b-tier-alert not-store" onClick={() => setIsAuthOpen(true)}>
                  <Store size={15} color="#059669" />
                  <span>
                    Bạn là tiệm tạp hoá? <strong>Đăng ký tài khoản Cửa hàng</strong> để nhận giá sỉ rẻ hơn 12%!
                  </span>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* CORE FMCG FEATURE: BỘ CHỌN HÌNH THỨC MUA CHẴN / MUA LẺ   */}
            {/* ========================================================= */}
            <div className="buying-mode-card">
              <div className="mode-card-header">
                <span className="mode-label-lead">CHỌN HÌNH THỨC MUA HÀNG:</span>
                <span className="conversion-formula">
                  Quy cách: <strong>1 {product.unit || 'Thùng'} = {conversionRate} {product.retailUnit || 'Chai/Gói'}</strong>
                </span>
              </div>

              {/* 3 Mode Tabs */}
              <div className="mode-tabs-row">
                <button
                  type="button"
                  className={`mode-tab-btn ${buyMode === 'CASE' ? 'active' : ''}`}
                  onClick={() => setBuyMode('CASE')}
                >
                  <Package size={16} />
                  <div>
                    <strong>Mua Chẵn (Theo Thùng)</strong>
                    <small>Tiết kiệm & nguyên đai</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`mode-tab-btn ${buyMode === 'RETAIL' ? 'active' : ''}`}
                  onClick={() => setBuyMode('RETAIL')}
                >
                  <Box size={16} />
                  <div>
                    <strong>Mua Lẻ ({product.retailUnit || 'Chai/Gói'})</strong>
                    <small>Bán lẻ linh hoạt</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`mode-tab-btn ${buyMode === 'COMBO' ? 'active' : ''}`}
                  onClick={() => setBuyMode('COMBO')}
                >
                  <Layers size={16} />
                  <div>
                    <strong>Mua Kết Hợp (Chẵn + Lẻ)</strong>
                    <small>Nhập thùng + gói thêm</small>
                  </div>
                </button>
              </div>

              {/* Mode 1: Case Quantity Controls */}
              {buyMode === 'CASE' && (
                <div className="mode-input-pane">
                  <div className="stepper-label-row">
                    <span>Số lượng thùng cần nhập:</span>
                    <span className="stock-hint">Còn {product.availableCases} thùng sẵn kho</span>
                  </div>
                  <div className="stepper-action-group">
                    <div className="stepper-box">
                      <button 
                        type="button" 
                        onClick={() => setCaseQty(Math.max(1, caseQty - 1))}
                        disabled={caseQty <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <input 
                        type="number" 
                        value={caseQty} 
                        onChange={(e) => setCaseQty(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <button 
                        type="button" 
                        onClick={() => setCaseQty(caseQty + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Quick Case Pills */}
                    <div className="quick-qty-pills">
                      {[1, 2, 5, 10, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className={`pill-btn ${caseQty === num ? 'selected' : ''}`}
                          onClick={() => setCaseQty(num)}
                        >
                          +{num} thùng
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Retail Quantity Controls */}
              {buyMode === 'RETAIL' && (
                <div className="mode-input-pane">
                  <div className="stepper-label-row">
                    <span>Số lượng lẻ cần mua ({product.retailUnit || 'chai/gói'}):</span>
                    <span className="stock-hint">1 thùng gồm {conversionRate} {product.retailUnit || 'lẻ'}</span>
                  </div>
                  <div className="stepper-action-group">
                    <div className="stepper-box">
                      <button 
                        type="button" 
                        onClick={() => setRetailQty(Math.max(1, retailQty - 1))}
                        disabled={retailQty <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <input 
                        type="number" 
                        value={retailQty} 
                        onChange={(e) => setRetailQty(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <button 
                        type="button" 
                        onClick={() => setRetailQty(retailQty + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Quick Retail Pills */}
                    <div className="quick-qty-pills">
                      {[1, 6, 12, conversionRate].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className={`pill-btn ${retailQty === num ? 'selected' : ''}`}
                          onClick={() => setRetailQty(num)}
                        >
                          +{num} {product.retailUnit || 'lẻ'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 3: Combo Controls (Chẵn + Lẻ) */}
              {buyMode === 'COMBO' && (
                <div className="mode-input-pane combo-pane">
                  <div className="combo-dual-row">
                    {/* Part A: Cases */}
                    <div className="combo-col">
                      <label>1. Số lượng chẵn ({product.unit || 'thùng'}):</label>
                      <div className="stepper-box">
                        <button 
                          type="button" 
                          onClick={() => setCaseQty(Math.max(0, caseQty - 1))}
                          disabled={caseQty <= 0}
                        >
                          <Minus size={14} />
                        </button>
                        <input 
                          type="number" 
                          value={caseQty} 
                          onChange={(e) => setCaseQty(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                        <button 
                          type="button" 
                          onClick={() => setCaseQty(caseQty + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="combo-plus-sign">+</div>

                    {/* Part B: Retail units */}
                    <div className="combo-col">
                      <label>2. Số lượng lẻ ({product.retailUnit || 'chai/gói'}):</label>
                      <div className="stepper-box">
                        <button 
                          type="button" 
                          onClick={() => setRetailQty(Math.max(0, retailQty - 1))}
                          disabled={retailQty <= 0}
                        >
                          <Minus size={14} />
                        </button>
                        <input 
                          type="number" 
                          value={retailQty} 
                          onChange={(e) => setRetailQty(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                        <button 
                          type="button" 
                          onClick={() => setRetailQty(retailQty + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Order Summary Panel */}
              <div className="order-summary-box">
                <div className="summary-line">
                  <span>Quy đổi sản phẩm:</span>
                  <strong>{orderCalculation.summaryText}</strong>
                </div>
                <div className="summary-line total-price-line">
                  <span>Tổng tiền tạm tính:</span>
                  <div className="total-number-wrap">
                    <span className="currency">₫</span>
                    <span className="total-amount">{orderCalculation.totalAmount.toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="detail-action-buttons-row">
              <button
                type="button"
                className="detail-add-cart-btn"
                onClick={handleAddToCart}
                disabled={!product.inStock}
              >
                <ShoppingCart size={18} />
                <span>Thêm Vào Giỏ Hàng</span>
              </button>

              <button
                type="button"
                className="detail-buy-now-btn"
                onClick={handleBuyNow}
                disabled={!product.inStock}
              >
                <span>Mua Ngay Tức Thì</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className={`detail-wishlist-btn ${isWishlisted ? 'active' : ''}`}
                onClick={handleToggleWishlist}
                title={isWishlisted ? 'Xoá khỏi yêu thích' : 'Lưu vào yêu thích'}
              >
                <Heart size={20} className={isWishlisted ? 'heart-fill' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Specifications & Related Products Tabs */}
        <div className="shop-container detail-bottom-section">
          {/* Detailed Specifications Table */}
          <div className="specifications-box">
            <h3 className="section-title">
              <Layers size={18} color="#059669" />
              <span>THÔNG SỐ KỸ THUẬT & QUY CÁCH PHÂN PHỐI</span>
            </h3>

            <div className="specs-table-grid">
              <div className="spec-row">
                <span className="spec-label">Tên sản phẩm</span>
                <span className="spec-value">{product.name}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Mã SKU phân phối</span>
                <span className="spec-value font-mono">{product.sku}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Ngành hàng</span>
                <span className="spec-value">{product.categoryName}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Đơn vị chẵn (Thùng/Két)</span>
                <span className="spec-value highlight">{product.unit || 'THÙNG'}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Đơn vị lẻ (Tiêu dùng)</span>
                <span className="spec-value highlight">{product.retailUnit || 'Chai/Gói'}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Hệ số quy đổi chuẩn</span>
                <span className="spec-value bold">1 {product.unit || 'Thùng'} = {conversionRate} {product.retailUnit || 'Chai/Gói'}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Số lô sản xuất hiện tại</span>
                <span className="spec-value font-mono">{product.lotNumber || 'L2026-FMCG-STD'}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Hạn sử dụng</span>
                <span className="spec-value bold text-emerald">
                  {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('vi-VN') : 'Đang cập nhật'} (Date mới 100%)
                </span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Hình thức giao nhận</span>
                <span className="spec-value">Đội xe tải kín phân phối theo tuyến bán hàng DMS</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Chính sách công nợ B2B</span>
                <span className="spec-value">Áp dụng công nợ chu kỳ 30 ngày cho tiệm tạp hoá đạt chuẩn</span>
              </div>
            </div>
          </div>

          {/* Related FMCG Products */}
          {product.relatedProducts && product.relatedProducts.length > 0 && (
            <div className="related-products-box">
              <div className="related-head">
                <h3 className="section-title">
                  <Sparkles size={18} color="#ea580c" />
                  <span>SẢN PHẨM CÙNG NGÀNH HÀNG GỢI Ý</span>
                </h3>
              </div>

              <div className="related-grid">
                {product.relatedProducts.map(item => (
                  <Link
                    key={item.id}
                    to={`/shop/product/${item.id}`}
                    className="related-card"
                  >
                    <div className="related-thumb">
                      <Package size={36} color="#059669" />
                    </div>
                    <div className="related-info">
                      <h4 className="related-name" title={item.name}>{item.name}</h4>
                      <div className="related-price">
                        {item.activePrice.toLocaleString('vi-VN')} đ
                        <small>/{item.unit || 'thùng'}</small>
                      </div>
                      <span className="related-spec">1 {item.unit || 'thùng'} = {item.conversionRate} {item.retailUnit || 'lẻ'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <ShopFooter />

      {/* Modals */}
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
        onSuccess={(loggedCustomer) => {
          setCustomer(loggedCustomer);
          triggerToast(`Xin chào ${loggedCustomer.storeName || loggedCustomer.fullName}!`);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        customer={customer}
        cartItems={cartItems}
        onOrderSuccess={(order) => {
          setCartItems([]);
          triggerToast(`Đặt đơn thành công! Mã đơn: ${order.orderCode}`);
        }}
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
