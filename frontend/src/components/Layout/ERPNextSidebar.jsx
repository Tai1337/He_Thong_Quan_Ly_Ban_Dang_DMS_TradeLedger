import { useState, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Home, 
  ShoppingCart, 
  TrendingUp, 
  Box, 
  BarChart3, 
  Settings, 
  Search, 
  Bell, 
  Layers, 
  ChevronRight, 
  ChevronLeft,
  Truck, 
  PlusCircle, 
  FileText, 
  CheckSquare, 
  LogOut,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import './Layout.css';

// Danh sách các phân hệ chính (Primary Modules - Cột 1)
const primaryModules = [
  { id: 'home', label: 'Trang chủ', icon: Home, path: '/' },
  { id: 'buying', label: 'Mua hàng', icon: ShoppingCart, basePath: '/purchase' },
  { id: 'selling', label: 'Bán hàng', icon: TrendingUp, basePath: '/sales' },
  { id: 'stock', label: 'Tồn kho', icon: Box, basePath: '/inventory' },
  { id: 'reports', label: 'Báo cáo', icon: BarChart3, basePath: '/reports' },
  { id: 'setup', label: 'Cài đặt', icon: Settings, basePath: '/settings' },
];

// Danh sách menu phụ tương ứng từng phân hệ (Submenus - Cột 2)
const moduleSubmenus = {
  buying: {
    title: 'Mua hàng',
    description: 'Procurement & Inbound',
    items: [
      { id: 'po-list', label: 'Đơn đặt hàng mua (PO)', icon: FileText, path: '/purchase/purchase-orders' },
      { id: 'ppo', label: 'Đề xuất đặt hàng (PPO)', icon: FileText, path: '/purchase/ppo' },
      { id: 'po-receiving', label: 'Nhập kho mua hàng', icon: Truck, path: '/purchase/receiving' },
      { id: 'po-create', label: 'Lập đơn đặt mua mới', icon: PlusCircle, path: '/purchase/purchase-orders?create=true' },
      { id: 'po-report', label: 'Báo cáo tồn kho đặt hàng', icon: BarChart3, path: '/inventory/rpt083' },
    ]
  },
  selling: {
    title: 'Bán hàng',
    description: 'Sales & Distribution',
    items: [
      { id: 'so-list', label: 'Danh sách đơn bán (SO)', icon: FileText, path: '/sales/sales-orders' },
      { id: 'so-create', label: 'Lập đơn bán hàng mới', icon: PlusCircle, path: '/sales/sales-orders?create=true' },
      { id: 'so-rpt005', label: 'Kiểm tra thiếu tồn (RPT005)', icon: CheckSquare, path: '/sales/sales-orders?rpt005=true' },
      { id: 'so-rpt057', label: 'Doanh số & Sản lượng (RPT057)', icon: BarChart3, path: '/reports/rpt057' },
    ]
  },
  stock: {
    title: 'Tồn kho',
    description: 'Inventory Management',
    items: [
      { id: 'stock-rpt083', label: 'RPT083 - Báo cáo tồn kho NPP', icon: BarChart3, path: '/inventory/rpt083' },
      { id: 'stock-fefo', label: 'Kiểm soát phân bổ FEFO', icon: SlidersHorizontal, path: '/sales/sales-orders?rpt005=true' },
      { id: 'stock-receiving', label: 'Phiếu giao hàng nhập kho', icon: Truck, path: '/purchase/receiving' },
    ]
  },
  reports: {
    title: 'Báo cáo',
    description: 'Analytics & Reporting',
    items: [
      { id: 'rpt-057', label: 'RPT057 - Doanh số & Sản lượng', icon: BarChart3, path: '/reports/rpt057' },
      { id: 'rpt-083', label: 'RPT083 - Báo cáo tồn kho', icon: BarChart3, path: '/inventory/rpt083' },
      { id: 'rpt-005', label: 'RPT005 - Kiểm tra thiếu tồn kho', icon: CheckSquare, path: '/sales/sales-orders?rpt005=true' },
    ]
  },
  setup: {
    title: 'Cài đặt hệ thống',
    description: 'Settings & Administration',
    items: [
      { id: 'setup-users', label: 'Người dùng & Phân quyền', icon: FileText, path: '#' },
      { id: 'setup-npp', label: 'Thông tin Nhà phân phối', icon: FileText, path: '#' },
    ]
  }
};

const ERPNextSidebar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định active module dựa trên URL
  const activeModule = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/purchase')) return 'buying';
    if (path.startsWith('/sales')) return 'selling';
    if (path.startsWith('/inventory')) return 'stock';
    if (path.startsWith('/reports')) return 'reports';
    if (path.startsWith('/settings')) return 'setup';
    return 'home';
  }, [location.pathname]);

  const [selectedModule, setSelectedModule] = useState(activeModule === 'home' ? 'buying' : activeModule);
  const [isSubmenuCollapsed, setIsSubmenuCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Tự động cập nhật selectedModule khi URL đổi (trừ khi đang ở Home)
  const currentSubmenu = moduleSubmenus[selectedModule];

  const handleModuleClick = (mod) => {
    if (mod.path) {
      navigate(mod.path);
    } else {
      setSelectedModule(mod.id);
      setIsSubmenuCollapsed(false);
      // Nếu bấm vào module, tự động chuyển đến tab đầu tiên của module đó nếu chưa ở trong module
      const defaultSub = moduleSubmenus[mod.id]?.items[0];
      if (defaultSub && !location.pathname.startsWith(mod.basePath)) {
        navigate(defaultSub.path);
      }
    }
  };

  const filteredSubItems = useMemo(() => {
    if (!currentSubmenu) return [];
    if (!searchTerm.trim()) return currentSubmenu.items;
    return currentSubmenu.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentSubmenu, searchTerm]);

  return (
    <aside className={`erp-sidebar-container ${isSubmenuCollapsed ? 'submenu-collapsed' : ''}`}>
      {/* CỘT 1: PRIMARY MODULE SIDEBAR */}
      <div className="erp-primary-sidebar">
        {/* Brand Logo */}
        <div className="erp-brand-header">
          <Link to="/" className="erp-brand-btn" title="Hệ thống Quản lý DMS TradeLedger">
            <div className="erp-brand-icon">
              <Layers size={18} />
            </div>
            <div className="erp-brand-info">
              <span className="erp-brand-name">ERPNext</span>
              <span className="erp-brand-sub">DMS-NPP</span>
            </div>
            <ChevronDown size={14} className="erp-brand-arrow" />
          </Link>
        </div>

        {/* Quick Search & Notifications */}
        <div className="erp-primary-tools">
          <button 
            type="button" 
            className="erp-primary-tool-btn" 
            title="Tìm kiếm nhanh (Ctrl+K)"
            onClick={() => {
              const input = document.querySelector('.erp-sub-search-input');
              if (input) input.focus();
            }}
          >
            <Search size={16} />
            <span>Search</span>
          </button>
          
          <button type="button" className="erp-primary-tool-btn" title="Thông báo hệ thống">
            <Bell size={16} />
            <span>Notifications</span>
            <span className="erp-notif-pill">3</span>
          </button>
        </div>

        {/* Primary Modules List */}
        <div className="erp-primary-menu">
          <div className="erp-primary-menu-label">Phân hệ chính</div>
          {primaryModules.map(mod => {
            const Icon = mod.icon;
            const isCurrentActive = 
              (mod.id === 'home' && location.pathname === '/') ||
              (mod.basePath && location.pathname.startsWith(mod.basePath)) ||
              (selectedModule === mod.id && location.pathname !== '/');

            return (
              <button
                key={mod.id}
                type="button"
                className={`erp-primary-item ${isCurrentActive ? 'active' : ''}`}
                onClick={() => handleModuleClick(mod)}
                title={mod.label}
              >
                <Icon size={17} className="erp-module-icon" />
                <span className="erp-module-label">{mod.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Account / Bottom Profile */}
        <div className="erp-primary-footer">
          <div className="erp-user-profile-pill" title={user?.email || 'Tài khoản người dùng'}>
            <div className="erp-user-avatar">
              {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="erp-user-info-text">
              <span className="erp-user-name">{user?.fullName || user?.username || 'Administrator'}</span>
              <span className="erp-user-email">{user?.email || 'admin@masan.dms'}</span>
            </div>
            <button 
              type="button" 
              className="erp-logout-btn" 
              onClick={onLogout}
              title="Đăng xuất"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* CỘT 2: SECONDARY SUBMENU SIDEBAR (Hiển thị khi không phải trang chủ hoặc được chọn) */}
      {currentSubmenu && (
        <div className="erp-secondary-sidebar">
          {/* Header Phân hệ con */}
          <div className="erp-sub-header">
            <div className="erp-sub-title-wrap">
              <h3 className="erp-sub-title">{currentSubmenu.title}</h3>
              <span className="erp-sub-desc">{currentSubmenu.description}</span>
            </div>
            <button 
              type="button" 
              className="erp-collapse-sub-btn" 
              onClick={() => setIsSubmenuCollapsed(!isSubmenuCollapsed)}
              title={isSubmenuCollapsed ? 'Mở rộng menu phụ' : 'Thu gọn menu phụ'}
            >
              {isSubmenuCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>

          {/* Ô tìm kiếm nhanh trong menu con */}
          <div className="erp-sub-search-wrap">
            <Search size={14} className="erp-search-icon" />
            <input 
              type="text" 
              className="erp-sub-search-input"
              placeholder={`Tìm trong ${currentSubmenu.title}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Danh sách các chức năng / màn hình con */}
          <div className="erp-sub-menu-list">
            <div className="erp-sub-group-label">Chứng từ & Nghiệp vụ</div>
            {filteredSubItems.map(item => {
              const ItemIcon = item.icon;
              // Kiểm tra xem subItem có đang active dựa trên pathname và query
              const isItemActive = location.pathname === item.path.split('?')[0] && 
                (!item.path.includes('?') || location.search === item.path.substring(item.path.indexOf('?')));

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`erp-sub-item ${isItemActive ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <ItemIcon size={16} className="erp-sub-icon" />
                  <span className="erp-sub-label">{item.label}</span>
                  {item.badge && (
                    <span className={`erp-sub-badge ${item.badge === 'AI' ? 'ai' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="erp-sub-group-label" style={{ marginTop: '16px' }}>Cài đặt & Báo cáo</div>
            <button 
              type="button" 
              className="erp-sub-item" 
              onClick={() => navigate('/reports/rpt057')}
            >
              <BarChart3 size={16} className="erp-sub-icon" />
              <span className="erp-sub-label">Báo cáo phân hệ</span>
              <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </button>
            <button 
              type="button" 
              className="erp-sub-item"
              onClick={() => alert('Cấu hình phân hệ đang được đồng bộ hóa')}
            >
              <Settings size={16} className="erp-sub-icon" />
              <span className="erp-sub-label">Thiết lập chung</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ERPNextSidebar;
