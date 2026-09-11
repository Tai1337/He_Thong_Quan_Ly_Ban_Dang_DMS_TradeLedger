import React from 'react';
import { 
  Package, 
  PhoneCall, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  QrCode, 
  ArrowUpRight 
} from 'lucide-react';
import './ShopFooter.css';

export default function ShopFooter() {
  return (
    <footer className="shop-footer-wrapper">
      {/* 4 Trust Highlights Strip */}
      <div className="footer-highlights-strip">
        <div className="shop-container highlights-grid">
          <div className="highlight-cell">
            <div className="highlight-icon">
              <ShieldCheck size={26} color="#059669" />
            </div>
            <div>
              <strong>100% Hàng Chính Hãng</strong>
              <small>Phân phối trực tiếp từ nhà máy</small>
            </div>
          </div>

          <div className="highlight-cell">
            <div className="highlight-icon">
              <Truck size={26} color="#0284c7" />
            </div>
            <div>
              <strong>Giao Xe Tải 24h</strong>
              <small>Miễn phí theo tuyến bán hàng</small>
            </div>
          </div>

          <div className="highlight-cell">
            <div className="highlight-icon">
              <Package size={26} color="#ea580c" />
            </div>
            <div>
              <strong>Date Mới & Đúng Lô</strong>
              <small>Kiểm soát chặt chẽ trên DMS</small>
            </div>
          </div>

          <div className="highlight-cell">
            <div className="highlight-icon">
              <PhoneCall size={26} color="#7c3aed" />
            </div>
            <div>
              <strong>Hotline Tuyến 1900 6868</strong>
              <small>Hỗ trợ đặt sỉ & công nợ 24/7</small>
            </div>
          </div>
        </div>
      </div>

      {/* Main 4-Column Footer */}
      <div className="footer-main-content">
        <div className="shop-container footer-columns-grid">
          {/* Col 1 */}
          <div className="footer-col">
            <div className="footer-brand-title">
              <Package size={22} color="#059669" />
              <span>DMS TradeLedger</span>
            </div>
            <p className="footer-desc">
              Hệ thống Cổng Đặt Hàng & Quản Lý Phân Phối Hàng Tiêu Dùng Nhanh (FMCG) số 1 dành cho Nhà Phân Phối, Tiệm Tạp Hoá và Cửa Hàng Tiện Lợi.
            </p>
            <div className="footer-contact-row">
              <MapPin size={15} color="#059669" />
              <span>Kho Tổng: KCN Tân Bình, P. Tây Thạnh, TP. Hồ Chí Minh</span>
            </div>
            <div className="footer-contact-row">
              <Mail size={15} color="#059669" />
              <span>hotro@dmstradeledger.vn</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="footer-col">
            <h4 className="footer-heading">CHĂM SÓC KHÁCH HÀNG</h4>
            <ul className="footer-links-list">
              <li><a href="#orders">Quy trình đặt đơn tiền tố R-</a></li>
              <li><a href="#b2b">Chính sách chiết khấu sỉ 12%</a></li>
              <li><a href="#delivery">Lịch trình tuyến xe tải DMS</a></li>
              <li><a href="#exchange">Chính sách đổi trả hàng cận date</a></li>
              <li><a href="#terms">Điều khoản hợp đồng đại lý</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="footer-col">
            <h4 className="footer-heading">PHƯƠNG THỨC THANH TOÁN</h4>
            <div className="payment-badges-grid">
              <div className="payment-badge">
                <QrCode size={18} color="#2563eb" />
                <span>VietQR Chuyển Khoản</span>
              </div>
              <div className="payment-badge">
                <CreditCard size={18} color="#059669" />
                <span>Tiền Mặt Khi Nhận Hàng (COD)</span>
              </div>
              <div className="payment-badge">
                <ShieldCheck size={18} color="#d97706" />
                <span>Công Nợ Đại Lý B2B (30 ngày)</span>
              </div>
            </div>

            <h4 className="footer-heading" style={{ marginTop: '20px' }}>ĐỐI TÁC VẬN CHUYỂN</h4>
            <div className="delivery-fleet-note">
              <Truck size={18} color="#0284c7" />
              <span>Đội xe tải phân phối chuyên trách DMS</span>
            </div>
          </div>

          {/* Col 4 */}
          <div className="footer-col">
            <h4 className="footer-heading">DÀNH CHO QUẢN TRỊ VIÊN</h4>
            <p className="footer-sub-text">
              Truy cập phân hệ điều phối kho, giám sát đơn hàng và phân tuyến tài xế nội bộ:
            </p>
            <a href="/" className="footer-dms-admin-btn">
              <span>Đăng Nhập DMS Quản Trị</span>
              <ArrowUpRight size={16} />
            </a>
            <div className="trust-cert-seal">
              <span>CHỨNG NHẬN ĐẠT CHUẨN PHÂN PHỐI QUỐC GIA FMCG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="footer-bottom-bar">
        <div className="shop-container bottom-inner">
          <span>© 2026 DMS TradeLedger. Bản quyền thuộc về Hệ Thống Quản Lý Bán Hàng & Phân Phối Nhà Phân Phối.</span>
          <span>Cổng Đặt Hàng Trực Tuyến Đơn Hàng Điện Tử R-</span>
        </div>
      </div>
    </footer>
  );
}
