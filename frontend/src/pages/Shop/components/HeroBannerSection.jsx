import React from 'react';
import {
  Truck,
  ShieldCheck,
  ClipboardList,
  Sparkles,
  Store,
  ArrowRight,
  Gift,
  Percent,
  Package,
  Tag,
  Calendar,
} from 'lucide-react';
import './HeroBannerSection.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(val) || 0));

const renderPromoHeadline = (promo) => {
  if (promo.promotionType === 'BUY_N_GET_M' && promo.buyNGetM) {
    return `Mua ${promo.buyNGetM.buyQuantity} tặng ${promo.buyNGetM.freeQuantity}`;
  }
  if (promo.promotionType === 'PERCENTAGE' && promo.percentageDiscount) {
    return `Giảm ${Number(promo.percentageDiscount.discountPercent)}% theo SKU`;
  }
  if (promo.promotionType === 'COMBO' && promo.combo) {
    return `Combo ${formatCurrency(promo.combo.comboPrice)} đ`;
  }
  if (promo.promotionType === 'INVOICE_DISCOUNT' && promo.invoiceDiscount) {
    const inv = promo.invoiceDiscount;
    return inv.discountPercent
      ? `Giảm ${Number(inv.discountPercent)}% đơn từ ${formatCurrency(inv.minOrderAmount)} đ`
      : `Giảm ${formatCurrency(inv.discountAmount)} đ`;
  }
  return promo.name;
};

const PromoIcon = ({ type }) => {
  if (type === 'BUY_N_GET_M') return <Gift size={15} />;
  if (type === 'COMBO') return <Package size={15} />;
  if (type === 'INVOICE_DISCOUNT') return <Percent size={15} />;
  return <Tag size={15} />;
};

export default function HeroBannerSection({
  onOpenAuth,
  onOpenLookup,
  customer,
  activePromotions = [],
}) {
  const topPromos = activePromotions.slice(0, 3);

  const handleScrollCatalog = () => {
    const el = document.getElementById('main-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="shop-hero-bento-section">
      <div className="shop-container">
        <div className="hero-bento-grid">
          {/* Left Editorial Showcase Card */}
          <div className="hero-editorial-card">
            <div className="hero-badge-pill">
              <Sparkles size={13} />
              <span>DMS TRADELEDGER • NGUỒN HÀNG PHÂN PHỐI CHÍNH HÃNG</span>
            </div>

            <h1 className="hero-headline">
              Nhập Hàng Tối Ưu — Vận Hành Thông Suốt Đến Điểm Bán
            </h1>

            <p className="hero-subtitle">
              Kết nối trực tiếp tổng kho nhà phân phối với bảng giá sỉ minh bạch, kiểm soát hạn dùng FEFO và tự động áp dụng ưu đãi theo đơn hàng.
            </p>

            <div className="hero-trust-row">
              <span className="hero-trust-item">
                <Truck size={14} /> Giao xe tải 24h – 48h
              </span>
              <span className="hero-trust-item">
                <ShieldCheck size={14} /> Đủ hóa đơn GTGT & Date mới
              </span>
              <span className="hero-trust-item">
                <Store size={14} /> Chiết khấu sỉ B2B -12%
              </span>
            </div>

            <div className="hero-cta-row">
              <button
                type="button"
                className="hero-btn-primary"
                onClick={handleScrollCatalog}
              >
                <span>Khám phá danh mục</span>
                <ArrowRight size={15} />
              </button>

              {!customer ? (
                <button
                  type="button"
                  className="hero-btn-ghost"
                  onClick={onOpenAuth}
                >
                  <Store size={15} />
                  <span>Đăng ký tài khoản Sỉ</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="hero-btn-ghost"
                  onClick={onOpenLookup}
                >
                  <ClipboardList size={15} />
                  <span>Tra cứu đơn R-</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Live Trade Promotions Card */}
          <aside className="hero-promos-panel">
            <div className="hero-promos-head">
              <div>
                <span className="promos-eyebrow">Ưu đãi đang áp dụng</span>
                <h3>Chương trình Khuyến mãi</h3>
              </div>
              <span className="promos-count-badge">{activePromotions.length} CTKM</span>
            </div>

            {topPromos.length === 0 ? (
              <div className="hero-promos-empty">
                <Gift size={26} color="#059669" />
                <div>
                  <strong>Mua sỉ đại lý giảm ngay 12%</strong>
                  <p>Đăng nhập tài khoản Cửa hàng để xem bảng giá sỉ tự động cho mọi mặt hàng.</p>
                </div>
              </div>
            ) : (
              <div className="hero-promos-list">
                {topPromos.map((promo) => (
                  <div
                    key={promo.id}
                    className="hero-promo-item"
                    onClick={handleScrollCatalog}
                  >
                    <div className={`hero-promo-icon type-${promo.promotionType}`}>
                      <PromoIcon type={promo.promotionType} />
                    </div>
                    <div className="hero-promo-text">
                      <div className="hero-promo-name" title={promo.name}>
                        {promo.name}
                      </div>
                      <div className="hero-promo-rule">{renderPromoHeadline(promo)}</div>
                      <div className="hero-promo-date">
                        <Calendar size={11} /> Đến {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="hero-lookup-bar-btn"
              onClick={onOpenLookup}
            >
              <ClipboardList size={15} />
              <span>Kiểm tra trạng thái giao hàng theo mã R-</span>
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
