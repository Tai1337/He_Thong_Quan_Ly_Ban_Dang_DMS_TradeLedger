import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  HelpCircle,
  LogOut,
  User,
  Shield
} from 'lucide-react';
import './Layout.css';

const FrappeHeader = ({ user, onLogout }) => {
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Sinh Breadcrumbs theo URL
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') {
      return [
        { label: 'spindl', path: '/' },
        { label: 'Dashboard', path: '/' }
      ];
    }
    if (path.includes('/reports/profit-and-loss')) {
      return [
        { label: 'spindl', path: '/' },
        { label: 'Accounting', path: '/reports/profit-and-loss' },
        { label: 'Profit and Loss Statement', path: '/reports/profit-and-loss' }
      ];
    }
    if (path.includes('/operations/calendar')) {
      return [
        { label: 'spindl', path: '/' },
        { label: 'Manufacturing', path: '/operations/calendar' },
        { label: 'Job Card', path: '/operations/calendar' }
      ];
    }
    if (path.includes('/operations/gantt')) {
      return [
        { label: 'spindl', path: '/' },
        { label: 'Projects', path: '/operations/gantt' },
        { label: 'Task', path: '/operations/gantt' }
      ];
    }
    if (path.startsWith('/purchase')) {
      return [
        { label: 'spindl', path: '/' },
        { label: 'Buying', path: '/purchase/purchase-orders' },
        { label: 'Purchase Order', path: '/purchase/purchase-orders' }
      ];
    }
    if (path.startsWith('/sales')) {
      return [
        { label: 'spindl', path: '/' },
        { label: 'Selling', path: '/sales/sales-orders' },
        { label: 'Sales Order', path: '/sales/sales-orders' }
      ];
    }
    if (path.startsWith('/inventory')) {
      return [
        { label: 'spindl', path: '/' },
        { label: 'Stock', path: '/inventory/rpt083' },
        { label: 'Inventory Summary', path: '/inventory/rpt083' }
      ];
    }
    return [
      { label: 'spindl', path: '/' },
      { label: 'Workspaces', path: '/' }
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="frappe-topbar">
      {/* Cụm Logo & Breadcrumbs (Bên trái) */}
      <div className="frappe-topbar-left">
        <Link to="/" className="frappe-logo-spindl">
          <svg className="spindl-svg-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 9 9" />
            <path d="M12 7a5 5 0 0 1 5 5" />
          </svg>
          <span className="spindl-brand-title">{breadcrumbs[0]?.label || 'spindl'}</span>
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
        {/* Command Search Box (⌘ + G / Ctrl + K) */}
        <div className="frappe-search-box">
          <Search size={14} className="frappe-search-ico" />
          <input 
            type="text" 
            placeholder="Search or type a command (⌘ + G)"
            className="frappe-search-input"
          />
        </div>

        {/* Notifications Bell */}
        <button type="button" className="frappe-tool-btn" title="Notifications">
          <Bell size={16} />
          <span className="frappe-notif-dot"></span>
        </button>

        {/* Help dropdown */}
        <button type="button" className="frappe-help-btn">
          <span>Help</span>
          <ChevronDown size={13} />
        </button>

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
