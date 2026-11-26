import { Link } from 'react-router-dom';
import {
  ArrowRight,
  User,
  PlusCircle,
  TrendingUp,
  Truck,
  FileText,
  BarChart3,
  Box,
  ShieldCheck,
  Calendar,
  DollarSign,
  ClipboardCheck,
} from 'lucide-react';
import DmsSectionPanel from '../../components/DmsUi/DmsSectionPanel';
import { hasPermission } from '../../utils/authPermission';
import './Home.css';

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
    day: 'numeric',
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
    <div className="dms-home-container">
      {/* 1. Welcome Strip */}
      <div className="dms-home-welcome">
        <div className="dms-welcome-left">
          <div className="dms-welcome-avatar">
            <User size={22} />
          </div>
          <div>
            <h2>Xin chào, {currentUser?.fullName || currentUser?.username || 'Thành viên NPP'}</h2>
            <p>
              Mã NPP: <strong>{currentUser?.distributor?.code || 'INK.AD.NPP-TEST.01'}</strong> · Vai trò:{' '}
              <span className="dms-home-role-badge">
                {currentUser?.roleName || currentUser?.roleCode || 'NHÂN VIÊN'}
              </span>
            </p>
          </div>
        </div>

        <div className="dms-welcome-right">
          <div className="dms-status-live">
            <span className="dms-live-dot" />
            <span>Hệ thống trực tuyến</span>
          </div>
          <div className="dms-date-pill">
            <Calendar size={14} />
            <span>{todayFormatted}</span>
          </div>
        </div>
      </div>

      {/* 2. Core Modules */}
      <DmsSectionPanel title="Phân hệ nghiệp vụ chính">
        <div className="dms-modules-grid">
          {canSales && (
            <Link to="/sales/sales-orders" className="dms-module-tile accent-steel">
              <div className="dms-tile-top">
                <span className="dms-tile-icon steel">
                  <TrendingUp size={18} />
                </span>
                <span className="dms-tile-tag">Bán hàng (SO)</span>
              </div>
              <div className="dms-tile-title">Vòng đời Đơn bán hàng</div>
              <p className="dms-tile-desc">Phân bổ lô FEFO, gán chuyến xe giao và đối soát công nợ</p>
              <div className="dms-tile-link">
                <span>Vào phân hệ SO</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          )}

          {canPO && (
            <Link to="/purchase/purchase-orders" className="dms-module-tile accent-navy">
              <div className="dms-tile-top">
                <span className="dms-tile-icon navy">
                  <FileText size={18} />
                </span>
                <span className="dms-tile-tag">Mua hàng NCC</span>
              </div>
              <div className="dms-tile-title">Đơn mua hàng (PO)</div>
              <p className="dms-tile-desc">Lập đơn đặt mua, theo dõi trạng thái và tiến độ giao từ NCC</p>
              <div className="dms-tile-link">
                <span>Quản lý PO ngay</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          )}

          {canReceiving && (
            <Link to="/purchase/receiving" className="dms-module-tile accent-green">
              <div className="dms-tile-top">
                <span className="dms-tile-icon green">
                  <Truck size={18} />
                </span>
                <span className="dms-tile-tag">Chuyến xe D+3</span>
              </div>
              <div className="dms-tile-title">Nhập kho mua hàng</div>
              <p className="dms-tile-desc">Theo dõi chuyến xe, kiểm đếm thực nhận & tăng tồn kho lô</p>
              <div className="dms-tile-link">
                <span>Xem điều phối xe</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          )}

          {canPnL && (
            <Link to="/reports/profit-and-loss" className="dms-module-tile accent-amber">
              <div className="dms-tile-top">
                <span className="dms-tile-icon amber">
                  <DollarSign size={18} />
                </span>
                <span className="dms-tile-tag">Tài chính & P&L</span>
              </div>
              <div className="dms-tile-title">Báo cáo Lãi / Lỗ</div>
              <p className="dms-tile-desc">Doanh thu thuần, giá vốn COGS và phân tích biểu đồ kỳ</p>
              <div className="dms-tile-link">
                <span>Xem báo cáo P&L</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          )}
        </div>
      </DmsSectionPanel>

      {/* 3. Workflow */}
      <DmsSectionPanel
        title="Quy trình Mua hàng & Phân phối Chuẩn hóa"
        actions={
          <span className="dms-iso-badge">
            <ShieldCheck size={14} /> Chuẩn hóa ISO/DMS
          </span>
        }
      >
        <div className="dms-workflow-grid">
          <div className="dms-workflow-card">
            <div className="dms-step-badge">Bước 1</div>
            <h4>Lập Đơn mua hàng (PO)</h4>
            <p>Xác định nhu cầu đặt hàng từ Nhà cung cấp dựa trên tồn kho thực tế và kế hoạch bán buôn.</p>
          </div>
          <div className="dms-workflow-card is-highlight">
            <div className="dms-step-badge">Bước 2</div>
            <h4>Xác nhận Đơn & Lịch giao</h4>
            <p>Nhà cung cấp tiếp nhận PO, phê duyệt đơn hàng và sắp xếp chuyến xe giao hàng.</p>
          </div>
          <div className="dms-workflow-card">
            <div className="dms-step-badge">Bước 3</div>
            <h4>Vận chuyển Chuyến xe</h4>
            <p>Điều phối chuyến xe giao hàng đến kho NPP theo đúng kế hoạch hẹn trước.</p>
          </div>
          <div className="dms-workflow-card">
            <div className="dms-step-badge">Bước 4</div>
            <h4>Nhập kho Đặt hàng</h4>
            <p>Chuyến xe đến kho, thủ kho nhập số lượng thực nhận, cập nhật Lô (GOOD), NSX, HSD.</p>
          </div>
        </div>
      </DmsSectionPanel>

      {/* 4. Quick Actions */}
      <DmsSectionPanel title="Lối tắt Thao tác Nhanh">
        <div className="dms-quick-actions-grid">
          {canCreateSO && (
            <Link to="/sales/sales-orders?create=true" className="dms-quick-tile">
              <span className="dms-quick-icon steel">
                <PlusCircle size={18} />
              </span>
              <div>
                <div className="dms-quick-name">Lập Đơn bán hàng (BH_BM1)</div>
                <div className="dms-quick-desc">Tạo đơn đặt hàng cho đại lý / điểm bán</div>
              </div>
            </Link>
          )}

          {canCreatePO && (
            <Link to="/purchase/purchase-orders/create" className="dms-quick-tile">
              <span className="dms-quick-icon navy">
                <PlusCircle size={18} />
              </span>
              <div>
                <div className="dms-quick-name">Lập Đơn mua hàng (PO)</div>
                <div className="dms-quick-desc">Tạo đơn đặt mua hàng từ Nhà cung cấp</div>
              </div>
            </Link>
          )}

          {canReceiving && (
            <Link to="/purchase/receiving" className="dms-quick-tile">
              <span className="dms-quick-icon green">
                <Truck size={18} />
              </span>
              <div>
                <div className="dms-quick-name">Nhập kho Chuyến xe (D+3)</div>
                <div className="dms-quick-desc">Kiểm đếm và nhập kho hàng nhà máy về</div>
              </div>
            </Link>
          )}

          {canViewReports && (
            <Link to="/reports/rpt057" className="dms-quick-tile">
              <span className="dms-quick-icon amber">
                <BarChart3 size={18} />
              </span>
              <div>
                <div className="dms-quick-name">Báo cáo Doanh số (RPT057)</div>
                <div className="dms-quick-desc">Biểu đồ, đối soát sản lượng và xuất Excel</div>
              </div>
            </Link>
          )}

          {canInventoryCounts && (
            <Link to="/inventory/counts" className="dms-quick-tile">
              <span className="dms-quick-icon steel">
                <ClipboardCheck size={18} />
              </span>
              <div>
                <div className="dms-quick-name">Kiểm kê kho hàng</div>
                <div className="dms-quick-desc">Mở đợt kiểm kho, giải trình chênh lệch & cân kho</div>
              </div>
            </Link>
          )}

          {canMasterData && (
            <Link to="/catalog/products" className="dms-quick-tile">
              <span className="dms-quick-icon navy">
                <Box size={18} />
              </span>
              <div>
                <div className="dms-quick-name">Quản lý sản phẩm & SKU</div>
                <div className="dms-quick-desc">Thêm mới sản phẩm, cấu hình đơn vị sỉ / lẻ và giá bán</div>
              </div>
            </Link>
          )}
        </div>
      </DmsSectionPanel>
    </div>
  );
};

export default Home;
