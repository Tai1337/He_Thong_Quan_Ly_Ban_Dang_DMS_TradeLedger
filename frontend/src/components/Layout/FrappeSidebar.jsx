import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  TrendingUp,
  ShoppingCart,
  Box,
  BarChart3,
  Calendar as CalendarIcon,
  GitPullRequest,
  Settings,
  Building2,
  ShieldCheck,
  Folder,
  Headphones,
  PieChart,
  Truck,
  FileText,
  PlusCircle,
  CheckSquare,
  SlidersHorizontal,
  ChevronRight,
  Pin,
  PinOff,
  Search,
  Palette,
  ClipboardCheck,
  Gift,
  Tag
} from 'lucide-react';
import './Layout.css';
import { hasPermission } from '../../utils/authPermission';

// Dữ liệu phân hệ chính và menu con chi tiết, kèm quyền yêu cầu (requiredPermission)
const modulesData = {
  home: {
    id: 'home',
    icon: Home,
    label: 'Trang chủ',
    desc: 'Tổng quan hệ thống DMS-NPP',
    path: '/',
    subItems: [
      { label: 'Bàn làm việc (Dashboard)', path: '/', icon: Home },
      { label: 'Quản lý sản phẩm & SKU', path: '/catalog/products', icon: Box, requiredPermission: 'master_data:view' },
      { label: 'Đơn hàng cần xử lý (SO)', path: '/sales/sales-orders', icon: FileText, requiredPermission: 'sales_orders:view' },
      { label: 'Đơn đặt hàng mua (PO)', path: '/purchase/purchase-orders', icon: ShoppingCart, requiredPermission: 'purchase_orders:view' },
      { label: 'Kiểm kê kho hàng', path: '/inventory/counts', icon: ClipboardCheck, requiredPermission: 'inventory_counts:view' },
      { label: 'Báo cáo tài chính nhanh', path: '/reports/profit-and-loss', icon: PieChart, requiredPermission: 'reports_finance:view' },
    ]
  },
  buying: {
    id: 'buying',
    icon: ShoppingCart,
    label: 'Mua hàng',
    desc: 'Procurement & Đặt hàng NCC',
    path: '/purchase/purchase-orders',
    requiredPermission: 'purchase_orders:view',
    subItems: [
      { label: 'Đơn đặt hàng mua (PO)', path: '/purchase/purchase-orders', icon: FileText, requiredPermission: 'purchase_orders:view' },
      { label: 'Lập đơn đặt mua mới', path: '/purchase/purchase-orders?create=true', icon: PlusCircle, requiredPermission: 'purchase_orders:create' },
      { label: 'Nhập kho mua hàng', path: '/purchase/receiving', icon: Truck, requiredPermission: 'purchase_orders:receive' },
      { label: 'Báo cáo tồn kho đặt hàng', path: '/inventory/rpt083', icon: BarChart3, requiredPermission: 'inventory:view' },
    ]
  },
  selling: {
    id: 'selling',
    icon: TrendingUp,
    label: 'Bán hàng',
    desc: 'Sales & Đơn hàng NPP',
    path: '/sales/sales-orders',
    requiredPermission: 'sales_orders:view',
    subItems: [
      { label: 'Danh sách đơn bán (SO)', path: '/sales/sales-orders', icon: FileText, requiredPermission: 'sales_orders:view' },
      { label: 'Lập đơn bán hàng mới', path: '/sales/sales-orders?create=true', icon: PlusCircle, requiredPermission: 'sales_orders:create' },
      { label: 'Chương trình khuyến mãi', path: '/promotions', icon: Gift, requiredPermission: 'sales_orders:view' },
      { label: 'Chuyến xe & Điều phối giao', path: '/logistics/delivery-trips', icon: Truck, requiredPermission: 'delivery_trips:view' },
      { label: 'Kiểm tra thiếu tồn (RPT005)', path: '/sales/sales-orders?rpt005=true', icon: CheckSquare, requiredPermission: 'inventory:view' },
      { label: 'Doanh số & Sản lượng (RPT057)', path: '/reports/rpt057', icon: BarChart3, requiredPermission: 'reports_finance:view' },
    ]
  },
  stock: {
    id: 'stock',
    icon: Box,
    label: 'Tồn kho & Sản phẩm',
    desc: 'Inventory & Quản lý SKU',
    path: '/catalog/products',
    requiredPermission: ['inventory:view', 'master_data:view', 'inventory_counts:view'],
    subItems: [
      { label: 'Quản lý sản phẩm & SKU', path: '/catalog/products', icon: Box, requiredPermission: 'master_data:view' },
      { label: 'Chương trình khuyến mãi', path: '/catalog/promotions', icon: Tag, requiredPermission: 'master_data:view' },
      { label: 'Nhật ký giao dịch kho', path: '/inventory/transactions', icon: FileText, requiredPermission: 'inventory:view' },
      { label: 'Kiểm kê kho hàng', path: '/inventory/counts', icon: ClipboardCheck, requiredPermission: 'inventory_counts:view' },
      { label: 'RPT083 - Báo cáo tồn kho NPP', path: '/inventory/rpt083', icon: BarChart3, requiredPermission: 'inventory:view' },
    ]
  },
  pnl: {
    id: 'pnl',
    icon: PieChart,
    label: 'Tài chính & Kế toán',
    desc: 'Accounting & Profit and Loss',
    path: '/reports/profit-and-loss',
    requiredPermission: 'reports_finance:view',
    subItems: [
      { label: 'Báo cáo KQKD (Profit & Loss)', path: '/reports/profit-and-loss', icon: PieChart, requiredPermission: 'reports_finance:view' },
    ]
  },
  calendar: {
    id: 'calendar',
    icon: CalendarIcon,
    label: 'Tuyến bán hàng (MCP)',
    desc: 'Sales Routes & Tuyến bán hàng',
    path: '/operations/calendar',
    subItems: [
      { label: 'Lập tuyến bán hàng theo tuần', path: '/operations/calendar', icon: CalendarIcon },
    ]
  },
  reports: {
    id: 'reports',
    icon: BarChart3,
    label: 'Báo cáo phân tích',
    desc: 'Reports & Business Intelligence',
    path: '/reports/rpt057',
    requiredPermission: 'reports_finance:view',
    subItems: [
      { label: 'RPT057 - Doanh số & Sản lượng', path: '/reports/rpt057', icon: BarChart3, requiredPermission: 'reports_finance:view' },
      { label: 'RPT083 - Báo cáo tồn kho NPP', path: '/inventory/rpt083', icon: BarChart3, requiredPermission: 'inventory:view' },
      { label: 'Báo cáo KQKD (Profit & Loss)', path: '/reports/profit-and-loss', icon: PieChart, requiredPermission: 'reports_finance:view' },
    ]
  },
  security: {
    id: 'security',
    icon: ShieldCheck,
    label: 'Bảo mật & Phân quyền',
    desc: 'Roles & User Access',
    path: '/admin/roles-permissions',
    requiredPermission: 'users_roles:manage',
    subItems: [
      { label: 'Ma trận Phân quyền (Roles)', path: '/admin/roles-permissions', icon: ShieldCheck, requiredPermission: 'users_roles:manage' },
      { label: 'Quản lý người dùng', path: '/admin/users', icon: Settings, requiredPermission: 'users_roles:manage' },
    ]
  }
};

