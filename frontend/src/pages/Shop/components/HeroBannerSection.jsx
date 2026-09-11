import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  BadgePercent, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Award,
  Clock
} from 'lucide-react';
import './HeroBannerSection.css';

const SLIDES = [
  {
    id: 1,
    tag: 'CHÍNH SÁCH ĐẠI LÝ SỈ B2B',
    title: 'Nguồn Hàng FMCG Giá Gốc Nhà Phân Phối',
    desc: 'Chiết khấu 12% cho mọi tiệm tạp hoá và cửa hàng bán lẻ. Hỗ trợ bảng hiệu và kệ trưng bày chính hãng.',
    ctaText: 'Đăng Ký Nhận Giá Sỉ Ngay',
    badge: 'CHIẾT KHẤU 12%',
    gradient: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
    iconColor: '#34d399',
    accentText: 'Áp dụng mọi đơn hàng B2B'
  },
  {
    id: 2,
    tag: 'ĐỘI XE TẢI PHÂN PHỐI DMS',
    title: 'Freeship Đơn Hàng Tận Nơi Trong 24h',
    desc: 'Giao hàng đúng lịch trình tuyến bán hàng. Không lo đứt gãy tồn kho với dịch vụ điều phối xe tải chuyên nghiệp.',
    ctaText: 'Xem Tuyến Giao Hàng',
    badge: 'FREESHIP 0Đ',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
    iconColor: '#60a5fa',
    accentText: 'Đội xe thùng kín bảo quản chuẩn'
  },
  {
    id: 3,
    tag: 'ĐƠN HÀNG ĐIỆN TỬ TIỀN TỐ R-',
    title: 'Đặt Hàng Online — Kho Tổng Xuất Hàng Tức Thì',
    desc: 'Mọi đơn hàng tự sinh mã R- kết nối trực tiếp kho vận DMS TradeLedger. Theo dõi số lô, date và tài xế trực tiếp.',
    ctaText: 'Lên Đơn Ngay',
    badge: 'ĐƠN TỰ ĐỘNG R-',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #ea580c 100%)',
    iconColor: '#fb923c',
    accentText: 'Lộ trình minh bạch 100%'
  }
];

export default function HeroBannerSection({ onOpenAuth, onOpenLookup, customer }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto advance slides every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const active = SLIDES[currentSlide];

  return (
    <section className="hero-banner-section">
      <div className="shop-container banner-grid-layout">
        {/* Main Banner Slider (68%) */}
        <div className="banner-main-slider" style={{ background: active.gradient }}>
          {/* Overlay pattern decoration */}
          <div className="slider-pattern-overlay"></div>

          {/* Slide Content */}
          <div className="slider-content-pane">
            <div className="slider-badges-row">
              <span className="slider-tag-pill">
                <Sparkles size={12} />
                {active.tag}
              </span>
              <span className="slider-highlight-badge">
                {active.badge}
              </span>
            </div>

            <h1 className="slider-headline">{active.title}</h1>
            <p className="slider-desc">{active.desc}</p>

            <div className="slider-actions-row">
              {!customer ? (
                <button 
                  type="button" 
                  className="slider-cta-btn"
                  onClick={onOpenAuth}
                >
                  <span>{active.ctaText}</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div className="slider-session-tag">
                  <ShieldCheck size={16} color="#34d399" />
                  <span>Đang đăng nhập: <strong>{customer.storeName || customer.fullName}</strong></span>
                </div>
              )}
              <span className="slider-note-tag">{active.accentText}</span>
            </div>
          </div>

          {/* Nav arrows */}
          <button 
            type="button" 
            className="slider-nav-arrow arrow-left" 
            onClick={handlePrev}
            aria-label="Slide trước"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            type="button" 
            className="slider-nav-arrow arrow-right" 
            onClick={handleNext}
            aria-label="Slide tiếp theo"
          >
            <ChevronRight size={20} />
          </button>

          {/* Pagination dots */}
          <div className="slider-dots-container">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`slider-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Đi tới slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right Stacked Mini Banners (32%) */}
        <div className="banner-side-stack">
          {/* Top Mini Promo */}
          <div className="mini-promo-card promo-orange" onClick={onOpenAuth}>
            <div className="mini-promo-content">
              <span className="mini-tag">CHƯƠNG TRÌNH ĐIỂM BÁN</span>
              <h3 className="mini-title">Mở Tiệm Mới? Nhận Kệ & Bảng Hiệu Miễn Phí</h3>
              <p className="mini-desc">Đơn hàng đầu tiên từ 10 triệu đồng hỗ trợ lắp đặt bộ nhận diện chuẩn nhà máy.</p>
              <div className="mini-action-link">
                <span>Tham gia ngay</span>
                <ArrowRight size={13} />
              </div>
            </div>
            <div className="mini-promo-icon-bg">
              <Award size={48} />
            </div>
          </div>

          {/* Bottom Mini Promo */}
          <div className="mini-promo-card promo-green" onClick={onOpenLookup}>
            <div className="mini-promo-content">
              <span className="mini-tag tag-green">TIỆN ÍCH KHÁCH HÀNG</span>
              <h3 className="mini-title">Tra Cứu Tiến Độ Đơn Hàng Tiền Tố R-</h3>
              <p className="mini-desc">Nhập mã đơn hàng để kiểm tra vị trí xe tải giao hàng & trạng thái xuất kho.</p>
              <div className="mini-action-link link-green">
                <span>Tra cứu nhanh</span>
                <ArrowRight size={13} />
              </div>
            </div>
            <div className="mini-promo-icon-bg">
              <Truck size={48} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
