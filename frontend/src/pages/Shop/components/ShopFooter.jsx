import React from 'react';
import { 
  Package, 
  PhoneCall, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Truck, 
  CheckCircle2
} from 'lucide-react';
import './ShopFooter.css';

export default function ShopFooter() {
  return (
    <footer className="shop-footer-wrapper">
      {/* 3 Core B2B Commitments */}
      <div className="footer-commitments-strip">
        <div className="shop-container commitments-grid">
          <div className="commitment-item">
            <div className="commitment-icon">
              <ShieldCheck size={22} color="#059669" />
            </div>
            <div className="commitment-text">
              <strong>100% Chính Hãng Từ Nhà Máy</strong>
              <span>Date mới, đủ giấy tờ và hoá đơn GTGT</span>
            </div>
          </div>

          <div className="commitment-item">
            <div className="commitment-icon">
              <Truck size={22} color="#0284c7" />
            </div>
            <div className="commitment-text">
              <strong>Giao Xe Tải Trong 24h - 48h</strong>
              <span>Đội ngũ xe tải điều phối theo tuyến bán hàng</span>
            </div>
          </div>

          <div className="commitment-item">
            <div className="commitment-icon">
              <CheckCircle2 size={22} color="#7c3aed" />
            </div>
            <div className="commitment-text">
              <strong>Đồng Bộ Kho DMS Tức Thì</strong>
              <span>Đơn hàng mã tiền tố R- kết nối trực tiếp kho vận</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Information */}
      <div className="footer-main-info">
        <div className="shop-container footer-info-inner">
          <div className="footer-brand-summary">
            <div className="footer-logo">
              <Package size={22} color="#059669" />
              <span className="logo-text">DMS TradeLedger</span>
            </div>
            <p className="footer-summary-desc">
              Cổng Đặt Hàng Trực Tuyến & Quản Lý Phân Phối Hàng Tiêu Dùng Nhanh (FMCG) dành riêng cho Nhà Phân Phối, Tiệm Tạp Hoá và Chuỗi Bán Lẻ.
            </p>
          </div>

          <div className="footer-contact-details">
            <div className="contact-line">
              <MapPin size={16} color="#059669" />
              <span>Kho Tổng: KCN Tân Bình, P. Tây Thạnh, TP. Hồ Chí Minh</span>
            </div>
            <div className="contact-line">
              <PhoneCall size={16} color="#059669" />
              <span>Hotline Đặt Hàng & Hỗ Trợ: <strong>1900 6868</strong> (08:00 - 18:00)</span>
            </div>
            <div className="contact-line">
              <Mail size={16} color="#059669" />
              <span>Email: <strong>hotro@dmstradeledger.vn</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="footer-copyright-bar">
        <div className="shop-container copyright-inner">
          <span>© 2026 DMS TradeLedger. All rights reserved. Hệ Thống Quản Lý Phân Phối Đa Điểm Bán.</span>
        </div>
      </div>
    </footer>
  );
}
