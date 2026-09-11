import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  HelpCircle,
  LogOut,
  User,
  Shield,
  Palette,
  Layers,
  ShoppingCart
} from 'lucide-react';
import './Layout.css';

const FrappeHeader = ({ user, onLogout }) => {
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Sinh Breadcrumbs theo URL
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/theme-review') {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Thiết kế & Giao diện', path: '/theme-review' },
        { label: 'Review Khung Màu', path: '/theme-review' }
      ];
    }
    if (path === '/') {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Bàn làm việc (Dashboard)', path: '/' }
      ];
    }
    if (path.includes('/reports/profit-and-loss')) {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Tài chính & Kế toán', path: '/reports/profit-and-loss' },
        { label: 'Báo cáo Lãi Lỗ (P&L)', path: '/reports/profit-and-loss' }
      ];
    }
    if (path.includes('/operations/calendar')) {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Vận hành & Giao hàng', path: '/operations/calendar' },
        { label: 'Lịch xe giao nhận D+3', path: '/operations/calendar' }
      ];
    }
    if (path.includes('/operations/gantt')) {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Kế hoạch & Vận hành', path: '/operations/gantt' },
        { label: 'Tiến độ Chuyến hàng D+3', path: '/operations/gantt' }
      ];
    }
    if (path.startsWith('/purchase/ppo')) {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Mua hàng', path: '/purchase/purchase-orders' },
        { label: 'Đề xuất Mua hàng AI (PPO)', path: '/purchase/ppo' }
      ];
    }
    if (path.startsWith('/purchase/receiving')) {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Mua hàng', path: '/purchase/purchase-orders' },
        { label: 'Nhập kho chuyến D+3', path: '/purchase/receiving' }
      ];
    }
    if (path.startsWith('/purchase')) {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Mua hàng', path: '/purchase/purchase-orders' },
        { label: 'Đơn đặt hàng mua (PO)', path: '/purchase/purchase-orders' }
      ];
    }
    if (path.startsWith('/sales')) {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Bán hàng', path: '/sales/sales-orders' },
        { label: 'Đơn đặt hàng bán (SO)', path: '/sales/sales-orders' }
      ];
    }
    if (path.startsWith('/inventory')) {
      return [
        { label: 'DMS-NPP TradeLedger', path: '/' },
        { label: 'Kho bãi & Tồn kho', path: '/inventory/rpt083' },
        { label: 'Báo cáo tồn kho (RPT083)', path: '/inventory/rpt083' }
      ];
    }
    return [
      { label: 'DMS-NPP TradeLedger', path: '/' },
      { label: 'Phân hệ chức năng', path: '/' }
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="frappe-topbar">
      {/* Cụm Logo & Breadcrumbs (Bên trái) */}
      <div className="frappe-topbar-left">
        <Link to="/" className="frappe-logo-spindl" title="DMS-NPP TradeLedger Home">
          <div className="frappe-logo-icon-wrap">
            <Layers size={18} />
          </div>
          <span className="spindl-brand-title">DMS-NPP TradeLedger</span>
        </Link>

        {breadcrumbs.slice(1).map((crumb, idx) => (
          <span key={crumb.label + idx} className="frappe-breadcrumb-item">
            <span className="frappe-crumb-sep">›</span>
            <Link to={crumb.path} className="frappe-crumb-text">
              {crumb.label}
            </Link>
          </span>
        ))}
      </div>

      {/* Cụm Tìm kiếm, Chuông & User Avatar (Bên phải) */}
      <div className="frappe-topbar-right">
        {/* Command Search Box (⌘ + K / Ctrl + K) */}
        <div className="frappe-search-box">
          <Search size={14} className="frappe-search-ico" />
          <input 
            type="text" 
            placeholder="Tìm kiếm chứng từ, SKU, khách hàng… (Ctrl + K)"
            className="frappe-search-input"
            spellCheck={false}
            autoComplete="off"
            aria-label="Tìm kiếm nhanh hoặc nhập lệnh"
          />
        </div>

        {/* Notifications Bell */}
        <button type="button" className="frappe-tool-btn" title="Thông báo hệ thống" aria-label="Thông báo">
          <Bell size={16} />
          <span className="frappe-notif-dot"></span>
        </button>

        {/* Help dropdown */}
        <button type="button" className="frappe-help-btn" aria-label="Trợ giúp">
          <span>Trợ giúp</span>
          <ChevronDown size={13} />
        </button>

        {/* Web Bán Hàng Link */}
        <Link 
          to="/shop" 
          target="_blank"
          className="frappe-theme-review-badge"
          style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
          title="Mở Cổng đặt hàng trực tuyến (Web Bán Hàng /shop)"
        >
          <ShoppingCart size={14} />
          <span>Web Bán Hàng</span>
        </Link>

        {/* Review Themes Button */}
        <Link 
          to="/theme-review" 
          className="frappe-theme-review-badge"
          title="Xem trước 4 khung màu (UI/UX Pro Max & Vercel Skills)"
        >
          <Palette size={14} />
          <span>Review Themes</span>
        </Link>

        {/* User Profile Avatar */}
        <div className="frappe-user-menu-container">
          <button 
            type="button" 
            className="frappe-avatar-btn"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title={user?.email || 'Tài khoản người dùng'}
          >
            <div className="frappe-avatar-img">
              {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="frappe-user-dropdown">
              <div className="frappe-user-header">
                <strong>{user?.fullName || user?.username || 'Administrator'}</strong>
                <span>{user?.email || 'admin@spindl.dms'}</span>
              </div>
              <div className="frappe-dropdown-divider"></div>
              <Link to="/theme-review" className="frappe-drop-item" style={{ textDecoration: 'none' }}>
                <Palette size={14} /> Review Khung Màu
              </Link>
              <button type="button" className="frappe-drop-item">
                <User size={14} /> Profile
              </button>
              <button type="button" className="frappe-drop-item">
                <Shield size={14} /> Permissions
              </button>
              <div className="frappe-dropdown-divider"></div>
              <button type="button" className="frappe-drop-item text-danger" onClick={onLogout}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default FrappeHeader;
