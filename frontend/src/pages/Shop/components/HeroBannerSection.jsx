import React from 'react';
import { 
  Truck, 
  ShieldCheck, 
  ClipboardList, 
  Sparkles, 
  Store,
  ArrowRight
} from 'lucide-react';
import './HeroBannerSection.css';

export default function HeroBannerSection({ onOpenAuth, onOpenLookup, customer }) {
  return (
    <section className="shop-compact-banner-section">
      <div className="shop-container">
        <div className="compact-banner-card">
          <div className="banner-left-content">
            <div className="banner-badge-pill">
              <Sparkles size={13} />
              <span>DMS TRADELEDGER • TỔNG KHO FMCG</span>
            </div>
            <h1 className="banner-headline">
              Cổng Đặt Hàng Phân Phối Trực Tuyến
            </h1>
            <p className="banner-subtitle">
              Nguồn hàng trực tiếp từ nhà máy. Chính sách chiết khấu 12% và hỗ trợ vận chuyển xe tải cho tiệm tạp hoá, điểm bán lẻ.
            </p>
            <div className="banner-highlights-row">
              <span className="b-highlight-item">
                <Truck size={14} color="#34d399" /> Giao xe tải 24h - 48h
              </span>
              <span className="b-highlight-item">
                <ShieldCheck size={14} color="#34d399" /> Cam kết Date mới & Đủ hoá đơn
              </span>
              <span className="b-highlight-item">
                <Store size={14} color="#34d399" /> Chiết khấu sỉ tiệm tạp hoá
              </span>
            </div>
          </div>

          <div className="banner-right-actions">
            {!customer ? (
              <button 
                type="button" 
                className="banner-action-btn primary"
                onClick={onOpenAuth}
              >
                <Store size={16} />
                <span>Đăng Ký Tài Khoản Sỉ</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <div className="banner-logged-tag">
                <ShieldCheck size={18} color="#10b981" />
                <div>
                  <small>Đang đăng nhập</small>
                  <strong>{customer.storeName || customer.fullName}</strong>
                </div>
              </div>
            )}

            <button 
              type="button" 
              className="banner-action-btn outline"
              onClick={onOpenLookup}
            >
              <ClipboardList size={16} />
              <span>Tra Cứu Lộ Trình Đơn R-</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
