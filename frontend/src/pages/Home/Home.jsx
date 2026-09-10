import { Link } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  User, 
  ShoppingCart, 
  PlusCircle, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  PackageCheck,
  ChevronRight
} from 'lucide-react';
import './Home.css';

const Home = ({ user }) => {
  return (
    <div className="home-container">
      {/* Banner Area */}
      <div className="banner-card">
        <div className="banner-content">
          <h2 className="banner-title">HỆ THỐNG DMS - NHÀ PHÂN PHỐI (DMS-NPP)</h2>
          <p className="banner-subtitle">Nền tảng Quản lý Bán hàng, Phân bổ Tồn kho FEFO & Đối soát Doanh số</p>
        </div>
        <div className="banner-illustration" style={{ display: 'flex', alignItems: 'flex-end', opacity: 0.85 }}>
           <img src="https://img.freepik.com/free-vector/ecommerce-web-page-concept-illustration_114360-8204.jpg" alt="Illustration" style={{height: '100%', objectFit: 'contain', mixBlendMode: 'multiply'}} />
        </div>
      </div>

      {/* Profile & Stats Overlay */}
      <div className="profile-stats-card">
        <div className="profile-info">
          <div className="profile-avatar-large">
            <User size={32} color="#1a73e8" />
          </div>
          <div className="profile-details">
            <h3>{user?.fullName || user?.name || user?.email || 'ADMIN NHÀ PHÂN PHỐI'}</h3>
            <p>Mã NPP: INK.AD.G-10KF1292.04 • Role: {user?.role || 'DISTRIBUTOR_ADMIN'}</p>
          </div>
        </div>

        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-value text-blue">1</div>
            <div className="stat-label">Kho hàng chính</div>
          </div>
          <div className="stat-item">
            <div className="stat-value text-green">112</div>
            <div className="stat-label">SKU Sản phẩm</div>
          </div>
          <div className="stat-item">
            <div className="stat-value text-amber">171</div>
            <div className="stat-label">Lô hàng khả dụng</div>
          </div>
        </div>

        <div className="profile-action">
          <Link to="/sales/sales-orders" className="btn-blue">
            Vào Phân hệ Bán hàng <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* SEARCH SECTION */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <input type="text" className="search-input" placeholder="Tìm kiếm nhanh đơn hàng bán, báo cáo, sản phẩm, đại lý..." />
        </div>
        <button className="search-button">
          <Search size={18} />
        </button>
      </div>

      {/* SECTION 1: PHÂN HỆ QUẢN LÝ BÁN HÀNG (HOTSPOT / PRIMARY) */}
      <div className="dashboard-section highlight-section">
        <div className="section-header-flex">
          <div>
            <h3 className="section-title highlight-title">🔥 PHÂN HỆ QUẢN LÝ BÁN HÀNG (SALES ORDERS)</h3>
            <p className="section-description">Quản lý toàn diện vòng đời đơn bán hàng, phân bổ lô FEFO, gán chuyến xe, đối soát tồn kho</p>
          </div>
          <Link to="/sales/sales-orders" className="section-view-all">
            Xem tất cả đơn hàng <ChevronRight size={16} />
          </Link>
        </div>

        <div className="sales-features-grid">
          {/* Card 1: Quản lý SO */}
          <Link to="/sales/sales-orders" className="sales-card sales-card-primary">
            <div className="sales-card-header">
              <div className="sales-card-icon bg-blue">
                <ShoppingCart size={24} />
              </div>
              <span className="badge badge-primary">Chức năng chính</span>
            </div>
            <h4 className="sales-card-title">Quản lý Đơn hàng bán (SO)</h4>
            <p className="sales-card-desc">
              Theo dõi luồng 6 trạng thái: Đã gửi đơn → Chờ giao (FEFO) → Đang giao (Xe) → Đã giao (Xuất kho) → Đã đóng & Huỷ đơn.
            </p>
            <div className="sales-card-footer">
              <span className="footer-action-text">Mở màn hình SO</span>
              <ArrowRight size={16} />
            </div>
          </Link>

          {/* Card 2: Lập đơn mới BH_BM1 */}
          <Link to="/sales/sales-orders?create=true" className="sales-card sales-card-action">
            <div className="sales-card-header">
              <div className="sales-card-icon bg-emerald">
                <PlusCircle size={24} />
              </div>
              <span className="badge badge-emerald">Biểu mẫu BH_BM1</span>
            </div>
            <h4 className="sales-card-title">Lập Đơn bán hàng mới</h4>
            <p className="sales-card-desc">
              Tạo đơn đặt hàng chuẩn BH_BM1 cho NPP & NVBH: chọn đại lý, kho xuất, SKU, tự động tính tổng tiền, chiết khấu, VAT.
            </p>
            <div className="sales-card-footer">
              <span className="footer-action-text text-emerald">+ Tạo đơn hàng ngay</span>
              <ArrowRight size={16} />
            </div>
          </Link>

          {/* Card 3: RPT005 Thiếu tồn kho */}
          <Link to="/sales/sales-orders?rpt005=true" className="sales-card sales-card-warning">
            <div className="sales-card-header">
              <div className="sales-card-icon bg-amber">
                <AlertTriangle size={24} />
              </div>
              <span className="badge badge-amber">Báo cáo RPT005</span>
            </div>
            <h4 className="sales-card-title">Đối soát Đơn thiếu tồn kho</h4>
            <p className="sales-card-desc">
              Kiểm tra tồn khả dụng (Vật lý - Giữ chỗ), phát hiện SKU không đủ giao và chỉnh sửa số lượng đơn hàng tức thì.
            </p>
            <div className="sales-card-footer">
              <span className="footer-action-text text-amber">Kiểm tra tồn kho</span>
              <ArrowRight size={16} />
            </div>
          </Link>

          {/* Card 4: RPT057 Báo cáo doanh số */}
          <Link to="/reports/rpt057" className="sales-card sales-card-info">
            <div className="sales-card-header">
              <div className="sales-card-icon bg-purple">
                <TrendingUp size={24} />
              </div>
              <span className="badge badge-purple">Báo cáo RPT057</span>
            </div>
            <h4 className="sales-card-title">Doanh số & Sản lượng bán</h4>
            <p className="sales-card-desc">
              Thống kê tổng sản lượng bán lẻ, doanh số theo Nhân viên bán hàng, Tuyến bán hàng, Phân loại ngành hàng và xuất file Excel.
            </p>
            <div className="sales-card-footer">
              <span className="footer-action-text text-purple">Xem báo cáo RPT057</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      </div>

      {/* SECTION 2: QUẢN LÝ KHO HÀNG & TỒN KHO */}
      <div className="dashboard-section">
        <h3 className="section-title">QUẢN LÝ TỒN KHO & ĐIỀU CHUYỂN</h3>
        <div className="cards-grid">
          <Link to="/inventory/rpt083" className="dashboard-card-link">
            <div className="dashboard-card">
              <Layers className="card-icon" size={22} style={{ color: '#0ea5e9' }} />
              <div>
                <span className="card-title">RPT083 - Báo cáo Tồn kho NPP</span>
                <p className="card-subtitle-small">Xem số lượng tồn kho theo SKU, Lô hàng và Hạn dùng</p>
              </div>
            </div>
          </Link>
          <div className="dashboard-card">
            <PackageCheck className="card-icon" size={22} style={{ color: '#64748b' }} />
            <div>
              <span className="card-title">Quản lý Lô & Hạn sử dụng (FEFO)</span>
              <p className="card-subtitle-small">Theo dõi 171 lô hàng xuất ưu tiên theo HSD</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;
