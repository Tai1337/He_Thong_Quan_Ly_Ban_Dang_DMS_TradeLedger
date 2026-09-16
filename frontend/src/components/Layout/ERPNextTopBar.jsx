import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  Building2,
  Sparkles
} from 'lucide-react';
import './Layout.css';

const ERPNextTopBar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Tạo breadcrumbs ngữ cảnh dựa vào URL
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [];

    if (path === '/') {
      crumbs.push({ label: 'Trang chủ', path: '/' });
    } else if (path.startsWith('/purchase')) {
      crumbs.push({ label: 'Mua hàng', path: '/purchase/purchase-orders' });
      if (path.includes('/ppo')) {
        crumbs.push({ label: 'Đề xuất đặt hàng (PPO)', path: '/purchase/ppo' });
      } else if (path.includes('/receiving')) {
        crumbs.push({ label: 'Nhập kho mua hàng', path: '/purchase/receiving' });
      } else if (path.includes('/purchase-orders/')) {
        crumbs.push({ label: 'Chi tiết Đơn đặt mua', path });
      } else {
        crumbs.push({ label: 'Đơn đặt hàng mua (PO)', path: '/purchase/purchase-orders' });
      }
    } else if (path.startsWith('/sales')) {
      crumbs.push({ label: 'Bán hàng', path: '/sales/sales-orders' });
      if (path.includes('/sales-orders/')) {
        crumbs.push({ label: 'Chi tiết Đơn bán hàng', path });
      } else {
        crumbs.push({ label: 'Danh sách đơn hàng bán (SO)', path: '/sales/sales-orders' });
      }
    } else if (path.startsWith('/inventory')) {
      crumbs.push({ label: 'Tồn kho', path: '/inventory/rpt083' });
      crumbs.push({ label: 'RPT083 - Báo cáo tồn kho', path });
    } else if (path.startsWith('/reports')) {
      crumbs.push({ label: 'Báo cáo', path: '/reports/rpt057' });
      crumbs.push({ label: 'RPT057 - Doanh số & Sản lượng', path });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="erp-topbar">
      {/* Cụm điều hướng lùi/tiến và Breadcrumb */}
      <div className="erp-topbar-left">
        <div className="erp-topbar-nav-btns">
          <button 
            type="button" 
            className="erp-nav-btn" 
            onClick={() => window.history.back()}
            title="Quay lại"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            type="button" 
            className="erp-nav-btn" 
            onClick={() => window.history.forward()}
            title="Đi tới"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <nav className="erp-breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.path + idx} className="erp-breadcrumb-segment">
              {idx > 0 && <span className="erp-breadcrumb-sep">/</span>}
              {idx === breadcrumbs.length - 1 ? (
                <span className="erp-breadcrumb-current">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="erp-breadcrumb-link">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Cụm tìm kiếm toàn cục & Trạng thái NPP */}
      <div className="erp-topbar-right">
        <div className="erp-topbar-search">
          <Search size={14} className="erp-topbar-search-icon" />
          <input 
            type="text" 
            placeholder="Tìm kiếm chứng từ, sản phẩm, SKU (Ctrl + G)..." 
            className="erp-topbar-search-input"
          />
          <span className="erp-search-kbd">Ctrl G</span>
        </div>

        {/* Thông tin NPP đang thao tác */}
        <div className="erp-topbar-distributor-badge" title="Đang làm việc tại Nhà phân phối">
          <Building2 size={14} color="#059669" />
          <span>NPP Masan Center #01</span>
        </div>

        {/* Trợ giúp & AI Assistant */}
        <button 
          type="button" 
          className="erp-topbar-action-icon" 
          title="Trợ giúp nghiệp vụ"
          onClick={() => alert('Hệ thống hỗ trợ nghiệp vụ DMS-NPP 24/7. Hotline: 1900 1234')}
        >
          <HelpCircle size={16} />
        </button>

        <button 
          type="button" 
          className="erp-topbar-action-icon" 
          title="Thông báo hệ thống"
        >
          <Bell size={16} />
          <span className="erp-topbar-badge-dot"></span>
        </button>
      </div>
    </header>
  );
};

export default ERPNextTopBar;
