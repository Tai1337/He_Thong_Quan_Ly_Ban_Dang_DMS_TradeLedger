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
  Palette
} from 'lucide-react';
import './Layout.css';

// Dữ liệu phân hệ chính và menu con chi tiết
const modulesData = {
  home: {
    id: 'home',
    icon: Home,
    label: 'Trang chủ',
    desc: 'Tổng quan hệ thống DMS-NPP',
    path: '/',
    subItems: [
      { label: 'Bàn làm việc (Dashboard)', path: '/', icon: Home },
      { label: 'Đơn hàng cần xử lý', path: '/sales/sales-orders', icon: FileText },
      { label: 'Chuyến xe nhập kho đến hạn', path: '/purchase/receiving', icon: Truck },
      { label: 'Báo cáo tài chính nhanh', path: '/reports/profit-and-loss', icon: PieChart },
      { label: 'Review Khung Màu (4 Theme)', path: '/theme-review', icon: Palette },
    ]
  },
  buying: {
    id: 'buying',
    icon: ShoppingCart,
    label: 'Mua hàng',
    desc: 'Procurement & Đặt hàng NCC',
    path: '/purchase/purchase-orders',
    subItems: [
      { label: 'Đơn đặt hàng mua (PO)', path: '/purchase/purchase-orders', icon: FileText },
      { label: 'Đề xuất đặt hàng (PPO)', path: '/purchase/ppo', icon: FileText },
      { label: 'Nhập kho mua hàng', path: '/purchase/receiving', icon: Truck },
      { label: 'Lập đơn đặt mua mới', path: '/purchase/purchase-orders?create=true', icon: PlusCircle },
      { label: 'Báo cáo tồn kho đặt hàng', path: '/inventory/rpt083', icon: BarChart3 },
    ]
  },
  selling: {
    id: 'selling',
    icon: TrendingUp,
    label: 'Bán hàng',
    desc: 'Sales & Đơn hàng NPP',
    path: '/sales/sales-orders',
    subItems: [
      { label: 'Danh sách đơn bán (SO)', path: '/sales/sales-orders', icon: FileText },
      { label: 'Chuyến xe & Điều phối giao', path: '/logistics/delivery-trips', icon: Truck },
      { label: 'Lập đơn bán hàng mới', path: '/sales/sales-orders?create=true', icon: PlusCircle },
      { label: 'Kiểm tra thiếu tồn (RPT005)', path: '/sales/sales-orders?rpt005=true', icon: CheckSquare },
      { label: 'Doanh số & Sản lượng (RPT057)', path: '/reports/rpt057', icon: BarChart3 },
    ]
  },
  stock: {
    id: 'stock',
    icon: Box,
    label: 'Tồn kho',
    desc: 'Inventory & Điều phối kho',
    path: '/inventory/rpt083',
    subItems: [
      { label: 'RPT083 - Báo cáo tồn kho NPP', path: '/inventory/rpt083', icon: BarChart3 },
      { label: 'Kiểm soát phân bổ FEFO', path: '/sales/sales-orders?rpt005=true', icon: SlidersHorizontal },
      { label: 'Lịch nhập xuất kho', path: '/operations/calendar', icon: CalendarIcon },
    ]
  },
  pnl: {
    id: 'pnl',
    icon: PieChart,
    label: 'Tài chính & Kế toán',
    desc: 'Accounting & Profit and Loss',
    path: '/reports/profit-and-loss',
    subItems: [
      { label: 'Báo cáo KQKD (Profit & Loss)', path: '/reports/profit-and-loss', icon: PieChart },
      { label: 'Theo dõi Thu - Chi', path: '/reports/profit-and-loss', icon: FileText },
      { label: 'Công nợ & Doanh thu NPP', path: '/reports/rpt057', icon: BarChart3 },
    ]
  },
  calendar: {
    id: 'calendar',
    icon: CalendarIcon,
    label: 'Lịch hoạt động',
    desc: 'Job Card & Calendar Trips',
    path: '/operations/calendar',
    subItems: [
      { label: 'Lịch vận hành công việc', path: '/operations/calendar', icon: CalendarIcon },
      { label: 'Lịch chuyến xe giao hàng D+3', path: '/purchase/receiving', icon: Truck },
    ]
  },
  gantt: {
    id: 'gantt',
    icon: GitPullRequest,
    label: 'Tiến độ Kế hoạch',
    desc: 'Task Gantt & Dự án cung ứng',
    path: '/operations/gantt',
    subItems: [
      { label: 'Biểu đồ tiến độ (Gantt)', path: '/operations/gantt', icon: GitPullRequest },
      { label: 'Kế hoạch cung ứng Q1/2026', path: '/operations/gantt', icon: FileText },
    ]
  },
  reports: {
    id: 'reports',
    icon: BarChart3,
    label: 'Báo cáo phân tích',
    desc: 'Reports & Business Intelligence',
    path: '/reports/rpt057',
    subItems: [
      { label: 'RPT057 - Doanh số & Sản lượng', path: '/reports/rpt057', icon: BarChart3 },
      { label: 'RPT083 - Báo cáo tồn kho NPP', path: '/inventory/rpt083', icon: BarChart3 },
      { label: 'Báo cáo KQKD (Profit & Loss)', path: '/reports/profit-and-loss', icon: PieChart },
    ]
  },
  company: {
    id: 'company',
    icon: Building2,
    label: 'Tổ chức & Chi nhánh',
    desc: 'Công ty & Kho bãi',
    path: '#',
    subItems: [
      { label: 'Hồ sơ Nhà phân phối', path: '#', icon: Building2 },
      { label: 'Danh sách Kho hàng', path: '#', icon: Box },
    ]
  },
  security: {
    id: 'security',
    icon: ShieldCheck,
    label: 'Bảo mật & Phân quyền',
    desc: 'Roles & User Access',
    path: '#',
    subItems: [
      { label: 'Quản lý người dùng', path: '#', icon: ShieldCheck },
      { label: 'Phân quyền vai trò (Roles)', path: '#', icon: Settings },
    ]
  },
  settings: {
    id: 'settings',
    icon: Settings,
    label: 'Cài đặt hệ thống',
    desc: 'System Preferences',
    path: '#',
    subItems: [
      { label: 'Cấu hình tham số hệ thống', path: '#', icon: Settings },
      { label: 'Tích hợp & Kết nối API', path: '#', icon: GitPullRequest },
    ]
  }
};

const navItemKeys = ['home', 'buying', 'selling', 'stock', 'pnl', 'calendar', 'gantt', 'reports', 'company', 'security', 'settings'];

const FrappeSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  const filteredSubItems = activeModule ? activeModule.subItems.filter(item =>
    item.label.toLowerCase().includes(subSearch.toLowerCase())
  ) : [];

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
          {navItemKeys.map((key) => {
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
              const isSubActive = location.pathname === sub.path.split('?')[0];

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
