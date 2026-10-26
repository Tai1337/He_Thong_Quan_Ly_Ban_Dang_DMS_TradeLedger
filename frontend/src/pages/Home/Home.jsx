import { Link } from 'react-router-dom';
import {
  ArrowRight,
  User,
  ShoppingCart,
  PlusCircle,
  AlertTriangle,
  TrendingUp,
  Layers,
  Truck,
  FileText,
  CheckCircle2,
  Clock,
  BarChart3,
  Box,
  ChevronRight,
  ShieldCheck,
  Calendar,
  DollarSign,
  ClipboardCheck
} from 'lucide-react';
import './Home.css';
import { hasPermission } from '../../utils/authPermission';

const Home = ({ user }) => {
  const currentUser = user || (() => {
    try {
      const saved = localStorage.getItem('current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const todayFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const canSales = hasPermission(currentUser, 'sales_orders:view');
  const canPO = hasPermission(currentUser, 'purchase_orders:view');
  const canReceiving = hasPermission(currentUser, 'purchase_orders:receive');
  const canPnL = hasPermission(currentUser, 'reports_finance:view');
  const canInventoryCounts = hasPermission(currentUser, 'inventory_counts:view');
  const canMasterData = hasPermission(currentUser, 'master_data:view');
  const canCreateSO = hasPermission(currentUser, 'sales_orders:create');
  const canCreatePO = hasPermission(currentUser, 'purchase_orders:create');
  const canViewReports = hasPermission(currentUser, 'reports_finance:view');

  return (
    <div className="home-bento-container">
      {/* 1. Welcome & Context Bar */}
      <div className="home-welcome-card">
        <div className="welcome-left">
          <div className="welcome-avatar-wrapper">
            <User size={26} />
          </div>
          <div className="welcome-text">
            <h2>Xin chào, {currentUser?.fullName || currentUser?.username || 'Thành viên NPP'}!</h2>
            <p>
              Mã NPP: <strong>INK.AD.NPP-TEST.01</strong> • Vai trò: <span className="role-tag">{currentUser?.roleName || currentUser?.roleCode || 'NHÂN VIÊN'}</span>
            </p>
          </div>
        </div>

        <div className="welcome-right">
          <div className="system-status-badge">
            <span className="status-dot"></span>
            <span>Hệ thống trực tuyến</span>
          </div>
          <div className="date-indicator">
            <Calendar size={15} />
            <span>{todayFormatted}</span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bento Grid (Ẩn các card không có quyền) */}
      <div className="bento-metrics-grid">
        {/* Card 1: Sales Orders */}
        {canSales && (
          <Link to="/sales/sales-orders" className="bento-metric-card border-blue">
            <div className="metric-header">
              <div className="metric-icon-box bg-blue-light text-blue">
                <TrendingUp size={20} />
              </div>
              <span className="metric-badge badge-blue">Bán hàng (SO)</span>
            </div>
            <div className="metric-body">
              <div className="metric-value">6 Luồng</div>
              <div className="metric-title">Vòng đời Đơn bán hàng</div>
              <p className="metric-sub">Phân bổ lô FEFO, gán chuyến xe giao và đối soát công nợ</p>
            </div>
            <div className="metric-footer text-blue">
              <span>Vào phân hệ SO</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        )}

        {/* Card 2: Purchase Orders (PO) */}
        {canPO && (
          <Link to="/purchase/purchase-orders" className="bento-metric-card border-indigo">
            <div className="metric-header">
              <div className="metric-icon-box bg-indigo-light text-indigo">
                <FileText size={20} />
              </div>
              <span className="metric-badge badge-indigo">Mua hàng NCC</span>
            </div>
            <div className="metric-body">
              <div className="metric-value">Đơn mua hàng</div>
              <div className="metric-title">Quản lý cung ứng</div>
              <p className="metric-sub">Lập đơn đặt mua, theo dõi trạng thái và tiến độ giao hàng từ NCC</p>
            </div>
            <div className="metric-footer text-indigo">
              <span>Quản lý PO ngay</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        )}

        {/* Card 3: Inbound Receiving (D+3) */}
        {canReceiving && (
          <Link to="/purchase/receiving" className="bento-metric-card border-emerald">
            <div className="metric-header">
              <div className="metric-icon-box bg-emerald-light text-emerald">
                <Truck size={20} />
              </div>
              <span className="metric-badge badge-emerald">Chuyến xe D+3</span>
            </div>
            <div className="metric-body">
              <div className="metric-value">Nhập kho mua hàng</div>
              <div className="metric-title">Tiếp nhận & Kiểm đếm</div>
              <p className="metric-sub">Theo dõi chuyến xe, ghi nhận số lượng thực nhận & tăng tồn kho</p>
            </div>
            <div className="metric-footer text-emerald">
              <span>Xem điều phối xe</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        )}

        {/* Card 4: Accounting Profit Loss */}
        {canPnL && (
          <Link to="/accounting/pnl" className="bento-metric-card border-amber">
            <div className="metric-header">
              <div className="metric-icon-box bg-amber-light text-amber">
                <DollarSign size={20} />
              </div>
              <span className="metric-badge badge-amber">Sổ sách kế toán</span>
            </div>
            <div className="metric-body">
              <div className="metric-value">Báo cáo Lãi / Lỗ</div>
              <div className="metric-title">Kết quả kinh doanh</div>
              <p className="metric-sub">Doanh thu thuần, giá vốn FIFO/Bình quân và chi phí vận hành</p>
            </div>
            <div className="metric-footer text-amber">
              <span>Xem báo cáo P&L</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        )}
      </div>

      {/* 3. Daily Operational Timeline Workflow */}
      <div className="bento-card timeline-card">
        <div className="timeline-header">
          <div>
            <h3 className="card-heading">
              <Clock size={18} color="#2563eb" />
              <span>Quy trình Mua hàng & Phân phối Chuẩn hóa</span>
            </h3>
            <p className="card-subheading">
              Luồng tự động hóa đồng bộ giữa Nhà sản xuất / NCC và Nhà phân phối (NPP)
            </p>
          </div>
          <div className="timeline-badge">
            <ShieldCheck size={15} />
            <span>Chuẩn hóa ISO/DMS</span>
          </div>
        </div>

        <div className="workflow-steps-grid">
          <div className="workflow-step-item">
            <div className="step-number">Bước 1</div>
            <div className="step-content">
              <h4>Lập Đơn mua hàng (PO)</h4>
              <p>Xác định nhu cầu đặt hàng từ Nhà cung cấp dựa trên tồn kho thực tế và kế hoạch bán buôn.</p>
            </div>
          </div>

          <div className="workflow-step-item highlight-step">
            <div className="step-number">Bước 2</div>
            <div className="step-content">
              <h4>Xác nhận Đơn & Lịch giao</h4>
              <p>Nhà cung cấp tiếp nhận PO, phê duyệt đơn hàng và sắp xếp chuyến xe giao hàng.</p>
            </div>
          </div>

          <div className="workflow-step-item">
            <div className="step-number">Bước 3</div>
            <div className="step-content">
              <h4>Vận chuyển Chuyến xe</h4>
              <p>Điều phối chuyến xe giao hàng đến kho NPP theo đúng kế hoạch hẹn trước.</p>
            </div>
          </div>

          <div className="workflow-step-item">
            <div className="step-number">Bước 4</div>
            <div className="step-content">
              <h4>Nhập kho Đặt hàng</h4>
              <p>Chuyến xe đến kho, thủ kho nhập số lượng thực nhận, cập nhật Lô (GOOD), NSX, HSD và tăng tồn kho.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Action Hub */}
      <div className="bento-card actions-card">
        <h3 className="card-heading">
          <Layers size={18} color="#0f172a" />
          <span>Lối tắt Thao tác Nhanh (Quick Actions)</span>
        </h3>

        <div className="quick-actions-grid">
          {canCreateSO && (
            <Link to="/sales/sales-orders?create=true" className="action-tile">
              <div className="action-tile-icon bg-blue">
                <PlusCircle size={20} />
              </div>
              <div className="action-tile-info">
                <span className="action-name">Lập Đơn bán hàng (BH_BM1)</span>
                <span className="action-desc">Tạo đơn đặt hàng cho đại lý / điểm bán</span>
              </div>
            </Link>
          )}

          {canCreatePO && (
            <Link to="/purchase/purchase-orders?create=true" className="action-tile">
              <div className="action-tile-icon bg-indigo">
                <PlusCircle size={20} />
              </div>
              <div className="action-tile-info">
                <span className="action-name">Lập Đơn mua hàng (PO)</span>
                <span className="action-desc">Tạo đơn đặt mua hàng từ Nhà cung cấp</span>
              </div>
            </Link>
          )}

          {canReceiving && (
            <Link to="/purchase/receiving" className="action-tile">
              <div className="action-tile-icon bg-emerald">
                <Truck size={20} />
              </div>
              <div className="action-tile-info">
                <span className="action-name">Nhập kho Chuyến xe (D+3)</span>
                <span className="action-desc">Kiểm đếm và nhập kho hàng nhà máy về</span>
              </div>
            </Link>
          )}

          {canViewReports && (
            <Link to="/reports/rpt057" className="action-tile">
              <div className="action-tile-icon bg-purple">
                <BarChart3 size={20} />
              </div>
              <div className="action-tile-info">
                <span className="action-name">Báo cáo Doanh số (RPT057)</span>
                <span className="action-desc">Đối soát sản lượng và xuất file Excel</span>
              </div>
            </Link>
          )}

          {canInventoryCounts && (
            <Link to="/inventory/counts" className="action-tile">
              <div className="action-tile-icon bg-blue">
                <ClipboardCheck size={20} />
              </div>
              <div className="action-tile-info">
                <span className="action-name">Kiểm kê kho hàng</span>
                <span className="action-desc">Mở đợt kiểm kho, giải trình chênh lệch & cân kho</span>
              </div>
            </Link>
          )}

          {canMasterData && (
            <Link to="/catalog/products" className="action-tile">
              <div className="action-tile-icon bg-purple">
                <Box size={20} />
              </div>
              <div className="action-tile-info">
                <span className="action-name">Quản lý sản phẩm & SKU</span>
                <span className="action-desc">Thêm mới sản phẩm, cấu hình đơn vị sỉ / lẻ và giá bán</span>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