const navItemKeys = ['home', 'buying', 'selling', 'stock', 'pnl', 'calendar', 'reports', 'security'];

// Helper kiểm tra subItem có đang active dựa trên pathname và query params
const checkIsSubActive = (subPath, currentPathname, currentSearch) => {
  const [subBasePath, subQuery] = subPath.split('?');
  if (currentPathname !== subBasePath) return false;

  const currentParams = new URLSearchParams(currentSearch);

  if (subQuery) {
    const subParams = new URLSearchParams(subQuery);
    return Array.from(subParams.entries()).every(([k, v]) => currentParams.get(k) === v);
  }

  // Đường dẫn gốc (không có query parameter): Chỉ active khi URL không chứa các trigger query modal như ?create=true hoặc ?rpt005=true
  return currentParams.get('create') !== 'true' && currentParams.get('rpt005') !== 'true';
};

const FrappeSidebar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Đọc user từ localStorage nếu chưa có prop
  const currentUser = user || (() => {
    try {
      const saved = localStorage.getItem('current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  // Lọc các module mà user có quyền truy cập
  const visibleNavItemKeys = navItemKeys.filter((key) => {
    const item = modulesData[key];
    if (!item) return false;
    if (!item.requiredPermission) return true;
    return hasPermission(currentUser, item.requiredPermission);
  });

  // Hover state
  const [hoveredModuleId, setHoveredModuleId] = useState(null);
  const [isPinned, setIsPinned] = useState(false);
  const [subSearch, setSubSearch] = useState('');
  const closeTimeoutRef = useRef(null);

  const handleMouseEnterIcon = (id) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setHoveredModuleId(id);
  };

  const handleMouseLeaveSidebar = () => {
    if (isPinned) return; // Nếu đã ghim thì không tự đóng
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredModuleId(null);
    }, 200); // 200ms grace period
  };

  const handleMouseEnterDrawer = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const activeModule = hoveredModuleId ? modulesData[hoveredModuleId] : null;

  // Lọc các menu con vừa theo từ khóa search vừa theo quyền hạn của user
  const filteredSubItems = activeModule
    ? activeModule.subItems
        .filter((item) => {
          if (!item.requiredPermission) return true;
          return hasPermission(currentUser, item.requiredPermission);
        })
        .filter((item) =>
          item.label.toLowerCase().includes(subSearch.toLowerCase())
        )
    : [];

  const handleItemClick = (path) => {
    if (path && path !== '#') {
      navigate(path);
      if (!isPinned) {
        setHoveredModuleId(null);
      }
    }
  };

  return (
    <div
      className="frappe-sidebar-root"
      onMouseLeave={handleMouseLeaveSidebar}
    >
      {/* 1. THANH ICON DỌC CỐ ĐỊNH (52px) */}
      <aside className="frappe-icon-sidebar" aria-label="Main Navigation">
        {/* Brand Logo Top */}
        <div className="frappe-logo-slot" onClick={() => navigate('/')} title="ERPNext / DMS-NPP">
          <div className="frappe-brand-badge">
            <span>E</span>
          </div>
        </div>

        {/* Navigation Icons List */}
        <div className="frappe-nav-icons-list">
          {visibleNavItemKeys.map((key) => {
            const item = modulesData[key];
            if (!item) return null;
            const Icon = item.icon;
            const isRouteActive =
              (item.path === '/' && location.pathname === '/') ||
              (item.path !== '/' && item.path !== '#' && location.pathname.startsWith(item.path));
            const isHovered = hoveredModuleId === item.id;

            return (
              <div
                key={item.id}
                className="frappe-nav-item-wrapper"
                onMouseEnter={() => handleMouseEnterIcon(item.id)}
              >
                <button
                  type="button"
                  className={`frappe-nav-icon-btn ${isRouteActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => handleItemClick(item.path)}
                  aria-label={item.label}
                >
                  <Icon size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 2. KHUNG PHÂN HỆ CON (HOVER FLYOUT DRAWER) */}
      {activeModule && (
        <div
          className="frappe-sub-flyout-drawer"
          onMouseEnter={handleMouseEnterDrawer}
        >
          {/* Header Flyout */}
          <div className="frappe-flyout-header">
            <div className="frappe-flyout-title-row">
              <div className="frappe-flyout-icon-wrap">
                <activeModule.icon size={16} />
              </div>
              <div className="frappe-flyout-titles">
                <h4 className="frappe-flyout-name">{activeModule.label}</h4>
                <span className="frappe-flyout-desc">{activeModule.desc}</span>
              </div>
            </div>

            {/* Nút Ghim (Pin / Unpin) */}
            <button
              type="button"
              className={`frappe-pin-btn ${isPinned ? 'pinned' : ''}`}
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Bỏ ghim (tự đóng khi rời chuột)' : 'Ghim menu này cố định'}
            >
              {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          </div>

          {/* Ô tìm kiếm nhanh trong phân hệ */}
          <div className="frappe-flyout-search">
            <Search size={13} className="flyout-search-icon" />
            <input
              type="text"
              placeholder={`Tìm trong ${activeModule.label}...`}
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
            />
          </div>

          {/* Danh sách các chức năng / phân hệ con */}
          <div className="frappe-flyout-items-list">
            <div className="frappe-flyout-section-title">Chức năng & Chứng từ</div>
            {filteredSubItems.map((sub, idx) => {
              const SubIcon = sub.icon;
              const isSubActive = checkIsSubActive(sub.path, location.pathname, location.search);

              return (
                <button
                  key={idx}
                  type="button"
                  className={`frappe-flyout-sub-item ${isSubActive ? 'active' : ''}`}
                  onClick={() => handleItemClick(sub.path)}
                >
                  <SubIcon size={15} className="frappe-sub-ico" />
                  <span className="frappe-sub-text">{sub.label}</span>
                  {sub.badge && (
                    <span className={`frappe-sub-tag ${sub.badge.toLowerCase()}`}>
                      {sub.badge}
                    </span>
                  )}
                  <ChevronRight size={13} className="frappe-sub-arrow" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FrappeSidebar;
